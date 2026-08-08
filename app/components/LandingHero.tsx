import Link from "next/link";
import PageHero from "./PageHero";

// design.md 2장/3.9 — 키네틱 타이포그래피는 랜딩 히어로 진입 애니메이션에만. Hero.tsx(구 카피)는
// 유료 /naming 전용 소개로 이동했고, 이 컴포넌트는 두 서비스를 아우르는 중립 카피를 쓴다.
// 2026.8.8 — 파격 리디자인 시안(색 조화 재검토 라운드)의 히어로를 그대로 복원: "이름을, 추측"은
// 아웃라인(스트로크) 처리, "하지 않습니다."는 인주색 강조로 CLAUDE.md 2장의 핵심 차별점(결정적
// 계산 vs LLM 추측)을 타이포 자체로 보여준다. CTA 두 개도 시안대로 히어로 안에 바로 둔다.
export default function LandingHero() {
  return (
    <PageHero
      variant="landing"
      eyebrow="정통 사주 기반 작명 서비스"
      title={
        <>
          이름을,
          <br />
          <span className="text-transparent" style={{ WebkitTextStroke: "2.5px var(--text-primary)" }}>
            추측
          </span>
          <span className="text-brand-600">하지 않습니다.</span>
        </>
      }
      description="생년월일시로 사주를 세우고, 오행·용신·수리사격·인명용 한자까지 코드가 하나하나 대조합니다. AI는 이미 확정된 사실을 설명할 뿐, 새로운 판정을 만들지 않습니다."
      cta={
        <>
          <Link
            href="/score"
            className="flex min-h-11 items-center rounded-pill bg-brand-600 px-6 text-[14.5px] font-semibold text-white shadow-[var(--shadow-brand-glow)] transition-all hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]"
          >
            무료로 이름 점수 확인하기
          </Link>
          <Link
            href="/naming"
            className="flex min-h-11 items-center gap-1.5 rounded-pill border border-border px-6 text-[14.5px] font-semibold text-text-primary transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]"
          >
            프리미엄 작명 시작하기
            <span aria-hidden="true">→</span>
          </Link>
        </>
      }
    />
  );
}
