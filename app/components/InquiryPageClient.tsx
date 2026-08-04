"use client";

import { useState, type FormEvent } from "react";
import type { InquiryRow } from "@/lib/db-auth";

interface InquiryPageClientProps {
  items: InquiryRow[];
}

function formatDate(iso: string): string {
  // DB의 created_at/answered_at은 SQLite CURRENT_TIMESTAMP(UTC, "YYYY-MM-DD HH:MM:SS") 형식이라
  // Date가 그대로 파싱하도록 "T"를 넣어 ISO 형태로 보정한다.
  const date = new Date(iso.includes("T") ? iso : `${iso.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const MAX_CONTENT_LENGTH = 2000;

// 회원 문의하기(CLAUDE.md 0.5) 마이페이지 화면 — 새 문의 등록 폼 + 내 문의 목록(비공개, 다른
// 회원에게 노출되지 않음). 등록은 서버 컴포넌트를 거치지 않고 바로 목록에 반영해야 자연스러워
// 클라이언트 상태로 관리한다(app/components/SavedScoreList.tsx와 동일한 낙관적 갱신 패턴).
export default function InquiryPageClient({ items: initialItems }: InquiryPageClientProps) {
  const [items, setItems] = useState(initialItems);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setErrorMessage(null);

    let response: Response;
    try {
      response = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
    } catch {
      setErrorMessage("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      setSubmitting(false);
      return;
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setErrorMessage(body.error ?? "문의 등록에 실패했습니다.");
      setSubmitting(false);
      return;
    }

    const { inquiry } = (await response.json()) as { inquiry: InquiryRow };
    setItems((prev) => [inquiry, ...prev]);
    setContent("");
    setSubmitting(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleSubmit}
        className="relative rounded-card border border-border bg-surface p-6 shadow-[var(--shadow-elevated)] sm:p-8"
      >
        <div className="-mx-6 -mt-6 mb-5 h-[3px] rounded-t-card bg-gradient-to-r from-brand-400 to-brand-600 sm:-mx-8 sm:-mt-8" />
        <h2 className="mb-1 text-[16px] font-semibold text-text-primary">문의하기</h2>
        <p className="mb-4 text-[13px] leading-6 text-text-secondary">
          작성하신 문의는 다른 회원에게 공개되지 않으며, 영업일 기준 1~3일 내에 답변드립니다.
        </p>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={MAX_CONTENT_LENGTH}
          rows={5}
          required
          placeholder="문의하실 내용을 입력해 주세요."
          className="w-full resize-none rounded-control border border-border bg-surface px-3.5 py-2.5 text-[14px] leading-6 text-text-primary outline-none transition-colors focus:border-brand-400"
        />
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[12px] text-text-secondary">
            {content.length}/{MAX_CONTENT_LENGTH}자
          </span>
        </div>

        {errorMessage && (
          <p role="alert" className="mt-3 text-[13px] text-[var(--status-alert)]">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || content.trim().length === 0}
          className="mt-4 rounded-control bg-gradient-to-r from-brand-400 to-brand-600 px-4 py-3 text-[14px] font-medium text-white shadow-[var(--shadow-brand-glow)] transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
        >
          {submitting ? "등록 중…" : "문의 등록"}
        </button>
      </form>

      <div className="relative rounded-card border border-border bg-surface p-6 shadow-[var(--shadow-elevated)] sm:p-8">
        <div className="-mx-6 -mt-6 mb-5 h-[3px] rounded-t-card bg-gradient-to-r from-brand-400 to-brand-600 sm:-mx-8 sm:-mt-8" />
        <h2 className="mb-4 text-[16px] font-semibold text-text-primary">내 문의 내역</h2>

        {items.length === 0 ? (
          <p className="rounded-control border border-border bg-surface-muted p-4 text-[13px] text-text-secondary">
            등록한 문의가 없습니다.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => {
              const answered = item.answer !== null;
              return (
                <div key={item.id} className="rounded-control border border-border bg-surface-muted p-4">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span
                      className={`rounded-control px-2 py-0.5 text-[11px] font-medium ${
                        answered
                          ? "bg-brand-50 text-brand-800"
                          : "border border-border bg-surface text-text-secondary"
                      }`}
                    >
                      {answered ? "답변완료" : "답변대기"}
                    </span>
                    <span className="text-[12px] text-text-secondary">{formatDate(item.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-[14px] leading-6 text-text-primary">{item.content}</p>

                  {answered && (
                    <div className="mt-3 rounded-control border border-border bg-surface p-3">
                      <p className="mb-1 text-[12px] font-medium text-text-secondary">
                        관리자 답변 · {item.answeredAt ? formatDate(item.answeredAt) : ""}
                      </p>
                      <p className="whitespace-pre-wrap text-[14px] leading-6 text-text-primary">{item.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
