import type { ReactNode } from "react";

interface FeatureSectionProps {
  index: string;
  title: string;
  description: ReactNode;
  /** 섹션 배경을 한 단씩 교대해, "실제 결과 화면 하나를 이어붙인 느낌" 대신 각각 독립된
   * 제품 소개 블록처럼 보이게 한다. */
  tone?: "page" | "muted";
  children: ReactNode;
}

// 제품 상세 페이지형 레이아웃 — 위에는 이 기능이 왜 도움이 되는지 설명하는 카피, 아래에는 실제
// 결과 화면 폭(max-w-3xl, ResultsDashboard와 동일)에 맞춘 미리보기를 둔다. 표·그리드처럼 폭이
// 필요한 컴포넌트를 그대로 재사용하므로 실제 화면과 동일한 너비를 유지해야 어색하지 않다.
export default function FeatureSection({ index, title, description, tone = "page", children }: FeatureSectionProps) {
  return (
    <section className={tone === "muted" ? "bg-surface-muted py-14" : "py-14"}>
      <div className="mx-auto w-full max-w-3xl px-6">
        <div className="mb-6 max-w-xl">
          <span className="text-[13px] font-semibold tracking-wide text-brand-600">{index}</span>
          <h3 className="mt-2 text-[22px] font-bold leading-snug text-text-primary">{title}</h3>
          <p className="mt-3 text-[14px] leading-7 text-text-secondary">{description}</p>
        </div>
        {children}
      </div>
    </section>
  );
}
