import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listInquiriesByUser } from "@/lib/db-auth";
import PageHero from "@/app/components/PageHero";
import InquiryPageClient from "@/app/components/InquiryPageClient";

// 회원 문의하기(CLAUDE.md 0.5). 목록은 여기서 lib/db-auth를 직접 호출해 서버에서 가져오고
// (CLAUDE.md 8.3), 등록 폼 + 낙관적 목록 갱신만 클라이언트 컴포넌트에 맡긴다.
export default async function MyPageInquiriesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/mypage/inquiries");
  }

  const items = await listInquiriesByUser(user.id);

  return (
    <main className="flex flex-1 flex-col">
      <PageHero
        eyebrow="마이페이지"
        title="문의하기"
        description="궁금한 점이나 불편한 점을 남겨 주시면 영업일 기준 1~3일 내에 답변드립니다."
      />

      <section className="mx-auto w-full max-w-2xl px-6 pb-16">
        <InquiryPageClient items={items} />
      </section>
    </main>
  );
}
