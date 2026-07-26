import type { Candidate } from "@/lib/naming/types";
import type { HanjaGloss } from "@/lib/llm/explain";
import ElementBadge from "./ElementBadge";

interface CandidateTileProps {
  candidate: Candidate;
  surnameHanja: string;
  rank: number;
  isFirst: boolean;
  isExpanded: boolean;
  hanjaGlosses: HanjaGloss[];
  onClick: () => void;
}

// design.md 3.1 — 벤토 그리드: 1순위 후보는 큰 타일, 나머지는 작은 타일로 위계를 표현한다.
export default function CandidateTile({
  candidate,
  surnameHanja,
  rank,
  isFirst,
  isExpanded,
  hanjaGlosses,
  onClick,
}: CandidateTileProps) {
  const hanjaText = candidate.hanja.map((h) => h.char).join("");
  // "법 규, 오얏 리" 형태 — 훈(hanjaGlosses, LLM이 영어 뜻풀이를 번역) + 음(h.readings, DB 사실)을 조합한다.
  const glossLine = candidate.hanja
    .map((h) => {
      const gloss = hanjaGlosses.find((g) => g.char === h.char);
      return gloss ? `${gloss.hun} ${h.readings[0]}` : null;
    })
    .filter((line): line is string => line !== null)
    .join(", ");

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
        {glossLine && <p className="mt-0.5 text-[11px] text-text-secondary">{glossLine}</p>}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {candidate.hanja.map((h) =>
          h.element ? <ElementBadge key={h.char} element={h.element} compact /> : null
        )}
      </div>
    </button>
  );
}
