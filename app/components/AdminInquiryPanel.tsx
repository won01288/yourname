"use client";

import { useState } from "react";
import type { AdminInquiryRow } from "@/lib/db-auth";

interface AdminInquiryPanelProps {
  items: AdminInquiryRow[];
}

function formatDateTime(iso: string): string {
  const date = new Date(iso.includes("T") ? iso : `${iso.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const MAX_ANSWER_LENGTH = 4000;

// 관리자 회원문의관리(CLAUDE.md 0.5) — 답변 등록·삭제 후 전체 페이지 새로고침 없이 목록을 그
// 자리에서 갱신한다(app/components/SavedScoreList.tsx와 동일한 낙관적 갱신 패턴). 삭제는
// 되돌릴 수 없는 작업이라 confirm()으로 한 번 더 확인한다.
export default function AdminInquiryPanel({ items: initialItems }: AdminInquiryPanelProps) {
  const [items, setItems] = useState(initialItems);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [editingIds, setEditingIds] = useState<Set<number>>(new Set());
  const [busyId, setBusyId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function startEdit(id: number, currentAnswer: string) {
    setErrorMessage(null);
    setDrafts((prev) => ({ ...prev, [id]: currentAnswer }));
    setEditingIds((prev) => new Set(prev).add(id));
  }

  function cancelEdit(id: number) {
    setEditingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function handleAnswer(id: number) {
    const answer = (drafts[id] ?? "").trim();
    if (!answer) return;

    setErrorMessage(null);
    setBusyId(id);
    try {
      const response = await fetch(`/api/admin/inquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setErrorMessage(body.error ?? "답변 등록에 실패했습니다.");
        return;
      }
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, answer, answeredAt: new Date().toISOString() } : item
        )
      );
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setEditingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch {
      setErrorMessage("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("이 문의를 삭제하시겠습니까? 되돌릴 수 없습니다.")) return;

    setErrorMessage(null);
    setBusyId(id);
    try {
      const response = await fetch(`/api/admin/inquiries/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setErrorMessage(body.error ?? "삭제에 실패했습니다.");
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setErrorMessage("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return (
      <p className="rounded-control border border-border bg-surface-muted p-4 text-[13px] text-text-secondary">
        접수된 문의가 없습니다.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {errorMessage && (
        <p role="alert" className="text-[13px] text-[var(--status-alert)]">
          {errorMessage}
        </p>
      )}

      {items.map((item) => {
        const answered = item.answer !== null;
        const editing = editingIds.has(item.id);
        const busy = busyId === item.id;
        return (
          <div key={item.id} className="rounded-card border border-border bg-surface p-5 shadow-[var(--shadow-elevated)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-control px-2 py-0.5 text-[11px] font-medium ${
                    answered ? "bg-brand-50 text-brand-800" : "border border-border bg-surface-muted text-text-secondary"
                  }`}
                >
                  {answered ? "답변완료" : "답변대기"}
                </span>
                <span className="text-[13px] font-medium text-text-primary">
                  {item.userDisplayName ?? item.userEmail}
                </span>
                <span className="text-[12px] text-text-secondary">({item.userEmail})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-text-secondary">{formatDateTime(item.createdAt)}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  disabled={busy}
                  className="rounded-control px-2.5 py-1.5 text-[12px] font-medium text-[var(--status-alert)] transition-colors hover:bg-[color-mix(in_srgb,var(--status-alert)_12%,transparent)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
                >
                  삭제
                </button>
              </div>
            </div>

            <p className="mt-3 whitespace-pre-wrap rounded-control bg-surface-muted p-3 text-[14px] leading-6 text-text-primary">
              {item.content}
            </p>

            {answered && !editing ? (
              <div className="mt-3 rounded-control border border-border p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-[12px] font-medium text-text-secondary">
                    답변 · {item.answeredAt ? formatDateTime(item.answeredAt) : ""}
                  </p>
                  <button
                    type="button"
                    onClick={() => startEdit(item.id, item.answer ?? "")}
                    className="rounded-control px-2 py-1 text-[12px] font-medium text-brand-600 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
                  >
                    수정
                  </button>
                </div>
                <p className="whitespace-pre-wrap text-[14px] leading-6 text-text-primary">{item.answer}</p>
              </div>
            ) : (
              <div className="mt-3">
                <textarea
                  value={drafts[item.id] ?? ""}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  maxLength={MAX_ANSWER_LENGTH}
                  rows={3}
                  placeholder="답변을 입력해 주세요."
                  className="w-full resize-none rounded-control border border-border bg-surface px-3.5 py-2.5 text-[14px] leading-6 text-text-primary outline-none transition-colors focus:border-brand-400"
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAnswer(item.id)}
                    disabled={busy || (drafts[item.id] ?? "").trim().length === 0}
                    className="rounded-control bg-gradient-to-r from-brand-400 to-brand-600 px-3.5 py-2 text-[13px] font-medium text-white shadow-[var(--shadow-brand-glow)] transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
                  >
                    {busy ? "저장 중…" : editing ? "답변 수정" : "답변 등록"}
                  </button>
                  {editing && (
                    <button
                      type="button"
                      onClick={() => cancelEdit(item.id)}
                      disabled={busy}
                      className="rounded-control border border-border px-3.5 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-surface-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
                    >
                      취소
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
