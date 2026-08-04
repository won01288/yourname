// 결제(페이앱, CLAUDE.md 0.4) — feedbackurl 웹훅. 결제 상태의 유일한 신뢰 소스다(브라우저 콜백은
// 신뢰하지 않는다). 페이앱은 폼인코딩으로 POST하며, 응답은 반드시 순수 텍스트 "SUCCESS" + HTTP
// 200이어야 한다(다르면 문서 기준 최대 10회 재시도) — NextResponse.json을 쓰지 않는 이유.

import { NextResponse } from "next/server";
import { markOrderStatus } from "@/lib/db-payment";
import { getPaymentProvider } from "@/lib/payment/provider";

function successResponse() {
  return new NextResponse("SUCCESS", { status: 200, headers: { "Content-Type": "text/plain" } });
}

export async function POST(request: Request) {
  let form: Record<string, string>;
  try {
    const formData = await request.formData();
    form = Object.fromEntries(
      Array.from(formData.entries()).map(([key, value]) => [key, String(value)])
    );
  } catch {
    return new NextResponse("FAIL", { status: 400 });
  }

  const provider = getPaymentProvider();
  const result = provider.parseWebhook(form);

  // userid/linkkey/linkval이 우리 설정과 일치하지 않으면 스푸핑으로 간주 — SUCCESS를 주지 않는다.
  if (!result.recognized) {
    console.error("결제 웹훅 인증 실패(userid/linkkey/linkval 불일치):", { var1: form.var1 });
    return new NextResponse("FAIL", { status: 400 });
  }

  if (result.orderId === null) {
    // 인증은 통과했지만 우리가 발급한 적 없는 주문(var1 누락/파싱 불가) — 재시도해도 해결되지
    // 않으므로 SUCCESS로 응답해 페이앱의 불필요한 재시도를 막는다.
    console.error("결제 웹훅에 유효한 orderId(var1)가 없습니다:", form);
    return successResponse();
  }

  if (result.status === "paid" || result.status === "canceled" || result.status === "failed") {
    await markOrderStatus(result.orderId, result.status, result.providerOrderId);
  }
  // status === "ignored" (요청/대기 등 이번 범위에서 다루지 않는 pay_state)는 아무 것도 하지 않고
  // 그냥 SUCCESS로 응답해 페이앱이 재시도하지 않게 한다.

  return successResponse();
}
