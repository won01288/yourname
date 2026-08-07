// 할인코드(CLAUDE.md 0.4 연장, 2026.8.7) — 결제 모달에서 "적용" 버튼을 눌렀을 때 즉시 할인가를
// 미리 보여주기 위한 조회 전용 라우트. 여기서 반환하는 discountedAmount는 화면 표시용일 뿐이고,
// 실제 결제 금액은 app/api/payment/checkout/route.ts가 이 코드를 다시 조회해 독립적으로
// 재계산한다(클라이언트가 보낸 값을 신뢰하지 않는다).

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { resolveNamingSessionRootId } from "@/lib/db-auth";
import { getActiveDiscountCodeByCode, getPriceForCandidateCount } from "@/lib/db-payment";
import { CANDIDATE_COUNT_OPTIONS, type CandidateCount } from "@/lib/naming/config";
import {
  computeDiscountedAmount,
  computeMorePrice,
  MORE_CANDIDATE_COUNT_MAX,
  MORE_CANDIDATE_COUNT_MIN,
} from "@/lib/payment/config";

interface ValidateRequestBody {
  code?: string;
  candidateCount?: number;
  /** "같은 사주로 더 추천받기"(CLAUDE.md 0.6, Phase 20) — 있으면 미리보기 가격도 체크아웃과 동일하게
   * 1~10개 자유 선택 + 정액(1,100원/개) 기준으로 계산한다. app/api/payment/checkout/route.ts와
   * 동일하게 서버가 소유권을 다시 확인한다. */
  parentNamingResultId?: number;
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  let body: ValidateRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바른 JSON이 아닙니다." }, { status: 400 });
  }

  if (typeof body.code !== "string" || body.code.trim() === "") {
    return NextResponse.json({ error: "할인코드를 입력해 주세요." }, { status: 400 });
  }
  let candidateCount: CandidateCount;
  let originalAmount: number;

  if (typeof body.parentNamingResultId === "number") {
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

    const sessionRootId = await resolveNamingSessionRootId(body.parentNamingResultId, currentUser.id);
    if (sessionRootId === null) {
      return NextResponse.json({ error: "더 추천받기 대상 결과를 찾을 수 없습니다." }, { status: 404 });
    }

    originalAmount = computeMorePrice(candidateCount);
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
    originalAmount = tierPrice;
  }

  const discount = await getActiveDiscountCodeByCode(body.code);
  if (!discount) {
    return NextResponse.json({ valid: false, error: "유효하지 않거나 만료된 할인코드입니다." }, { status: 200 });
  }

  const discountedAmount = computeDiscountedAmount(originalAmount, discount.discountPercent);

  return NextResponse.json({
    valid: true,
    code: discount.code,
    discountPercent: discount.discountPercent,
    originalAmount,
    discountedAmount,
  });
}
