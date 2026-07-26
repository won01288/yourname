// CLAUDE.md 8.2 — Phase 4: 용신 + 성씨 제약으로 이름 후보 조합을 생성한다. 순수 함수만. 외부 import 금지.
// 규칙 근거: CLAUDE.md 3.1(발음오행)·3.2(원획)·3.3(용신)·3.4(음양)·3.5(자원오행)·3.6(후보 생성), 4.3(81수리).
// DB 조회는 db.ts가 하고, 여기서는 이미 조회된 데이터(한자 풀, 81수리표)만 받아 조합·필터·점수화한다.

import type { Element, Hanja, Numerology81, Candidate } from "./types";
import {
  SANGSAENG_ORDER,
  GIVEN_NAME_LENGTH,
  CANDIDATE_COUNT,
  CANDIDATE_SCORE_WEIGHTS,
  CANDIDATE_DIVERSITY,
} from "./config";
import { getElementForSyllable, isPhoneticSangsaeng } from "./phonetic";
import { calcSagyeok, isAuspiciousNumber } from "./numerology";

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

// 한자 풀을 대표음(readings[0])의 초성 오행 기준으로 5개 그룹으로 나눈다.
// 대표음이 없는 한자는 발음오행을 판정할 수 없어 후보 생성에서 제외한다.
export function groupByPhoneticElement(pool: Hanja[]): Record<Element, Hanja[]> {
  const groups: Record<Element, Hanja[]> = { 木: [], 火: [], 土: [], 金: [], 水: [] };
  for (const hanja of pool) {
    const primaryReading = hanja.readings[0];
    if (!primaryReading) continue;
    const element = getElementForSyllable(primaryReading);
    groups[element].push(hanja);
  }
  return groups;
}

function groupByStroke(list: Hanja[]): Map<number, Hanja[]> {
  const map = new Map<number, Hanja[]>();
  for (const hanja of list) {
    const bucket = map.get(hanja.strokeOriginal);
    if (bucket) bucket.push(hanja);
    else map.set(hanja.strokeOriginal, [hanja]);
  }
  return map;
}

// 획수 배열의 홀(양)/짝(음)이 한쪽으로 쏠리지 않으면 true (CLAUDE.md 3.4).
function isYinYangBalanced(strokes: number[]): boolean {
  const parities = strokes.map((s) => s % 2);
  return !parities.every((p) => p === parities[0]);
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

// 이름 두 글자 원획 합. 점수 동점자 사이의 2차 정렬 키로만 쓴다(뜻 판단이 아니라 순수 수치 비교).
function totalGivenNameStroke(candidate: Candidate): number {
  return candidate.hanja.reduce((sum, h) => sum + h.strokeOriginal, 0);
}

// 4격(원형이정) 조합을 문자열 키로 — 같은 획수쌍에서 나온 후보인지 구분하는 용도.
function numerologyBucketKey(candidate: Candidate): string {
  return candidate.numerologyNumbers.join(",");
}

// 점수순으로 정렬된 후보 목록에서, 주어진 완화 단계(maxCharReuse·maxPerNumerologyBucket) 제약을
// 지키며 앞에서부터 그리디로 count개를 고른다. 발음(hangul) 중복은 이 함수 안에서 항상 금지한다
// (완화 단계와 무관 — CLAUDE.md 3.6: 서로 다른 한자라도 같은 이름으로 읽히는 후보를 동시에
// 보여주지 않는다).
function pickWithLimits(
  sorted: Array<{ candidate: Candidate; score: number }>,
  count: number,
  stage: { maxCharReuse: number; maxPerNumerologyBucket: number }
): Candidate[] {
  const picked: Candidate[] = [];
  const usedHangul = new Set<string>();
  const firstCharCount = new Map<string, number>();
  const secondCharCount = new Map<string, number>();
  const bucketCount = new Map<string, number>();

  for (const { candidate } of sorted) {
    if (picked.length >= count) break;
    if (usedHangul.has(candidate.hangul)) continue;

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

// CLAUDE.md 3.6 — 점수만으로는 동점(최대 6단계뿐)이 매우 흔해, 그대로 slice하면 같은 획수
// 조합 하나 안에서 글자 하나만 고정된 채 나머지가 채워지거나(첫 글자 5개 전부 동일), 서로 다른
// 한자인데 발음이 같은 후보가 중복 등장하는 문제가 생긴다(실사용에서 확인). CANDIDATE_DIVERSITY의
// 완화 단계를 앞에서부터 시도해 count를 채우는 첫 단계를 채택하고, 끝까지 못 채우면 그중 가장
// 많이 채운 단계를 반환한다(부족한 채로라도 다양성이 가장 큰 결과를 우선).
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
}

// 용신 + 성씨 제약으로 이름 후보를 생성해 점수순 상위 CANDIDATE_COUNT개를 반환한다.
// 하드 필터: 발음오행 순방향 상생(3.1) + 4격 전부 길수(3.6). 가산점: 자원오행 일치(3.5) + 음양 균형(3.4).
export function buildCandidates(input: BuildCandidatesInput): Candidate[] {
  const { surnameStroke, surnameElement, yongsin, hanjaPool, numerologyTable } = input;

  const requiredElements = requiredPhoneticElements(surnameElement, GIVEN_NAME_LENGTH);
  const phoneticElements = [surnameElement, ...requiredElements];
  if (!isPhoneticSangsaeng(phoneticElements)) {
    // requiredPhoneticElements가 항상 순방향 상생이 되도록 구성하므로 이 분기는 도달하지 않는다.
    // (isPhoneticSangsaeng을 실제로 사용해 두 함수의 일관성을 테스트로 고정하기 위한 안전장치.)
    return [];
  }

  const grouped = groupByPhoneticElement(hanjaPool);
  const firstByStroke = groupByStroke(grouped[requiredElements[0]]);
  const secondByStroke = groupByStroke(grouped[requiredElements[1]]);

  const scored: Array<{ candidate: Candidate; score: number }> = [];

  for (const [stroke1, listA] of firstByStroke) {
    for (const [stroke2, listB] of secondByStroke) {
      const sagyeok = calcSagyeok(surnameStroke, [stroke1, stroke2]);
      const allAuspicious = [sagyeok.won, sagyeok.hyeong, sagyeok.i, sagyeok.jeong].every((n) =>
        isAuspiciousNumber(numerologyTable.get(n)?.fortune ?? "")
      );
      if (!allAuspicious) continue;

      const balanced = isYinYangBalanced([surnameStroke, stroke1, stroke2]);

      for (const h1 of listA) {
        for (const h2 of listB) {
          if (h1.char === h2.char) continue; // 이름 두 글자가 같은 한자인 조합은 제외.

          const wonhaengMatches = countWonhaengMatches([h1, h2], yongsin);
          const commonMatches = countCommonHanja([h1, h2]);
          const score =
            wonhaengMatches * CANDIDATE_SCORE_WEIGHTS.wonhaengMatch +
            commonMatches * CANDIDATE_SCORE_WEIGHTS.commonHanja +
            (balanced ? CANDIDATE_SCORE_WEIGHTS.yinYangBalanced : 0);

          scored.push({
            candidate: {
              hanja: [h1, h2],
              hangul: `${h1.readings[0]}${h2.readings[0]}`,
              numerologyNumbers: [sagyeok.won, sagyeok.hyeong, sagyeok.i, sagyeok.jeong],
              phoneticElements,
            },
            score,
          });
        }
      }
    }
  }

  // 점수 동점자는 이름 두 글자 원획 합이 작은 쪽을 앞세운다(2차 정렬 키, 뜻 판단 아님).
  // 이것만으로는 동점이 여전히 흔해 selectDiverseCandidates가 실제 다양성을 강제한다.
  scored.sort(
    (a, b) => b.score - a.score || totalGivenNameStroke(a.candidate) - totalGivenNameStroke(b.candidate)
  );
  return selectDiverseCandidates(scored, CANDIDATE_COUNT);
}
