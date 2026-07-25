// CLAUDE.md 8.2 — 팔자 8글자 → 오행 분포 집계. 순수 함수만. 외부 import 금지.
// 규칙 근거: CLAUDE.md 2.1 (오행 분포 산출), 천간·지지·지장간 환산 포함.

import type { Saju, ElementDistribution } from "./types";
import { STEM_ELEMENT, BRANCH_HIDDEN_STEMS } from "./config";

// 팔자 8글자(천간 4 + 지지 4)와 지장간을 오행으로 환산해 집계한다.
// 천간 1글자 = 가중치 1, 지지 1글자 = 지장간 각각 days/30 가중치 (합 1) — 총합은 항상 8이 된다.
export function aggregateElements(saju: Saju): ElementDistribution {
  const distribution: ElementDistribution = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };

  for (const pillar of [saju.year, saju.month, saju.day, saju.hour]) {
    const stemElement = STEM_ELEMENT[pillar.stem];
    if (!stemElement) throw new Error(`알 수 없는 천간: ${pillar.stem}`);
    distribution[stemElement] += 1;

    const hiddenStems = BRANCH_HIDDEN_STEMS[pillar.branch];
    if (!hiddenStems) throw new Error(`알 수 없는 지지: ${pillar.branch}`);
    for (const { stem, days } of hiddenStems) {
      const hiddenElement = STEM_ELEMENT[stem];
      distribution[hiddenElement] += days / 30;
    }
  }

  return distribution;
}
