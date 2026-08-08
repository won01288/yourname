import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import LogoutButton from "./LogoutButton";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

// design.md 3.4 — 글래스모피즘은 상단 고정 내비게이션과 모달에만 적용한다.
// 로그인 베타 — Nav는 Server Component라 getCurrentUser()를 직접 호출한다(레이아웃을 거쳐
// prop으로 내려줄 필요 없음). 단, cookies()를 읽으므로 이 Nav를 포함한 모든 라우트가
// 정적 프리렌더링에서 동적 렌더링으로 바뀐다 — 지금은 체감 영향이 작아 받아들이는 트레이드오프.
export default async function Nav() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)]">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-control text-[17px] font-semibold tracking-tight text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]"
        >
          {/* design.md 3.9 — "이름에 도장을 찍다"를 상징하는 도장(印) 모티프 로고. 원형 링에서
              살짝 회전한 사각 인장으로 교체(2026.8.7). */}
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" className="shrink-0 -rotate-6">
            <rect x="1.5" y="1.5" width="23" height="23" rx="6" fill="var(--brand-600)" />
            <rect x="6" y="6" width="14" height="14" rx="2.5" fill="none" stroke="var(--bg-page)" strokeWidth="1.4" />
          </svg>
          {/* 좁은 화면(360px대)에서 워드마크+링크 2개+토글이 한 줄에 빡빡해지지 않도록,
              가장 덜 중요한 워드마크 텍스트부터 숨긴다. 대신 아이콘 자체를 키워(20→26px) 텍스트가
              없어도 홈 버튼의 존재감이 nav 항목들에 밀리지 않게 한다. */}
          <span className="hidden xs:inline">유어네임</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/score"
            className="flex min-h-11 flex-col items-center justify-center rounded-control px-2 text-center font-medium text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)] sm:px-2.5"
          >
            {/* 모바일에선 "점수 확인" 한 줄 축약 대신 서비스명 "이름점수"를 의미 단위로 2줄에 나눠 보여준다. */}
            <span className="flex flex-col items-center text-[11px] leading-[1.2] sm:hidden">
              <span>이름</span>
              <span>점수</span>
            </span>
            <span className="hidden text-[13px] sm:inline">이름 점수 확인</span>
          </Link>
          <Link
            href="/naming"
            className="flex min-h-11 flex-col items-center justify-center rounded-control px-2 text-center font-medium text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)] sm:px-2.5"
          >
            <span className="flex flex-col items-center text-[11px] leading-[1.2] sm:hidden">
              <span>프리미엄</span>
              <span>작명</span>
            </span>
            <span className="hidden text-[13px] sm:inline">프리미엄 작명</span>
          </Link>
          {isAdminUser(user) && (
            <Link
              href="/admin"
              className="flex min-h-11 flex-col items-center justify-center rounded-control px-2 text-center font-medium text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)] sm:px-2.5"
            >
              <span className="text-[11px] leading-[1.2] sm:hidden">관리자</span>
              <span className="hidden text-[13px] sm:inline">관리자</span>
            </Link>
          )}
          {user ? (
            <>
              <Link
                href="/mypage"
                className="flex min-h-11 flex-col items-center justify-center rounded-control px-2 text-center font-medium text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)] sm:px-2.5"
              >
                <span className="flex flex-col items-center text-[11px] leading-[1.2] sm:hidden">
                  <span>마이</span>
                  <span>페이지</span>
                </span>
                <span className="hidden text-[13px] sm:inline">마이페이지</span>
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="flex min-h-11 items-center rounded-control px-2.5 text-[13px] font-medium text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="flex min-h-11 items-center rounded-control bg-gradient-to-r from-brand-400 to-brand-600 px-3 text-[13px] font-medium text-white shadow-[var(--shadow-brand-glow)] transition-all hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]"
              >
                회원가입
              </Link>
            </>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
