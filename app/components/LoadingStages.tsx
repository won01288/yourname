"use client";

import { useEffect, useRef, useState } from "react";

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

interface LoadingStagesProps {
  /** 표시할 단계 텍스트 목록. 생략 시 유료 작명 파이프라인 기본값을 쓴다. */
  stages?: string[];
  /** 실제 API 요청이 끝났는지 여부. 끝나도 마지막 단계 연출은 최소 시간 유지한다. */
  isDone: boolean;
  onComplete: () => void;
}

export default function LoadingStages({ stages = DEFAULT_STAGES, isDone, onComplete }: LoadingStagesProps) {
  const [index, setIndex] = useState(0);
  const completedRef = useRef(false);

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

  return (
    <section className="mx-auto flex w-full max-w-md flex-col items-center px-6 py-24">
      <div className="w-full rounded-card border border-border bg-surface p-8 shadow-[var(--shadow-card)]">
        <p role="status" aria-live="polite" className="sr-only">
          {stages[index]} ({index + 1}/{stages.length}단계)
        </p>
        <ul className="flex flex-col gap-4" aria-hidden="true">
          {stages.map((label, i) => {
            const state = i < index ? "done" : i === index ? "active" : "pending";
            return (
              <li key={label} className="flex items-center gap-3">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] transition-colors ${
                    state === "done"
                      ? "border-brand-600 bg-brand-600 text-white"
                      : state === "active"
                        ? "border-brand-600 text-brand-600"
                        : "border-border text-text-secondary"
                  }`}
                >
                  {state === "done" ? "✓" : i + 1}
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
      </div>
    </section>
  );
}
