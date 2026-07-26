import AmbientBackdrop from "./AmbientBackdrop";

// design.md 2장 — 키네틱 타이포그래피는 랜딩 히어로 진입 애니메이션에만 절제해서 사용한다.
// design.md 3.6 — 배경 앰비언트/모티프는 이 히어로 영역에만 적용한다.
export default function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-16 pb-10 text-center sm:pt-24">
      <AmbientBackdrop />
      <div className="relative mx-auto w-full max-w-2xl">
        <p
          className="animate-hero-in text-[13px] font-medium tracking-wide text-brand-600"
          style={{ animationDelay: "0ms" }}
        >
          정통 기반 현대식 작명 서비스
        </p>
        <h1
          className="animate-hero-in mt-3 bg-gradient-to-r from-brand-800 via-brand-600 to-[var(--glow-amber)] bg-clip-text text-[32px] font-extrabold leading-tight tracking-tight text-transparent sm:text-[44px]"
          style={{ animationDelay: "80ms" }}
        >
          아이의 사주를 읽고,
          <br />
          가장 좋은 이름을 찾습니다
        </h1>
        <p
          className="animate-hero-in mt-4 text-[15px] leading-7 text-text-secondary sm:text-base"
          style={{ animationDelay: "160ms" }}
        >
          생년월일시를 입력하면 사주를 분석해 용신을 도출하고, 
            <br />발음오행·수리·자원오행을
          따져 근거가 분명한 작명 레포트를 제공합니다.
        </p>
      </div>
    </section>
  );
}
