// CLAUDE.md 8.2 — 신강/신약 판정 + 억부 용신 도출 (규칙 엔진). 순수 함수만. 외부 import 금지.
// 규칙 근거: CLAUDE.md 3.3. LLM은 이 결과를 서술만 하고 판정하지 않는다 (2.3).

import type { Saju, ElementDistribution, YongsinResult, Element } from "./types";
import {
  STEM_ELEMENT,
  BRANCH_ELEMENT,
  SANGSAENG_ORDER,
  STRENGTH_THRESHOLD,
  MONTH_BRANCH_STRENGTH_BONUS,
  ELEMENT_READING,
} from "./config";

function elementIndex(element: Element): number {
  return SANGSAENG_ORDER.indexOf(element);
}

// 리포트 텍스트에서 오행 한자를 "한자(음)" 형태(예: 火(화))로 표기한다. 한자만 단독으로 쓰지 않는다.
function withReading(element: Element): string {
  return `${element}(${ELEMENT_READING[element]})`;
}

function withReadingList(elements: Element[]): string {
  return elements.map(withReading).join("·");
}

// 인성(印星): 일간을 생하는 오행.
function resourceOf(element: Element): Element {
  return SANGSAENG_ORDER[(elementIndex(element) + 4) % 5];
}

// 식상(食傷): 일간이 생하는 오행.
function outputOf(element: Element): Element {
  return SANGSAENG_ORDER[(elementIndex(element) + 1) % 5];
}

// 관성(官星): 일간을 극하는 오행.
function officerOf(element: Element): Element {
  return SANGSAENG_ORDER[(elementIndex(element) + 3) % 5];
}

interface StrengthScore {
  dayMasterElement: Element;
  supportiveElement: Element; // 비겁: 일간과 같은 오행
  resourceElement: Element; // 인성: 일간을 생하는 오행
  supportScore: number;
  totalScore: number;
  ratio: number;
  monthSupportsStrength: boolean;
}

// 월지 가중 점수제: 비겁+인성 세력 비율에 월지 득령 여부를 가중치로 반영한다 (CLAUDE.md 3.3).
function calculateStrengthScore(saju: Saju, distribution: ElementDistribution): StrengthScore {
  const dayMasterElement = STEM_ELEMENT[saju.day.stem];
  if (!dayMasterElement) throw new Error(`알 수 없는 일간: ${saju.day.stem}`);

  const supportiveElement = dayMasterElement;
  const resourceElement = resourceOf(dayMasterElement);

  const baseSupportScore = distribution[supportiveElement] + distribution[resourceElement];
  const baseTotal = distribution.木 + distribution.火 + distribution.土 + distribution.金 + distribution.水;

  const monthBranchElement = BRANCH_ELEMENT[saju.month.branch];
  if (!monthBranchElement) throw new Error(`알 수 없는 지지: ${saju.month.branch}`);
  const monthSupportsStrength = monthBranchElement === supportiveElement || monthBranchElement === resourceElement;

  const supportScore = baseSupportScore + (monthSupportsStrength ? MONTH_BRANCH_STRENGTH_BONUS : 0);
  const totalScore = baseTotal + MONTH_BRANCH_STRENGTH_BONUS;

  return {
    dayMasterElement,
    supportiveElement,
    resourceElement,
    supportScore,
    totalScore,
    ratio: supportScore / totalScore,
    monthSupportsStrength,
  };
}

// 월령·득지·득세 등 세력 계산으로 신강/신약 판정.
export function judgeStrength(saju: Saju, distribution: ElementDistribution): "신강" | "신약" {
  const { ratio } = calculateStrengthScore(saju, distribution);
  return ratio >= STRENGTH_THRESHOLD ? "신강" : "신약";
}

// 억부용신 도출. 신강이면 설기(식상)·극제(관성) 오행, 신약이면 생조(인성)·부조(비겁) 오행을 용신으로 삼는다.
// 조후용신 우선 적용 임계값은 미결정 (CLAUDE.md 6장) — 확정 전까지 억부만 구현.
export function deriveYongsin(saju: Saju, distribution: ElementDistribution): YongsinResult {
  const score = calculateStrengthScore(saju, distribution);
  const strength: "신강" | "신약" = score.ratio >= STRENGTH_THRESHOLD ? "신강" : "신약";

  const yongsin: Element[] =
    strength === "신강"
      ? [outputOf(score.dayMasterElement), officerOf(score.dayMasterElement)]
      : [score.resourceElement, score.supportiveElement];

  // 쉬운 설명 병행 (CLAUDE.md 3.9 원칙과 동일하게, 전문 용어는 살리되 처음 나올 때 괄호로 풀어쓴다).
  const monthPhrase = score.monthSupportsStrength
    ? "태어난 달의 지지(월지)도 일간 편이라 힘을 더 보태줘서"
    : "태어난 달의 지지(월지)는 일간 편이 아니라서";
  const strengthPhrase = strength === "신강" ? "힘이 강한 편(신강)" : "힘이 약한 편(신약)";
  const balancePhrase =
    strength === "신강"
      ? "기운이 넘치는 사주이니 그 기운을 덜어내거나 눌러줄"
      : "기운이 부족한 사주이니 그 기운을 채워줄";

  const reason =
    `일간(태어난 날의 천간, ${saju.day.stem})은 ${withReading(score.dayMasterElement)} 오행이다. ` +
    `사주 8글자 중 일간과 같은 오행인 비겁(比劫)과 일간을 도와주는 오행인 인성(印星)의 힘을 합치면 ` +
    `전체 ${score.totalScore.toFixed(2)} 중 ${score.supportScore.toFixed(2)}(${(score.ratio * 100).toFixed(1)}%)이다. ` +
    `${monthPhrase}, 일간의 ${strengthPhrase}으로 판단했다. ` +
    `${balancePhrase} ${withReadingList(yongsin)} 오행을 용신(부족하거나 넘치는 기운을 조절해 균형을 잡아주는 오행)으로 삼는다.`;

  return { strength, yongsin, reason };
}
