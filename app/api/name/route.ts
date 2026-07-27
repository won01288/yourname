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

interface NameRequestBody extends BirthInput {
  surnameHangul: string;
  /** 같은 한글 성에 한자가 여럿일 때 특정 (예: "정" → 鄭/丁). 생략 시 여럿이면 400. */
  surnameHanja?: string;
  /** CLAUDE.md 3.6 확장 — 이름 후보 풀(given_name 테이블)을 성별에 맞게 고르는 데만 쓰인다.
   * 사주·용신 계산에는 영향을 주지 않는다. */
  gender: Gender;
  /** Phase 8 — 추천받을 이름 개수(3/5/10). 생략 시 DEFAULT_CANDIDATE_COUNT(5). */
  candidateCount?: number;
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
    (body.candidateCount === undefined || (CANDIDATE_COUNT_OPTIONS as readonly number[]).includes(body.candidateCount))
  );
}

export async function POST(request: Request) {
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

  const saju = await getSaju(body);
  const elementDistribution = aggregateElements(saju);
  const yongsinResult = deriveYongsin(saju, elementDistribution);
  const manseryeok = buildManseryeok(saju);

  const [hanjaPool, numerologyTable, curatedGivenNames] = await Promise.all([
    getEligibleHanjaPool(),
    getAllNumerology81(),
    getGivenNamesByGender(body.gender),
  ]);

  const builtCandidates = buildCandidates({
    surnameStroke: surname.strokeOriginal,
    surnameElement: surname.initialElement,
    yongsin: yongsinResult.yongsin,
    hanjaPool,
    numerologyTable,
    curatedGivenNames,
    candidateCount,
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
      return NextResponse.json({ error: `해설 생성 중 오류가 발생했습니다: ${message}` }, { status: 502 });
    }
  }

  return NextResponse.json({
    saju,
    elementDistribution,
    yongsin: yongsinResult,
    manseryeok,
    surname,
    candidates,
    report,
  });
}
