const STEPS = [
  { n: "01", title: "생년월일시 입력", body: "태어난 시각과 성씨만 입력하면 시작됩니다." },
  { n: "02", title: "사주 계산", body: "팔자를 세우고 오행 분포·신강신약·용신을 도출합니다." },
  { n: "03", title: "이름 후보 대조", body: "발음오행·수리사격·자원오행 조건을 모두 만족하는 이름만 후보가 됩니다." },
  { n: "04", title: "리포트 확인", body: "근거와 함께 후보 이름을 감정서 형태로 받아봅니다." },
];

// design.md 3.9 — 실제 파이프라인 순서를 그대로 보여주는 4단계. 번호가 장식이 아니라
// 정보(진행 순서)이므로 넘버링을 쓴다.
export default function HowItWorksSection() {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-xl text-center sm:mx-0 sm:text-left">
        <p className="flex items-center justify-center gap-2 text-[12.5px] font-bold tracking-wide text-brand-600 sm:justify-start">
          <span aria-hidden="true" className="h-[2px] w-[18px] bg-brand-600" />
          이렇게 진행됩니다
        </p>
        <h2 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight text-text-primary sm:text-[36px]">
          입력부터 리포트까지, 네 단계
        </h2>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-card border border-border bg-border sm:grid-cols-4">
        {STEPS.map((step) => (
          <div key={step.n} className="flex flex-col gap-2.5 bg-surface p-6">
            <span
              aria-hidden="true"
              className="text-[34px] font-extrabold leading-none text-transparent"
              style={{ WebkitTextStroke: "1.4px var(--brand-400)" }}
            >
              {step.n}
            </span>
            <h3 className="mt-1 text-[15px] font-bold text-text-primary">{step.title}</h3>
            <p className="text-[13px] leading-6 text-text-secondary">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
