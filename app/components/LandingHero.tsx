import PageHero from "./PageHero";

// design.md 2장 — 키네틱 타이포그래피는 랜딩 히어로 진입 애니메이션에만. Hero.tsx(구 카피)는
// 유료 /naming 전용 소개로 이동했고, 이 컴포넌트는 두 서비스를 아우르는 중립 카피를 쓴다.
export default function LandingHero() {
  return (
    <PageHero
      eyebrow="정통 기반 현대식 작명 서비스"
      title={
        <>
          사주를 읽고, 이름의 이야기를
          <br className="hidden sm:inline" />
          {" "}함께 찾습니다
        </>
      }
      description={
        <>
          지금 쓰는 이름의 점수를 무료로 확인하거나, 사주 전체를 분석한 전문가 수준의
          <br className="hidden sm:inline" />
          {" "}작명 리포트로 완벽한 이름을 지어보세요.
        </>
      }
    />
  );
}
