// 결제(페이앱, CLAUDE.md 0.4) — 프론트가 결제 완료 여부를 폴링으로 확인하는 조회 전용 라우트.
// 웹훅이 상태를 갱신하는 유일한 경로이고, 여긴 그 결과를 읽기만 한다.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPaymentOrderById } from "@/lib/db-payment";

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
  });
}
