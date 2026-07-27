import type { ReactNode } from "react";
import AmbientBackdrop from "./AmbientBackdrop";

interface PageHeroProps {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  /**
   * design.md 2장 — 키네틱 타이포그래피(진입 애니메이션)와 40~56px 대형 타이틀은 랜딩 히어로에만
   * 쓰고, 결과 리포트·폼 같은 실사용 화면(=/naming, /score)에는 쓰지 않는다. "landing"만 애니메이션과
   * 대형 타이틀을 켜고, 기본값 "page"는 서브페이지 H1(28px)로 정적 렌더링한다.
   */
  variant?: "landing" | "page";
}

// design.md 2장/3.6 — 랜딩·유료·무료 세 페이지가 앰비언트 배경은 공유하되, 키네틱 타이포그래피는
// variant="landing"에서만 켠다(8.3 — 셋 이상에서 필요해 추출한 공유 마크업).
export default function PageHero({ eyebrow, title, description, variant = "page" }: PageHeroProps) {
  const isLanding = variant === "landing";
  const kinetic = isLanding ? "animate-hero-in" : "";

  return (
    <section className="relative overflow-hidden px-6 pt-16 pb-10 text-center sm:pt-24">
      <AmbientBackdrop />
      <div className="relative mx-auto w-full max-w-2xl">
        <p
          className={`${kinetic} text-[13px] font-medium tracking-wide text-brand-600`}
          style={isLanding ? { animationDelay: "0ms" } : undefined}
        >
          {eyebrow}
        </p>
        <h1
          className={`${kinetic} mt-3 bg-gradient-to-r from-brand-800 via-brand-600 to-[var(--glow-amber)] bg-clip-text font-extrabold leading-tight tracking-tight text-transparent ${
            isLanding ? "text-[40px] sm:text-[56px]" : "text-[28px]"
          }`}
          style={isLanding ? { animationDelay: "80ms" } : undefined}
        >
          {title}
        </h1>
        <p
          className={`${kinetic} mt-4 text-[15px] leading-7 text-text-secondary sm:text-base`}
          style={isLanding ? { animationDelay: "160ms" } : undefined}
        >
          {description}
        </p>
      </div>
    </section>
  );
}
