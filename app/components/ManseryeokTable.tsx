import type { Manseryeok, ManseryeokPillar } from "@/lib/naming/types";
import { elementTintStyle } from "@/app/lib/element-style";

interface ManseryeokTableProps {
  manseryeok: Manseryeok;
}

// 전통 만세력 표는 시주→일주→월주→연주 순(오른쪽에서 왼쪽으로 읽는 전통 배열을 좌→우로 뒤집은 순서)으로 본다.
const PILLAR_KEYS: Array<keyof Pick<Manseryeok, "hour" | "day" | "month" | "year">> = ["hour", "day", "month", "year"];

function PillarColumn({ pillar }: { pillar: ManseryeokPillar }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-[11px] font-medium text-text-secondary">{pillar.label}</p>

      <div className="w-full rounded-control py-3 text-center" style={elementTintStyle(pillar.stem.element)}>
        <p className="text-[22px] font-semibold leading-none">{pillar.stem.hanja}</p>
        <p className="mt-1.5 text-[11px] opacity-80">
          {pillar.stem.reading} · {pillar.stem.tenGod}
        </p>
      </div>

      <div className="relative w-full rounded-control py-3 text-center" style={elementTintStyle(pillar.branch.element)}>
        {pillar.branch.isVoid && (
          <span className="absolute right-1 top-1 rounded-pill bg-surface px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
            공망
          </span>
        )}
        <p className="text-[22px] font-semibold leading-none">{pillar.branch.hanja}</p>
        <p className="mt-1.5 text-[11px] opacity-80">
          {pillar.branch.reading} · {pillar.branch.tenGod}
        </p>
      </div>

      <div className="w-full rounded-control border border-border bg-surface-muted px-1.5 py-2">
        {pillar.hiddenStems.map((h) => (
          <p
            key={h.stem}
            className={`text-center text-[11px] leading-5 ${h.isMain ? "font-semibold text-text-primary" : "text-text-secondary"}`}
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
export default function ManseryeokTable({ manseryeok }: ManseryeokTableProps) {
  return (
    <section className="relative mb-8 rounded-card border border-border bg-surface p-6 shadow-[var(--shadow-elevated)] sm:p-8">
      {/* design.md 4장 — 핵심 카드 상단 액센트 바 */}
      <div className="-mx-6 -mt-6 mb-5 h-[3px] rounded-t-card bg-gradient-to-r from-brand-400 to-brand-600 sm:-mx-8 sm:-mt-8" />
      <h2 className="mb-5 text-[16px] font-semibold text-text-primary">만세력</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-2">
        {PILLAR_KEYS.map((key) => (
          <PillarColumn key={key} pillar={manseryeok[key]} />
        ))}
      </div>
    </section>
  );
}
