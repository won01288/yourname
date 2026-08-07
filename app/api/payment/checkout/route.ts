// 결제(페이앱, CLAUDE.md 0.4) — 체크아웃 세션 생성. 페이앱 서버를 직접 호출하지 않는다(payapp.ts
// 참고 — JS SDK 방식이라 프론트가 직접 결제창을 연다). 여기서는 로컬 payment_order(pending)만
// 만들고, 프론트가 lite.js로 결제창을 여는 데 필요한 clientConfig를 돌려준다.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { resolveNamingSessionRootId } from "@/lib/db-auth";
import { createPaymentOrder, getActiveDiscountCodeByCode, getPriceForCandidateCount } from "@/lib/db-payment";
import { CANDIDATE_COUNT_OPTIONS, type CandidateCount } from "@/lib/naming/config";
import {
  computeDiscountedAmount,
  computeMorePrice,
  getAppBaseUrl,
  MORE_CANDIDATE_COUNT_MAX,
  MORE_CANDIDATE_COUNT_MIN,
} from "@/lib/payment/config";
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

  // "같은 사주로 더 추천받기"(CLAUDE.md 0.6, Phase 20) — payload에 parentNamingResultId가 있으면
  // 이 체크아웃은 3/5/10 세트가 아니라 1~10개 자유 선택 + 이름당 정액(1,100원) 요금이다. 클라이언트
  // 주장을 그대로 믿지 않고 app/api/name/route.ts와 동일하게 소유권·세션 루트를 서버가 다시
  // 확인한다 — 그래야 아무 값이나 넣어 더 싼 정액제로 최초 결제를 위장할 수 없다.
  const rawPayload = body.payload && typeof body.payload === "object" ? (body.payload as Record<string, unknown>) : null;
  const parentNamingResultId =
    rawPayload && typeof rawPayload.parentNamingResultId === "number" ? rawPayload.parentNamingResultId : undefined;

  let candidateCount: CandidateCount;
  let price: number;

  if (parentNamingResultId !== undefined) {
    if (
      typeof body.candidateCount !== "number" ||
      !Number.isInteger(body.candidateCount) ||
      body.candidateCount < MORE_CANDIDATE_COUNT_MIN ||
      body.candidateCount > MORE_CANDIDATE_COUNT_MAX
    ) {
      return NextResponse.json(
        { error: `candidateCount는 ${MORE_CANDIDATE_COUNT_MIN}~${MORE_CANDIDATE_COUNT_MAX} 사이의 정수여야 합니다.` },
        { status: 400 }
      );
    }
    candidateCount = body.candidateCount as CandidateCount;

    const sessionRootId = await resolveNamingSessionRootId(parentNamingResultId, currentUser.id);
    if (sessionRootId === null) {
      return NextResponse.json({ error: "더 추천받기 대상 결과를 찾을 수 없습니다." }, { status: 404 });
    }

    price = computeMorePrice(candidateCount);
  } else {
    if (
      typeof body.candidateCount !== "number" ||
      !(CANDIDATE_COUNT_OPTIONS as readonly number[]).includes(body.candidateCount)
    ) {
      return NextResponse.json(
        { error: `candidateCount는 ${CANDIDATE_COUNT_OPTIONS.join("/")} 중 하나여야 합니다.` },
        { status: 400 }
      );
    }
    candidateCount = body.candidateCount as CandidateCount;

    const tierPrice = await getPriceForCandidateCount(candidateCount);
    if (tierPrice === null) {
      return NextResponse.json({ error: "가격 정보를 찾을 수 없습니다." }, { status: 500 });
    }
    price = tierPrice;
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
    goodName:
      parentNamingResultId !== undefined
        ? `유어네임 이름 더 추천받기 ${candidateCount}개`
        : `유어네임 프리미엄 작명 ${candidateCount}개`,
    feedbackUrl: `${baseUrl}/api/payment/webhook`,
    returnUrl: `${baseUrl}/naming?paymentReturn=1&orderId=${order.id}`,
  });

  return NextResponse.json({ orderId: order.id, amount, checkout });
}
