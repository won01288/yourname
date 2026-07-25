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
        <Link href="/" className="text-[17px] font-semibold tracking-tight text-text-primary">
          유어네임
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
