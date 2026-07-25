// CLAUDE.md 8.2 — 팔자 8글자 → 오행 분포 집계. 순수 함수만. 외부 import 금지.
// 규칙 근거: CLAUDE.md 2.1 (오행 분포 산출), 천간·지지·지장간 환산 포함.

import type { Saju, ElementDistribution } from "./types";

// TODO(Phase 2): 팔자 8글자(천간 4 + 지지 4)와 지장간을 오행으로 환산해 집계한다.
export function aggregateElements(saju: Saju): ElementDistribution {
  throw new Error("not implemented");
}
