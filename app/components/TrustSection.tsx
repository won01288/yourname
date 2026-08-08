import ManseryeokTable from "./ManseryeokTable";
import ElementDistributionChart from "./ElementDistributionChart";
import { SAMPLE_ELEMENT_DISTRIBUTION, SAMPLE_MANSERYEOK, SAMPLE_DAY_STEM } from "@/app/lib/landing-sample-data";

const NO_ROWS = ["AI가 사주를 추측하거나 오행을 판단", "근거 없이 인기 있는 이름만 추천"];

const YES_ROWS = [
  "만세력 라이브러리로 팔자를 직접 계산",
  "81수리 전체를 대조해 길흉 판정",
  "인명용 한자 9,063자 전수 검증",
];

// design.md 3.9 — 랜딩 전용 "신뢰 증명" 섹션. CLAUDE.md 2장의 결정적/해석적 계층 경계를
// 대비 리스트로 보여주고, 실제 ManseryeokTable/ElementDistributionChart 컴포넌트를 예시
// 사주로 그대로 재사용해 "과장 없는 증거"를 제시한다(별도로 꾸민 그래픽을 만들지 않는다).
export default function TrustSection() {
  return (
    <section className="border-y border-border bg-surface-muted">
      <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-xl text-center sm:text-left">
          <p className="flex items-center justify-center gap-2 text-[12.5px] font-bold tracking-wide text-brand-600 sm:justify-start">
            <span aria-hidden="true" className="h-[2px] w-[18px] bg-brand-600" />
            왜 믿을 수 있나요
          </p>
          <h2 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight text-text-primary sm:text-[36px]">
            사주는 코드가 계산합니다.
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-text-secondary">
            이름을 지을 때 가장 중요한 것은 &quot;그럴듯함&quot;이 아니라 &quot;근거&quot;입니다. 사주 계산, 오행
            판정, 81수리 대조, 인명용 한자 확인까지 — 사람이 검수한 결정적 규칙으로 처리하고, LLM은 이미
            확정된 사실을 리포트로 풀어 쓸 뿐입니다.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 md:items-stretch">
          <div className="flex flex-col gap-2.5">
            {NO_ROWS.map((text) => (
              <div
                key={text}
                className="flex items-start gap-3 rounded-control bg-[color-mix(in_srgb,var(--text-primary)_5%,transparent)] px-4 py-3.5 text-[14px] leading-6 text-text-secondary line-through decoration-text-secondary/60"
              >
                <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-control bg-[color-mix(in_srgb,var(--text-secondary)_28%,transparent)] text-[12px] font-bold text-text-secondary">
                  ✕
                </span>
                {text}
              </div>
            ))}
            {YES_ROWS.map((text) => (
              <div
                key={text}
                className="flex items-start gap-3 rounded-control border border-border bg-surface px-4 py-3.5 text-[14px] font-semibold leading-6 text-text-primary shadow-[var(--shadow-card)]"
              >
                <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-control bg-brand-600 text-[12px] font-bold text-white">
                  ✓
                </span>
                {text}
              </div>
            ))}
          </div>

          <div className="relative overflow-hidden rounded-card border border-border bg-surface p-5 shadow-[var(--shadow-elevated)] sm:p-6">
            <div className="-mx-5 -mt-5 mb-5 h-[3px] bg-gradient-to-r from-brand-400 to-brand-600 sm:-mx-6 sm:-mt-6" />
            <div className="mb-1 flex items-center justify-between gap-2">
              <h3 className="text-[14px] font-bold text-text-primary">사주 요약 · 예시</h3>
              <span className="inline-flex items-center gap-1.5 rounded-control border border-dashed border-brand-600 px-2.5 py-1 text-[11px] font-bold text-brand-600">
                결정적 계산
              </span>
            </div>
            <ElementDistributionChart distribution={SAMPLE_ELEMENT_DISTRIBUTION} dayStem={SAMPLE_DAY_STEM} />
          </div>
        </div>

        <div className="mt-4">
          <ManseryeokTable manseryeok={SAMPLE_MANSERYEOK} />
        </div>
        <p className="-mt-4 text-center text-[12px] text-text-secondary">
          * 실제 사용자의 사주가 아닌 예시 화면입니다 — 실제 리포트와 같은 화면 그대로입니다.
        </p>
      </div>
    </section>
  );
}
