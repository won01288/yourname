import LandingHero from "./components/LandingHero";
import ServiceCards from "./components/ServiceCards";

// CLAUDE.md 0장 — 두 서비스(무료 이름 점수 확인 / 프리미엄 작명)로 진입을 나누는 랜딩.
// 계산 로직 없음 — 카드 클릭으로 각 라우트(/score, /naming)에 진입한다.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <LandingHero />
      <ServiceCards />
    </main>
  );
}
