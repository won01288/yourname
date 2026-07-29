interface SupportingFeature {
  title: string;
  description: string;
}

const FEATURES: SupportingFeature[] = [
  {
    title: "24시간, 원하는 시간에",
    description: "예약이나 방문 없이 언제든 온라인으로 시작할 수 있습니다.",
  },
  {
    title: "30일간 다시 보기",
    description: "로그인 후 생성한 리포트는 재계산 없이 저장되어, 마이페이지에서 몇 번이고 다시 확인할 수 있습니다.",
  },
  {
    title: "숨김 없는 계산 근거",
    description: "발음오행·수리사격·자원오행 등 모든 판정 과정을 리포트 안에서 그대로 확인할 수 있습니다.",
  },
];

// 위 FeatureSection 5개(핵심 기능)와 달리 전용 화면 미리보기가 없는 부가 장점들을 짧게 정리한
// 마무리 그리드. 새 카드 스타일을 만들지 않고 기존 카드 톤(border-border/bg-surface)을 재사용한다.
export default function SupportingFeatures() {
  return (
    <section className="py-14">
      <div className="mx-auto w-full max-w-3xl px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-card border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
              <p className="text-[14px] font-semibold text-text-primary">{feature.title}</p>
              <p className="mt-2 text-[13px] leading-6 text-text-secondary">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
