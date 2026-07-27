// Phase 9(2026.7.27) — 순위 폐지 이후에도 후보별 강점 배지의 소재가 겹치는 문제(CLAUDE.md 3.6.2)를
// 고치기 위해, 코드가 계산한 고정 태그(4가지 조합뿐이라 후보 여럿이 쉽게 같은 배지를 갖는다) 대신
// 각 후보 한자의 고유한 뜻에 기반해 LLM이 만든 strengths 문구를 그대로 짧은 필 배지로 보여준다.
// (explainCandidates가 이미 후보 간 소재가 겹치지 않도록 프롬프트로 강제한다 — 2.3 역할 경계 안.)
interface HighlightBadgesProps {
  strengths: string[];
  limit?: number;
}

export default function HighlightBadges({ strengths, limit = 2 }: HighlightBadgesProps) {
  const shown = strengths.slice(0, limit);
  if (shown.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((s, i) => (
        <span key={i} className="rounded-pill bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-800">
          {s}
        </span>
      ))}
    </div>
  );
}
