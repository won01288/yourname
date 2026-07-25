// CLAUDE.md 8.2 — Phase 4: 용신 + 성씨 제약으로 이름 후보 조합을 생성한다. 순수 함수만. 외부 import 금지.
// 규칙 근거: CLAUDE.md 3.1(발음오행)·3.2(원획)·3.3(용신)·3.4(음양)·3.5(자원오행)·3.6(후보 생성), 4.3(81수리).
// DB 조회는 db.ts가 하고, 여기서는 이미 조회된 데이터(한자 풀, 81수리표)만 받아 조합·필터·점수화한다.

import type { Element, Hanja, Numerology81, Candidate } from "./types";
import { SANGSAENG_ORDER, GIVEN_NAME_LENGTH, CANDIDATE_COUNT, CANDIDATE_SCORE_WEIGHTS } from "./config";
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
          const score =
            wonhaengMatches * CANDIDATE_SCORE_WEIGHTS.wonhaengMatch +
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

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, CANDIDATE_COUNT).map((s) => s.candidate);
}
