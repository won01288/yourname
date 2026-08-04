import { notFound } from "next/navigation";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { listAllInquiriesForAdmin } from "@/lib/db-auth";
import PageHero from "@/app/components/PageHero";
import AdminInquiryPanel from "@/app/components/AdminInquiryPanel";

// 관리자 회원문의관리(CLAUDE.md 0.5) — app/admin/users/page.tsx와 동일하게 ADMIN_EMAILS 게이트를
// 쓴다. 답변대기 문의가 위로 오도록 lib/db-auth의 listAllInquiriesForAdmin이 이미 정렬해 반환한다.
export default async function AdminInquiriesPage() {
  const currentUser = await getCurrentUser();
  if (!isAdminUser(currentUser)) {
    notFound();
  }

  const items = await listAllInquiriesForAdmin();
  const pendingCount = items.filter((item) => item.answer === null).length;

  return (
    <main className="flex flex-1 flex-col">
      <PageHero
        eyebrow="관리자"
        title="회원문의관리"
        description={`총 ${items.length}건 · 답변대기 ${pendingCount}건`}
      />

      <section className="mx-auto w-full max-w-3xl px-6 pb-16">
        <AdminInquiryPanel items={items} />
      </section>
    </main>
  );
}
