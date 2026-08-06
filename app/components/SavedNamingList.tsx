"use client";

import { useState } from "react";
import Link from "next/link";
import { CANDIDATE_COUNT_OPTIONS } from "@/lib/naming/config";

const MIN_CANDIDATE_TIER = Math.min(...CANDIDATE_COUNT_OPTIONS);

/** "같은 사주로 더 추천받기"(CLAUDE.md 0.6) — 루트 항목 밑에 누적되어 쌓이는 추가 라운드 하나. */
export interface SavedNamingAdditionalRound {
  id: number;
  candidateCount: number;
  /** 이 라운드에서 추천된 이름(한글) 목록. 예: ["동연", "동훈", "이준"]. */
  candidateNames: string[];
  createdAt: string;
}

export interface SavedNamingItem {
  id: number;
  createdAt: string;
  surnameLabel: string; // 예: "김(金)"
  candidateCount: number;
  /** 이 리포트에서 추천된 이름(한글) 목록. 예: ["동연", "동훈", "이준"]. */
  candidateNames: string[];
  /** 검색에 입력한 생년월일시. 예: "1993년 8월 23일 양력 08시 40분" */
  birthLabel: string;
  /** 세션의 최신 라운드(추가 라운드가 있으면 그중 최신, 없으면 이 항목 자신) 기준
   * "더 추천받기" 잔여 개수. */
  moreAvailableCount: number;
  /** 이 세션에서 이미 받은 추가 라운드들, 오래된 순(위에서 아래로 누적). 없으면 빈 배열. */
  additionalRounds: SavedNamingAdditionalRound[];
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
          className="flex flex-col gap-2 rounded-control border border-border bg-surface-muted px-4 py-3"
        >
          <div className="flex items-center justify-between gap-3">
            <Link href={`/mypage/naming/${item.id}`} className="flex-1 min-w-0">
              <p className="truncate text-[14px] font-medium text-text-primary">
                {item.surnameLabel}씨 작명 리포트 · 후보 {item.candidateCount}개
                {item.candidateNames.length > 0 && ` (${item.candidateNames.join(", ")})`}
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
          {/* "같은 사주로 더 추천받기"(CLAUDE.md 0.6) — 항상 루트 항목 바로 밑에 위치한다(1차
              추천 결과 밑). 잔여 개수는 세션의 최신 라운드 기준. */}
          {item.moreAvailableCount >= MIN_CANDIDATE_TIER && (
            <Link
              href={`/naming?more=1&parentId=${item.id}`}
              className="inline-flex min-h-11 w-fit items-center gap-1 self-start rounded-control border border-brand-600 px-4 text-[13px] font-semibold text-brand-600 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface-muted)]"
            >
              이름 더 추천받기 · 최대 {item.moreAvailableCount}개
            </Link>
          )}
          {/* 이미 받은 추가 라운드는 별도 상위 항목이 아니라 이 항목 밑에 누적해서 쌓인다 —
              라운드마다 몇 개를 더 받았는지·검색일시를 함께 보여준다. */}
          {item.additionalRounds.length > 0 && (
            <div className="flex flex-col gap-1 border-t border-border pt-2">
              {item.additionalRounds.map((round, i) => (
                <Link
                  key={round.id}
                  href={`/mypage/naming/${round.id}`}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 rounded-control px-2 py-1.5 text-[12px] text-text-secondary transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface-muted)]"
                >
                  <span className="font-medium text-text-primary">
                    {i + 2}차 추가 추천 결과 확인 · 후보 {round.candidateCount}개
                    {round.candidateNames.length > 0 && ` (${round.candidateNames.join(", ")})`}
                  </span>
                  <span>검색일시: {formatDateTime(round.createdAt)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
