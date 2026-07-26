"use client";

import { useState } from "react";
import type { NameApiResult } from "@/app/lib/name-client";
import { orderCandidatesByReport, matchReportEntry } from "@/app/lib/match-report";
import ManseryeokTable from "./ManseryeokTable";
import SajuReportCard from "./SajuReportCard";
import SajuStoryCard from "./SajuStoryCard";
import CandidateTile from "./CandidateTile";
import CandidateDetail from "./CandidateDetail";
import LegalNotice from "./LegalNotice";

interface ResultsDashboardProps {
  data: NameApiResult;
  onRestart: () => void;
}

// design.md 3.1/3.2 — 벤토 그리드 + 점진적 공개로 구성된 결과 리포트.
export default function ResultsDashboard({ data, onRestart }: ResultsDashboardProps) {
  const { saju, elementDistribution, yongsin, manseryeok, surname, candidates, report } = data;
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const orderedCandidates = orderCandidatesByReport(candidates, report);
  const expandedCandidate = expandedIndex !== null ? orderedCandidates[expandedIndex] : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 pb-8 pt-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-text-primary">
            {surname.hangul}({surname.hanja})씨 사주 작명 리포트
          </h1>
          {saju && (
            <p className="mt-1 text-[13px] text-text-secondary">
              일간 {saju.day.stem} 기준, {yongsin.strength} 사주로 분석되었습니다.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onRestart}
          className="shrink-0 rounded-control border border-border bg-surface px-3.5 py-2 text-[13px] font-medium text-text-primary transition-colors hover:bg-surface-muted"
        >
          다시 짓기
        </button>
      </div>

      {report && <p className="mb-8 text-[15px] leading-8 text-text-primary">{report.summary}</p>}

      <ManseryeokTable manseryeok={manseryeok} />

      <SajuReportCard elementDistribution={elementDistribution} yongsin={yongsin} />

      {report && <SajuStoryCard title={report.sajuStory.title} body={report.sajuStory.body} />}

      {candidates.length === 0 ? (
        <section className="rounded-card border border-border bg-surface p-8 text-center shadow-[var(--shadow-card)]">
          <p className="text-[15px] font-medium text-text-primary">조건을 만족하는 이름 후보를 찾지 못했습니다.</p>
          <p className="mt-2 text-[13px] leading-6 text-text-secondary">
            발음오행 상생과 81수리 길격을 모두 만족하는 조합이 현재 한자 풀 안에서 나오지 않았습니다.
            성씨나 태어난 시각을 다시 확인한 뒤 시도해 주세요.
          </p>
        </section>
      ) : (
        <>
          <h2 className="mb-3 text-[16px] font-semibold text-text-primary">추천 이름 {candidates.length}개</h2>
          <div className="mb-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {orderedCandidates.map((candidate, i) => (
              <CandidateTile
                key={candidate.hangul + i}
                candidate={candidate}
                surnameHanja={surname.hanja}
                rank={i + 1}
                isFirst={i === 0}
                isExpanded={expandedIndex === i}
                onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
              />
            ))}
          </div>

          {expandedCandidate && (
            <div className="mt-6">
              <CandidateDetail
                candidate={expandedCandidate}
                surname={surname}
                yongsin={yongsin.yongsin}
                explanation={matchReportEntry(report, expandedCandidate.hangul)?.explanation ?? null}
                onClose={() => setExpandedIndex(null)}
              />
            </div>
          )}
        </>
      )}

      <div className="-mx-6 mt-8">
        <LegalNotice />
      </div>
    </div>
  );
}
