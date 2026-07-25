import type { Element } from "@/lib/naming/types";

// design.md 1.4 — 오행 5색은 데이터 시각화 전용. CSS 변수 이름만 여기서 매핑하고, 실제 값은 globals.css가 쥔다.
export const ELEMENT_VAR: Record<Element, string> = {
  木: "--element-wood",
  火: "--element-fire",
  土: "--element-earth",
  金: "--element-metal",
  水: "--element-water",
};

export const ELEMENT_LABEL: Record<Element, string> = {
  木: "목(木)",
  火: "화(火)",
  土: "토(土)",
  金: "금(金)",
  水: "수(水)",
};

export function elementColor(element: Element): string {
  return `var(${ELEMENT_VAR[element]})`;
}

export function elementTintStyle(element: Element): { color: string; background: string } {
  const varName = ELEMENT_VAR[element];
  return {
    color: `var(${varName})`,
    background: `color-mix(in srgb, var(${varName}) 14%, transparent)`,
  };
}
