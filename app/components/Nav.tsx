import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

// design.md 3.4 — 글래스모피즘은 상단 고정 내비게이션과 모달에만 적용한다.
export default function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)]">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-control text-[17px] font-semibold tracking-tight text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="shrink-0">
            <circle cx="10" cy="10" r="8.2" fill="none" stroke="var(--brand-600)" strokeWidth="1.7" />
            <path d="M10 3.2 Q14.8 10 10 16.8" fill="none" stroke="var(--brand-600)" strokeWidth="1.7" />
          </svg>
          {/* 좁은 화면(360px대)에서 워드마크+링크 2개+토글이 한 줄에 빡빡해지지 않도록,
              가장 덜 중요한 워드마크 텍스트부터 숨긴다. */}
          <span className="hidden xs:inline">유어네임</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/score"
            className="flex min-h-11 items-center rounded-control px-2.5 text-[13px] font-medium text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]"
          >
            <span className="sm:hidden">점수 확인</span>
            <span className="hidden sm:inline">이름 점수 확인</span>
          </Link>
          <Link
            href="/naming"
            className="flex min-h-11 items-center rounded-control px-2.5 text-[13px] font-medium text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]"
          >
            <span className="sm:hidden">작명</span>
            <span className="hidden sm:inline">프리미엄 작명</span>
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
