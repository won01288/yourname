// 결제(페이앱, CLAUDE.md 0.4) — 체크아웃 세션 생성. 페이앱 서버를 직접 호출하지 않는다(payapp.ts
// 참고 — JS SDK 방식이라 프론트가 직접 결제창을 연다). 여기서는 로컬 payment_order(pending)만
// 만들고, 프론트가 lite.js로 결제창을 여는 데 필요한 clientConfig를 돌려준다.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPaymentOrder, getPriceForCandidateCount } from "@/lib/db-payment";
import { CANDIDATE_COUNT_OPTIONS, type CandidateCount } from "@/lib/naming/config";
import { getAppBaseUrl } from "@/lib/payment/config";
import { getPaymentProvider } from "@/lib/payment/provider";

interface CheckoutRequestBody {
  candidateCount?: number;
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  let body: CheckoutRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바른 JSON이 아닙니다." }, { status: 400 });
  }

  if (
    typeof body.candidateCount !== "number" ||
    !(CANDIDATE_COUNT_OPTIONS as readonly number[]).includes(body.candidateCount)
  ) {
    return NextResponse.json(
      { error: `candidateCount는 ${CANDIDATE_COUNT_OPTIONS.join("/")} 중 하나여야 합니다.` },
      { status: 400 }
    );
  }
  const candidateCount = body.candidateCount as CandidateCount;

  const price = await getPriceForCandidateCount(candidateCount);
  if (price === null) {
    return NextResponse.json({ error: "가격 정보를 찾을 수 없습니다." }, { status: 500 });
  }

  const order = await createPaymentOrder(currentUser.id, candidateCount, price);

  const baseUrl = getAppBaseUrl();
  const provider = getPaymentProvider();
  const checkout = provider.buildCheckoutSession({
    order,
    goodName: `유어네임 프리미엄 작명 ${candidateCount}개`,
    feedbackUrl: `${baseUrl}/api/payment/webhook`,
    returnUrl: `${baseUrl}/naming?paymentReturn=1&orderId=${order.id}`,
  });

  return NextResponse.json({ orderId: order.id, amount: price, checkout });
}
