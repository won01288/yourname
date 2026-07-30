import type { ReactNode } from "react";

// 사업자등록번호·연락처 등 아직 확정되지 않은 값을 표시하는 자리표시자.
// 실제 게시 전 이 컴포넌트로 감싼 값을 전부 실제 정보로 교체해야 한다.
export function Fill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded bg-amber-400/20 px-1 py-0.5 font-medium text-amber-700 dark:text-amber-300">
      {children}
    </span>
  );
}

export type LegalSection = {
  heading: string;
  body: ReactNode;
};

export default function LegalPage({
  title,
  effectiveDate,
  intro,
  sections,
}: {
  title: string;
  effectiveDate: ReactNode;
  intro?: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12 sm:py-16">
      <h1 className="text-[24px] font-bold text-text-primary">{title}</h1>
      <p className="mt-2 text-[13px] text-text-secondary">시행일: {effectiveDate}</p>
      {intro && <p className="mt-6 text-[14px] leading-7 text-text-secondary">{intro}</p>}
      <div className="mt-8 space-y-8 border-t border-border pt-8">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-[16px] font-semibold text-text-primary">{section.heading}</h2>
            <div className="mt-2 space-y-2 text-[14px] leading-7 text-text-secondary">
              {section.body}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
