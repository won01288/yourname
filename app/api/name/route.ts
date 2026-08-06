// CLAUDE.md 8.2 — saju → db → naming 순서로 호출하는 파이프라인 조립 지점. 계산 로직 없음.
// LLM 호출(해설·큐레이션)은 후보가 확정된 뒤, 이 파이프라인 바깥에서만 붙인다 (CLAUDE.md 2.3, 5장 Phase 5).

import { NextResponse } from "next/server";
import { getSaju, type BirthInput } from "@/lib/saju";
import { getSurnameByHangul, getEligibleHanjaPool, getAllNumerology81, getGivenNamesByGender } from "@/lib/db";
import { aggregateElements } from "@/lib/naming/elements";
import { deriveYongsin } from "@/lib/naming/yongsin";
import { buildManseryeok } from "@/lib/naming/manseryeok";
import { buildCandidatesDetailed } from "@/lib/naming/candidates";
import { CANDIDATE_COUNT_OPTIONS, DEFAULT_CANDIDATE_COUNT, type CandidateCount } from "@/lib/naming/config";
import { explainCandidates } from "@/lib/llm/explain";
import { shuffleArray } from "@/app/lib/shuffle";
import type { Gender } from "@/lib/naming/types";
import { getCurrentUser, isAdminUser } from "@/lib/auth"; // isAdminUser는 ADMIN_FREE_TIER_CANDIDATE_COUNT 판정에만 쓴다(0.4).
import { saveNamingResult, resolveNamingSessionRootId, getNamingSessionResults } from "@/lib/db-auth";
import { claimPaymentOrder, linkPaymentOrderToNamingResult, revertPaymentOrderToPaid } from "@/lib/db-payment";
import { ADMIN_FREE_TIER_CANDIDATE_COUNT } from "@/lib/payment/config";
import type { NameApiResult } from "@/app/lib/name-client";

interface NameRequestBody extends BirthInput {
  surnameHangul: string;
  /** 같은 한글 성에 한자가 여럿일 때 특정 (예: "정" → 鄭/丁). 생략 시 여럿이면 400. */
  surnameHanja?: string;
  /** CLAUDE.md 3.6 확장 — 이름 후보 풀(given_name 테이블)을 성별에 맞게 고르는 데만 쓰인다.
   * 사주·용신 계산에는 영향을 주지 않는다. */
  gender: Gender;
  /** Phase 8 — 추천받을 이름 개수(3/5/10). 생략 시 DEFAULT_CANDIDATE_COUNT(5). */
  candidateCount?: number;
  /** 결제(CLAUDE.md 0.4) — candidateCount만큼 생성할 권리를 산 payment_order.id. 관리자 무료
   * 티어(ADMIN_FREE_TIER_CANDIDATE_COUNT, lib/payment/config.ts)가 아니면 필수. */
  orderId?: number;
  /** "같은 사주로 더 추천받기"(CLAUDE.md 0.6). 이 값을 그대로 신뢰하지 않고 소유권·세션 루트를
   * 서버가 재계산한다(resolveNamingSessionRootId). 생략하면 새 세션(최초 생성)으로 취급한다. */
  parentNamingResultId?: number;
}

function isValidBirthInput(body: Partial<NameRequestBody>): body is NameRequestBody {
  return (
    typeof body.year === "number" &&
    typeof body.month === "number" &&
    typeof body.day === "number" &&
    typeof body.hour === "number" &&
    typeof body.minute === "number" &&
    typeof body.isLunar === "boolean" &&
    typeof body.surnameHangul === "string" &&
    body.surnameHangul.length > 0 &&
    (body.gender === "M" || body.gender === "F") &&
    (body.candidateCount === undefined || (CANDIDATE_COUNT_OPTIONS as readonly number[]).includes(body.candidateCount)) &&
    (body.orderId === undefined || typeof body.orderId === "number") &&
    (body.parentNamingResultId === undefined || typeof body.parentNamingResultId === "number")
  );
}

export async function POST(request: Request) {
  // 로그인 베타 — 프리미엄 작명은 로그인 필수(무료 /score와 달리). 가장 비싼 단계(LLM 호출)는
  // 물론 DB 조회조차 하기 전에 막아, 미인증 요청이 어떤 비용도 유발하지 않게 한다. 클라이언트의
  // 사전 모달은 UX일 뿐이고, 이 401이 실제 보안 경계다.
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  let body: Partial<NameRequestBody>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바른 JSON이 아닙니다." }, { status: 400 });
  }

  if (!isValidBirthInput(body)) {
    return NextResponse.json(
      {
        error:
          "필수 필드가 누락되었습니다. year/month/day/hour/minute/isLunar/surnameHangul/gender(M 또는 F)를 확인하고, " +
          `candidateCount를 지정했다면 ${CANDIDATE_COUNT_OPTIONS.join("/")} 중 하나인지, orderId를 지정했다면 숫자인지 확인하세요.`,
      },
      { status: 400 }
    );
  }

  const candidateCount: CandidateCount = (body.candidateCount as CandidateCount | undefined) ?? DEFAULT_CANDIDATE_COUNT;
  // isAdminUser(currentUser)는 위 403 게이트를 통과했으므로 이 시점엔 항상 true다 — 게이트가
  // 나중에 풀려도 이 조건 자체는 계속 관리자에게만 적용되도록 명시적으로 다시 확인해 둔다.
  const isFreeAdminTier = isAdminUser(currentUser) && candidateCount === ADMIN_FREE_TIER_CANDIDATE_COUNT;

  const surnameOptions = await getSurnameByHangul(body.surnameHangul);
  if (surnameOptions.length === 0) {
    return NextResponse.json({ error: `등록되지 않은 성씨입니다: ${body.surnameHangul}` }, { status: 400 });
  }

  const surname = body.surnameHanja
    ? surnameOptions.find((s) => s.hanja === body.surnameHanja)
    : surnameOptions.length === 1
      ? surnameOptions[0]
      : undefined;

  if (!surname) {
    return NextResponse.json(
      {
        error: `성씨 "${body.surnameHangul}"에 해당하는 한자가 여럿입니다. surnameHanja로 특정해 주세요.`,
        options: surnameOptions.map((s) => s.hanja),
      },
      { status: 400 }
    );
  }

  // "같은 사주로 더 추천받기"(CLAUDE.md 0.6) — 무료로 재시도 가능한 검증(DB 읽기만 함)이라
  // 결제 소비(claimPaymentOrder) 이전에 끝낸다. parentNamingResultId를 그대로 신뢰하지 않고
  // 소유권·만료·세션 루트를 서버가 재계산한다.
  let sessionRootId: number | null = null;
  let excludeHangul: Set<string> | undefined;

  if (body.parentNamingResultId !== undefined) {
    sessionRootId = await resolveNamingSessionRootId(body.parentNamingResultId, currentUser.id);
    if (sessionRootId === null) {
      return NextResponse.json({ error: "더 추천받기 대상 결과를 찾을 수 없습니다." }, { status: 404 });
    }

    const sessionRows = await getNamingSessionResults(sessionRootId, currentUser.id);
    const rootRow = sessionRows.find((row) => row.id === sessionRootId);
    if (!rootRow) {
      // 루트 행이 30일 만료로 먼저 사라진 드문 경우 — 세션을 이어갈 근거(원본 입력값)가 없다.
      return NextResponse.json({ error: "더 추천받기 대상 결과를 찾을 수 없습니다." }, { status: 404 });
    }

    // 같은 사주 세션인지 정합성 확인 — 위저드에서 뒤로 가 입력을 바꾼 뒤 제출하는 드문 경우 방지.
    const rootPayload = JSON.parse(rootRow.requestPayload) as NameRequestBody;
    const sameSaju =
      rootPayload.year === body.year &&
      rootPayload.month === body.month &&
      rootPayload.day === body.day &&
      rootPayload.hour === body.hour &&
      rootPayload.minute === body.minute &&
      rootPayload.isLunar === body.isLunar &&
      (rootPayload.isLeapMonth ?? false) === (body.isLeapMonth ?? false) &&
      rootPayload.surnameHangul === body.surnameHangul &&
      rootPayload.gender === body.gender;
    if (!sameSaju) {
      return NextResponse.json({ error: "같은 사주로만 추가 추천을 받을 수 있습니다." }, { status: 400 });
    }

    excludeHangul = new Set(
      sessionRows.flatMap((row) => (JSON.parse(row.result) as NameApiResult).candidates.map((c) => c.hangul))
    );
  }

  // 결제(CLAUDE.md 0.4) — 무료로 재시도 가능한 입력 검증(성씨 등록 여부·한자 특정)은 전부 통과한
  // 뒤, 가장 비싼 단계(DB 풀 조회·LLM 호출) 진입 직전에만 결제를 소비한다. 이 주문이 이 유저·이
  // 개수로 결제 완료(paid) 상태인지 원자적으로 확인하며 동시에 소비 처리한다(claimPaymentOrder) —
  // 이미 소비됐거나, 다른 유저 소유이거나, 아직 결제 완료 웹훅이 도착하지 않았으면 실패한다.
  // isFreeAdminTier면 결제 자체를 건너뛴다(관리자 테스트 편의, 위 ADMIN_FREE_TIER_CANDIDATE_COUNT
  // 참고) — orderId도 요구하지 않는다.
  if (!isFreeAdminTier) {
    if (typeof body.orderId !== "number") {
      return NextResponse.json({ error: "orderId가 필요합니다." }, { status: 400 });
    }
    const claimed = await claimPaymentOrder(body.orderId, currentUser.id, candidateCount);
    if (!claimed) {
      return NextResponse.json(
        { error: "유효하지 않거나 이미 사용된 결제입니다.", code: "PAYMENT_REQUIRED" },
        { status: 402 }
      );
    }
  }

  const saju = await getSaju(body);
  const elementDistribution = aggregateElements(saju);
  const yongsinResult = deriveYongsin(saju, elementDistribution);
  const manseryeok = buildManseryeok(saju);

  const oppositeGender: Gender = body.gender === "M" ? "F" : "M";
  const [hanjaPool, numerologyTable, curatedGivenNames, oppositeGenderGivenNames] = await Promise.all([
    getEligibleHanjaPool(),
    getAllNumerology81(),
    getGivenNamesByGender(body.gender),
    getGivenNamesByGender(oppositeGender),
  ]);
  // CLAUDE.md 3.6.6(Phase 13) — 반대 성별 쪽에서 훨씬 더 흔한 이름을 후보에서 제외하기 위한
  // hangul → frequency 조회 맵.
  const oppositeGenderFrequency = new Map(oppositeGenderGivenNames.map((n) => [n.hangul, n.frequency]));

  const { candidates: builtCandidates, poolSize } = buildCandidatesDetailed({
    surnameStroke: surname.strokeOriginal,
    surnameElement: surname.initialElement,
    yongsin: yongsinResult.yongsin,
    distribution: elementDistribution,
    hanjaPool,
    numerologyTable,
    curatedGivenNames,
    candidateCount,
    oppositeGenderFrequency,
    excludeHangul,
  });

  // Phase 8 — 더 이상 점수순으로 표시하지 않는다(순위 폐지, CLAUDE.md 3.6). 점수 순서를 그대로
  // 노출하면 위치만으로 사실상 순위를 매긴 인상을 주고, 앞쪽 후보에 선택이 몰리는 편향이 생긴다.
  // 화면에 보여줄 순서만 무작위화하고, 이 순서를 LLM 해설·응답 양쪽에 동일하게 사용한다.
  const candidates = shuffleArray(builtCandidates);

  // "같은 사주로 더 추천받기"(CLAUDE.md 0.6) — 추가 라운드면 summary·사주풀이(sajuStory)를 다시
  // 생성하지 않는다. 이미 최초 라운드에서 한 번 보여준 해설이라 반복 생성이 무의미하고, LLM 비용도
  // 줄인다(lib/llm/explain.ts가 스키마 자체에서 두 필드를 뺀다).
  const isAdditionalRound = body.parentNamingResultId !== undefined;

  let report = null;
  if (candidates.length > 0) {
    try {
      report = await explainCandidates({
        saju,
        elementDistribution,
        yongsin: yongsinResult,
        manseryeok,
        surname,
        candidates,
        isAdditionalRound,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // 결제(CLAUDE.md 0.4) — LLM 호출 실패로 사용자가 결과를 못 받게 됐으니, 이미 소비 처리한
      // 주문을 paid로 되돌려 같은 orderId로 재시도할 수 있게 한다(재결제를 요구하지 않는다).
      // isFreeAdminTier면 애초에 소비한 결제가 없으므로 되돌릴 것도 없다.
      if (!isFreeAdminTier && typeof body.orderId === "number") {
        await revertPaymentOrderToPaid(body.orderId).catch((revertErr) => {
          console.error("결제 소비 되돌리기 실패:", revertErr);
        });
      }
      return NextResponse.json({ error: `해설 생성 중 오류가 발생했습니다: ${message}` }, { status: 502 });
    }
  }

  // "같은 사주로 더 추천받기"(CLAUDE.md 0.6) — 이번 라운드가 끝난 뒤에도 아직 받을 수 있는
  // 이름이 몇 개 남았는지를 생성 시점 스냅샷으로 저장한다. poolSize는 exclude(이미 이 세션에서
  // 나온 이름 제외) + 게이트(총점 90) 적용 후 전체 통과 풀 크기이므로, 이번에 실제로 뽑힌
  // candidates 개수를 빼면 "다음 라운드에 뽑을 수 있는 잔여 개수"가 된다.
  const moreAvailableCount = poolSize - candidates.length;

  const responseBody = {
    saju,
    elementDistribution,
    yongsin: yongsinResult,
    manseryeok,
    surname,
    candidates,
    report,
    moreAvailableCount,
    isAdditionalRound,
  };

  // best-effort 저장 — 이미 비용을 지불해 생성된 LLM 결과를 저장 실패 때문에 사용자가 못 받는
  // 일이 없도록, 저장이 실패해도 정상 응답은 그대로 반환한다(30일 재조회는 CLAUDE.md 신규 결정).
  let namingResultId: number | null = null;
  try {
    namingResultId = await saveNamingResult(currentUser.id, body, responseBody, sessionRootId);
    // 결제(CLAUDE.md 0.4) — best-effort. 실패해도 이미 생성된 결과 응답에는 영향 없다.
    // isFreeAdminTier면 연결할 실제 주문이 없으므로 건너뛴다.
    if (!isFreeAdminTier && typeof body.orderId === "number") {
      await linkPaymentOrderToNamingResult(body.orderId, namingResultId).catch((err) => {
        console.error("payment_order ↔ naming_result 연결 실패:", err);
      });
    }
  } catch (err) {
    console.error("naming_result 저장 실패:", err);
  }

  // namingResultId는 저장 성공 후에만 알 수 있어(닭-달걀 문제) DB에 저장되는 responseBody 자체에는
  // 포함하지 않고, 클라이언트로 보내는 최종 응답에만 스프레드로 추가한다.
  return NextResponse.json({ ...responseBody, namingResultId });
}
