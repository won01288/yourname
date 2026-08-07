// 결제(페이앱, CLAUDE.md 0.4) — price_tier/payment_order 전용 DB 접근. lib/db-auth.ts와 동일하게
// getDbClient()(lib/db.ts)를 재사용하고, 쓰기가 잦은 사용자 관련 데이터라 lib/db.ts(읽기 전용
// 참조 데이터)와 분리했다.

import { getDbClient } from "./db";
import type { CandidateCount } from "./naming/config";
import { CANDIDATE_COUNT_OPTIONS } from "./naming/config";
import type { DiscountCode, PaymentOrder, PaymentStatus, PriceTier } from "./payment/types";

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
    payType: (row.pay_type as string | null) ?? null,
    pendingPayload: (row.pending_payload as string | null) ?? null,
    discountCode: (row.discount_code as string | null) ?? null,
    discountPercent: (row.discount_percent as number | null) ?? null,
    originalAmount: (row.original_amount as number | null) ?? null,
    namingResultId: (row.naming_result_id as number | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToDiscountCode(row: Record<string, unknown>): DiscountCode {
  return {
    id: row.id as number,
    code: row.code as string,
    discountPercent: row.discount_percent as number,
    validFrom: (row.valid_from as string | null) ?? null,
    validUntil: row.valid_until as string,
    isActive: (row.is_active as number) === 1,
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
  amount: number,
  // 결제 시작 시점의 NameRequestPayload(JSON 문자열) 스냅샷 — 모바일 풀리다이렉트 복귀 시
  // sessionStorage가 유실돼도 orderId만으로 복원할 수 있게 한다(2026.8.5, app/api/payment/checkout).
  pendingPayload: string | null = null,
  // 할인코드가 적용된 주문이면 코드/할인율/할인 전 원가 스냅샷을 함께 남긴다(2026.8.7).
  // app/api/payment/checkout/route.ts가 서버에서 재검증·재계산한 값만 여기로 넘긴다.
  discount: { code: string; percent: number; originalAmount: number } | null = null
): Promise<PaymentOrder> {
  const client = getDbClient();
  const inserted = await client.execute({
    sql: `INSERT INTO payment_order (user_id, candidate_count, amount, pending_payload, discount_code, discount_percent, original_amount)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      userId,
      candidateCount,
      amount,
      pendingPayload,
      discount?.code ?? null,
      discount?.percent ?? null,
      discount?.originalAmount ?? null,
    ],
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
                       pay_type, pending_payload, discount_code, discount_percent, original_amount,
                       naming_result_id, created_at, updated_at
                FROM payment_order WHERE id = ?`,
          args: [id],
        })
      : await client.execute({
          sql: `SELECT id, user_id, candidate_count, amount, status, provider, provider_order_id,
                       pay_type, pending_payload, discount_code, discount_percent, original_amount,
                       naming_result_id, created_at, updated_at
                FROM payment_order WHERE id = ? AND user_id = ?`,
          args: [id, userId],
        });
  if (result.rows.length === 0) return null;
  return rowToPaymentOrder(result.rows[0] as unknown as Record<string, unknown>);
}

// /naming 진입 시(2026.8.5) — 이 유저의 결제가 이미 소비됐는데(claimPaymentOrder로 status='consumed')
// 아직 naming_result로 연결되지 않은 주문이 있으면, 백그라운드에서 여전히 생성 중이라는 뜻이다.
// 결제 후 카카오페이/네이버페이 앱 전환처럼 브라우저 컨텍스트가 바뀌며 클라이언트 상태(로딩 화면)가
// 유실돼도, 서버 쪽 진행 상태만으로 새로고침 후에도 로딩 화면을 그대로 복원할 수 있게 한다 —
// sessionStorage나 URL 쿼리에 의존하지 않는다.
export async function getInProgressNamingOrder(
  userId: number
): Promise<{ orderId: number; candidateCount: CandidateCount } | null> {
  const client = getDbClient();
  const result = await client.execute({
    sql: `SELECT id, candidate_count FROM payment_order
          WHERE user_id = ? AND status = 'consumed' AND naming_result_id IS NULL
          ORDER BY created_at DESC LIMIT 1`,
    args: [userId],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0] as unknown as Record<string, unknown>;
  const candidateCount = row.candidate_count as number;
  if (!isCandidateCount(candidateCount)) return null;
  return { orderId: row.id as number, candidateCount };
}

// 웹훅 전용 — 페이앱의 "최초 결제요청" 통보(pay_state=1)로 mul_no를 결제 완료 전에 미리 확보한다.
// 이걸 알아야 결제가 끝나기 전에도 요청취소(paycancel) API를 호출할 수 있다(사용자가 결제 확인
// 화면에서 취소를 눌렀을 때, 이미 휴대폰에 간 카카오페이/네이버페이 승인 알림을 실제로 무효화하는
// 용도). status='pending'이고 아직 값이 없을 때만 채워, 이미 정리된 주문이나 기존 값을 덮어쓰지
// 않는다.
export async function setPaymentOrderProviderOrderId(orderId: number, providerOrderId: string): Promise<void> {
  const client = getDbClient();
  await client.execute({
    sql: `UPDATE payment_order
          SET provider_order_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND status = 'pending' AND provider_order_id IS NULL`,
    args: [providerOrderId, orderId],
  });
}

// 웹훅 전용. status='pending'일 때만 전이시켜 페이앱의 중복 통보(문서상 여러 번 호출될 수 있음)에
// 안전하다 — 이미 paid/consumed/canceled로 정리된 주문을 다시 덮어쓰지 않는다.
export async function markOrderStatus(
  orderId: number,
  status: Extract<PaymentStatus, "paid" | "canceled" | "failed">,
  providerOrderId: string | null,
  payType: string | null = null
): Promise<void> {
  const client = getDbClient();
  await client.execute({
    sql: `UPDATE payment_order
          SET status = ?, provider_order_id = COALESCE(?, provider_order_id),
              pay_type = COALESCE(?, pay_type), updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND status = 'pending'`,
    args: [status, providerOrderId, payType, orderId],
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

// 관리자 회원관리(app/admin/users) 전용 — 전 회원의 결제 내역을 한 번에 조회한다. 호출부가
// isAdminUser를 이미 확인했다고 가정한다(listAllUsersForAdmin과 동일한 패턴). user_id로 그룹핑은
// 호출부(페이지)에서 한다 — 이 파일은 db-auth.ts의 user 타입을 모르므로 여기서 합치지 않는다.
export async function listAllPaymentOrdersForAdmin(): Promise<PaymentOrder[]> {
  const client = getDbClient();
  const result = await client.execute(
    `SELECT id, user_id, candidate_count, amount, status, provider, provider_order_id,
            pay_type, pending_payload, discount_code, discount_percent, original_amount,
            naming_result_id, created_at, updated_at
     FROM payment_order ORDER BY created_at DESC`
  );
  return result.rows.map((row) => rowToPaymentOrder(row as unknown as Record<string, unknown>));
}

// 할인코드 테이블 ---------------------------------------------------------

// 결제 모달 검증(app/api/payment/discount-code/validate)·체크아웃(app/api/payment/checkout)
// 양쪽에서 쓰는 조회다 — 활성 + 유효기간(now가 valid_from~valid_until 사이) 조건을 SQL이 직접
// CURRENT_TIMESTAMP로 판정한다(애플리케이션 코드에서 날짜를 다시 비교하지 않음).
export async function getActiveDiscountCodeByCode(code: string): Promise<DiscountCode | null> {
  const client = getDbClient();
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  const result = await client.execute({
    sql: `SELECT id, code, discount_percent, valid_from, valid_until, is_active, created_at, updated_at
          FROM discount_code
          WHERE code = ? AND is_active = 1
                AND (valid_from IS NULL OR valid_from <= CURRENT_TIMESTAMP)
                AND valid_until >= CURRENT_TIMESTAMP`,
    args: [normalized],
  });
  if (result.rows.length === 0) return null;
  return rowToDiscountCode(result.rows[0] as unknown as Record<string, unknown>);
}

// 관리자 전용(app/admin/discount-codes) — 호출부가 isAdminUser를 이미 확인했다고 가정한다.
export async function listDiscountCodesForAdmin(): Promise<DiscountCode[]> {
  const client = getDbClient();
  const result = await client.execute(
    `SELECT id, code, discount_percent, valid_from, valid_until, is_active, created_at, updated_at
     FROM discount_code ORDER BY created_at DESC`
  );
  return result.rows.map((row) => rowToDiscountCode(row as unknown as Record<string, unknown>));
}

export async function createDiscountCode(
  code: string,
  discountPercent: number,
  validFrom: string | null,
  validUntil: string
): Promise<void> {
  const client = getDbClient();
  await client.execute({
    sql: `INSERT INTO discount_code (code, discount_percent, valid_from, valid_until) VALUES (?, ?, ?, ?)`,
    args: [code.trim().toUpperCase(), discountPercent, validFrom, validUntil],
  });
}

export async function updateDiscountCode(
  id: number,
  discountPercent: number,
  validFrom: string | null,
  validUntil: string,
  isActive: boolean
): Promise<void> {
  const client = getDbClient();
  await client.execute({
    sql: `UPDATE discount_code
          SET discount_percent = ?, valid_from = ?, valid_until = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
    args: [discountPercent, validFrom, validUntil, isActive ? 1 : 0, id],
  });
}
