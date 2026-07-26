import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

// design.md 3.4 — 글래스모피즘은 상단 고정 내비게이션과 모달에만 적용한다.
export default function Nav() {
  return (
    <header
      className="sticky top-0 z-40 border-b border-border"
      style={{ background: "var(--glass-bg)", backdropFilter: "blur(var(--glass-blur))", WebkitBackdropFilter: "blur(var(--glass-blur))" }}
    >
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="shrink-0">
            <circle cx="10" cy="10" r="8.2" fill="none" stroke="var(--brand-600)" strokeWidth="1.7" />
            <path d="M10 3.2 Q14.8 10 10 16.8" fill="none" stroke="var(--brand-600)" strokeWidth="1.7" />
          </svg>
          유어네임
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
