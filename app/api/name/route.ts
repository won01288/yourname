// CLAUDE.md 8.2 — saju → db → naming 순서로 호출하는 파이프라인 조립 지점. 계산 로직 없음.
// LLM 호출(해설·큐레이션)은 후보가 확정된 뒤, 이 파이프라인 바깥에서만 붙인다 (CLAUDE.md 2.3, 5장 Phase 5).

import { NextResponse } from "next/server";
import { getSaju, type BirthInput } from "@/lib/saju";
import { getSurnameByHangul, getEligibleHanjaPool, getAllNumerology81, getGivenNamesByGender } from "@/lib/db";
import { aggregateElements } from "@/lib/naming/elements";
import { deriveYongsin } from "@/lib/naming/yongsin";
import { buildManseryeok } from "@/lib/naming/manseryeok";
import { buildCandidates } from "@/lib/naming/candidates";
import { CANDIDATE_COUNT_OPTIONS, DEFAULT_CANDIDATE_COUNT, type CandidateCount } from "@/lib/naming/config";
import { explainCandidates } from "@/lib/llm/explain";
import { shuffleArray } from "@/app/lib/shuffle";
import type { Gender } from "@/lib/naming/types";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { saveNamingResult } from "@/lib/db-auth";
import { claimPaymentOrder, linkPaymentOrderToNamingResult, revertPaymentOrderToPaid } from "@/lib/db-payment";

interface NameRequestBody extends BirthInput {
  surnameHangul: string;
  /** 같은 한글 성에 한자가 여럿일 때 특정 (예: "정" → 鄭/丁). 생략 시 여럿이면 400. */
  surnameHanja?: string;
  /** CLAUDE.md 3.6 확장 — 이름 후보 풀(given_name 테이블)을 성별에 맞게 고르는 데만 쓰인다.
   * 사주·용신 계산에는 영향을 주지 않는다. */
  gender: Gender;
  /** Phase 8 — 추천받을 이름 개수(3/5/10). 생략 시 DEFAULT_CANDIDATE_COUNT(5). */
  candidateCount?: number;
  /** 결제(CLAUDE.md 0.4) — candidateCount만큼 생성할 권리를 산 payment_order.id. 필수. */
  orderId: number;
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
    typeof body.orderId === "number"
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

  // 정식 출시 전 임시 게이트 — app/naming/page.tsx의 화면 차단과 별개로, API 자체도 관리자가
  // 아니면 막는다(직접 호출로 화면 차단을 우회하지 못하게).
  if (!isAdminUser(currentUser)) {
    return NextResponse.json(
      { error: "프리미엄 작명은 서비스 준비 중입니다.", code: "SERVICE_NOT_READY" },
      { status: 403 }
    );
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
          "필수 필드가 누락되었습니다. year/month/day/hour/minute/isLunar/surnameHangul/gender(M 또는 F)/orderId를 확인하고, " +
          `candidateCount를 지정했다면 ${CANDIDATE_COUNT_OPTIONS.join("/")} 중 하나인지 확인하세요.`,
      },
      { status: 400 }
    );
  }

  const candidateCount: CandidateCount = (body.candidateCount as CandidateCount | undefined) ?? DEFAULT_CANDIDATE_COUNT;

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

  // 결제(CLAUDE.md 0.4) — 무료로 재시도 가능한 입력 검증(성씨 등록 여부·한자 특정)은 전부 통과한
  // 뒤, 가장 비싼 단계(DB 풀 조회·LLM 호출) 진입 직전에만 결제를 소비한다. 이 주문이 이 유저·이
  // 개수로 결제 완료(paid) 상태인지 원자적으로 확인하며 동시에 소비 처리한다(claimPaymentOrder) —
  // 이미 소비됐거나, 다른 유저 소유이거나, 아직 결제 완료 웹훅이 도착하지 않았으면 실패한다.
  const claimed = await claimPaymentOrder(body.orderId, currentUser.id, candidateCount);
  if (!claimed) {
    return NextResponse.json(
      { error: "유효하지 않거나 이미 사용된 결제입니다.", code: "PAYMENT_REQUIRED" },
      { status: 402 }
    );
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

  const builtCandidates = buildCandidates({
    surnameStroke: surname.strokeOriginal,
    surnameElement: surname.initialElement,
    yongsin: yongsinResult.yongsin,
    distribution: elementDistribution,
    hanjaPool,
    numerologyTable,
    curatedGivenNames,
    candidateCount,
    oppositeGenderFrequency,
  });

  // Phase 8 — 더 이상 점수순으로 표시하지 않는다(순위 폐지, CLAUDE.md 3.6). 점수 순서를 그대로
  // 노출하면 위치만으로 사실상 순위를 매긴 인상을 주고, 앞쪽 후보에 선택이 몰리는 편향이 생긴다.
  // 화면에 보여줄 순서만 무작위화하고, 이 순서를 LLM 해설·응답 양쪽에 동일하게 사용한다.
  const candidates = shuffleArray(builtCandidates);

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
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // 결제(CLAUDE.md 0.4) — LLM 호출 실패로 사용자가 결과를 못 받게 됐으니, 이미 소비 처리한
      // 주문을 paid로 되돌려 같은 orderId로 재시도할 수 있게 한다(재결제를 요구하지 않는다).
      await revertPaymentOrderToPaid(body.orderId).catch((revertErr) => {
        console.error("결제 소비 되돌리기 실패:", revertErr);
      });
      return NextResponse.json({ error: `해설 생성 중 오류가 발생했습니다: ${message}` }, { status: 502 });
    }
  }

  const responseBody = {
    saju,
    elementDistribution,
    yongsin: yongsinResult,
    manseryeok,
    surname,
    candidates,
    report,
  };

  // best-effort 저장 — 이미 비용을 지불해 생성된 LLM 결과를 저장 실패 때문에 사용자가 못 받는
  // 일이 없도록, 저장이 실패해도 정상 응답은 그대로 반환한다(30일 재조회는 CLAUDE.md 신규 결정).
  try {
    const namingResultId = await saveNamingResult(currentUser.id, body, responseBody);
    // 결제(CLAUDE.md 0.4) — best-effort. 실패해도 이미 생성된 결과 응답에는 영향 없다.
    await linkPaymentOrderToNamingResult(body.orderId, namingResultId).catch((err) => {
      console.error("payment_order ↔ naming_result 연결 실패:", err);
    });
  } catch (err) {
    console.error("naming_result 저장 실패:", err);
  }

  return NextResponse.json(responseBody);
}
