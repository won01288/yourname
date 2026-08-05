// 결제(CLAUDE.md 0.4) — 결제 확인 중(대기) 화면에서 사용자가 취소를 누르면 호출. 결제창을 연
// 순간부터 휴대폰(카카오페이/네이버페이)으로 승인 알림이 이미 나가 있을 수 있는데, 프론트에서
// 모달만 닫으면 그 알림은 여전히 유효해서 사용자가 나중에 승인을 눌러 결제가 그대로 성사될 수
// 있다 — 서비스 쪽은 이미 취소했다고 여기고 있어 결과를 보여줄 방법이 없는 게 원래 문제였다.
// 이 라우트는 페이앱 REST API(cmd=paycancel)로 그 요청 자체를 무효화한다.
//
// 판단은 항상 DB의 실제 상태를 기준으로 한다 — 취소 요청과 거의 동시에 결제가 승인되는 레이스에서
// 웹훅이 먼저 paid로 갱신했을 수 있고, 그 경우 이 라우트는 취소 대신 paid 상태를 그대로 돌려줘
// 프론트가 정상 결제 흐름으로 이어가게 한다(원래 문제를 정확히 뒤집는 지점).

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPaymentOrderById, markOrderStatus } from "@/lib/db-payment";
import { getPaymentProvider } from "@/lib/payment/provider";

// 결제창을 연 직후라 페이앱의 "최초 요청" 웹훅(mul_no 포함)이 아직 도착하지 않았을 수 있다 —
// 잠깐 재확인하며 기다린다(최대 2.5초). 그래도 못 받으면 취소를 강행하지 않고 프론트가 잠시 후
// 다시 시도하게 한다(retry: true) — mul_no 없이는 페이앱에 어떤 요청을 취소할지 특정할 수 없다.
const PROVIDER_ORDER_ID_WAIT_ATTEMPTS = 5;
const PROVIDER_ORDER_ID_WAIT_INTERVAL_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await context.params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: "올바르지 않은 id입니다." }, { status: 400 });
  }

  let order = await getPaymentOrderById(orderId, user.id);
  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  // 이미 최종 상태로 정리됐으면(특히 paid/consumed — 취소보다 웹훅이 먼저 도착) 그대로 반환한다.
  if (order.status !== "pending") {
    return NextResponse.json({ status: order.status });
  }

  for (let attempt = 0; !order.providerOrderId && attempt < PROVIDER_ORDER_ID_WAIT_ATTEMPTS; attempt++) {
    await sleep(PROVIDER_ORDER_ID_WAIT_INTERVAL_MS);
    order = await getPaymentOrderById(orderId, user.id);
    if (!order) {
      return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
    }
    if (order.status !== "pending") {
      return NextResponse.json({ status: order.status });
    }
  }

  if (!order.providerOrderId) {
    return NextResponse.json({ status: "pending", retry: true }, { status: 202 });
  }

  const provider = getPaymentProvider();
  const result = await provider.cancelPendingRequest(order.providerOrderId);

  if (result.success) {
    // status='pending' 가드가 있는 markOrderStatus라, 그 사이 웹훅이 먼저 paid로 바꿨다면 이
    // UPDATE는 조용히 무시된다(아래 재조회가 최종 진실을 돌려준다).
    await markOrderStatus(orderId, "canceled", null);
  }

  const finalOrder = await getPaymentOrderById(orderId, user.id);
  return NextResponse.json({ status: finalOrder?.status ?? order.status });
}
