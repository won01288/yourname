"use client";

import { useState } from "react";
import CandidateTile from "@/app/components/CandidateTile";
import CandidateDetail from "@/app/components/CandidateDetail";
import { SAMPLE_CANDIDATES, SAMPLE_REPORT, SAMPLE_SURNAME, SAMPLE_YONGSIN } from "./sample-data";

// FeatureSection의 "이름 후보 비교" 미리보기 전용 — 실제 서비스와 동일하게 타일을 눌러 근거를
// 펼쳐볼 수 있는 인터랙티브 데모다(공유 상태(expandedIndex)가 필요해 클라이언트 컴포넌트로 분리).
export default function CandidateShowcase() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const expandedCandidate = expandedIndex !== null ? SAMPLE_CANDIDATES[expandedIndex] : null;
  const expandedEntry = expandedIndex !== null ? SAMPLE_REPORT.candidates[expandedIndex] : null;

  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {SAMPLE_CANDIDATES.map((candidate, i) => (
          <CandidateTile
            key={candidate.hangul}
            candidate={candidate}
            surnameHanja={SAMPLE_SURNAME.hanja}
            isExpanded={expandedIndex === i}
            hanjaGlosses={SAMPLE_REPORT.candidates[i]?.hanjaGlosses ?? []}
            strengths={SAMPLE_REPORT.candidates[i]?.strengths ?? []}
            onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
          />
        ))}
      </div>

      {expandedCandidate && expandedEntry && (
        <div className="mt-4">
          <CandidateDetail
            candidate={expandedCandidate}
            surname={SAMPLE_SURNAME}
            yongsin={SAMPLE_YONGSIN.yongsin}
            explanation={expandedEntry.explanation}
            hanjaGlosses={expandedEntry.hanjaGlosses}
            strengths={expandedEntry.strengths}
            onClose={() => setExpandedIndex(null)}
          />
        </div>
      )}
    </div>
  );
}
