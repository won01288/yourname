import type { Candidate } from "@/lib/naming/types";
import type { NamingReport } from "@/lib/llm/explain";

export interface ReportEntry {
  rank: number;
  explanation: string;
}

// LLM이 반환하는 hangul이 이름 두 글자만인지 성을 포함하는지 확정할 수 없어(explain.ts 프롬프트가
// 강제하지 않음), candidate.hangul이 접미사로 포함되는지로 느슨하게 대조한다.
export function matchReportEntry(report: NamingReport | null, candidateHangul: string): ReportEntry | null {
  if (!report) return null;
  const found = report.candidates.find((c) => c.hangul === candidateHangul || c.hangul.endsWith(candidateHangul));
  return found ? { rank: found.rank, explanation: found.explanation } : null;
}

// report의 rank로 후보를 재정렬한다. 매치되지 않는 후보는 원래 순서(이미 점수순)를 유지하며 뒤로 보낸다.
export function orderCandidatesByReport(candidates: Candidate[], report: NamingReport | null): Candidate[] {
  if (!report) return candidates;
  return [...candidates]
    .map((c, originalIndex) => ({ c, originalIndex, rank: matchReportEntry(report, c.hangul)?.rank }))
    .sort((a, b) => {
      if (a.rank != null && b.rank != null) return a.rank - b.rank;
      if (a.rank != null) return -1;
      if (b.rank != null) return 1;
      return a.originalIndex - b.originalIndex;
    })
    .map((x) => x.c);
}
