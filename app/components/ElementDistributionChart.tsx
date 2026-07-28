"use client";

import { useId } from "react";
import type { ElementDistribution, Element } from "@/lib/naming/types";
import { STEM_ELEMENT, ELEMENT_READING } from "@/lib/naming/config";
import { elementColor } from "@/app/lib/element-style";

const TOTAL = 8; // CLAUDE.md 3.3.1 — 지장간 가중치 정규화로 오행 분포 총합은 항상 8.

// 오행을 오각형 꼭짓점에 배치하는 고정 순서. 인접한 두 오행(i → i+1)이 상생(木生火·火生土·
// 土生金·金生水·水生木) 관계이고, 한 칸 건너(i → i+2)가 상극(木剋土·火剋金·土剋水·金剋木·
// 水剋火) 관계가 되도록 잡은 순서라 임의로 바꾸면 화살표 방향이 실제 오행 이론과 어긋난다.
const PENTAGON_ORDER: Element[] = ["木", "火", "土", "金", "水"];

const VIEW_W = 320;
const VIEW_H = 300;
const CX = 160;
const CY = 160;
const RADIUS = 98;
const NODE_R = 38;
const NODE_GAP = 3; // 원 테두리와 화살표 시작/끝 사이 여백

function nodePosition(index: number) {
  const angle = (-90 + index * 72) * (Math.PI / 180);
  return { x: CX + RADIUS * Math.cos(angle), y: CY + RADIUS * Math.sin(angle) };
}

const POSITIONS = PENTAGON_ORDER.map((_, i) => nodePosition(i));

// 두 노드 중심을 잇는 선분을 양끝 원의 반지름(+여백)만큼 안쪽으로 당겨, 화살표가 원 위에
// 겹치지 않고 테두리 바로 바깥에서 시작·끝나도록 만든다.
function trimmedEdge(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  const ux = dx / dist;
  const uy = dy / dist;
  return {
    start: { x: from.x + ux * (NODE_R + NODE_GAP), y: from.y + uy * (NODE_R + NODE_GAP) },
    end: { x: to.x - ux * (NODE_R + NODE_GAP), y: to.y - uy * (NODE_R + NODE_GAP) },
  };
}

interface ElementDistributionChartProps {
  distribution: ElementDistribution;
  // 사주 요약 헤더의 "일간: 戊(토)" 배지와 일간 오행 노드 강조용. 없으면 배지·강조를 생략한다.
  dayStem?: string;
}

// design.md 3.2 — 사주 요약 오행 분포 시각화. 오각형 꼭짓점에 오행 5개를 배치하고, 인접
// 꼭짓점을 잇는 실선 화살표로 상생(生) 순환을, 한 칸 건너 잇는 점선 화살표로 상극(剋)
// 관계를 함께 보여준다. 노드 안 퍼센트는 오행 분포(총합 8) 그대로이고, 생/극 화살표는
// 오행 이론 자체의 고정된 순환 구조를 그리는 장식이라 사주마다 방향이 달라지지 않는다.
export default function ElementDistributionChart({ distribution, dayStem }: ElementDistributionChartProps) {
  const uid = useId();
  const dayMasterElement = dayStem ? STEM_ELEMENT[dayStem] : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-text-secondary">오행 (생/극)</h3>
        {dayMasterElement && dayStem && (
          <p className="text-[12px] text-text-secondary">
            일간: <span className="font-semibold text-text-primary">{dayStem}</span>{" "}
            <span>({ELEMENT_READING[dayMasterElement]})</span>
          </p>
        )}
      </div>

      <div className="relative mx-auto w-full max-w-[320px] drop-shadow-[var(--shadow-chart)]" style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}>
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-full w-full" aria-hidden="true">
          <defs>
            <marker
              id={`${uid}-arrow-saeng`}
              viewBox="0 0 8 8"
              refX="8"
              refY="4"
              markerWidth="7"
              markerHeight="7"
              markerUnits="userSpaceOnUse"
              orient="auto"
            >
              <path d="M0,1 L8,4 L0,7 Z" fill="var(--text-secondary)" fillOpacity={0.85} />
            </marker>
            <marker
              id={`${uid}-arrow-keuk`}
              viewBox="0 0 8 8"
              refX="8"
              refY="4"
              markerWidth="7"
              markerHeight="7"
              markerUnits="userSpaceOnUse"
              orient="auto"
            >
              <path d="M0,1 L8,4 L0,7 Z" fill="var(--text-secondary)" fillOpacity={0.55} />
            </marker>
          </defs>

          {/* 상극(剋) — 한 칸 건너 노드를 잇는 점선 화살표, 오각별(pentagram) 형태 */}
          {PENTAGON_ORDER.map((_, i) => {
            const { start, end } = trimmedEdge(POSITIONS[i], POSITIONS[(i + 2) % 5]);
            return (
              <line
                key={`keuk-${i}`}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="var(--text-secondary)"
                strokeOpacity={0.55}
                strokeWidth={1.4}
                strokeDasharray="4 3"
                markerEnd={`url(#${uid}-arrow-keuk)`}
              />
            );
          })}

          {/* 상생(生) — 인접 노드를 잇는 실선 화살표, 오각형 둘레 */}
          {PENTAGON_ORDER.map((_, i) => {
            const { start, end } = trimmedEdge(POSITIONS[i], POSITIONS[(i + 1) % 5]);
            return (
              <line
                key={`saeng-${i}`}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="var(--text-secondary)"
                strokeOpacity={0.8}
                strokeWidth={2}
                markerEnd={`url(#${uid}-arrow-saeng)`}
              />
            );
          })}

          {/* 노드 — 오행별 원. 테두리는 오행색, 내부는 그 오행이 오행 분포(총합 8)에서 차지하는
              비율만큼 원 안쪽 바닥부터 같은 오행색으로 채운다(수위계/배터리 게이지와 같은 방식) —
              나머지는 뉴트럴 배경(design.md 1.5)으로 남아 "채워진 만큼"이 한눈에 보인다. 일간과
              같은 오행의 노드는 채우기와 별개로 바깥쪽에 --glow-amber 강조 링을 하나 더 둘러
              "이 사주의 일간이 여기 속한다"는 사실을 표시한다(새 판정이 아니라 이미 계산된
              dayStem→오행 매핑을 그대로 표시). */}
          {PENTAGON_ORDER.map((el, i) => {
            const pos = POSITIONS[i];
            const ratio = Math.min(1, distribution[el] / TOTAL);
            const pct = Math.round(ratio * 100);
            const isDayMaster = el === dayMasterElement;
            const fillR = NODE_R - 3; // 테두리 두께만큼 안쪽으로 들여, 채우기가 테두리를 침범하지 않게 한다.
            const fillHeight = fillR * 2 * ratio;
            return (
              <g key={el}>
                {isDayMaster && (
                  <circle cx={pos.x} cy={pos.y} r={NODE_R + 5} fill="none" stroke="var(--glow-amber)" strokeWidth={2.5} />
                )}
                <clipPath id={`${uid}-clip-${i}`}>
                  <circle cx={pos.x} cy={pos.y} r={fillR} />
                </clipPath>
                <circle cx={pos.x} cy={pos.y} r={NODE_R} fill="var(--bg-surface-muted)" stroke={elementColor(el)} strokeWidth={4.5} />
                {fillHeight > 0 && (
                  <rect
                    x={pos.x - fillR}
                    y={pos.y + fillR - fillHeight}
                    width={fillR * 2}
                    height={fillHeight}
                    fill={elementColor(el)}
                    opacity={0.9}
                    clipPath={`url(#${uid}-clip-${i})`}
                  />
                )}
                <text
                  x={pos.x}
                  y={pos.y - 3}
                  textAnchor="middle"
                  fill="var(--text-primary)"
                  paintOrder="stroke"
                  stroke="var(--bg-surface-muted)"
                  strokeWidth={3}
                  strokeLinejoin="round"
                  className="text-[15px] font-semibold"
                >
                  {ELEMENT_READING[el]}
                </text>
                <text
                  x={pos.x}
                  y={pos.y + 15}
                  textAnchor="middle"
                  fill="var(--text-primary)"
                  paintOrder="stroke"
                  stroke="var(--bg-surface-muted)"
                  strokeWidth={3}
                  strokeLinejoin="round"
                  className="text-[12px] font-medium tabular-nums"
                >
                  {pct}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex items-center justify-center gap-5 text-[12px] text-text-secondary">
        <span className="flex items-center gap-1.5">
          <svg width="20" height="8" viewBox="0 0 20 8" aria-hidden="true">
            <line x1="0" y1="4" x2="20" y2="4" stroke="var(--text-secondary)" strokeOpacity={0.8} strokeWidth={2} />
          </svg>
          생(生)
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="20" height="8" viewBox="0 0 20 8" aria-hidden="true">
            <line x1="0" y1="4" x2="20" y2="4" stroke="var(--text-secondary)" strokeOpacity={0.55} strokeWidth={1.4} strokeDasharray="4 3" />
          </svg>
          극(剋)
        </span>
      </div>
    </div>
  );
}
