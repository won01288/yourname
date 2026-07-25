"use client";

import { useState } from "react";
import type { Saju, ElementDistribution, YongsinResult } from "@/lib/naming/types";
import ElementDistributionChart from "./ElementDistributionChart";
import ElementBadge from "./ElementBadge";

interface SajuReportCardProps {
  saju: Saju;
  elementDistribution: ElementDistribution;
  yongsin: YongsinResult;
}

const PILLARS: Array<{ key: keyof Saju; label: string }> = [
  { key: "year", label: "연주" },
  { key: "month", label: "월주" },
  { key: "day", label: "일주" },
  { key: "hour", label: "시주" },
];

// design.md 3.2 1단계 사주 요약 + 2단계(용신 근거)를 한 카드 안의 점진적 공개로 구성한다.
export default function SajuReportCard({ saju, elementDistribution, yongsin }: SajuReportCardProps) {
  const [showReason, setShowReason] = useState(false);

  return (
    <section className="mb-8 rounded-card border border-border bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
      <h2 className="mb-5 text-[16px] font-semibold text-text-primary">사주 요약</h2>

      <div className="mb-6 grid grid-cols-4 gap-2">
        {PILLARS.map(({ key, label }) => (
          <div key={key} className="rounded-control border border-border bg-surface-muted py-3 text-center">
            <p className="text-[11px] text-text-secondary">{label}</p>
            <p className="mt-1 text-[20px] font-semibold tracking-wide text-text-primary">
              {saju[key].stem}
              {saju[key].branch}
            </p>
          </div>
        ))}
      </div>

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
