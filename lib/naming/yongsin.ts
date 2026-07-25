// CLAUDE.md 8.2 — 신강/신약 판정 + 억부 용신 도출 (규칙 엔진). 순수 함수만. 외부 import 금지.
// 규칙 근거: CLAUDE.md 3.3. LLM은 이 결과를 서술만 하고 판정하지 않는다 (2.3).

import type { Saju, ElementDistribution, YongsinResult, Element } from "./types";
import { STEM_ELEMENT, BRANCH_ELEMENT, SANGSAENG_ORDER, STRENGTH_THRESHOLD, MONTH_BRANCH_STRENGTH_BONUS } from "./config";

function elementIndex(element: Element): number {
  return SANGSAENG_ORDER.indexOf(element);
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

  const reason =
    `일간(${saju.day.stem})은 ${score.dayMasterElement} 오행이다. ` +
    `비겁(${score.supportiveElement})+인성(${score.resourceElement}) 세력 점수 ${score.supportScore.toFixed(2)} / 전체 ${score.totalScore.toFixed(2)}` +
    `(비율 ${(score.ratio * 100).toFixed(1)}%, 월지 득령 ${score.monthSupportsStrength ? "충족" : "미충족"}) → ${strength} 판정. ` +
    `${strength === "신강" ? "설기(식상)·극제(관성)" : "생조(인성)·부조(비겁)"} 오행인 ${yongsin.join("·")}을(를) 억부용신으로 삼는다.`;

  return { strength, yongsin, reason };
}
