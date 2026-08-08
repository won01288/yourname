import type { ReactNode } from "react";
import AmbientBackdrop from "./AmbientBackdrop";

interface PageHeroProps {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  /**
   * design.md 2장 — 키네틱 타이포그래피(진입 애니메이션)와 40~124px 대형 타이틀은 랜딩 히어로에만
   * 쓰고, 결과 리포트·폼 같은 실사용 화면(=/naming, /score)에는 쓰지 않는다. "landing"만 애니메이션과
   * 대형 타이틀·좌측 정렬 레이아웃·CTA·도장 그래픽을 켜고, 기본값 "page"는 서브페이지 H1(28px)로
   * 중앙 정렬 정적 렌더링한다.
   */
  variant?: "landing" | "page";
  /** variant="landing" 전용 — 히어로 안에 바로 두는 CTA 버튼 행. */
  cta?: ReactNode;
}

// design.md 2장/3.6/3.9 — 랜딩·유료·무료 세 페이지가 앰비언트 배경은 공유하되, 키네틱 타이포그래피와
// 초대형 스케일·좌측 정렬·도장/한자 모티프는 variant="landing"에서만 켠다(8.3 — 셋 이상에서 필요해
// 추출한 공유 마크업). 2026.8.8 — 시안 대비 어긋난 부분(중앙 정렬·타이틀 그라디언트 일괄 적용·CTA
// 부재·도장 그래픽 부재)을 시안 그대로 복원했다.
export default function PageHero({ eyebrow, title, description, variant = "page", cta }: PageHeroProps) {
  const isLanding = variant === "landing";
  const kinetic = isLanding ? "animate-hero-in" : "";

  return (
    <section
      className={`relative overflow-hidden px-6 pt-16 pb-10 sm:pt-24 ${isLanding ? "pb-20 text-left sm:pb-28" : "text-center"}`}
    >
      <AmbientBackdrop />
      {/* design.md 3.9 — 한자 워터마크. "이름"을 뜻하는 名을 초대형·저채도로 깔아 랜딩 정체성을 드러낸다. */}
      {isLanding && (
        <>
          <p
            aria-hidden="true"
            className="pointer-events-none absolute -right-[8%] -top-[6%] select-none text-[clamp(220px,34vw,480px)] font-extrabold leading-none text-text-primary opacity-[0.06]"
          >
            名
          </p>
          {/* 시안의 낙관(인장) 그래픽 — 히어로 우측 하단에 회전된 사각 도장. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 200 200"
            className="pointer-events-none absolute -bottom-10 right-[4%] hidden w-[clamp(150px,17vw,210px)] opacity-90 sm:block"
          >
            <g transform="rotate(-8 100 100)">
              <rect x="14" y="14" width="172" height="172" rx="20" fill="none" stroke="var(--brand-600)" strokeWidth="8" />
              <rect x="32" y="32" width="136" height="136" rx="10" fill="none" stroke="var(--brand-600)" strokeWidth="2.5" />
              <text x="100" y="122" textAnchor="middle" fontSize="66" fontWeight="800" fill="var(--brand-600)">
                名
              </text>
            </g>
          </svg>
        </>
      )}
      <div className={`relative mx-auto w-full ${isLanding ? "max-w-3xl" : "max-w-2xl"}`}>
        <p
          className={`${kinetic} inline-flex items-center gap-2 text-[13px] font-semibold tracking-wide text-brand-600`}
          style={isLanding ? { animationDelay: "0ms" } : undefined}
        >
          {isLanding && (
            <span
              aria-hidden="true"
              className="flex h-[18px] w-[18px] shrink-0 -rotate-6 items-center justify-center rounded-[5px] border-2 border-brand-600 text-[10px] font-bold"
            >
              印
            </span>
          )}
          {eyebrow}
        </p>
        <h1
          className={`${kinetic} mt-4 font-extrabold leading-[0.98] tracking-tight text-text-primary ${
            isLanding ? "text-[clamp(48px,9.5vw,124px)] tracking-[-0.03em]" : "text-[28px]"
          }`}
          style={isLanding ? { animationDelay: "80ms" } : undefined}
        >
          {title}
        </h1>
        <p
          className={`${kinetic} mt-5 text-[15px] leading-7 text-text-secondary sm:text-base ${isLanding ? "max-w-xl" : "mx-auto"}`}
          style={isLanding ? { animationDelay: "160ms" } : undefined}
        >
          {description}
        </p>
        {isLanding && cta && (
          <div className={`${kinetic} mt-9 flex flex-wrap items-center gap-3`} style={{ animationDelay: "220ms" }}>
            {cta}
          </div>
        )}
      </div>
    </section>
  );
}
