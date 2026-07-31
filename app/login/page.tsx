import { redirect } from "next/navigation";
import PageHero from "@/app/components/PageHero";
import LoginForm from "@/app/components/LoginForm";
import SocialLoginButtons from "@/app/components/SocialLoginButtons";
import { getCurrentUser } from "@/lib/auth";

// 로그인 베타 — "/"로 시작하지 않는 next 값(예: 외부 절대 URL)은 오픈 리다이렉트로 악용될 수
// 있어 무시하고 기본값("/")으로 대체한다. "//"로 시작하는 값(프로토콜 상대 URL)도 같은 이유로 배제.
function sanitizeNext(next: string | undefined): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = sanitizeNext(next);

  const user = await getCurrentUser();
  if (user) {
    redirect(safeNext);
  }

  return (
    <main className="flex flex-1 flex-col">
      <PageHero eyebrow="로그인" title="다시 만나서 반가워요" description="저장된 결과를 다시 확인하려면 로그인해 주세요." />
      <LoginForm next={safeNext} />
      <section className="mx-auto -mt-8 w-full max-w-md px-6 pb-16">
        <div className="mb-5 flex items-center gap-3 text-[12px] text-text-secondary">
          <div className="h-px flex-1 bg-border" />
          또는
          <div className="h-px flex-1 bg-border" />
        </div>
        <SocialLoginButtons next={safeNext} />
      </section>
    </main>
  );
}
