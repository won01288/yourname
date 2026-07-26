"use client";

import { useState } from "react";
import type { ElementDistribution, YongsinResult } from "@/lib/naming/types";
import ElementDistributionChart from "./ElementDistributionChart";
import ElementBadge from "./ElementBadge";

interface SajuReportCardProps {
  elementDistribution: ElementDistribution;
  yongsin: YongsinResult;
}

// design.md 3.2 1단계 사주 요약 + 2단계(용신 근거)를 한 카드 안의 점진적 공개로 구성한다.
// 팔자 자체(간지)는 ManseryeokTable이 십신·지장간·공망까지 담아 더 상세히 보여주므로 여기서는 중복하지 않는다.
export default function SajuReportCard({ elementDistribution, yongsin }: SajuReportCardProps) {
  const [showReason, setShowReason] = useState(false);

  return (
    <section className="relative mb-8 rounded-card border border-border bg-surface p-6 shadow-[var(--shadow-elevated)] sm:p-8">
      {/* design.md 4장 — 핵심 카드 상단 액센트 바 */}
      <div className="-mx-6 -mt-6 mb-5 h-[3px] rounded-t-card bg-gradient-to-r from-brand-400 to-brand-600 sm:-mx-8 sm:-mt-8" />
      <h2 className="mb-5 text-[16px] font-semibold text-text-primary">사주 요약</h2>

      <h3 className="mb-2.5 text-[13px] font-semibold text-text-secondary">오행 분포</h3>
      <ElementDistributionChart distribution={elementDistribution} />

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-5">
        <span className="rounded-pill bg-brand-50 px-2.5 py-1 text-[12px] font-medium text-brand-800">
          {yongsin.strength}
        </span>
        <span className="text-[13px] text-text-secondary">용신</span>
        {yongsin.yongsin.map((el) => (
          <ElementBadge key={el} element={el} />
        ))}
        <button
          type="button"
          onClick={() => setShowReason((v) => !v)}
          className="ml-auto text-[13px] font-medium text-brand-600 hover:text-brand-800"
        >
          {showReason ? "근거 접기" : "근거 자세히"}
        </button>
      </div>

      {showReason && (
        <p className="animate-accordion-in mt-3 text-[13px] leading-6 text-text-secondary">{yongsin.reason}</p>
      )}
    </section>
  );
}
