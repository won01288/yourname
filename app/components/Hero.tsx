// design.md 2장 — 키네틱 타이포그래피는 랜딩 히어로 진입 애니메이션에만 절제해서 사용한다.
export default function Hero() {
  return (
    <section className="mx-auto w-full max-w-2xl px-6 pt-16 pb-10 text-center sm:pt-24">
      <p
        className="animate-hero-in text-[13px] font-medium tracking-wide text-brand-600"
        style={{ animationDelay: "0ms" }}
      >
        사주 기반 정통 작명
      </p>
      <h1
        className="animate-hero-in mt-3 text-[32px] font-bold leading-tight tracking-tight text-text-primary sm:text-[44px]"
        style={{ animationDelay: "80ms" }}
      >
        아이의 사주를 읽고,
        <br />
        어울리는 이름을 찾습니다
      </h1>
      <p
        className="animate-hero-in mt-4 text-[15px] leading-7 text-text-secondary sm:text-base"
        style={{ animationDelay: "160ms" }}
      >
        생년월일시를 입력하면 사주를 분석해 용신을 도출하고, 발음오행·수리·자원오행을
        따져 근거가 분명한 이름 후보를 리포트로 보여드립니다.
      </p>
    </section>
  );
}
