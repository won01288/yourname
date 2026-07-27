"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const THEME_EVENT = "yourname-theme-change";

function readTheme(): Theme {
  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

// design.md 1.2 — 다크모드는 CSS 변수 + data-theme 토글로 전환한다. 기본 테마는 다크이며,
// 시스템 설정과 무관하게 사용자가 토글로 라이트를 명시적으로 선택했을 때만 라이트가 된다.
// useSyncExternalStore로 localStorage를 구독해, effect 안에서 setState하는 대신
// 서버 스냅샷("dark" — 레이아웃의 인라인 스크립트가 실제 테마를 하이드레이션 전에 <html>에 반영)과
// 클라이언트 스냅샷을 안전하게 동기화한다.
function subscribe(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  return () => {
    window.removeEventListener(THEME_EVENT, callback);
  };
}

function getServerSnapshot(): Theme {
  return "dark";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  window.localStorage.setItem("theme", theme);
  window.dispatchEvent(new Event(THEME_EVENT));
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, getServerSnapshot);

  function toggle() {
    applyTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="다크모드 전환"
      className="flex h-11 w-11 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
    >
      {theme === "dark" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M20.5 14.7A8.5 8.5 0 1 1 9.3 3.5a7 7 0 0 0 11.2 11.2Z" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
