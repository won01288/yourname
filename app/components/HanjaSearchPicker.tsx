"use client";

import { useState } from "react";
import type { Hanja } from "@/lib/naming/types";
import ElementBadge from "./ElementBadge";

export interface HanjaSelection {
  hangul: string;
  hanja: Hanja;
}

interface HanjaSearchPickerProps {
  label: string;
  selected: HanjaSelection | null;
  onSelect: (selection: HanjaSelection) => void;
  onClear: () => void;
}

// CLAUDE.md 3.10 — "한자 찾기": 한글 음 한 글자로 /api/hanja-search를 조회해 후보 한자 목록에서
// 고른다. 인명용 아님/불용문자도 걸러내지 않고 그대로 보여주며 경고 배지로만 구분한다(실제 이름은
// 등록 목록 밖 한자를 쓸 수도 있으므로).
export default function HanjaSearchPicker({ label, selected, onSelect, onClear }: HanjaSearchPickerProps) {
  const [query, setQuery] = useState("");
  // 검색 시점의 음을 별도로 고정한다 — 검색 후 query를 계속 입력창에서 수정할 수 있어(results는
  // 재검색 전까지 남아있음), 표시/선택 값이 실시간 query를 따라가면 결과 목록과 어긋날 수 있다.
  const [searchedReading, setSearchedReading] = useState("");
  const [results, setResults] = useState<Hanja[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    const reading = query.trim();
    if (reading.length !== 1) {
      setError("한글 음 한 글자를 입력하세요. 예: 서, 준");
      return;
    }
    setError(null);
    setLoading(true);
    setResults(null);
    try {
      const response = await fetch(`/api/hanja-search?reading=${encodeURIComponent(reading)}`);
      const body = (await response.json()) as { hanja?: Hanja[]; error?: string };
      if (!response.ok) {
        setError(body.error ?? "검색에 실패했습니다.");
        return;
      }
      setSearchedReading(reading);
      setResults(body.hanja ?? []);
    } catch {
      setError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  if (selected) {
    return (
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-text-primary">{label}</label>
        <div className="flex items-center justify-between rounded-control border border-brand-600 bg-brand-50 px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[20px] font-semibold text-text-primary">{selected.hanja.char}</span>
            <span className="text-[13px] text-text-secondary">
              {selected.hanja.hun ? `${selected.hanja.hun} ${selected.hangul}` : selected.hangul}
            </span>
            {selected.hanja.element && <ElementBadge element={selected.hanja.element} compact />}
          </div>
          <button
            type="button"
            onClick={onClear}
            className="rounded-control px-1.5 py-1 text-[12px] font-medium text-brand-600 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
          >
            다시 찾기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-text-primary">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
          placeholder="한글 음 입력 (예: 서)"
          maxLength={1}
          className="w-full rounded-control border border-border bg-surface px-3.5 py-2.5 text-[15px] text-text-primary outline-none transition-colors focus:border-brand-400"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          className="shrink-0 rounded-control border border-border bg-surface px-4 py-3 text-[14px] font-medium text-text-primary transition-colors hover:bg-surface-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
        >
          {loading ? "검색 중…" : "찾기"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-[12px] text-[var(--status-alert)]">
          {error}
        </p>
      )}

      {results && (
        <div className="mt-3">
          {results.length === 0 ? (
            <p className="rounded-control border border-border bg-surface-muted p-3.5 text-[13px] text-text-secondary">
              이 음으로 등록된 한자를 찾지 못했습니다.
            </p>
          ) : (
            <div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-0.5">
              {results.map((h) => (
                <button
                  key={h.char}
                  type="button"
                  onClick={() => onSelect({ hangul: searchedReading, hanja: h })}
                  className="flex items-center gap-3 rounded-control border border-border bg-surface-muted px-3.5 py-3 text-left transition-colors hover:border-brand-400 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-surface text-[22px] font-semibold text-text-primary">
                    {h.char}
                  </span>
                  <span className="flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[13px] font-medium text-text-primary">
                        {/* 한자에 음이 여럿이어도(예: 員=운/원) 실제로 검색한 음을 표시한다 —
                            readings[0]은 검색과 무관한 대표음일 수 있다. */}
                        {h.hun ? `${h.hun} ${searchedReading}` : searchedReading}
                      </span>
                      <span className="text-[12px] text-text-secondary">원획 {h.strokeOriginal}획</span>
                      {h.element && <ElementBadge element={h.element} compact />}
                    </span>
                    {(!h.isNameAllowed || h.isForbidden) && (
                      <span className="mt-1 flex flex-wrap gap-1.5">
                        {!h.isNameAllowed && (
                          <span className="rounded-pill bg-[color-mix(in_srgb,var(--status-alert)_16%,transparent)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--status-alert)]">
                            인명용 아님
                          </span>
                        )}
                        {h.isForbidden && (
                          <span className="rounded-pill bg-[color-mix(in_srgb,var(--status-alert)_16%,transparent)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--status-alert)]">
                            불용문자
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
