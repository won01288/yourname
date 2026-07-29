"use client";

import { useState } from "react";
import type { NameApiResult, NameRequestPayload } from "@/app/lib/name-client";
import { matchReportEntry } from "@/app/lib/match-report";
import { formatBirthLine, formatGenderLabel } from "@/app/lib/search-summary";
import ManseryeokTable from "./ManseryeokTable";
import SajuReportCard from "./SajuReportCard";
import SajuStoryCard from "./SajuStoryCard";
import CandidateTile from "./CandidateTile";
import CandidateDetail from "./CandidateDetail";
import LegalNotice from "./LegalNotice";
import ElementBadge from "./ElementBadge";
import AmbientBackdrop from "./AmbientBackdrop";

interface ResultsDashboardProps {
  data: NameApiResult;
  onRestart: () => void;
  /** 마이페이지에서 저장된 결과를 다시 볼 때 "다시 짓기"/"다시 시도하기" 대신 쓸 라벨.
   * 생략 시 기존 문구 그대로(하위호환) — 위저드 맥락에서는 "다시 시작"으로 읽혀야 맞다. */
  restartLabel?: string;
  /** 사용자가 실제로 제출한 검색 조건. 상단 요약 줄 표시용 — 없으면(하위호환) 요약을 생략한다. */
  searchPayload?: NameRequestPayload | null;
}

// design.md 3.1/3.2 — 벤토 그리드 + 점진적 공개로 구성된 결과 리포트.
export default function ResultsDashboard({ data, onRestart, restartLabel, searchPayload }: ResultsDashboardProps) {
  const { saju, elementDistribution, yongsin, manseryeok, surname, candidates, report } = data;
  // 처음 제시할 때부터 첫 번째 후보를 활성화해, 클릭하면 상세가 열린다는 걸 바로 보여준다.
  const [expandedIndex, setExpandedIndex] = useState<number | null>(candidates.length > 0 ? 0 : null);

  // Phase 8(2026.7.27) — 순위를 매기지 않는다(CLAUDE.md 3.6). 표시 순서는 API가 응답 시점에 이미
  // 무작위화해 반환하므로, 여기서 report의 rank로 재정렬하지 않고 candidates 순서를 그대로 쓴다.
  const expandedCandidate = expandedIndex !== null ? candidates[expandedIndex] : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 pb-8 pt-10">
      {/* design.md 3.6 — 결과 리포트 상단 배경 앰비언트 (이 헤더 영역에만 적용) */}
      <div className="relative mb-6 overflow-hidden rounded-card">
        <AmbientBackdrop />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold text-text-primary">
              {surname.hangul}(<span className="text-brand-600">{surname.hanja}</span>)씨 사주 작명 리포트
            </h1>
            {saju && (
              <p className="mt-1 text-[13px] text-text-secondary">일간 {saju.day.stem} 기준 분석</p>
            )}
            {searchPayload && (
              <p className="mt-2 text-[12px] text-text-secondary">
                검색 조건 · {formatBirthLine(searchPayload)} · {formatGenderLabel(searchPayload.gender)}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-pill bg-brand-50 px-2.5 py-1 text-[12px] font-medium text-brand-800">
                {yongsin.strength}
              </span>
              <span className="text-[12px] text-text-secondary">용신</span>
              {yongsin.yongsin.map((el) => (
                <ElementBadge key={el} element={el} compact />
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onRestart}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-control border border-border bg-surface px-3.5 py-2 text-[13px] font-medium text-text-primary transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true" className="shrink-0">
              <path d="M9 3 A4 4 0 1 1 3 2" fill="none" stroke="currentColor" strokeWidth="1.3" />
              <path d="M9 1v2.5H6.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            {restartLabel ?? "다시 짓기"}
          </button>
        </div>
      </div>

      {report && <p className="mb-8 text-[15px] leading-8 text-text-primary">{report.summary}</p>}

      <ManseryeokTable manseryeok={manseryeok} />

      <SajuReportCard elementDistribution={elementDistribution} yongsin={yongsin} dayStem={saju?.day.stem} />

      {report && <SajuStoryCard title={report.sajuStory.title} body={report.sajuStory.body} />}

      {candidates.length === 0 ? (
        <section className="rounded-card border border-border bg-surface p-8 text-center shadow-[var(--shadow-card)]">
          <p className="text-[15px] font-medium text-text-primary">조건을 만족하는 이름 후보를 찾지 못했습니다.</p>
          <p className="mt-2 text-[13px] leading-6 text-text-secondary">
            발음오행 상생과 81수리 길격을 모두 만족하는 조합이 현재 한자 풀 안에서 나오지 않았습니다.
            성씨나 태어난 시각을 다시 확인한 뒤 시도해 주세요.
          </p>
          <button
            type="button"
            onClick={onRestart}
            className="mt-5 inline-flex min-h-11 items-center rounded-control bg-gradient-to-r from-brand-400 to-brand-600 px-5 text-[14px] font-medium text-white shadow-[var(--shadow-brand-glow)] transition-all hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
          >
            {restartLabel ?? "다시 시도하기"}
          </button>
        </section>
      ) : (
        <>
          <h2 className="mb-1 text-[16px] font-semibold text-text-primary">추천 이름 {candidates.length}개</h2>
          <p className="mb-3 text-[13px] text-text-secondary">
            우열을 매기지 않았습니다. 각 이름의 강점을 확인하고 마음에 드는 이름을 골라 보세요.
          </p>
          <div className="mb-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {candidates.map((candidate, i) => (
              <CandidateTile
                key={candidate.hangul + i}
                candidate={candidate}
                surnameHanja={surname.hanja}
                isExpanded={expandedIndex === i}
                hanjaGlosses={matchReportEntry(report, candidate.hangul)?.hanjaGlosses ?? []}
                strengths={matchReportEntry(report, candidate.hangul)?.strengths ?? []}
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
                hanjaGlosses={matchReportEntry(report, expandedCandidate.hangul)?.hanjaGlosses ?? []}
                strengths={matchReportEntry(report, expandedCandidate.hangul)?.strengths ?? []}
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
