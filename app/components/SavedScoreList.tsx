"use client";

import { useState } from "react";
import Link from "next/link";
import { formatShortDateTimeFromSql } from "@/app/lib/date-format";

export interface SavedScoreItem {
  id: number;
  createdAt: string;
  nameLabel: string; // 예: "김서준"
  totalScore: number;
  grade: string;
  /** 검색에 입력한 생년월일시. 예: "93.8.23 08:40" */
  birthLabel: string;
}

interface SavedScoreListProps {
  items: SavedScoreItem[];
}

// 마이페이지 — 저장된 "이름 점수 확인" 결과 목록. 영구 보관이라 목록에 삭제 버튼이 필요하다
// (naming_result는 30일 자동 만료라 삭제 UI가 없음, app/mypage/page.tsx 참고).
export default function SavedScoreList({ items: initialItems }: SavedScoreListProps) {
  const [items, setItems] = useState(initialItems);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleDelete(id: number) {
    setErrorMessage(null);
    setDeletingId(id);
    try {
      const response = await fetch(`/api/history/score/${id}`, { method: "DELETE" });
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
        저장된 이름 점수 확인 결과가 없습니다.
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
          <Link href={`/mypage/score/${item.id}`} className="flex-1 min-w-0">
            <p className="truncate text-[14px] font-medium text-text-primary">
              {item.nameLabel} · {item.totalScore}점 ({item.grade})
            </p>
            <p className="text-[12px] text-text-secondary">생년월일시: {item.birthLabel}</p>
            <p className="text-[12px] text-text-secondary">
              검색일시: {formatShortDateTimeFromSql(item.createdAt)}
            </p>
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
