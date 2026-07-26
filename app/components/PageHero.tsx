import type { ReactNode } from "react";
import AmbientBackdrop from "./AmbientBackdrop";

interface PageHeroProps {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
}

// design.md 2장/3.6 — 랜딩·유료·무료 세 페이지가 전부 같은 히어로 톤(그라디언트 타이틀 + 앰비언트
// 배경 + 진입 애니메이션)을 쓰도록 공유한다. 이 마크업이 처음부터 셋 이상에서 필요해 추출했다(8.3).
export default function PageHero({ eyebrow, title, description }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden px-6 pt-16 pb-10 text-center sm:pt-24">
      <AmbientBackdrop />
      <div className="relative mx-auto w-full max-w-2xl">
        <p className="animate-hero-in text-[13px] font-medium tracking-wide text-brand-600" style={{ animationDelay: "0ms" }}>
          {eyebrow}
        </p>
        <h1
          className="animate-hero-in mt-3 bg-gradient-to-r from-brand-800 via-brand-600 to-[var(--glow-amber)] bg-clip-text text-[32px] font-extrabold leading-tight tracking-tight text-transparent sm:text-[44px]"
          style={{ animationDelay: "80ms" }}
        >
          {title}
        </h1>
        <p className="animate-hero-in mt-4 text-[15px] leading-7 text-text-secondary sm:text-base" style={{ animationDelay: "160ms" }}>
          {description}
        </p>
      </div>
    </section>
  );
}
