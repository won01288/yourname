import type { ElementDistribution, Element } from "@/lib/naming/types";
import { ELEMENT_LABEL, elementColor } from "@/app/lib/element-style";

const ORDER: Element[] = ["木", "火", "土", "金", "水"];

// design.md 3.2 — 사주 요약 오행 분포 시각화. 총합은 항상 8 (CLAUDE.md 3.3.1 지장간 가중치 정규화).
export default function ElementDistributionChart({ distribution }: { distribution: ElementDistribution }) {
  const total = 8;
  return (
    <div className="flex flex-col gap-2.5">
      {ORDER.map((el) => {
        const value = distribution[el];
        const pct = Math.min(100, (value / total) * 100);
        return (
          <div key={el} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-[13px] font-medium text-text-secondary">{ELEMENT_LABEL[el]}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-pill bg-surface-muted">
              <div
                className="h-full rounded-pill transition-[width] duration-500 ease-out"
                style={{ width: `${pct}%`, background: elementColor(el) }}
              />
            </div>
            <span className="w-9 shrink-0 text-right text-[13px] tabular-nums text-text-secondary">
              {value.toFixed(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
