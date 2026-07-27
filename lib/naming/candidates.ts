// CLAUDE.md 8.2 — Phase 4/6: 용신 + 성씨 제약으로 이름 후보를 만든다. 순수 함수만. 외부 import 금지.
// 규칙 근거: CLAUDE.md 3.1(발음오행)·3.2(원획)·3.3(용신)·3.4(음양)·3.5(자원오행)·3.6(후보 생성), 4.3(81수리).
// DB 조회는 db.ts가 하고, 여기서는 이미 조회된 데이터(한자 풀, 81수리표, 이름 후보 풀)만 받아
// 필터·점수화한다.
//
// Phase 6 확정(3.6 확장, 2026.7.26) — 이름(hangul) 후보는 자유 조합이 아니라 사용자가 제공한
// etc/korean_name.xlsx(성별별 실사용 이름 표)의 A열에 있는 이름만 후보로 삼는다. 한자 자유 조합
// 방식은 "존재하지 않는 이름"을 만들어낼 위험이 있었다(예: 塌刃). curatedGivenNames를 순회하며
// 그 이름의 두 음절에 대해 발음오행 하드 필터를 먼저 걸고, 통과한 이름에 한해서만 실제 한자
// 조합(원획·수리·자원오행)을 찾는다.

import type { Element, Hanja, Numerology81, Candidate, CandidateHighlight, GivenNameEntry } from "./types";
import {
  SANGSAENG_ORDER,
  GIVEN_NAME_LENGTH,
  CANDIDATE_SCORE_WEIGHTS,
  CANDIDATE_DIVERSITY,
  SIMILAR_NAME_MAX_JAMO_MISMATCH,
} from "./config";
import { getElementForSyllable, isPhoneticSangsaeng } from "./phonetic";
import { calcSagyeok, isAuspiciousNumber, type Sagyeok } from "./numerology";
import { isYinYangBalanced } from "./score";
import { isSimilarName } from "./similarity";

function nextElement(element: Element): Element {
  const index = SANGSAENG_ORDER.indexOf(element);
  return SANGSAENG_ORDER[(index + 1) % SANGSAENG_ORDER.length];
}

// 성 초성 오행 → 이름 각 글자에 요구되는 발음오행. 순방향 상생만 길로 보므로(phonetic.ts),
// 성의 오행이 정해지면 이름 글자별 요구 오행은 유일하게 하나로 정해진다.
export function requiredPhoneticElements(surnameElement: Element, nameLength: number): Element[] {
  const result: Element[] = [];
  let current = surnameElement;
  for (let i = 0; i < nameLength; i++) {
    current = nextElement(current);
    result.push(current);
  }
  return result;
}

// 한자 풀을 대표음(readings[0]) 글자 그대로 색인한다 — curatedGivenNames의 각 음절이 실제로
// 어떤 한자로 표기될 수 있는지 찾는 용도. 대표음이 없는 한자는 색인하지 않는다.
function groupBySyllable(pool: Hanja[]): Map<string, Hanja[]> {
  const map = new Map<string, Hanja[]>();
  for (const hanja of pool) {
    const syllable = hanja.readings[0];
    if (!syllable) continue;
    const bucket = map.get(syllable);
    if (bucket) bucket.push(hanja);
    else map.set(syllable, [hanja]);
  }
  return map;
}

// 자원오행이 용신과 일치하는 한자 수를 센다. element가 NULL이면 이 기준을 건너뛴다
// (CLAUDE.md 3.5 — 불일치로 취급하지 않고, "이 기준으로는 판단하지 않음"으로 취급).
function countWonhaengMatches(hanjaList: Hanja[], yongsin: Element[]): number {
  return hanjaList.filter((h) => h.element !== null && yongsin.includes(h.element)).length;
}

// 교육용 기초한자(hanja.isCommon)인 글자 수를 센다 (CLAUDE.md 3.6 — "생소한 한자" 억제용 가산점).
function countCommonHanja(hanjaList: Hanja[]): number {
  return hanjaList.filter((h) => h.isCommon).length;
}

// 이름 두 글자 원획 합. 점수 동점자 사이의 마지막 정렬 키로만 쓴다(뜻 판단이 아니라 순수 수치 비교).
function totalGivenNameStroke(candidate: Candidate): number {
  return candidate.hanja.reduce((sum, h) => sum + h.strokeOriginal, 0);
}

// 4격(원형이정) 조합을 문자열 키로 — 같은 획수쌍에서 나온 후보인지 구분하는 용도.
function numerologyBucketKey(candidate: Candidate): string {
  return candidate.numerologyNumbers.join(",");
}

interface Realization {
  h1: Hanja;
  h2: Hanja;
  sagyeok: Sagyeok;
  score: number;
}

// 정해진 두 음절(listA×listB)에서, 4격 하드 필터를 통과하는 조합 중 점수가 가장 높은 하나를 고른다.
// 같은 이름(hangul)에 대해 여러 한자 조합이 나올 수 있어(예: "민"=民/旻/珉…), 하나의 후보로
// 대표시키기 위해 최고점 한 조합만 남긴다 — 그래야 이 함수를 호출하는 쪽에서 이름별 중복이 생기지 않는다.
function bestRealization(
  listA: Hanja[],
  listB: Hanja[],
  surnameStroke: number,
  yongsin: Element[],
  numerologyTable: Map<number, Numerology81>
): Realization | null {
  let best: Realization | null = null;

  for (const h1 of listA) {
    for (const h2 of listB) {
      if (h1.char === h2.char) continue; // 이름 두 글자가 같은 한자인 조합은 제외.

      const sagyeok = calcSagyeok(surnameStroke, [h1.strokeOriginal, h2.strokeOriginal]);
      const allAuspicious = [sagyeok.won, sagyeok.hyeong, sagyeok.i, sagyeok.jeong].every((n) =>
        isAuspiciousNumber(numerologyTable.get(n)?.fortune ?? "")
      );
      if (!allAuspicious) continue;

      const balanced = isYinYangBalanced([surnameStroke, h1.strokeOriginal, h2.strokeOriginal]);
      const wonhaengMatches = countWonhaengMatches([h1, h2], yongsin);
      const commonMatches = countCommonHanja([h1, h2]);
      const score =
        wonhaengMatches * CANDIDATE_SCORE_WEIGHTS.wonhaengMatch +
        commonMatches * CANDIDATE_SCORE_WEIGHTS.commonHanja +
        (balanced ? CANDIDATE_SCORE_WEIGHTS.yinYangBalanced : 0);

      if (!best || score > best.score) {
        best = { h1, h2, sagyeok, score };
      }
    }
  }

  return best;
}

// 점수순으로 정렬된 후보 목록에서, 주어진 완화 단계(maxCharReuse·maxPerNumerologyBucket·avoidSimilar)
// 제약을 지키며 앞에서부터 그리디로 count개를 고른다. 발음(hangul) 중복은 이 함수 안에서 항상
// 금지한다(완화 단계와 무관 — 이제 candidate 하나당 curatedGivenNames의 서로 다른 이름 하나씩만
// 대응하므로 원칙적으로 이미 유일하지만, 안전장치로 유지한다).
function pickWithLimits(
  sorted: Array<{ candidate: Candidate; score: number }>,
  count: number,
  stage: { maxCharReuse: number; maxPerNumerologyBucket: number; avoidSimilar: boolean }
): Candidate[] {
  const picked: Candidate[] = [];
  const usedHangul = new Set<string>();
  const firstCharCount = new Map<string, number>();
  const secondCharCount = new Map<string, number>();
  const bucketCount = new Map<string, number>();

  for (const { candidate } of sorted) {
    if (picked.length >= count) break;
    if (usedHangul.has(candidate.hangul)) continue;

    // CLAUDE.md 3.6(Phase 8) — 이미 뽑힌 후보와 자모 단위로 너무 비슷한 이름(예: 규리/규린/규나)은
    // 이 단계에서 건너뛴다. 완전 차단이 아니라 완화 단계별로 켜고 끄는 소프트 필터다.
    if (
      stage.avoidSimilar &&
      picked.some((p) => isSimilarName(p.hangul, candidate.hangul, SIMILAR_NAME_MAX_JAMO_MISMATCH))
    ) {
      continue;
    }

    const [firstChar, secondChar] = candidate.hanja.map((h) => h.char);
    const bucketKey = numerologyBucketKey(candidate);

    if ((firstCharCount.get(firstChar) ?? 0) >= stage.maxCharReuse) continue;
    if ((secondCharCount.get(secondChar) ?? 0) >= stage.maxCharReuse) continue;
    if ((bucketCount.get(bucketKey) ?? 0) >= stage.maxPerNumerologyBucket) continue;

    picked.push(candidate);
    usedHangul.add(candidate.hangul);
    firstCharCount.set(firstChar, (firstCharCount.get(firstChar) ?? 0) + 1);
    secondCharCount.set(secondChar, (secondCharCount.get(secondChar) ?? 0) + 1);
    bucketCount.set(bucketKey, (bucketCount.get(bucketKey) ?? 0) + 1);
  }

  return picked;
}

// CLAUDE.md 3.6 — 점수만으로는 동점이 흔해, 그대로 slice하면 특정 글자만 반복되는 등 다양성이
// 떨어진다. CANDIDATE_DIVERSITY의 완화 단계를 앞에서부터 시도해 count를 채우는 첫 단계를 채택하고,
// 끝까지 못 채우면 그중 가장 많이 채운 단계를 반환한다(부족한 채로라도 다양성이 가장 큰 결과를 우선).
export function selectDiverseCandidates(
  scored: Array<{ candidate: Candidate; score: number }>,
  count: number
): Candidate[] {
  let best: Candidate[] = [];
  for (const stage of CANDIDATE_DIVERSITY.stages) {
    const picked = pickWithLimits(scored, count, stage);
    if (picked.length > best.length) best = picked;
    if (picked.length >= count) return picked;
  }
  return best;
}

export interface BuildCandidatesInput {
  surnameStroke: number;
  surnameElement: Element;
  yongsin: Element[];
  /** 인명용 & 불용문자 아님으로 이미 필터링된 한자 풀 (db.ts getEligibleHanjaPool). */
  hanjaPool: Hanja[];
  /** 1~81 전체 (db.ts getAllNumerology81). */
  numerologyTable: Map<number, Numerology81>;
  /** 성별에 맞는 실사용 이름(한글) 후보 풀 전체 (db.ts getGivenNamesByGender). 이 목록에 있는
   * 이름만 후보로 나올 수 있다 — 한자 자유 조합은 하지 않는다 (CLAUDE.md 3.6 확장). */
  curatedGivenNames: GivenNameEntry[];
  /** 최종 반환할 후보 개수. 3/5/10 중 사용자가 선택한다 (config.ts CANDIDATE_COUNT_OPTIONS, Phase 8). */
  candidateCount: number;
}

// 배열의 중앙값(짝수 개면 아래쪽 값). highlights의 "실사용 빈도 상위권" 판정 기준으로 쓴다.
function medianOf(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

// CLAUDE.md 3.6(Phase 8) — 순위 대신 각 후보의 강점을 보여주기 위한 태그. 전부 이미 계산된 사실의
// 조회/집계일 뿐 새 판정이 아니다(2.1). 앞의 두 항목(발음오행 상생·수리사격 길격)은 buildCandidates의
// 하드 필터를 통과한 모든 후보가 공통으로 만족하는 사실이라 항상 포함하고, 나머지는 후보마다 다른
// 값이 있을 때만 조건부로 추가한다.
function buildHighlights(
  candidate: Candidate,
  surnameStroke: number,
  yongsin: Element[],
  medianFrequencyInBatch: number
): CandidateHighlight[] {
  const highlights: CandidateHighlight[] = [
    { key: "phoneticFlow", label: "성과 이름의 발음오행이 처음부터 끝까지 상생으로 흐름" },
    { key: "numerology", label: "수리사격(원형이정) 4격이 모두 길격" },
  ];

  const wonhaengCount = countWonhaengMatches(candidate.hanja, yongsin);
  if (wonhaengCount === 2) {
    highlights.push({ key: "wonhaeng", label: "이름 두 글자 모두 자원오행이 용신과 일치" });
  } else if (wonhaengCount === 1) {
    highlights.push({ key: "wonhaeng", label: "이름 한 글자의 자원오행이 용신과 일치" });
  }

  if (countCommonHanja(candidate.hanja) === 2) {
    highlights.push({ key: "common", label: "두 글자 모두 교육용 기초한자로 친숙함" });
  }

  if (isYinYangBalanced([surnameStroke, ...candidate.hanja.map((h) => h.strokeOriginal)])) {
    highlights.push({ key: "yinYang", label: "획수의 음양 배열이 한쪽으로 쏠리지 않고 균형을 이룸" });
  }

  if (candidate.frequency >= medianFrequencyInBatch) {
    highlights.push({ key: "frequency", label: "실사용 빈도가 이번 추천 후보 중 상위권" });
  }

  return highlights;
}

// 용신 + 성씨 제약으로 이름 후보를 생성해 점수순 상위 candidateCount개를 반환한다.
// 이름(hangul) 자체는 curatedGivenNames에 있는 것만 쓴다. 하드 필터: 발음오행 순방향 상생(3.1)
// + 4격 전부 길수(3.6). 가산점: 자원오행 일치(3.5) + 친숙한 한자(3.6) + 음양 균형(3.4).
// 동점자는 이름의 실사용 빈도(frequency)가 높은 쪽을 우선한다.
export function buildCandidates(input: BuildCandidatesInput): Candidate[] {
  const { surnameStroke, surnameElement, yongsin, hanjaPool, numerologyTable, curatedGivenNames, candidateCount } =
    input;

  const requiredElements = requiredPhoneticElements(surnameElement, GIVEN_NAME_LENGTH);
  const phoneticElements = [surnameElement, ...requiredElements];
  if (!isPhoneticSangsaeng(phoneticElements)) {
    // requiredPhoneticElements가 항상 순방향 상생이 되도록 구성하므로 이 분기는 도달하지 않는다.
    // (isPhoneticSangsaeng을 실제로 사용해 두 함수의 일관성을 테스트로 고정하기 위한 안전장치.)
    return [];
  }

  const syllableIndex = groupBySyllable(hanjaPool);
  const scored: Array<{ candidate: Candidate; score: number }> = [];

  for (const entry of curatedGivenNames) {
    if (entry.hangul.length !== GIVEN_NAME_LENGTH) continue; // 방어적 — 데이터 계층에서 이미 걸러짐.

    const syllables = Array.from(entry.hangul);
    let syllableElements: Element[];
    try {
      syllableElements = syllables.map((s) => getElementForSyllable(s));
    } catch {
      continue; // 한글 완성형 음절이 아닌 값이 섞여 있으면 건너뛴다 (판정 불가).
    }

    const matchesRequired = syllableElements.every((el, i) => el === requiredElements[i]);
    if (!matchesRequired) continue;

    const listA = syllableIndex.get(syllables[0]) ?? [];
    const listB = syllableIndex.get(syllables[1]) ?? [];
    if (listA.length === 0 || listB.length === 0) continue;

    const realization = bestRealization(listA, listB, surnameStroke, yongsin, numerologyTable);
    if (!realization) continue;

    scored.push({
      candidate: {
        hanja: [realization.h1, realization.h2],
        hangul: entry.hangul,
        numerologyNumbers: [
          realization.sagyeok.won,
          realization.sagyeok.hyeong,
          realization.sagyeok.i,
          realization.sagyeok.jeong,
        ],
        phoneticElements,
        frequency: entry.frequency,
        highlights: [], // 최종 다양성 선택 뒤(medianFrequency 계산 후) buildHighlights로 채운다.
      },
      score: realization.score,
    });
  }

  // 점수 동점자는 실사용 빈도가 높은 이름을 앞세우고, 그마저 같으면 원획 합이 작은 쪽을 앞세운다
  // (둘 다 뜻 판단이 아니라 이미 주어진 수치 비교). curatedGivenNames 안에서는 이름(hangul)마다
  // bestRealization으로 이미 하나씩만 남겼으므로 발음 중복은 구조적으로 생기지 않지만,
  // selectDiverseCandidates의 글자·수리조합 다양성 제약은 그대로 적용한다.
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      b.candidate.frequency - a.candidate.frequency ||
      totalGivenNameStroke(a.candidate) - totalGivenNameStroke(b.candidate)
  );
  const picked = selectDiverseCandidates(scored, candidateCount);

  // CLAUDE.md 3.6(Phase 8) — 순위 대신 각 후보의 강점을 부각한다. "실사용 빈도 상위권" 판정은 이번에
  // 실제로 반환되는 후보들끼리 비교해야 의미가 있으므로(다른 회차 결과와 비교하는 값이 아니다),
  // 최종 선택이 끝난 뒤 이 배치 안에서 중앙값을 계산한다.
  const medianFrequencyInBatch = medianOf(picked.map((c) => c.frequency));
  return picked.map((candidate) => ({
    ...candidate,
    highlights: buildHighlights(candidate, surnameStroke, yongsin, medianFrequencyInBatch),
  }));
}
