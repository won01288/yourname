import Link from "next/link";
import LandingHero from "./components/LandingHero";
import ServiceCards from "./components/ServiceCards";
import { getCurrentUser } from "@/lib/auth";

// CLAUDE.md 0장 — 두 서비스(무료 이름 점수 확인 / 프리미엄 작명)로 진입을 나누는 랜딩.
// 계산 로직 없음 — 카드 클릭으로 각 라우트(/score, /naming)에 진입한다.
// 회원 문의하기(0.5)는 로그인한 회원만 쓸 수 있는 기능이라, 비로그인 방문자에게는 노출하지 않고
// 로그인 상태일 때만 메인화면 하단에 진입 버튼을 보여준다.
export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="flex flex-1 flex-col">
      <LandingHero />
      <ServiceCards />
      {user && (
        <section className="mx-auto -mt-16 w-full max-w-3xl px-6 pb-24 text-center">
          <Link
            href="/mypage/inquiries"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-border bg-surface px-4 text-[14px] font-medium text-text-secondary shadow-[var(--shadow-card)] transition-colors hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]"
          >
            문의하기
          </Link>
        </section>
      )}
    </main>
  );
}
