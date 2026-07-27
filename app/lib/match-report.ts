import type { HanjaGloss, NamingReport } from "@/lib/llm/explain";

export interface ReportEntry {
  explanation: string;
  hanjaGlosses: HanjaGloss[];
}

// LLM이 반환하는 hangul이 이름 두 글자만인지 성을 포함하는지 확정할 수 없어(explain.ts 프롬프트가
// 강제하지 않음), candidate.hangul이 접미사로 포함되는지로 느슨하게 대조한다.
//
// Phase 8(2026.7.27) — rank는 더 이상 존재하지 않는다(CLAUDE.md 3.6 "순위 폐지" 결정). 후보 표시
// 순서는 app/api/name/route.ts가 응답 시점에 이미 무작위화해 반환하므로, 프론트는 report로 후보를
// 재정렬하지 않고 candidates 배열 순서를 그대로 쓴다(orderCandidatesByReport는 폐기).
export function matchReportEntry(report: NamingReport | null, candidateHangul: string): ReportEntry | null {
  if (!report) return null;
  const found = report.candidates.find((c) => c.hangul === candidateHangul || c.hangul.endsWith(candidateHangul));
  return found ? { explanation: found.explanation, hanjaGlosses: found.hanjaGlosses } : null;
}
