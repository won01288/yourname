import type { Candidate } from "@/lib/naming/types";
import type { HanjaGloss } from "@/lib/llm/explain";
import ElementBadge from "./ElementBadge";
import HighlightBadges from "./HighlightBadges";

interface CandidateTileProps {
  candidate: Candidate;
  surnameHanja: string;
  isExpanded: boolean;
  hanjaGlosses: HanjaGloss[];
  strengths: string[];
  onClick: () => void;
}

// design.md 3.1(Phase 8 갱신) — 순위를 매기지 않으므로(CLAUDE.md 3.6) 모든 타일을 동일한 크기로
// 배치하고, 대신 각 후보의 강점 배지로 눈에 띄는 지점을 보여준다.
export default function CandidateTile({
  candidate,
  surnameHanja,
  isExpanded,
  hanjaGlosses,
  strengths,
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
      className={`group flex flex-col justify-between rounded-card border p-4 text-left transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)] ${
        isExpanded
          ? "border-brand-600 bg-brand-50 shadow-[var(--shadow-elevated)]"
          : "border-border bg-surface shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)]"
      }`}
    >
      <div>
        <p className="text-[20px] font-semibold text-text-primary">
          {surnameHanja}
          {hanjaText}
        </p>
        <p className="mt-1 text-[13px] text-text-secondary">{candidate.hangul}</p>
        {glossLine && <p className="mt-0.5 text-[11px] text-text-secondary">{glossLine}</p>}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {candidate.hanja.map((h) =>
          h.element ? <ElementBadge key={h.char} element={h.element} compact /> : null
        )}
      </div>

      <div className="mt-2">
        <HighlightBadges strengths={strengths} limit={2} />
      </div>
    </button>
  );
}
