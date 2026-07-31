import { signIn } from "@/lib/oauth";

// SNS 로그인(카카오/네이버) — 각 버튼은 next-auth의 signIn()을 호출하는 Server Action에
// 연결된 <form>이다(클라이언트 JS 없이 동작, 기존 프로젝트에 Server Action 사용례가 없어 새로
// 도입하지만 next-auth 공식 App Router 패턴이 이 방식이라 그대로 따른다). 로그인 성공 후 이동할
// 경로는 hidden input으로 넘긴다 — LoginForm의 next 처리와 동일한 목적.
async function signInWithKakao(formData: FormData) {
  "use server";
  await signIn("kakao", { redirectTo: (formData.get("next") as string) || "/" });
}

async function signInWithNaver(formData: FormData) {
  "use server";
  await signIn("naver", { redirectTo: (formData.get("next") as string) || "/" });
}

interface SocialLoginButtonsProps {
  next?: string;
}

export default function SocialLoginButtons({ next = "/" }: SocialLoginButtonsProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <form action={signInWithKakao}>
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-control bg-[#FEE500] px-4 text-[14px] font-medium text-[#191919] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
        >
          <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-[#191919] text-[11px] font-bold text-[#FEE500]">
            K
          </span>
          카카오로 계속하기
        </button>
      </form>

      <form action={signInWithNaver}>
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-control bg-[#03C75A] px-4 text-[14px] font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
        >
          <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#03C75A]">
            N
          </span>
          네이버로 계속하기
        </button>
      </form>
    </div>
  );
}
