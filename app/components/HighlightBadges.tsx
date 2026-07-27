import type { CandidateHighlight } from "@/lib/naming/types";

// Phase 8 — 순위 대신 각 후보의 강점을 보여주는 배지(CLAUDE.md 3.6). 문장형 label(candidates.ts가
// 계산)은 상세 화면에 그대로 쓰고, 타일처럼 좁은 공간에서는 짧은 표시용 텍스트로 줄여 보여준다.
// 이 축약은 새로운 판단이 아니라 이미 계산된 사실을 짧게 다시 쓴 것뿐이다.
const SHORT_LABEL: Record<CandidateHighlight["key"], string> = {
  phoneticFlow: "발음오행 상생",
  numerology: "수리 4격 길격",
  wonhaeng: "용신 자원오행 일치",
  common: "친숙한 한자",
  yinYang: "음양 균형",
  frequency: "실사용 빈도 상위",
};

// 후보마다 다른 값을 갖는 항목(용신 일치·친숙도·음양·빈도)을 먼저 보여주고, 모든 후보가 공통으로
// 만족하는 기본 항목(발음오행·수리)은 부각할 차별점이 없을 때만 채워 넣는다.
const DISTINCTIVE_KEYS = new Set<CandidateHighlight["key"]>(["wonhaeng", "common", "yinYang", "frequency"]);

export function pickDisplayHighlights(highlights: CandidateHighlight[], limit: number): CandidateHighlight[] {
  const distinctive = highlights.filter((h) => DISTINCTIVE_KEYS.has(h.key));
  const baseline = highlights.filter((h) => !DISTINCTIVE_KEYS.has(h.key));
  return [...distinctive, ...baseline].slice(0, limit);
}

interface HighlightBadgesProps {
  highlights: CandidateHighlight[];
  limit?: number;
}

export default function HighlightBadges({ highlights, limit = 2 }: HighlightBadgesProps) {
  const shown = pickDisplayHighlights(highlights, limit);
  if (shown.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((h) => (
        <span
          key={h.key}
          className="rounded-pill bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-800"
        >
          {SHORT_LABEL[h.key]}
        </span>
      ))}
    </div>
  );
}
