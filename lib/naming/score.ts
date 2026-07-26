// CLAUDE.md 8.2 — Phase 7: 이름 점수 확인 서비스(무료, LLM 미사용). 순수 함수만. 외부 import 금지.
// 규칙 근거: CLAUDE.md 3.10. candidates.ts(후보 생성)와 달리 이미 정해진 이름을 채점한다 — 하드
// 필터로 탈락시키지 않고 등급을 매긴다. LLM은 이 결과를 전혀 거치지 않는다(2.3과 무관하게 애초에
// 호출 자체가 없음 — 무료 서비스는 운영자 비용이 0이어야 한다는 제약).

import type {
  Element,
  Hanja,
  Numerology81,
  NameScoreResult,
  PhoneticLinkGrade,
  PhoneticLinkResult,
  NumerologyGyeokScore,
  ScoreCategoryResult,
  ScoreWarning,
  ScoreGrade,
} from "./types";
import { SANGSAENG_ORDER, destructiveOf } from "./config";
import { getElementForSyllable } from "./phonetic";
import { calcSagyeok, type Sagyeok } from "./numerology";

const PHONETIC_LINK_MAX = 15; // 링크 2개(성→이름1, 이름1→이름2) × 15 = 30점.
const PHONETIC_LINK_HALF = PHONETIC_LINK_MAX / 2; // 비화·역상생 공통 배점.
const NUMEROLOGY_GYEOK_MAX = 10; // 4격 × 10 = 40점.
const WONHAENG_MAX = 20; // 이름 2글자 × 10점.
const YIN_YANG_MAX = 10;

function nextElement(element: Element): Element {
  const idx = SANGSAENG_ORDER.indexOf(element);
  return SANGSAENG_ORDER[(idx + 1) % SANGSAENG_ORDER.length];
}

// 인접한 두 오행의 관계 등급 (CLAUDE.md 3.10). 5개 오행 사이의 관계는 항상 이 4가지 중 하나로
// 정확히 분류된다(비화 1가지 + 상생 1가지 + 역상생 1가지 + 상극 2가지 방향) — else 없이 전부
// 명시적으로 분기해 두어, 분류 불가능한 조합이 생기면(버그) 조용히 넘어가지 않고 즉시 드러나게 한다.
export function classifyPhoneticLink(from: Element, to: Element): PhoneticLinkGrade {
  if (to === nextElement(from)) return "상생";
  if (to === from) return "비화";
  if (from === nextElement(to)) return "역상생";
  if (to === destructiveOf(from) || from === destructiveOf(to)) return "상극";
  throw new Error(`분류할 수 없는 오행 관계: ${from} → ${to}`);
}

const PHONETIC_LINK_POINTS: Record<PhoneticLinkGrade, number> = {
  상생: PHONETIC_LINK_MAX,
  비화: PHONETIC_LINK_HALF,
  역상생: PHONETIC_LINK_HALF,
  상극: 0,
};

// 성 초성 → 이름 첫 글자 → 이름 끝 글자, 인접한 두 링크를 채점한다.
export function scorePhoneticFlow(elements: Element[]): {
  links: PhoneticLinkResult[];
  points: number;
  maxPoints: number;
} {
  const links: PhoneticLinkResult[] = [];
  for (let i = 0; i < elements.length - 1; i++) {
    const grade = classifyPhoneticLink(elements[i], elements[i + 1]);
    links.push({
      from: elements[i],
      to: elements[i + 1],
      grade,
      points: PHONETIC_LINK_POINTS[grade],
      maxPoints: PHONETIC_LINK_MAX,
    });
  }
  return {
    links,
    points: links.reduce((sum, l) => sum + l.points, 0),
    maxPoints: links.length * PHONETIC_LINK_MAX,
  };
}

// numerology_81.fortune 문자열을 점수로 환산한다. "반길"(선흉후길 등 혼합)은 "길"의 절반으로
// 반영한다 — numerology.ts의 isAuspiciousNumber는 반길을 흉과 함께 false로 보수적 처리하지만
// (하드 필터용), 채점은 등급이 필요하므로 여기서는 별도로 3단 분기한다.
function numerologyPoints(fortune: string): number {
  if (fortune === "길") return NUMEROLOGY_GYEOK_MAX;
  if (fortune === "반길") return NUMEROLOGY_GYEOK_MAX / 2;
  return 0;
}

const GYEOK_LABELS: NumerologyGyeokScore["label"][] = ["원격", "형격", "이격", "정격"];

// 4격(원형이정) 각각을 81수리 길흉으로 채점한다.
export function scoreNumerology(
  sagyeok: Sagyeok,
  numerologyTable: Map<number, Numerology81>
): { gyeoks: NumerologyGyeokScore[]; points: number; maxPoints: number } {
  const numbers = [sagyeok.won, sagyeok.hyeong, sagyeok.i, sagyeok.jeong];
  const gyeoks = numbers.map((number, i) => {
    const fortune = numerologyTable.get(number)?.fortune ?? "흉";
    return {
      label: GYEOK_LABELS[i],
      number,
      fortune,
      points: numerologyPoints(fortune),
      maxPoints: NUMEROLOGY_GYEOK_MAX,
    };
  });
  return {
    gyeoks,
    points: gyeoks.reduce((sum, g) => sum + g.points, 0),
    maxPoints: gyeoks.length * NUMEROLOGY_GYEOK_MAX,
  };
}

// 획수 배열의 홀(양)/짝(음)이 한쪽으로 쏠리지 않으면 true (CLAUDE.md 3.4). candidates.ts의 후보
// 생성 가산점과 채점이 같은 판정식을 쓰도록 여기로 옮겨와 공유한다.
export function isYinYangBalanced(strokes: number[]): boolean {
  const parities = strokes.map((s) => s % 2);
  return !parities.every((p) => p === parities[0]);
}

export function scoreYinYang(strokes: number[]): { points: number; maxPoints: number; balanced: boolean } {
  const balanced = isYinYangBalanced(strokes);
  return { points: balanced ? YIN_YANG_MAX : 0, maxPoints: YIN_YANG_MAX, balanced };
}

// 자원오행이 용신과 일치하는 글자 수를 채점한다. element가 NULL인 글자는 CLAUDE.md 3.5 원칙대로
// "판단 보류"로 건너뛴다 — 적용 가능한 글자가 하나도 없으면 applicable=false로 반환해 scoreName이
// 이 항목 자체를 총점 분모에서 제외(재환산)하게 한다.
export function scoreWonhaeng(
  hanjaList: Hanja[],
  yongsin: Element[]
): { points: number; maxPoints: number; applicable: boolean } {
  const applicableChars = hanjaList.filter((h) => h.element !== null);
  if (applicableChars.length === 0) {
    return { points: 0, maxPoints: 0, applicable: false };
  }
  const perCharMax = WONHAENG_MAX / hanjaList.length;
  const matched = applicableChars.filter((h) => yongsin.includes(h.element as Element)).length;
  return { points: matched * perCharMax, maxPoints: applicableChars.length * perCharMax, applicable: true };
}

const GRADE_THRESHOLDS: [number, ScoreGrade][] = [
  [90, "S"],
  [80, "A"],
  [65, "B"],
  [50, "C"],
];

// totalScore를 구간화하는 표시 전용 변환. 새 판정이 아니라 이미 계산된 숫자의 UI 버킷팅이다.
function gradeOf(score: number): ScoreGrade {
  for (const [threshold, grade] of GRADE_THRESHOLDS) {
    if (score >= threshold) return grade;
  }
  return "D";
}

export interface ScoreNameInput {
  surnameElement: Element;
  surnameStroke: number;
  /** 이름 두 글자의 한글 음(발음오행 판정용) — 한자의 readings[0]이 아니라 사용자가 실제로
   * 의도한 음을 그대로 쓴다("한자 찾기"에서 검색했던 음절). */
  givenSyllables: [string, string];
  /** 위 음절에 대응하는 실제 한자(수리·자원오행·인명용/불용 판정용). */
  givenHanja: [Hanja, Hanja];
  yongsin: Element[];
  numerologyTable: Map<number, Numerology81>;
}

// 이미 정해진 이름(성씨+한자 2글자)을 CLAUDE.md 3.10 가중치(발음30·수리40·자원20·음양10)로
// 채점한다. 자원오행이 적용 불가(두 글자 다 element NULL)면 그 항목을 분모에서 빼고 나머지
// 만점 대비 비율로 100점 만점을 재환산한다. 인명용 아님/불용문자는 점수가 아니라 별도 경고로만
// 반환한다 — 두 문제 모두 "이름의 좋고 나쁨"이 아니라 "실사용/신고 가능 여부"에 대한 사실 안내다.
export function scoreName(input: ScoreNameInput): NameScoreResult {
  const { surnameElement, surnameStroke, givenSyllables, givenHanja, yongsin, numerologyTable } = input;

  const phoneticElements = [surnameElement, ...givenSyllables.map((s) => getElementForSyllable(s))];
  const phonetic = scorePhoneticFlow(phoneticElements);

  const sagyeok = calcSagyeok(
    surnameStroke,
    givenHanja.map((h) => h.strokeOriginal)
  );
  const numerology = scoreNumerology(sagyeok, numerologyTable);

  const yinYang = scoreYinYang([surnameStroke, ...givenHanja.map((h) => h.strokeOriginal)]);

  const wonhaeng = scoreWonhaeng(givenHanja, yongsin);

  const categories: ScoreCategoryResult[] = [
    { key: "phonetic", label: "발음오행 상생", points: phonetic.points, maxPoints: phonetic.maxPoints, applicable: true },
    {
      key: "numerology",
      label: "수리사격(4격)",
      points: numerology.points,
      maxPoints: numerology.maxPoints,
      applicable: true,
    },
    {
      key: "wonhaeng",
      label: "자원오행 용신 일치",
      points: wonhaeng.points,
      maxPoints: wonhaeng.maxPoints,
      applicable: wonhaeng.applicable,
    },
    { key: "yinYang", label: "음양 배열", points: yinYang.points, maxPoints: yinYang.maxPoints, applicable: true },
  ];

  const applicable = categories.filter((c) => c.applicable);
  const earnedPoints = applicable.reduce((sum, c) => sum + c.points, 0);
  const maxPoints = applicable.reduce((sum, c) => sum + c.maxPoints, 0);
  const totalScore = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0;

  const warnings: ScoreWarning[] = [];
  for (const h of givenHanja) {
    if (!h.isNameAllowed) {
      warnings.push({
        type: "not-name-allowed",
        char: h.char,
        message: `${h.char}은(는) 인명용 한자 목록에서 확인되지 않았습니다. 출생신고 시 한글로만 기록될 수 있어 관할 확인이 필요합니다.`,
      });
    }
    if (h.isForbidden) {
      warnings.push({
        type: "forbidden",
        char: h.char,
        message: h.forbiddenReason ?? `${h.char}은(는) 작명 실무에서 피하는 것이 좋은 글자(불용문자)로 분류되어 있습니다.`,
      });
    }
  }

  return {
    totalScore,
    grade: gradeOf(totalScore),
    categories,
    phoneticLinks: phonetic.links,
    numerology: numerology.gyeoks,
    warnings,
  };
}
