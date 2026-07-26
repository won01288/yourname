"use client";

import { useState } from "react";

interface SajuStoryCardProps {
  title: string;
  body: string;
}

// design.md 3.2 아코디언 패턴 — 사주를 은유적으로 풀어낸 해설을 소제목 클릭으로 펼친다.
// 텍스트 자체는 LLM이 쓰지만, 재료가 된 사실(일간·오행 분포·용신·십신)은 전부 코드가 계산했다 (CLAUDE.md 2.3).
export default function SajuStoryCard({ title, body }: SajuStoryCardProps) {
  const [expanded, setExpanded] = useState(true);
  const paragraphs = body.split(/\n{2,}/).filter((p) => p.trim().length > 0);

  return (
    <section className="mb-8 rounded-card border border-border bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
      <h2 className="mb-4 text-[16px] font-semibold text-text-primary">사주풀이</h2>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <span className="flex items-start gap-1.5 text-[15px] font-semibold leading-6 text-text-primary">
          <span aria-hidden>✨</span>
          {title}
        </span>
        <span className="shrink-0 text-[13px] font-medium text-brand-600">{expanded ? "접기" : "펼치기"}</span>
      </button>

      {expanded && (
        <div className="animate-accordion-in mt-4 flex flex-col gap-3 border-t border-border pt-4 text-[14px] leading-7 text-text-primary">
          {paragraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      )}
    </section>
  );
}
