// 결제(페이앱, CLAUDE.md 0.4) — 프론트가 결제 완료 여부를 폴링으로 확인하는 조회 전용 라우트.
// 웹훅이 상태를 갱신하는 유일한 경로이고, 여긴 그 결과를 읽기만 한다.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPaymentOrderById } from "@/lib/db-payment";

// 저장된 pending_payload(JSON 문자열)를 파싱한다. 저장 형식이 깨진 극히 드문 경우에도 조회
// 자체는 실패시키지 않고 조용히 null로 취급한다(호출부가 사용자 측 다른 복원 수단으로 넘어감).
function parsePendingPayload(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await context.params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: "올바르지 않은 id입니다." }, { status: 400 });
  }

  const order = await getPaymentOrderById(orderId, user.id);
  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    id: order.id,
    status: order.status,
    candidateCount: order.candidateCount,
    amount: order.amount,
    // 모바일 풀리다이렉트 복귀 시 sessionStorage 유실에 대비한 서버 측 위저드 입력값 스냅샷
    // (2026.8.5). 저장된 적 없으면(레거시 주문 등) null.
    payload: parsePendingPayload(order.pendingPayload),
  });
}
