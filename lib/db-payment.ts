// 결제(페이앱, CLAUDE.md 0.4) — price_tier/payment_order 전용 DB 접근. lib/db-auth.ts와 동일하게
// getDbClient()(lib/db.ts)를 재사용하고, 쓰기가 잦은 사용자 관련 데이터라 lib/db.ts(읽기 전용
// 참조 데이터)와 분리했다.

import { getDbClient } from "./db";
import type { CandidateCount } from "./naming/config";
import { CANDIDATE_COUNT_OPTIONS } from "./naming/config";
import type { PaymentOrder, PaymentStatus, PriceTier } from "./payment/types";

function isCandidateCount(value: number): value is CandidateCount {
  return (CANDIDATE_COUNT_OPTIONS as readonly number[]).includes(value);
}

function rowToPriceTier(row: Record<string, unknown>): PriceTier {
  const candidateCount = row.candidate_count as number;
  if (!isCandidateCount(candidateCount)) {
    throw new Error(`price_tier에 알 수 없는 candidate_count가 있습니다: ${candidateCount}`);
  }
  return { candidateCount, price: row.price as number, updatedAt: row.updated_at as string };
}

function rowToPaymentOrder(row: Record<string, unknown>): PaymentOrder {
  const candidateCount = row.candidate_count as number;
  if (!isCandidateCount(candidateCount)) {
    throw new Error(`payment_order에 알 수 없는 candidate_count가 있습니다: ${candidateCount}`);
  }
  return {
    id: row.id as number,
    userId: row.user_id as number,
    candidateCount,
    amount: row.amount as number,
    status: row.status as PaymentStatus,
    provider: row.provider as string,
    providerOrderId: (row.provider_order_id as string | null) ?? null,
    namingResultId: (row.naming_result_id as number | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// price_tier 테이블 -----------------------------------------------------

export async function getPriceTiers(): Promise<PriceTier[]> {
  const client = getDbClient();
  const result = await client.execute(
    "SELECT candidate_count, price, updated_at FROM price_tier ORDER BY candidate_count ASC"
  );
  return result.rows.map((row) => rowToPriceTier(row as unknown as Record<string, unknown>));
}

export async function getPriceForCandidateCount(candidateCount: CandidateCount): Promise<number | null> {
  const client = getDbClient();
  const result = await client.execute({
    sql: "SELECT price FROM price_tier WHERE candidate_count = ?",
    args: [candidateCount],
  });
  if (result.rows.length === 0) return null;
  return (result.rows[0] as unknown as Record<string, unknown>).price as number;
}

// 관리자 전용 — 호출부(app/admin/pricing)가 isAdminUser를 이미 확인했다고 가정한다.
export async function updatePriceTier(candidateCount: CandidateCount, price: number): Promise<void> {
  const client = getDbClient();
  await client.execute({
    sql: `UPDATE price_tier SET price = ?, updated_at = CURRENT_TIMESTAMP WHERE candidate_count = ?`,
    args: [price, candidateCount],
  });
}

// payment_order 테이블 ---------------------------------------------------

export async function createPaymentOrder(
  userId: number,
  candidateCount: CandidateCount,
  amount: number
): Promise<PaymentOrder> {
  const client = getDbClient();
  const inserted = await client.execute({
    sql: `INSERT INTO payment_order (user_id, candidate_count, amount) VALUES (?, ?, ?)`,
    args: [userId, candidateCount, amount],
  });
  const id = Number(inserted.lastInsertRowid);
  const order = await getPaymentOrderById(id);
  if (!order) throw new Error("payment_order 생성 직후 조회에 실패했습니다.");
  return order;
}

// userId를 주면 소유권까지 함께 검증한다(API 라우트용). 웹훅은 유저 세션이 아니라
// userid/linkkey/linkval로 인증되므로 userId 없이 조회한다.
export async function getPaymentOrderById(id: number, userId?: number): Promise<PaymentOrder | null> {
  const client = getDbClient();
  const result =
    userId === undefined
      ? await client.execute({
          sql: `SELECT id, user_id, candidate_count, amount, status, provider, provider_order_id,
                       naming_result_id, created_at, updated_at
                FROM payment_order WHERE id = ?`,
          args: [id],
        })
      : await client.execute({
          sql: `SELECT id, user_id, candidate_count, amount, status, provider, provider_order_id,
                       naming_result_id, created_at, updated_at
                FROM payment_order WHERE id = ? AND user_id = ?`,
          args: [id, userId],
        });
  if (result.rows.length === 0) return null;
  return rowToPaymentOrder(result.rows[0] as unknown as Record<string, unknown>);
}

// 웹훅 전용. status='pending'일 때만 전이시켜 페이앱의 중복 통보(문서상 여러 번 호출될 수 있음)에
// 안전하다 — 이미 paid/consumed/canceled로 정리된 주문을 다시 덮어쓰지 않는다.
export async function markOrderStatus(
  orderId: number,
  status: Extract<PaymentStatus, "paid" | "canceled" | "failed">,
  providerOrderId: string | null
): Promise<void> {
  const client = getDbClient();
  await client.execute({
    sql: `UPDATE payment_order
          SET status = ?, provider_order_id = COALESCE(?, provider_order_id), updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND status = 'pending'`,
    args: [status, providerOrderId, orderId],
  });
}

// app/api/name/route.ts 전용 — LLM 호출(가장 비싼 단계) 이전에, "이 주문이 이 유저·이 개수로
// paid 상태인가"를 원자적으로 확인하며 동시에 소비 처리한다. 같은 주문으로 두 번 생성 요청을
// 보내는 이중사용(더블클릭, 새로고침 재시도 등)을 UPDATE ... WHERE status='paid' 하나로 막는다 —
// 두 요청이 동시에 들어와도 DB 레벨에서 하나만 rowsAffected=1을 받는다.
export async function claimPaymentOrder(
  orderId: number,
  userId: number,
  candidateCount: CandidateCount
): Promise<boolean> {
  const client = getDbClient();
  const result = await client.execute({
    sql: `UPDATE payment_order
          SET status = 'consumed', updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_id = ? AND candidate_count = ? AND status = 'paid'`,
    args: [orderId, userId, candidateCount],
  });
  return result.rowsAffected > 0;
}

// LLM 호출 실패 등으로 claim(소비 처리) 이후 결과 생성에 실패했을 때, 사용자가 결제를 다시
// 하지 않고 같은 orderId로 재시도할 수 있도록 소비 상태를 되돌린다.
export async function revertPaymentOrderToPaid(orderId: number): Promise<void> {
  const client = getDbClient();
  await client.execute({
    sql: `UPDATE payment_order SET status = 'paid', updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND status = 'consumed'`,
    args: [orderId],
  });
}

// 생성 성공 후 best-effort로 호출 — 실패해도 이미 생성된 결과 응답에는 영향 주지 않는다
// (app/api/name/route.ts의 saveNamingResult와 동일한 패턴).
export async function linkPaymentOrderToNamingResult(orderId: number, namingResultId: number): Promise<void> {
  const client = getDbClient();
  await client.execute({
    sql: `UPDATE payment_order SET naming_result_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    args: [namingResultId, orderId],
  });
}
