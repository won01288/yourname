// CLAUDE.md 8.2 — 신강/신약 판정 + 억부 용신 도출 (규칙 엔진). 순수 함수만. 외부 import 금지.
// 규칙 근거: CLAUDE.md 3.3. LLM은 이 결과를 서술만 하고 판정하지 않는다 (2.3).

import type { Saju, ElementDistribution, YongsinResult } from "./types";

// TODO(Phase 2): 월령·득지·득세 등 세력 계산으로 신강/신약 판정.
export function judgeStrength(saju: Saju, distribution: ElementDistribution): "신강" | "신약" {
  throw new Error("not implemented");
}

// TODO(Phase 2): 억부용신 기본 도출. 신강이면 설기·극하는 오행, 신약이면 생조하는 오행.
// 조후용신 우선 적용 임계값은 미결정 (CLAUDE.md 6장) — 확정 전까지 억부만 구현.
// 판정 근거(reason)는 구조화된 데이터로 반환해 LLM 해설·디버깅에 사용한다.
export function deriveYongsin(saju: Saju, distribution: ElementDistribution): YongsinResult {
  throw new Error("not implemented");
}
