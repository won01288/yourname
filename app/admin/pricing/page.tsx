import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { getPriceTiers, updatePriceTier } from "@/lib/db-payment";
import { CANDIDATE_COUNT_OPTIONS, type CandidateCount } from "@/lib/naming/config";
import PageHero from "@/app/components/PageHero";

// 결제(CLAUDE.md 0.4) — 프리미엄 작명 가격(candidateCount별)을 관리자가 직접 바꾸는 화면.
// app/admin/users/page.tsx와 동일하게 ADMIN_EMAILS 게이트를 쓴다. 별도 API 라우트 없이 Server
// Action으로 처리한다(CLAUDE.md 8.3 — 클라이언트 인터랙션이 실제로 필요한 것만 API로 둔다는
// 원칙, app/components/SocialLoginButtons.tsx의 Server Action 선례를 따름).
async function updatePricesAction(formData: FormData) {
  "use server";

  for (const candidateCount of CANDIDATE_COUNT_OPTIONS) {
    const raw = formData.get(`price_${candidateCount}`);
    const price = Number(raw);
    if (!Number.isInteger(price) || price < 1000) {
      // 페이앱 최소 결제금액(1,000원) 기준 — 이보다 낮으면 저장하지 않고 조용히 건너뛴다.
      continue;
    }
    await updatePriceTier(candidateCount as CandidateCount, price);
  }

  revalidatePath("/admin/pricing");
}

export default async function AdminPricingPage() {
  const currentUser = await getCurrentUser();
  if (!isAdminUser(currentUser)) {
    notFound();
  }

  const tiers = await getPriceTiers();
  const priceByCount = new Map(tiers.map((t) => [t.candidateCount, t]));

  return (
    <main className="flex flex-1 flex-col">
      <PageHero
        eyebrow="관리자"
        title="가격 관리"
        description="추천 개수별 프리미엄 작명 가격입니다. 저장하면 이후 결제부터 바로 반영됩니다(이미 만들어진 주문의 금액은 바뀌지 않습니다)."
      />

      <section className="mx-auto w-full max-w-md px-6 pb-16">
        <form
          action={updatePricesAction}
          className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-[var(--shadow-elevated)]"
        >
          {CANDIDATE_COUNT_OPTIONS.map((count) => (
            <div key={count} className="flex items-center justify-between gap-3">
              <label htmlFor={`price_${count}`} className="text-[14px] font-medium text-text-primary">
                {count}개 추천
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id={`price_${count}`}
                  name={`price_${count}`}
                  type="number"
                  min={1000}
                  step={100}
                  defaultValue={priceByCount.get(count)?.price ?? ""}
                  className="w-28 rounded-control border border-border bg-surface px-3 py-2 text-right text-[14px] text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)]"
                />
                <span className="text-[13px] text-text-secondary">원</span>
              </div>
            </div>
          ))}

          <button
            type="submit"
            className="mt-2 rounded-control bg-gradient-to-r from-brand-400 to-brand-600 px-4 py-3 text-[14px] font-medium text-white shadow-[var(--shadow-brand-glow)] transition-all hover:brightness-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
          >
            저장
          </button>
        </form>
      </section>
    </main>
  );
}
