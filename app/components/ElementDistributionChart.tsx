import type { ElementDistribution, Element } from "@/lib/naming/types";
import { ELEMENT_LABEL, elementColor, elementTintStyle } from "@/app/lib/element-style";

const ORDER: Element[] = ["木", "火", "土", "金", "水"];
const TOTAL = 8; // CLAUDE.md 3.3.1 — 지장간 가중치 정규화로 오행 분포 총합은 항상 8.

// 가로형 라운드 사각형 "도넛" 트랙의 SVG 좌표계. rx가 높이의 절반보다 작아 평평한 변이 남는
// 라운드 사각형이 되도록 잡았다(완전히 둥글면 알약/필 형태가 되어 버림).
const VIEW_W = 100;
const VIEW_H = 32;
const INSET = 5;
const RX = 7;
const STROKE_WIDTH = 13;
const RECT_X = INSET;
const RECT_Y = INSET;
const RECT_W = VIEW_W - INSET * 2;
const RECT_H = VIEW_H - INSET * 2;

// 세그먼트 사이 여백(둘레 길이 대비 %, pathLength=100 기준). 여백만큼 dash를 줄이고 슬롯
// 중앙에 배치해, strokeLinecap="round"로 끝을 둥글려도 이웃과 자연스럽게 떨어져 보인다.
const GAP = 1.6;
// 비중이 아주 작은 오행(예: 0.3/8)도 완전히 사라지지 않도록 보장하는 최소 dash 길이.
const MIN_DASH = 0.8;
// 세그먼트 위에 라벨을 직접 얹을 수 있는 최소 비중(%). 이보다 작은 조각은 라벨을 넣을
// 자리가 안 나오므로, 링 아래 범례 칩으로 뺀다. 라벨을 "오행명 / 퍼센트" 두 줄로 쌓아
// 폭을 좁혀둔 덕에, 한 줄로 나란히 쓸 때보다 더 작은 조각에도 들어갈 수 있다.
const INLINE_LABEL_THRESHOLD = 8;

// 라운드 사각형 둘레 위에서, 시작점(경로 시작 = 상단 변의 rx만큼 오른쪽 지점)부터
// 시계 방향으로 pct%(0~100) 만큼 이동한 지점의 좌표를 구한다. SVG의 stroke-dasharray가
// 실제로 그 둘레를 따라가는 방식과 동일한 순서(윗변 → 우상단 모서리 → 오른쪽 변 → …)로
// 계산하는 순수 함수라, 세그먼트 중간 지점에 라벨을 얹을 때 별도 DOM 측정 없이 쓸 수 있다.
function pointOnRoundedRect(pct: number, x: number, y: number, width: number, height: number, r: number) {
  const straightW = width - 2 * r;
  const straightH = height - 2 * r;
  const arcLen = (Math.PI * r) / 2;
  const total = 2 * straightW + 2 * straightH + 4 * arcLen;
  let d = ((pct % 100) / 100) * total;

  if (d <= straightW) return { x: x + r + d, y };
  d -= straightW;
  if (d <= arcLen) {
    const theta = -Math.PI / 2 + (d / arcLen) * (Math.PI / 2);
    return { x: x + width - r + r * Math.cos(theta), y: y + r + r * Math.sin(theta) };
  }
  d -= arcLen;
  if (d <= straightH) return { x: x + width, y: y + r + d };
  d -= straightH;
  if (d <= arcLen) {
    const theta = (d / arcLen) * (Math.PI / 2);
    return { x: x + width - r + r * Math.cos(theta), y: y + height - r + r * Math.sin(theta) };
  }
  d -= arcLen;
  if (d <= straightW) return { x: x + width - r - d, y: y + height };
  d -= straightW;
  if (d <= arcLen) {
    const theta = Math.PI / 2 + (d / arcLen) * (Math.PI / 2);
    return { x: x + r + r * Math.cos(theta), y: y + height - r + r * Math.sin(theta) };
  }
  d -= arcLen;
  if (d <= straightH) return { x, y: y + height - r - d };
  d -= straightH;
  const theta = Math.PI + (d / arcLen) * (Math.PI / 2);
  return { x: x + r + r * Math.cos(theta), y: y + r + r * Math.sin(theta) };
}

// design.md 3.2 — 사주 요약 오행 분포 시각화. 라운드 사각형 도넛 하나를 오행 5개 비율만큼
// 색으로 나누어 채운다(원형 도넛과 같은 논리 — 세그먼트 5개가 이어 붙어 링 전체를 이룸).
// SVG pathLength로 트랙 전체 길이를 100으로 정규화해, 각 세그먼트의 길이(dasharray)와
// 시작 위치(dashoffset)를 퍼센트 그대로 쓴다 — 실제 픽셀 둘레를 계산할 필요가 없다.
export default function ElementDistributionChart({ distribution }: { distribution: ElementDistribution }) {
  let cumulative = 0;
  const segments = ORDER.map((el) => {
    const value = distribution[el];
    const pct = Math.min(100, (value / TOTAL) * 100);
    const start = cumulative;
    cumulative += pct;
    const dashLen = Math.max(pct - GAP, Math.min(pct, MIN_DASH));
    const dashStart = start + (pct - dashLen) / 2;
    const mid = start + pct / 2;
    const showInline = pct >= INLINE_LABEL_THRESHOLD;
    const point = showInline ? pointOnRoundedRect(mid, RECT_X, RECT_Y, RECT_W, RECT_H, RX) : null;
    return { el, value, pct, dashLen, dashStart, showInline, point };
  });

  const legendItems = segments.filter((s) => !s.showInline);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* 가로 여백 없이 카드 폭을 최대한 채우되(w-full), 큰 화면에서는 max-w에서 멈추고
          mx-auto로 가운데 정렬한다. */}
      <div className="relative aspect-[100/32] w-full max-w-[640px] drop-shadow-[0_2px_6px_rgba(0,0,0,0.14)]">
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
          <rect
            x={INSET}
            y={INSET}
            width={RECT_W}
            height={RECT_H}
            rx={RX}
            ry={RX}
            fill="none"
            stroke="var(--bg-surface-muted)"
            strokeWidth={STROKE_WIDTH}
            pathLength={100}
          />
          {segments.map(({ el, dashLen, dashStart }) => (
            <rect
              key={el}
              x={INSET}
              y={INSET}
              width={RECT_W}
              height={RECT_H}
              rx={RX}
              ry={RX}
              fill="none"
              stroke={elementColor(el)}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={`${dashLen} ${100 - dashLen}`}
              strokeDashoffset={-dashStart}
              className="transition-[stroke-dasharray,stroke-dashoffset] duration-700 ease-out"
            />
          ))}
        </svg>
        {/* 자리가 넉넉한 조각은 그 조각 한가운데에 라벨을 직접 얹는다. 색 조각 위에 놓이는
            라벨이라 흰색 배경 칩을 따로 두지 않고 흰 글씨를 바로 얹는다(옅은 텍스트
            그림자만으로 밝은 오행색 위에서도 읽히게 한다) — 조각 밖으로 빠지는 나머지만
            아래에서 기존 틴트 배지 범례를 그대로 쓴다. */}
        {segments.map(
          ({ el, pct, showInline, point }) =>
            showInline &&
            point && (
              <span
                key={el}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center leading-none text-white"
                style={{
                  left: `${(point.x / VIEW_W) * 100}%`,
                  top: `${(point.y / VIEW_H) * 100}%`,
                  textShadow: "0 1px 2px rgba(0,0,0,0.35)",
                }}
              >
                <span className="text-[11px] font-semibold sm:text-[13px]">{ELEMENT_LABEL[el]}</span>
                <span className="mt-0.5 text-[11px] font-bold tabular-nums sm:text-[13px]">{Math.round(pct)}%</span>
              </span>
            )
        )}
      </div>
      {/* 자리가 안 나서 링 위에 못 얹은 나머지는 지금처럼 아래 범례에 표시한다. */}
      {legendItems.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {legendItems.map(({ el, pct }) => (
            <span
              key={el}
              className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[12px] font-medium"
              style={elementTintStyle(el)}
            >
              <span>{ELEMENT_LABEL[el]}</span>
              <span className="font-semibold tabular-nums">{Math.round(pct)}%</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
