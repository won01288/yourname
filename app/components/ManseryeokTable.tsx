import type { Manseryeok, ManseryeokPillar } from "@/lib/naming/types";
import { elementTintStyle } from "@/app/lib/element-style";

interface ManseryeokTableProps {
  manseryeok: Manseryeok;
}

// 전통 만세력 표는 시주→일주→월주→연주 순(오른쪽에서 왼쪽으로 읽는 전통 배열을 좌→우로 뒤집은 순서)으로 본다.
const PILLAR_KEYS: Array<keyof Pick<Manseryeok, "hour" | "day" | "month" | "year">> = ["hour", "day", "month", "year"];

function PillarColumn({ pillar }: { pillar: ManseryeokPillar }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 sm:gap-2">
      <p className="truncate text-[11px] font-semibold text-text-secondary sm:text-[11px]">{pillar.label}</p>

      <div
        className="w-full rounded-control py-2 text-center sm:py-3"
        style={elementTintStyle(pillar.stem.element)}
      >
        <p className="text-[24px] font-bold leading-none sm:text-[26px]">{pillar.stem.hanja}</p>
        <p className="mt-1.5 truncate px-0.5 text-[11px] font-medium opacity-80 sm:mt-2 sm:text-[12px]">
          {pillar.stem.reading} · {pillar.stem.tenGod}
        </p>
      </div>

      <div
        className="relative w-full rounded-control py-2 text-center sm:py-3"
        style={elementTintStyle(pillar.branch.element)}
      >
        {pillar.branch.isVoid && (
          <span className="absolute right-0.5 top-0.5 rounded-control border border-dashed border-[var(--status-alert)] px-1 py-0.5 text-[8px] font-semibold text-[var(--status-alert)] sm:right-1 sm:top-1 sm:px-1.5 sm:text-[9px]">
            공망
          </span>
        )}
        <p className="text-[24px] font-bold leading-none sm:text-[26px]">{pillar.branch.hanja}</p>
        <p className="mt-1.5 truncate px-0.5 text-[11px] font-medium opacity-80 sm:mt-2 sm:text-[12px]">
          {pillar.branch.reading} · {pillar.branch.tenGod}
        </p>
      </div>

      <div className="flex w-full flex-col gap-0.5 rounded-control border border-border bg-surface-muted px-1.5 py-2 sm:gap-1">
        {pillar.hiddenStems.map((h) => (
          <p
            key={h.stem}
            className={`truncate text-center text-[11px] leading-5 sm:text-[12px] ${
              h.isMain ? "font-bold text-[var(--gold-deep)]" : "text-text-secondary"
            }`}
          >
            {h.stem}({h.reading}) {h.tenGod}
          </p>
        ))}
      </div>
    </div>
  );
}

// design.md 3.2 — 사주 요약 카드와 짝을 이루는 상세 만세력 표. 십신·지장간·공망은 전부
// lib/naming/manseryeok.ts가 결정적으로 계산한 값을 그대로 표시만 한다 (CLAUDE.md 2.1).
// design.md 4장(2026.8.7) — 좁은 화면에서 가로 스크롤(드래그) 대신 2×2 그리드로 재배열해,
// 4기둥이 항상 한 화면 안에 다 보이게 한다(시주·일주 위 행 / 월주·연주 아래 행).
export default function ManseryeokTable({ manseryeok }: ManseryeokTableProps) {
  return (
    <section className="relative mb-8 rounded-card border border-border bg-surface p-4 shadow-[var(--shadow-elevated)] sm:p-8">
      {/* design.md 4장 — 핵심 카드 상단 액센트 바 */}
      <div className="-mx-4 -mt-4 mb-5 h-[3px] rounded-t-card bg-gradient-to-r from-brand-400 to-brand-600 sm:-mx-8 sm:-mt-8" />
      <h2 className="mb-5 text-[16px] font-semibold text-text-primary">만세력</h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-2">
        {PILLAR_KEYS.map((key) => (
          <PillarColumn key={key} pillar={manseryeok[key]} />
        ))}
      </div>
    </section>
  );
}
