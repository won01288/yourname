// CLAUDE.md 8.2 — Phase 4/6/11: 용신 + 성씨 제약으로 이름 후보를 만든다. 순수 함수만. 외부 import 금지.
// 규칙 근거: CLAUDE.md 3.1(발음오행)·3.2(원획)·3.3(용신)·3.4(음양)·3.5(자원오행)·3.6(후보 생성)·
// 3.6.4(하드필터 재설계), 4.3(81수리).
// DB 조회는 db.ts가 하고, 여기서는 이미 조회된 데이터(한자 풀, 81수리표, 이름 후보 풀)만 받아
// 필터·점수화한다.
//
// Phase 6 확정(3.6 확장, 2026.7.26) — 이름(hangul) 후보는 자유 조합이 아니라 사용자가 제공한
// etc/korean_name.xlsx(성별별 실사용 이름 표)의 A열에 있는 이름만 후보로 삼는다. 한자 자유 조합
// 방식은 "존재하지 않는 이름"을 만들어낼 위험이 있었다(예: 塌刃).
//
// Phase 11 재설계(3.6.4, 2026.8.1) — 이전에는 curatedGivenNames를 순회하며 그 이름의 두 음절에
// 대해 발음오행 순방향 상생 하드 필터를 먼저 걸고, 통과한 이름에 한해서만 4격 전부 길수인 한자
// 조합을 찾았다. 실사용 검증 결과 이 이중 하드 필터가 score.ts(3.10, 무료 채점 서비스)가 이미
// 정의해둔 "상극만 나쁘고 비화·역상생은 절반짜리"라는 등급 체계보다 훨씬 엄격해서(사실상 총점
// 95점 이상만 통과), 박씨 같은 일부 성씨는 통과 풀이 7개까지 줄어드는 문제가 있었다. 이제 두
// 하드 필터를 score.ts의 scoreName() 총점 기준(config.ts CANDIDATE_MIN_TOTAL_SCORE=90, S등급)
// 하나로 대체했다 — 채점(score.ts)과 생성(candidates.ts)이 같은 등급 기준을 공유한다.

import type {
  Element,
  Hanja,
  Numerology81,
  Candidate,
  CandidateHighlight,
  GivenNameEntry,
  ElementDistribution,
} from "./types";
import {
  SANGSAENG_ORDER,
  GIVEN_NAME_LENGTH,
  CANDIDATE_SCORE_WEIGHTS,
  CANDIDATE_DIVERSITY,
  CANDIDATE_MIN_TOTAL_SCORE,
  RANDOM_SELECTION_POOL,
  SIMILAR_NAME_MAX_JAMO_MISMATCH,
  ELEMENT_DISTRIBUTION_TOTAL,
  CROSS_GENDER_FREQUENCY_RATIO,
} from "./config";
import { getElementForSyllable } from "./phonetic";
import { calcSagyeok, type Sagyeok } from "./numerology";
import { isYinYangBalanced, scoreName, scorePhoneticFlow, classifyPhoneticLink } from "./score";
import { isSimilarName } from "./similarity";

// 3.6.4 — score.ts 발음오행 배점(상생15·비화/역상생7.5)에서, 링크 2개 중 하나는 반드시 상생이어야
// 총점 90에 도달할 수 있는 최소값(상생15+비화/역상생7.5=22.5). buildCandidates의 사전 가지치기용.
const MIN_PHONETIC_POINTS_FOR_GATE = 22.5;

// CLAUDE.md 3.6.6(Phase 13) — 반대 성별 쪽에서 이 이름이 CROSS_GENDER_FREQUENCY_RATIO배 이상
// 더 흔하면 true(제외 대상). 반대 성별 given_name에 아예 없는 이름(undefined)은 비교 대상이
// 아니므로 false. 순수 수치 비교이며 뜻 판단이 아니다(2.1과 충돌하지 않음).
export function isCrossGenderSkewed(ownFrequency: number, oppositeFrequency: number | undefined): boolean {
  if (oppositeFrequency === undefined) return false;
  return oppositeFrequency >= ownFrequency * CROSS_GENDER_FREQUENCY_RATIO;
}

function nextElement(element: Element): Element {
  const index = SANGSAENG_ORDER.indexOf(element);
  return SANGSAENG_ORDER[(index + 1) % SANGSAENG_ORDER.length];
}

// 성 초성 오행 뒤로 순방향 상생만 이어지는 "이상적" 체인. Phase 11부터는 하드 필터로 쓰지
// 않는다(3.6.4) — 이제 이 이상적 체인과 다르더라도(비화·역상생 최대 1개) 총점 90점 이상이면
// 통과할 수 있다. requiredPhoneticElements 자체는 테스트(순방향 상생 체인 생성 로직 검증)와
// 문서적 참조용으로 남겨둔다.
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
// 강점 배지(buildHighlights)의 "일치 여부" 표시용 — 매치가 있었다는 사실만 필요할 때 쓴다.
function countWonhaengMatches(hanjaList: Hanja[], yongsin: Element[]): number {
  return hanjaList.filter((h) => h.element !== null && yongsin.includes(h.element)).length;
}

// CLAUDE.md 3.6.3 — 자원오행 매치를 연속 점수로 계산한다. countWonhaengMatches(이진 카운트)와
// 달리 (1) 주용신(yongsin[0])/보조용신(yongsin[1]) 차등 가중과 (2) 오행분포 부족량 비례 가중을
// 결합한다. 두 축 모두 이미 계산된 값(용신 도출 순서, 오행분포 수치)을 조합할 뿐 새 판정을
// 만들지 않는다(2.1). element가 NULL인 한자는 여전히 0점(3.5 "판단 보류" 원칙 유지).
function wonhaengScore(hanjaList: Hanja[], yongsin: Element[], distribution: ElementDistribution): number {
  const avgPerElement = ELEMENT_DISTRIBUTION_TOTAL / 5;
  return hanjaList.reduce((sum, h) => {
    if (h.element === null) return sum;

    const positionWeight =
      h.element === yongsin[0]
        ? CANDIDATE_SCORE_WEIGHTS.wonhaengPrimaryWeight
        : h.element === yongsin[1]
          ? CANDIDATE_SCORE_WEIGHTS.wonhaengSecondaryWeight
          : 0;
    if (positionWeight === 0) return sum;

    // 0(평균 이상 이미 채워짐) ~ 1(사주에 이 오행이 전혀 없음) 사이로 정규화.
    const shortageRatio = Math.max(0, avgPerElement - distribution[h.element]) / avgPerElement;
    return sum + positionWeight * (1 + shortageRatio);
  }, 0);
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

// 정해진 두 음절(listA×listB)에서, score.ts 총점(scoreName)이 CANDIDATE_MIN_TOTAL_SCORE 이상인
// 조합 중 점수가 가장 높은 하나를 고른다(3.6.4 — 발음오행 순방향 상생·4격 전부 길수라는 이중
// 하드 필터를 총점 기준 하나로 대체). 같은 이름(hangul)에 대해 여러 한자 조합이 나올 수 있어
// (예: "민"=民/旻/珉…), 하나의 후보로 대표시키기 위해 최고점 한 조합만 남긴다 — 그래야 이 함수를
// 호출하는 쪽에서 이름별 중복이 생기지 않는다. 게이트를 통과한 조합들 사이의 순위는 여전히
// 기존 내부 가중치(자원오행 3.6.3·친숙한 한자·음양균형)로 매긴다 — score.ts의 scoreWonhaeng은
// 이진 매치라 3.6.3의 주/보조 용신 차등·부족량 비례가 없어 순위 결정력이 더 약하기 때문이다.
function bestRealization(
  listA: Hanja[],
  listB: Hanja[],
  surnameStroke: number,
  surnameElement: Element,
  givenSyllables: [string, string],
  yongsin: Element[],
  distribution: ElementDistribution,
  numerologyTable: Map<number, Numerology81>
): Realization | null {
  let best: Realization | null = null;

  for (const h1 of listA) {
    for (const h2 of listB) {
      if (h1.char === h2.char) continue; // 이름 두 글자가 같은 한자인 조합은 제외.

      const sagyeok = calcSagyeok(surnameStroke, [h1.strokeOriginal, h2.strokeOriginal]);

      const gate = scoreName({
        surnameElement,
        surnameStroke,
        givenSyllables,
        givenHanja: [h1, h2],
        yongsin,
        numerologyTable,
      });
      if (gate.totalScore < CANDIDATE_MIN_TOTAL_SCORE) continue;

      const balanced = isYinYangBalanced([surnameStroke, h1.strokeOriginal, h2.strokeOriginal]);
      const commonMatches = countCommonHanja([h1, h2]);
      const score =
        wonhaengScore([h1, h2], yongsin, distribution) +
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

// Fisher-Yates. random은 [0,1) 난수 생성기를 주입받는다 — 실사용은 Math.random, 테스트는 고정
// 시퀀스를 주입해 결과를 재현 가능하게 한다(CLAUDE.md 8.4, "순수 함수는 테스트로 고정"과 양립).
function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// CLAUDE.md 3.6.5(Phase 12, 2026.8.1) — 점수순 최상위만 그대로 뽑으면 같은 주용신(사주 핵심
// 요구)을 가진 사람들끼리 top5가 거의 겹친다는 게 실측으로 확인됐다(무작위 사주 200개 쌍 비교:
// 주용신이 같으면 72.7%가 4개 이상 겹침). 게이트(90점) 통과 풀 크기에 따라 상위 일정 비율
// 안에서 무작위로 뽑도록 바꾼다 — 풀이 작을수록(품질 편차가 클 수 있으므로) 비율을 넓게, 클수록
// 좁게 잡는다(config.ts RANDOM_SELECTION_POOL). 상위 비율 밖으로는 무작위화하지 않고 점수순
// 그대로 이어붙여, 상위 비율만으로 candidateCount를 못 채우는 작은 풀에서도 최대한 채운다.
export function buildRandomizedSelectionPool(
  scored: Array<{ candidate: Candidate; score: number }>,
  candidateCount: number,
  random: () => number
): Array<{ candidate: Candidate; score: number }> {
  const percent =
    scored.length >= RANDOM_SELECTION_POOL.poolSizeThreshold
      ? RANDOM_SELECTION_POOL.largePoolTopPercent
      : RANDOM_SELECTION_POOL.smallPoolTopPercent;
  const topCount = Math.min(scored.length, Math.max(candidateCount, Math.ceil(scored.length * percent)));

  const top = scored.slice(0, topCount);
  const rest = scored.slice(topCount);
  return [...shuffle(top, random), ...rest];
}

export interface BuildCandidatesInput {
  surnameStroke: number;
  surnameElement: Element;
  yongsin: Element[];
  /** 오행 분포(elements.ts aggregateElements 결과). 자원오행 점수 산정 시 "이 오행이 사주에
   * 얼마나 부족한지"를 wonhaengScore의 가중치로 쓴다(CLAUDE.md 3.6.3). */
  distribution: ElementDistribution;
  /** 인명용 & 불용문자 아님으로 이미 필터링된 한자 풀 (db.ts getEligibleHanjaPool). */
  hanjaPool: Hanja[];
  /** 1~81 전체 (db.ts getAllNumerology81). */
  numerologyTable: Map<number, Numerology81>;
  /** 성별에 맞는 실사용 이름(한글) 후보 풀 전체 (db.ts getGivenNamesByGender). 이 목록에 있는
   * 이름만 후보로 나올 수 있다 — 한자 자유 조합은 하지 않는다 (CLAUDE.md 3.6 확장). */
  curatedGivenNames: GivenNameEntry[];
  /** 반대 성별 given_name의 hangul → frequency 맵 (CLAUDE.md 3.6.6, Phase 13). 이 이름이 반대
   * 성별 쪽에서 CROSS_GENDER_FREQUENCY_RATIO배 이상 더 흔하면 후보에서 제외한다. 생략 시(기본
   * 빈 Map) 이 필터를 적용하지 않는다 — random과 동일하게 옵셔널 + 안전한 기본값 패턴. */
  oppositeGenderFrequency?: Map<string, number>;
  /** CLAUDE.md 0.6·3.6.7 — "같은 사주로 더 추천받기". 이미 이 세션에서 추천된 이름은 후보에서
   * 제외한다. hangul만으로 충분한 이유: curatedGivenNames 순회 시 bestRealization()이 이름
   * (hangul)마다 최고점 한자 조합 1개만 남기므로(위 143-147행 주석) hangul 자체가 이름의 유니크
   * 키다. 생략 시(기본값 없음) 이 필터를 적용하지 않는다. */
  excludeHangul?: Set<string>;
  /** 최종 반환할 후보 개수. 3/5/10 중 사용자가 선택한다 (config.ts CANDIDATE_COUNT_OPTIONS, Phase 8). */
  candidateCount: number;
  /** [0,1) 난수 생성기. 상위 비율 안 무작위 선택(3.6.5)에 쓰인다. 생략 시 Math.random.
   * 테스트에서는 고정 시퀀스를 주입해 재현 가능한 결과를 검증한다. */
  random?: () => number;
}

// 배열의 중앙값(짝수 개면 아래쪽 값). highlights의 "실사용 빈도 상위권" 판정 기준으로 쓴다.
function medianOf(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

// CLAUDE.md 3.6(Phase 8)·3.6.4(Phase 11) — 순위 대신 각 후보의 강점을 보여주기 위한 태그. 전부
// 이미 계산된 사실의 조회/집계일 뿐 새 판정이 아니다(2.1). Phase 11부터는 발음오행 순방향 상생·
// 4격 전부 길격이 더 이상 "통과한 모든 후보가 공통으로 만족하는 사실"이 아니므로(총점 90점 기준
// 하드 필터로 바뀌어 비화·역상생·반길이 섞인 후보도 통과할 수 있다, 3.6.4) 이 둘도 다른 항목처럼
// 실제로 참일 때만 조건부로 추가한다 — 없는 사실을 있다고 표시하지 않기 위함(2.1).
function buildHighlights(
  candidate: Candidate,
  surnameStroke: number,
  yongsin: Element[],
  numerologyTable: Map<number, Numerology81>,
  medianFrequencyInBatch: number
): CandidateHighlight[] {
  const highlights: CandidateHighlight[] = [];

  const phoneticGrades = candidate.phoneticElements
    .slice(0, -1)
    .map((el, i) => classifyPhoneticLink(el, candidate.phoneticElements[i + 1]));
  if (phoneticGrades.every((grade) => grade === "상생")) {
    highlights.push({ key: "phoneticFlow", label: "성과 이름의 발음오행이 처음부터 끝까지 상생으로 흐름" });
  }

  const gyeokFortunes = candidate.numerologyNumbers.map((n) => numerologyTable.get(n)?.fortune ?? "흉");
  if (gyeokFortunes.every((fortune) => fortune === "길")) {
    highlights.push({ key: "numerology", label: "수리사격(원형이정) 4격이 모두 길격" });
  }

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

// CLAUDE.md 0.6·3.6.7 — buildCandidatesDetailed의 poolSize(게이트+exclude 적용 후 전체 후보 풀
// 크기)를 함께 노출하기 위한 반환 타입. "더 추천받기" 잔여 개수(moreAvailableCount = poolSize -
// candidates.length)를 계산하는 기준값이다.
export interface BuildCandidatesResult {
  candidates: Candidate[];
  poolSize: number;
}

// 용신 + 성씨 제약으로 이름 후보를 생성해 candidateCount개를 반환한다. 이름(hangul) 자체는
// curatedGivenNames에 있는 것만 쓴다. 하드 필터(3.6.4): score.ts scoreName() 총점이
// CANDIDATE_MIN_TOTAL_SCORE(90) 이상. 게이트 통과 후 내부 순위: 자원오행 일치(3.5·3.6.3) +
// 친숙한 한자(3.6) + 음양 균형(3.4). 동점자는 이름의 실사용 빈도(frequency)가 높은 쪽을 우선한다.
// 최종 선택은 이 순위 최상위를 그대로 쓰지 않고, 게이트 통과 풀 크기에 따른 상위 비율 안에서
// 무작위로 뽑는다(3.6.5) — 같은 주용신을 가진 사용자끼리 결과가 거의 겹치는 문제 완화.
export function buildCandidatesDetailed(input: BuildCandidatesInput): BuildCandidatesResult {
  const {
    surnameStroke,
    surnameElement,
    yongsin,
    distribution,
    hanjaPool,
    numerologyTable,
    curatedGivenNames,
    candidateCount,
    random = Math.random,
    oppositeGenderFrequency = new Map<string, number>(),
    excludeHangul,
  } = input;

  const syllableIndex = groupBySyllable(hanjaPool);
  const scored: Array<{ candidate: Candidate; score: number }> = [];

  for (const entry of curatedGivenNames) {
    if (entry.hangul.length !== GIVEN_NAME_LENGTH) continue; // 방어적 — 데이터 계층에서 이미 걸러짐.

    // CLAUDE.md 0.6·3.6.7 — "더 추천받기" 세션에서 이미 추천된 이름은 한자 탐색 전에 건너뛴다.
    if (excludeHangul?.has(entry.hangul)) continue;

    // CLAUDE.md 3.6.6(Phase 13) — 반대 성별 쪽에서 훨씬 더 흔한 이름은 한자 탐색 전에 건너뛴다
    // (실사용 성별 인상과 어긋나는 추천 방지). 한자 조합과 무관하게 이름(hangul)만으로 정해지므로
    // 다른 사전 가지치기와 마찬가지로 여기서 가장 먼저 걸러 불필요한 계산을 피한다.
    if (isCrossGenderSkewed(entry.frequency, oppositeGenderFrequency.get(entry.hangul))) continue;

    const syllables = Array.from(entry.hangul);
    let syllableElements: Element[];
    try {
      syllableElements = syllables.map((s) => getElementForSyllable(s));
    } catch {
      continue; // 한글 완성형 음절이 아닌 값이 섞여 있으면 건너뛴다 (판정 불가).
    }

    // 3.6.4 성능 최적화 — 발음오행 점수는 한자 선택과 무관하게 이름(성+음절)만으로 정해진다.
    // 90점 게이트에 도달하려면 발음오행 링크 2개(성→음절1, 음절1→음절2) 중 상극은 하나도 없고
    // 비화/역상생도 최대 1개까지만 허용돼야 한다(config.ts CANDIDATE_MIN_TOTAL_SCORE 주석 참고) —
    // 그 미만이면 나머지(수리40·자원20·음양10)가 전부 만점이어도 총점이 90을 못 넘는다. 한자
    // 조합 전수탐색(및 매 조합 scoreName 호출) 전에 이 값으로 미리 걸러 불필요한 계산을 피한다.
    const phoneticPoints = scorePhoneticFlow([surnameElement, ...syllableElements]).points;
    if (phoneticPoints < MIN_PHONETIC_POINTS_FOR_GATE) continue;

    const listA = syllableIndex.get(syllables[0]) ?? [];
    const listB = syllableIndex.get(syllables[1]) ?? [];
    if (listA.length === 0 || listB.length === 0) continue;

    const realization = bestRealization(
      listA,
      listB,
      surnameStroke,
      surnameElement,
      [syllables[0], syllables[1]],
      yongsin,
      distribution,
      numerologyTable
    );
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
        // 3.6.4 — 더 이상 모든 후보가 같은 "이상적" 체인을 공유하지 않으므로, 이 후보의 실제
        // 발음오행 체인(성 + 이 이름의 실제 두 음절 오행)을 그대로 담는다.
        phoneticElements: [surnameElement, ...syllableElements],
        frequency: entry.frequency,
        highlights: [], // 최종 다양성 선택 뒤(medianFrequency 계산 후) buildHighlights로 채운다.
      },
      // 2026.8.2 — featured 이름(entry.isFeatured)에 소폭 가산점을 더해 90점 게이트 통과 풀
      // 안에서 순위를 살짝 올린다(config.ts CANDIDATE_SCORE_WEIGHTS.featured).
      score: realization.score + (entry.isFeatured ? CANDIDATE_SCORE_WEIGHTS.featured : 0),
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
  const randomizedPool = buildRandomizedSelectionPool(scored, candidateCount, random);
  const picked = selectDiverseCandidates(randomizedPool, candidateCount);

  // CLAUDE.md 3.6(Phase 8) — 순위 대신 각 후보의 강점을 부각한다. "실사용 빈도 상위권" 판정은 이번에
  // 실제로 반환되는 후보들끼리 비교해야 의미가 있으므로(다른 회차 결과와 비교하는 값이 아니다),
  // 최종 선택이 끝난 뒤 이 배치 안에서 중앙값을 계산한다.
  const medianFrequencyInBatch = medianOf(picked.map((c) => c.frequency));
  const candidates = picked.map((candidate) => ({
    ...candidate,
    highlights: buildHighlights(candidate, surnameStroke, yongsin, numerologyTable, medianFrequencyInBatch),
  }));

  return { candidates, poolSize: scored.length };
}

// buildCandidatesDetailed의 얇은 wrapper — candidateCount개의 후보 배열만 필요한 기존 호출부
// (scripts/debug/*, candidates.test.ts 등)를 위해 시그니처를 그대로 유지한다.
export function buildCandidates(input: BuildCandidatesInput): Candidate[] {
  return buildCandidatesDetailed(input).candidates;
}
