import Link from "next/link";
import PageHero from "./PageHero";

// 정식 출시 전 프리미엄 작명 접근 제한(임시 게이트). 관리자 계정(lib/auth.ts isAdminUser)이 아닌
// 모든 접근에서 위저드 대신 이 안내만 보여준다 — /naming 직접 진입, 랜딩 카드·Nav 링크 클릭 어느
// 경로로 와도 서버 컴포넌트(app/naming/page.tsx)에서 이 컴포넌트로 대체되므로 단일 지점에서 막힌다.
export default function ServiceComingSoon() {
  return (
    <main className="flex flex-1 flex-col pb-20">
      <PageHero
        eyebrow="프리미엄 작명"
        title="서비스 준비 중입니다"
        description="프리미엄 작명은 정식 출시를 준비하고 있습니다. 오픈되면 가장 먼저 안내해 드릴게요."
      />
      <section className="mx-auto w-full max-w-md px-6 text-center">
        <div className="rounded-card border border-border bg-surface p-8 shadow-[var(--shadow-card)]">
          <p className="text-[14px] leading-6 text-text-secondary">
            그 사이에 무료 &ldquo;이름 점수 확인하기&rdquo;는 지금 바로 이용하실 수 있습니다.
          </p>
          <div className="mt-6 flex flex-col items-center gap-2.5">
            <Link
              href="/score"
              className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-control bg-gradient-to-r from-brand-400 to-brand-600 px-6 text-[14px] font-semibold text-white shadow-[var(--shadow-brand-glow)] transition-all hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]"
            >
              이름 점수 확인하러 가기
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/"
              className="flex min-h-11 w-full items-center justify-center rounded-control border border-border bg-surface px-6 text-[14px] font-medium text-text-primary transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]"
            >
              홈으로
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
