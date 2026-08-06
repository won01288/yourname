"use client";

import { useState } from "react";
import Link from "next/link";

export interface SavedNamingItem {
  id: number;
  createdAt: string;
  surnameLabel: string; // 예: "김(金)"
  candidateCount: number;
  /** 검색에 입력한 생년월일시. 예: "1993년 8월 23일 양력 08시 40분" */
  birthLabel: string;
}

interface SavedNamingListProps {
  items: SavedNamingItem[];
}

function formatDateTime(iso: string): string {
  // DB의 created_at은 SQLite CURRENT_TIMESTAMP(UTC, "YYYY-MM-DD HH:MM:SS") 형식이라
  // Date가 그대로 파싱하도록 "T"를 넣어 ISO 형태로 보정한다.
  const date = new Date(iso.includes("T") ? iso : `${iso.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 마이페이지 — 저장된 "프리미엄 작명" 결과 목록. 30일 자동 만료와 별개로 사용자가
// 직접 삭제할 수 있다(app/api/history/naming/[id] DELETE).
export default function SavedNamingList({ items: initialItems }: SavedNamingListProps) {
  const [items, setItems] = useState(initialItems);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleDelete(id: number) {
    setErrorMessage(null);
    setDeletingId(id);
    try {
      const response = await fetch(`/api/history/naming/${id}`, { method: "DELETE" });
      if (!response.ok) {
        setErrorMessage("삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setErrorMessage("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setDeletingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <p className="rounded-control border border-border bg-surface-muted p-4 text-[13px] text-text-secondary">
        저장된 작명 결과가 없습니다.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {errorMessage && (
        <p role="alert" className="text-[13px] text-[var(--status-alert)]">
          {errorMessage}
        </p>
      )}
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between gap-3 rounded-control border border-border bg-surface-muted px-4 py-3"
        >
          <Link href={`/mypage/naming/${item.id}`} className="flex-1 min-w-0">
            <p className="truncate text-[14px] font-medium text-text-primary">
              {item.surnameLabel}씨 작명 리포트 · 후보 {item.candidateCount}개
            </p>
            <p className="text-[12px] text-text-secondary">생년월일시: {item.birthLabel}</p>
            <p className="text-[12px] text-text-secondary">검색일시: {formatDateTime(item.createdAt)}</p>
          </Link>
          <button
            type="button"
            onClick={() => handleDelete(item.id)}
            disabled={deletingId === item.id}
            className="shrink-0 rounded-control px-2.5 py-2 text-[12px] font-medium text-[var(--status-alert)] transition-colors hover:bg-[color-mix(in_srgb,var(--status-alert)_12%,transparent)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface-muted)]"
          >
            {deletingId === item.id ? "삭제 중…" : "삭제"}
          </button>
        </div>
      ))}
    </div>
  );
}
