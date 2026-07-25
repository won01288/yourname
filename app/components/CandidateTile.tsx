import type { Candidate } from "@/lib/naming/types";
import ElementBadge from "./ElementBadge";

interface CandidateTileProps {
  candidate: Candidate;
  surnameHanja: string;
  rank: number;
  isFirst: boolean;
  isExpanded: boolean;
  onClick: () => void;
}

// design.md 3.1 — 벤토 그리드: 1순위 후보는 큰 타일, 나머지는 작은 타일로 위계를 표현한다.
export default function CandidateTile({ candidate, surnameHanja, rank, isFirst, isExpanded, onClick }: CandidateTileProps) {
  const hanjaText = candidate.hanja.map((h) => h.char).join("");

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col justify-between rounded-card border p-4 text-left transition-all hover:-translate-y-0.5 ${
        isFirst ? "col-span-2 row-span-2 p-6" : "col-span-1"
      } ${
        isExpanded
          ? "border-brand-600 bg-brand-50 shadow-[var(--shadow-elevated)]"
          : "border-border bg-surface shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)]"
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="rounded-pill bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-text-secondary">
          {rank}순위
        </span>
      </div>

      <div className="mt-3">
        <p className={`font-semibold text-text-primary ${isFirst ? "text-[28px]" : "text-[20px]"}`}>
          {surnameHanja}
          {hanjaText}
        </p>
        <p className={`mt-1 text-text-secondary ${isFirst ? "text-[15px]" : "text-[13px]"}`}>{candidate.hangul}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {candidate.hanja.map((h) =>
          h.element ? <ElementBadge key={h.char} element={h.element} compact /> : null
        )}
      </div>
    </button>
  );
}
