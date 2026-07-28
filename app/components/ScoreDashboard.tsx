"use client";

import Link from "next/link";
import type { ScoreApiResult } from "@/app/lib/score-client";
import ManseryeokTable from "./ManseryeokTable";
import ElementBadge from "./ElementBadge";
import ElementDistributionChart from "./ElementDistributionChart";
import LegalNotice from "./LegalNotice";
import AmbientBackdrop from "./AmbientBackdrop";

interface ScoreDashboardProps {
  data: ScoreApiResult;
  onRestart: () => void;
  /** 마이페이지에서 저장된 결과를 다시 볼 때 "다시 확인" 대신 쓸 라벨. 생략 시 기존 문구(하위호환). */
  restartLabel?: string;
}

const GRADE_DESCRIPTION: Record<string, string> = {
  S: "발음오행·수리·자원오행·음양이 두루 조화로운 이름입니다.",
  A: "대부분의 기준을 잘 충족하는 좋은 이름입니다.",
  B: "무난한 이름이지만 아쉬운 부분이 있습니다.",
  C: "몇 가지 기준에서 개선 여지가 있습니다.",
  D: "여러 기준에서 아쉬운 부분이 많습니다.",
};

function CategoryBar({ label, points, maxPoints, applicable }: { label: string; points: number; maxPoints: number; applicable: boolean }) {
  const ratio = applicable && maxPoints > 0 ? Math.round((points / maxPoints) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[13px]">
        <span className="font-medium text-text-primary">{label}</span>
        <span className="text-text-secondary">{applicable ? `${points}/${maxPoints}점` : "해당 없음"}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-pill bg-surface-muted">
        {applicable && (
          <div
            className="h-full rounded-pill bg-gradient-to-r from-brand-400 to-brand-600"
            style={{ width: `${ratio}%` }}
          />
        )}
      </div>
    </div>
  );
}

// design.md — 무료 서비스 결과 화면. LLM 산문이 없으므로 수치·배지 중심으로 전문성을 표현한다.
export default function ScoreDashboard({ data, onRestart, restartLabel }: ScoreDashboardProps) {
  const { saju, elementDistribution, yongsin, manseryeok, surname, givenName, score } = data;
  const hanjaText = givenName.map((h) => h.char).join("");
  const hangulText = givenName.map((h) => h.readings[0] ?? h.char).join("");

  return (
    <div className="mx-auto w-full max-w-3xl px-6 pb-8 pt-10">
      <div className="relative mb-6 overflow-hidden rounded-card">
        <AmbientBackdrop />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold text-text-primary">
              {surname.hangul}(<span className="text-brand-600">{surname.hanja}</span>){hanjaText} 이름 점수
            </h1>
            {saju && <p className="mt-1 text-[13px] text-text-secondary">일간 {saju.day.stem} 기준 분석</p>}
          </div>
          <button
            type="button"
            onClick={onRestart}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-control border border-border bg-surface px-3.5 py-2 text-[13px] font-medium text-text-primary transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
          >
            {restartLabel ?? "다시 확인"}
          </button>
        </div>
      </div>

      <section className="relative mb-8 rounded-card border border-border bg-surface p-6 text-center shadow-[var(--shadow-elevated)] sm:p-8">
        <div className="-mx-6 -mt-6 mb-6 h-[3px] rounded-t-card bg-gradient-to-r from-brand-400 to-brand-600 sm:-mx-8 sm:-mt-8" />
        <p className="text-[13px] font-medium text-text-secondary">{surname.hanja}{hanjaText} ({surname.hangul}{hangulText})</p>
        <div className="mt-2 flex items-center justify-center gap-3">
          <span className="text-[56px] font-bold leading-none text-text-primary">{score.totalScore}</span>
          <span className="rounded-pill bg-brand-50 px-3 py-1 text-[18px] font-bold text-brand-800">{score.grade}</span>
        </div>
        <p className="mt-3 text-[14px] text-text-secondary">{GRADE_DESCRIPTION[score.grade]}</p>

        {score.warnings.length > 0 && (
          <div className="mt-6 flex flex-col gap-2 rounded-control border border-[var(--status-alert)] bg-[color-mix(in_srgb,var(--status-alert)_10%,transparent)] p-4 text-left">
            {score.warnings.map((w, i) => (
              <p key={i} className="text-[13px] leading-6 text-[var(--status-alert)]">
                <span className="font-semibold">{w.char}</span> — {w.message}
              </p>
            ))}
          </div>
        )}
      </section>

      <section className="relative mb-8 rounded-card border border-border bg-surface p-6 shadow-[var(--shadow-elevated)] sm:p-8">
        <div className="-mx-6 -mt-6 mb-5 h-[3px] rounded-t-card bg-gradient-to-r from-brand-400 to-brand-600 sm:-mx-8 sm:-mt-8" />
        <h2 className="mb-5 text-[16px] font-semibold text-text-primary">항목별 점수</h2>
        <div className="flex flex-col gap-4">
          {score.categories.map((c) => (
            <CategoryBar key={c.key} label={c.label} points={c.points} maxPoints={c.maxPoints} applicable={c.applicable} />
          ))}
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <h3 className="mb-2.5 text-[13px] font-semibold text-text-secondary">발음오행 흐름</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            {score.phoneticLinks.map((link, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i === 0 && <ElementBadge element={link.from} compact />}
                <span className="text-[11px] text-text-secondary">{link.grade}</span>
                <ElementBadge element={link.to} compact />
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <h3 className="mb-2.5 text-[13px] font-semibold text-text-secondary">수리사격 (원형이정)</h3>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {score.numerology.map((g) => (
              <div key={g.label} className="rounded-control border border-border bg-surface-muted px-3 py-2.5 text-center">
                <p className="text-[11px] text-text-secondary">{g.label}</p>
                <p className="mt-0.5 text-[18px] font-semibold text-text-primary">{g.number}</p>
                <p className="text-[11px] text-text-secondary">{g.fortune}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ManseryeokTable manseryeok={manseryeok} />

      <section className="relative mb-8 rounded-card border border-border bg-surface p-6 shadow-[var(--shadow-elevated)] sm:p-8">
        <div className="-mx-6 -mt-6 mb-5 h-[3px] rounded-t-card bg-gradient-to-r from-brand-400 to-brand-600 sm:-mx-8 sm:-mt-8" />
        <h2 className="mb-5 text-[16px] font-semibold text-text-primary">사주 요약</h2>
        <ElementDistributionChart distribution={elementDistribution} dayStem={saju?.day.stem} />
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-5">
          <span className="rounded-pill bg-brand-50 px-2.5 py-1 text-[12px] font-medium text-brand-800">{yongsin.strength}</span>
          <span className="text-[13px] text-text-secondary">용신</span>
          {yongsin.yongsin.map((el) => (
            <ElementBadge key={el} element={el} />
          ))}
        </div>
        <p className="mt-3 text-[13px] leading-6 text-text-secondary">{yongsin.reason}</p>
      </section>

      {/* design.md 0장 — "무료라서 가벼워 보이지 않게": 업셀 카드도 다른 카드와 같은 중립 배경을
          쓰고, 브랜드 강조는 상단 액센트 바 하나로만 줘 "이 리포트는 부족하다"는 인상을 주지 않는다. */}
      <section className="relative mb-8 overflow-hidden rounded-card border border-border bg-surface p-6 text-center shadow-[var(--shadow-card)] sm:p-8">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand-400 to-brand-600" />
        <h2 className="text-[16px] font-semibold text-text-primary">더 완벽한 이름을 원하신다면</h2>
        <p className="mt-2 text-[13px] leading-6 text-text-secondary">
          사주 전체를 분석해 용신에 꼭 맞는 이름 후보와 전문가 수준의 상세 해설을 받아보세요.
        </p>
        <Link
          href="/naming"
          className="mt-4 inline-flex min-h-11 items-center rounded-control bg-gradient-to-r from-brand-400 to-brand-600 px-5 py-2.5 text-[14px] font-medium text-white shadow-[var(--shadow-brand-glow)] transition-all hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
        >
          프리미엄 작명 시작하기
        </Link>
      </section>

      <div className="-mx-6 mt-8">
        <LegalNotice />
      </div>
    </div>
  );
}
