import Link from "next/link";

interface ServiceCardProps {
  href: string;
  badge: string;
  badgeTone: "free" | "premium";
  title: string;
  description: string;
  cta: string;
  icon: "score" | "naming";
}

function ServiceIcon({ icon, badgeTone }: { icon: "score" | "naming"; badgeTone: "free" | "premium" }) {
  return (
    <span
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-control ${
        badgeTone === "premium" ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-600"
      }`}
    >
      {icon === "score" ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8 12.5 10.5 15 16 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3.5 14 9l5.5 1-4 4 1 5.5-4.5-2.8-4.5 2.8 1-5.5-4-4L9 9z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

// design.md 6.1 — 랜딩 두 서비스 카드. 브랜드 컬러(--brand-600)는 공통으로 쓰되, "무료"/"프리미엄"
// 배지·아이콘 톤만으로 구분한다(과한 색 대비 지양, 기존 팔레트 재사용). 첫 진입 화면의 핵심 CTA라
// 다른 핵심 카드(입력 폼 등)와 동일하게 상단 액센트 바를 두어 무게감을 준다.
function ServiceCard({ href, badge, badgeTone, title, description, cta, icon }: ServiceCardProps) {
  return (
    <Link
      href={href}
      className={`group relative flex flex-col overflow-hidden rounded-card border bg-surface p-6 shadow-[var(--shadow-card)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)] sm:p-8 ${
        badgeTone === "premium" ? "border-brand-600" : "border-border"
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand-400 to-brand-600" />

      <div className="flex items-start justify-between">
        <ServiceIcon icon={icon} badgeTone={badgeTone} />
        <span
          className={`rounded-pill px-2.5 py-1 text-[11px] font-semibold ${
            badgeTone === "premium" ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-800"
          }`}
        >
          {badge}
        </span>
      </div>

      <h2 className="mt-5 text-[20px] font-bold text-text-primary">{title}</h2>
      <p className="mt-2.5 flex-1 text-[13px] leading-6 text-text-secondary">{description}</p>

      <span
        className={`mt-6 flex w-fit items-center gap-1.5 rounded-control px-4 py-2.5 text-[14px] font-semibold transition-all ${
          badgeTone === "premium"
            ? "bg-gradient-to-r from-brand-400 to-brand-600 text-white shadow-[var(--shadow-brand-glow)] group-hover:brightness-105"
            : "bg-brand-50 text-brand-800 group-hover:bg-brand-100"
        }`}
      >
        {cta}
        <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </span>
    </Link>
  );
}

export default function ServiceCards() {
  return (
    <section className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-5 px-6 pb-24 sm:grid-cols-2">
      <ServiceCard
        href="/score"
        badge="무료"
        badgeTone="free"
        icon="score"
        title="이름 점수 확인하기"
        description="이미 지어진 이름의 한자를 입력하면, 발음오행·수리사격·자원오행·음양 배열을 계산해 점수와 근거를 바로 알려드립니다."
        cta="점수 확인하기"
      />
      <ServiceCard
        href="/naming"
        badge="프리미엄"
        badgeTone="premium"
        icon="naming"
        title="프리미엄 작명"
        description="생년월일시로 사주를 분석해 용신을 도출하고, 조건에 맞는 이름 후보와 전문가 수준의 상세 해설 리포트를 받아보세요."
        cta="작명 시작하기"
      />
    </section>
  );
}
