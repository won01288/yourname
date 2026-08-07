import { CANDIDATE_COUNT_OPTIONS, DEFAULT_CANDIDATE_COUNT, type CandidateCount } from "@/lib/naming/config";

const DESCRIPTIONS: Record<(typeof CANDIDATE_COUNT_OPTIONS)[number], string> = {
  3: "가장 빠르게 핵심만 훑어보고 싶다면",
  5: "균형 잡힌 개수로 비교하고 싶다면",
  10: "폭넓게 비교하며 직접 고르고 싶다면",
};

interface PricingSectionProps {
  /** app/admin/pricing에서 관리자가 설정한 값을 그대로 받는다(app/naming/about/page.tsx가
   * getPriceTiers()로 매 요청마다 조회) — 이 컴포넌트는 가격을 하드코딩하지 않는다. */
  priceByCount: Partial<Record<CandidateCount, number>>;
}

// 관리자(app/admin/pricing)가 설정한 price_tier 값을 그대로 보여주는 가격 안내 섹션.
// InputForm.tsx의 추천 개수 선택 카드와 같은 톤(3.6.1 후보 개수 선택)을 재사용하되, 여긴 선택이
// 아니라 안내용이라 클릭 인터랙션은 없다.
export default function PricingSection({ priceByCount }: PricingSectionProps) {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-14">
      <div className="text-center">
        <h2 className="text-[20px] font-bold text-text-primary">가격 안내</h2>
        <p className="mt-2 text-[13px] leading-6 text-text-secondary">
          추천받을 이름 개수에 따라 가격이 달라집니다. 카드·카카오페이·네이버페이로 결제할 수 있습니다.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CANDIDATE_COUNT_OPTIONS.map((count) => {
          const isDefault = count === DEFAULT_CANDIDATE_COUNT;
          const price = priceByCount[count];
          return (
            <div
              key={count}
              className={`rounded-card border p-5 shadow-[var(--shadow-card)] ${
                isDefault ? "border-brand-600 bg-brand-50" : "border-border bg-surface"
              }`}
            >
              <p className={`text-[14px] font-semibold ${isDefault ? "text-brand-800" : "text-text-primary"}`}>
                {count}개 추천
              </p>
              <p className="mt-2 text-[22px] font-bold text-text-primary">
                {price !== undefined ? `${price.toLocaleString("ko-KR")}원` : "-"}
              </p>
              {price !== undefined && (
                <p className="mt-0.5 text-[12px] text-text-secondary opacity-80">
                  이름당 {Math.round(price / count).toLocaleString("ko-KR")}원
                </p>
              )}
              <p className="mt-2 text-[13px] leading-6 text-text-secondary">{DESCRIPTIONS[count]}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
