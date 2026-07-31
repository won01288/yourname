import { redirect } from "next/navigation";
import PageHero from "@/app/components/PageHero";
import SignupForm from "@/app/components/SignupForm";
import SocialLoginButtons from "@/app/components/SocialLoginButtons";
import { getCurrentUser } from "@/lib/auth";

function sanitizeNext(next: string | undefined): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/";
}

export default async function SignupPage({
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
      <PageHero
        eyebrow="회원가입"
        title="이메일로 간편하게 시작하기"
        description="가입하면 이름 점수 확인·작명 결과를 나중에 다시 확인할 수 있어요."
      />
      <SignupForm next={safeNext} />
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
