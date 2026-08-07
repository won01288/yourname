import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import PageHero from "@/app/components/PageHero";

// 관리자 허브 — Nav.tsx의 "관리자" 링크가 가리키는 진입점. 개별 관리 화면(/admin/users,
// /admin/pricing, ...)을 카드로 나열만 하는 조회용 랜딩이라 계산 로직이 없다. 새 관리 기능이
// 생기면 이 배열에 한 줄만 추가하면 된다(CLAUDE.md 8.3 — 지금 당장 필요한 만큼만 구조화).
const ADMIN_SECTIONS = [
  {
    href: "/admin/users",
    title: "회원관리",
    description: "가입 시 수집된 회원 정보(이메일·가입 방식·연결된 소셜 계정)를 조회합니다.",
  },
  {
    href: "/admin/pricing",
    title: "가격관리",
    description: "프리미엄 작명 추천 개수(3/5/10개)별 가격을 직접 수정합니다.",
  },
  {
    href: "/admin/discount-codes",
    title: "할인코드 관리",
    description: "마케팅 채널로 배포할 할인코드를 만들고 할인율·유효기간을 관리합니다.",
  },
  {
    href: "/admin/inquiries",
    title: "회원문의관리",
    description: "회원이 남긴 문의에 답변하거나, 필요 시 문의를 삭제합니다.",
  },
];

export default async function AdminHubPage() {
  const currentUser = await getCurrentUser();
  if (!isAdminUser(currentUser)) {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col">
      <PageHero eyebrow="관리자" title="관리자" description="운영에 필요한 관리 기능 모음입니다." />

      <section className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-4 px-6 pb-16 sm:grid-cols-2">
        {ADMIN_SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group relative flex flex-col overflow-hidden rounded-card border border-border bg-surface p-6 shadow-[var(--shadow-card)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]"
          >
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand-400 to-brand-600" />
            <h2 className="text-[16px] font-semibold text-text-primary">{section.title}</h2>
            <p className="mt-2 flex-1 text-[13px] leading-6 text-text-secondary">{section.description}</p>
            <span
              aria-hidden="true"
              className="mt-4 flex items-center gap-1 text-[13px] font-semibold text-brand-600 transition-transform group-hover:translate-x-0.5"
            >
              이동하기 →
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
