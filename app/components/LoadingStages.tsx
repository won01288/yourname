"use client";

import { useEffect, useRef, useState } from "react";
import AmbientBackdrop from "./AmbientBackdrop";

// design.md 3.3 — 실제 결정적 파이프라인(CLAUDE.md 2장) 단계를 그대로 보여주는 스테이지형 로딩.
// stages를 prop으로 받는 범용 컴포넌트다 — 유료(/naming)와 무료(/score)는 실제로 거치는 파이프라인
// 단계 수가 다르므로(무료는 LLM·후보탐색 단계가 없음), 각 라우트가 자신의 실제 단계만 넘겨야
// 정직한 연출이 된다(design.md 3.3 — 과장 연출 금지 원칙).
const DEFAULT_STAGES = [
  "사주팔자를 세우는 중",
  "오행 분포를 계산하는 중",
  "용신을 도출하는 중",
  "이름 후보를 탐색하는 중",
  "인명용 한자·수리를 검증하는 중",
];

const STEP_MS = 900;

// 2026.7.30 — 유료 작명의 마지막 단계(LLM 해설 생성)는 몇 초 만에 끝나는 앞 단계들과 달리 실제로
// 수십 초씩 걸릴 수 있는데, 게이지가 곧바로 100%를 채우고 그대로 멈춰 있으면 "멈춘 것 아닌가" 하는
// 불안과 지루함을 준다. longFinalStage일 때만 마지막 단계 게이지를 이 값까지만 서서히(점근적으로)
// 채우고, 실제로 끝났을 때(isDone)만 100%로 채운다.
const FINAL_STAGE_PROGRESS_CAP = 96;
// 점근 곡선의 시간 상수(초) — 값이 클수록 더 천천히 증가한다. 25초 부근에서 캡의 약 63%까지 채워지는
// 정도로, 1분 넘게 기다려도 게이지가 계속(아주 조금씩) 움직이는 인상을 준다.
const TRICKLE_TAU_SECONDS = 25;

const FINAL_STAGE_HINTS = [
  "AI가 이 사주만의 이야기를 한 편의 글로 다듬고 있어요",
  "후보 이름마다 고유한 강점을 정리하고 있어요",
  "한자 훈음과 뜻풀이도 함께 준비하고 있어요",
  "다른 단계보다 이 단계가 가장 오래 걸려요",
  "소중한 이름을 위해 조금만 기다려주세요",
];
const HINT_ROTATE_MS = 4000;

// 2026.7.30 — 실제 /naming 호출을 여러 번 재서 확인한 결과 candidateCount=5가 약 80초,
// candidateCount=3이 약 95초로 나왔다. 후보 개수가 적을수록 빠를 거라는 가정과 달리 편차가 커서
// (LLM 응답 속도 자체의 변동성 때문으로 보인다), 개수별로 촘촘하게 차등을 두지 않고 넉넉한 여유를
// 둔 범위로 잡는다 — "최대"라고 안내해놓고 실제로 넘기면 안내 자체의 신뢰가 깎인다.
function estimateWaitLabel(candidateCount?: number): string {
  if (candidateCount !== undefined && candidateCount > 5) {
    return "보통 1분 30초~2분 30초 정도, 최대 3분 정도 걸릴 수 있어요";
  }
  return "보통 1~2분 정도, 최대 2분 30초 정도 걸릴 수 있어요";
}

interface LoadingStagesProps {
  /** 표시할 단계 텍스트 목록. 생략 시 유료 작명 파이프라인 기본값을 쓴다. */
  stages?: string[];
  /** 실제 API 요청이 끝났는지 여부. 끝나도 마지막 단계 연출은 최소 시간 유지한다. */
  isDone: boolean;
  onComplete: () => void;
  /** 마지막 단계가 유독 오래 걸릴 수 있음을 안내한다(LLM 해설 생성처럼 소요 시간을 예측하기 어려운
   * 단계). true면 마지막 단계에서 게이지를 끝까지 채우지 않고, 경과 시간·예상 소요 안내·안내 문구
   * 로테이션을 함께 보여준다. 무료 서비스(LLM 미호출, 실제로 오래 걸리지 않음)는 기본값 false로 둔다. */
  longFinalStage?: boolean;
  /** longFinalStage일 때 예상 소요 안내 문구를 조정하는 데만 쓴다(후보가 많을수록 해설 분량이
   * 늘어나 시간이 더 걸린다). */
  candidateCount?: number;
}

export default function LoadingStages({
  stages = DEFAULT_STAGES,
  isDone,
  onComplete,
  longFinalStage = false,
  candidateCount,
}: LoadingStagesProps) {
  const [index, setIndex] = useState(0);
  const completedRef = useRef(false);
  // 마지막 단계에 머문 시간(초). "진입 시각을 기록해 now와 비교"하는 대신 진입 후부터 1초씩
  // 직접 세어 올린다 — setInterval 콜백 안에서만 setState하면 되므로 effect 본문에서 곧바로
  // setState하는 걸 피할 수 있다(react-hooks/set-state-in-effect).
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [hintIndex, setHintIndex] = useState(0);

  const isFinalStage = index === stages.length - 1;

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => Math.min(prev + 1, stages.length - 1));
    }, STEP_MS);
    return () => clearInterval(timer);
  }, [stages.length]);

  useEffect(() => {
    if (index === stages.length - 1 && isDone && !completedRef.current) {
      completedRef.current = true;
      const t = setTimeout(onComplete, 350);
      return () => clearTimeout(t);
    }
  }, [index, isDone, onComplete, stages.length]);

  useEffect(() => {
    if (!longFinalStage || !isFinalStage || isDone) return;
    const t = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [longFinalStage, isFinalStage, isDone]);

  useEffect(() => {
    if (!longFinalStage || !isFinalStage || isDone) return;
    const t = setInterval(() => setHintIndex((i) => (i + 1) % FINAL_STAGE_HINTS.length), HINT_ROTATE_MS);
    return () => clearInterval(t);
  }, [longFinalStage, isFinalStage, isDone]);

  const showLongWaitUi = longFinalStage && isFinalStage && !isDone;

  let progress: number;
  if (isDone) {
    progress = 100;
  } else if (longFinalStage && isFinalStage) {
    const baseProgress = ((stages.length - 1) / stages.length) * 100;
    progress =
      baseProgress +
      (FINAL_STAGE_PROGRESS_CAP - baseProgress) * (1 - Math.exp(-elapsedSeconds / TRICKLE_TAU_SECONDS));
  } else {
    progress = ((index + 1) / stages.length) * 100;
  }

  return (
    <section className="relative mx-auto flex w-full max-w-md flex-col items-center overflow-hidden px-6 py-24">
      {/* 카드 내부가 아니라 카드 뒤 배경에만 앰비언트를 둔다 — AmbientBackdrop.tsx 사용 원칙 준수 */}
      <AmbientBackdrop />
      <div className="relative w-full rounded-card border border-border bg-surface p-8 shadow-[var(--shadow-elevated)]">
        <p role="status" aria-live="polite" className="sr-only">
          {stages[index]} ({index + 1}/{stages.length}단계)
        </p>

        <div className="mb-6 text-center">
          <h2 className="text-[17px] font-semibold text-text-primary">결과를 준비하고 있어요</h2>
          <p className="mt-1 text-[13px] text-text-secondary">실제 계산 과정을 그대로 보여드릴게요</p>
        </div>

        <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <ul className="flex flex-col gap-4" aria-hidden="true">
          {stages.map((label, i) => {
            const state = i < index ? "done" : i === index ? "active" : "pending";
            return (
              <li key={label} className="flex items-center gap-3">
                <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                  {state === "active" && (
                    <span className="absolute h-full w-full animate-ping rounded-full bg-brand-400 opacity-50" />
                  )}
                  <span
                    className={`relative flex h-5 w-5 items-center justify-center rounded-full border text-[11px] transition-colors ${
                      state === "done"
                        ? "border-brand-600 bg-brand-600 text-white"
                        : state === "active"
                          ? "border-brand-600 bg-surface text-brand-600"
                          : "border-border text-text-secondary"
                    }`}
                  >
                    {state === "done" ? "✓" : i + 1}
                  </span>
                </span>
                <span
                  className={`text-[14px] transition-colors ${
                    state === "pending" ? "text-text-secondary" : "text-text-primary"
                  } ${state === "active" ? "font-medium" : ""}`}
                >
                  {label}
                </span>
                {state === "active" && (
                  <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-brand-600" />
                )}
              </li>
            );
          })}
        </ul>

        {showLongWaitUi && (
          <div
            className="mt-5 rounded-control border border-border bg-[color-mix(in_srgb,var(--brand-400)_8%,var(--bg-surface))] px-3.5 py-3 text-center"
            aria-live="polite"
          >
            <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[12px] text-text-secondary">
              <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                  className="shrink-0 text-brand-600"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3.2 2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="tabular-nums">{elapsedSeconds}초 경과</span>
              </span>
              <span className="shrink-0 text-border" aria-hidden="true">
                ·
              </span>
              <span>{estimateWaitLabel(candidateCount)}</span>
            </p>
            <p key={hintIndex} className="animate-accordion-in mt-1.5 text-[12px] text-text-secondary/80">
              {FINAL_STAGE_HINTS[hintIndex]}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
