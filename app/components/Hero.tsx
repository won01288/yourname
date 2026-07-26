import PageHero from "./PageHero";

// design.md 2장 — 키네틱 타이포그래피는 랜딩 히어로 진입 애니메이션에만 절제해서 사용한다.
// design.md 3.6 — 배경 앰비언트/모티프는 이 히어로 영역에만 적용한다.
export default function Hero() {
  return (
    <PageHero
      eyebrow="정통 기반 현대식 작명 서비스"
      title={
        <>
          사주를 깊이 읽고,
          <br className="hidden sm:inline" />
          {" "}가장 좋은 이름을 찾습니다
        </>
      }
      description={
        <>
          생년월일시를 입력하면 사주를 분석해 용신을 도출하고,
          <br className="hidden sm:inline" />
          {" "}발음오행·수리·자원오행을 따져 근거가 분명한 작명 레포트를 제공합니다.
        </>
      }
    />
  );
}
