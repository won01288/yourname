// 결제(페이앱, CLAUDE.md 0.4) — 체크아웃 세션 생성. 페이앱 서버를 직접 호출하지 않는다(payapp.ts
// 참고 — JS SDK 방식이라 프론트가 직접 결제창을 연다). 여기서는 로컬 payment_order(pending)만
// 만들고, 프론트가 lite.js로 결제창을 여는 데 필요한 clientConfig를 돌려준다.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPaymentOrder, getActiveDiscountCodeByCode, getPriceForCandidateCount } from "@/lib/db-payment";
import { CANDIDATE_COUNT_OPTIONS, type CandidateCount } from "@/lib/naming/config";
import { computeDiscountedAmount, getAppBaseUrl } from "@/lib/payment/config";
import { getPaymentProvider } from "@/lib/payment/provider";

interface CheckoutRequestBody {
  candidateCount?: number;
  /** 결제 시작 시점의 위저드 입력값(NameRequestPayload) — orderId는 아직 없어 빠져 있다. 모바일
   * 풀리다이렉트 복귀 시 sessionStorage 유실에 대비해 서버에도 스냅샷으로 저장해둔다(2026.8.5).
   * 이 값은 화면 복원 편의용일 뿐 실제 작명 계산에는 쓰이지 않으므로 깊은 검증 없이 그대로
   * 직렬화한다 — 최종 제출은 어차피 app/api/name/route.ts가 다시 검증한다. */
  payload?: unknown;
  /** 결제 모달에서 "적용"한 할인코드(2026.8.7). 클라이언트가 미리 계산한 할인가는 신뢰하지 않고,
   * 여기서 이 코드를 다시 조회해 서버가 독립적으로 재계산한다 — /validate 응답 조작으로 가격을
   * 낮추는 시도를 막기 위함. */
  discountCode?: string;
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

  let amount = price;
  let discountSnapshot: { code: string; percent: number; originalAmount: number } | null = null;
  if (typeof body.discountCode === "string" && body.discountCode.trim() !== "") {
    const discount = await getActiveDiscountCodeByCode(body.discountCode);
    if (!discount) {
      return NextResponse.json({ error: "유효하지 않거나 만료된 할인코드입니다." }, { status: 400 });
    }
    amount = computeDiscountedAmount(price, discount.discountPercent);
    discountSnapshot = { code: discount.code, percent: discount.discountPercent, originalAmount: price };
  }

  const pendingPayload =
    body.payload && typeof body.payload === "object" ? JSON.stringify(body.payload) : null;
  const order = await createPaymentOrder(currentUser.id, candidateCount, amount, pendingPayload, discountSnapshot);

  const baseUrl = getAppBaseUrl();
  const provider = getPaymentProvider();
  const checkout = provider.buildCheckoutSession({
    order,
    goodName: `유어네임 프리미엄 작명 ${candidateCount}개`,
    feedbackUrl: `${baseUrl}/api/payment/webhook`,
    returnUrl: `${baseUrl}/naming?paymentReturn=1&orderId=${order.id}`,
  });

  return NextResponse.json({ orderId: order.id, amount, checkout });
}
