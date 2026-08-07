import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { createDiscountCode, listDiscountCodesForAdmin, updateDiscountCode } from "@/lib/db-payment";
import PageHero from "@/app/components/PageHero";

// 할인코드(CLAUDE.md 0.4 연장, 2026.8.7) — 관리자가 마케팅 채널에 배포할 코드(예: "XXLX2026")를
// 만들고 할인율·유효기간을 관리하는 화면. app/admin/pricing과 동일하게 ADMIN_EMAILS 게이트 +
// Server Action(별도 API 라우트 없음, CLAUDE.md 8.3)만 쓴다.
//
// 날짜 입력(<input type="date">)은 관리자가 KST 기준으로 "이 날짜까지 유효"라고 생각하며 입력하는
// 값이다. DB에는 CURRENT_TIMESTAMP와 같은 형식(UTC "YYYY-MM-DD HH:MM:SS")으로 저장해야 유효기간
// SQL 비교(lib/db-payment.ts getActiveDiscountCodeByCode)가 그대로 맞아떨어지므로, 아래 두 헬퍼로
// KST 날짜 ↔ UTC 저장값을 왕복 변환한다.
function kstDateToUtcTimestamp(dateStr: string, endOfDay: boolean): string {
  const time = endOfDay ? "23:59:59" : "00:00:00";
  const date = new Date(`${dateStr}T${time}+09:00`);
  return date.toISOString().replace("T", " ").slice(0, 19);
}

function utcTimestampToKstDateInputValue(utcTimestamp: string): string {
  const iso = utcTimestamp.includes("T") ? utcTimestamp : `${utcTimestamp.replace(" ", "T")}Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function formatDateTime(utcTimestamp: string): string {
  const iso = utcTimestamp.includes("T") ? utcTimestamp : `${utcTimestamp.replace(" ", "T")}Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return utcTimestamp;
  return date.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

async function createDiscountCodeAction(formData: FormData) {
  "use server";

  const code = String(formData.get("code") ?? "").trim();
  const discountPercent = Number(formData.get("discount_percent"));
  const validFromRaw = String(formData.get("valid_from") ?? "").trim();
  const validUntilRaw = String(formData.get("valid_until") ?? "").trim();

  if (!code || !Number.isInteger(discountPercent) || discountPercent < 1 || discountPercent > 100 || !validUntilRaw) {
    // 관리자 화면 최소 검증 — admin/pricing과 동일하게 잘못된 입력은 조용히 건너뛴다.
    return;
  }

  const validFrom = validFromRaw ? kstDateToUtcTimestamp(validFromRaw, false) : null;
  const validUntil = kstDateToUtcTimestamp(validUntilRaw, true);

  try {
    await createDiscountCode(code, discountPercent, validFrom, validUntil);
  } catch (err) {
    // UNIQUE(code) 충돌 등 — 화면에 별도 에러 UI가 없어 서버 로그로만 남긴다.
    console.error("할인코드 생성 실패:", err);
  }

  revalidatePath("/admin/discount-codes");
}

async function updateDiscountCodeAction(formData: FormData) {
  "use server";

  const id = Number(formData.get("id"));
  const discountPercent = Number(formData.get("discount_percent"));
  const validFromRaw = String(formData.get("valid_from") ?? "").trim();
  const validUntilRaw = String(formData.get("valid_until") ?? "").trim();
  const isActive = formData.get("is_active") === "on";

  if (!Number.isInteger(id) || !Number.isInteger(discountPercent) || discountPercent < 1 || discountPercent > 100 || !validUntilRaw) {
    return;
  }

  const validFrom = validFromRaw ? kstDateToUtcTimestamp(validFromRaw, false) : null;
  const validUntil = kstDateToUtcTimestamp(validUntilRaw, true);

  await updateDiscountCode(id, discountPercent, validFrom, validUntil, isActive);
  revalidatePath("/admin/discount-codes");
}

export default async function AdminDiscountCodesPage() {
  const currentUser = await getCurrentUser();
  if (!isAdminUser(currentUser)) {
    notFound();
  }

  const codes = await listDiscountCodesForAdmin();

  return (
    <main className="flex flex-1 flex-col">
      <PageHero
        eyebrow="관리자"
        title="할인코드 관리"
        description="마케팅 채널로 배포할 할인코드를 만들고 할인율·유효기간을 관리합니다. 결제 모달에서 코드를 입력하면 즉시 반영됩니다."
      />

      <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 pb-16">
        <form
          action={createDiscountCodeAction}
          className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-[var(--shadow-elevated)]"
        >
          <h2 className="text-[14px] font-semibold text-text-primary">새 할인코드 만들기</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor="code" className="text-[12px] text-text-secondary">
                코드명
              </label>
              <input
                id="code"
                name="code"
                type="text"
                placeholder="예: XXLX2026"
                required
                className="rounded-control border border-border bg-surface px-3 py-2 text-[14px] uppercase text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)]"
              />
            </div>
            <div className="flex w-24 flex-col gap-1">
              <label htmlFor="discount_percent" className="text-[12px] text-text-secondary">
                할인율(%)
              </label>
              <input
                id="discount_percent"
                name="discount_percent"
                type="number"
                min={1}
                max={100}
                required
                className="rounded-control border border-border bg-surface px-3 py-2 text-[14px] text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)]"
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor="valid_from" className="text-[12px] text-text-secondary">
                유효 시작일 (비우면 즉시 유효)
              </label>
              <input
                id="valid_from"
                name="valid_from"
                type="date"
                className="rounded-control border border-border bg-surface px-3 py-2 text-[14px] text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)]"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor="valid_until" className="text-[12px] text-text-secondary">
                유효 종료일
              </label>
              <input
                id="valid_until"
                name="valid_until"
                type="date"
                required
                className="rounded-control border border-border bg-surface px-3 py-2 text-[14px] text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)]"
              />
            </div>
          </div>
          <button
            type="submit"
            className="self-start rounded-control bg-gradient-to-r from-brand-400 to-brand-600 px-4 py-2.5 text-[14px] font-medium text-white shadow-[var(--shadow-brand-glow)] transition-all hover:brightness-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
          >
            만들기
          </button>
        </form>

        <div className="flex flex-col gap-3">
          {codes.map((c) => (
            <form
              key={c.id}
              action={updateDiscountCodeAction}
              className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
            >
              <input type="hidden" name="id" value={c.id} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[15px] font-semibold text-text-primary">{c.code}</p>
                <p className="text-[11px] text-text-secondary">생성 {formatDateTime(c.createdAt)}</p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex w-24 flex-col gap-1">
                  <label htmlFor={`discount_percent_${c.id}`} className="text-[12px] text-text-secondary">
                    할인율(%)
                  </label>
                  <input
                    id={`discount_percent_${c.id}`}
                    name="discount_percent"
                    type="number"
                    min={1}
                    max={100}
                    defaultValue={c.discountPercent}
                    className="rounded-control border border-border bg-surface px-3 py-2 text-[14px] text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)]"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label htmlFor={`valid_from_${c.id}`} className="text-[12px] text-text-secondary">
                    시작일
                  </label>
                  <input
                    id={`valid_from_${c.id}`}
                    name="valid_from"
                    type="date"
                    defaultValue={c.validFrom ? utcTimestampToKstDateInputValue(c.validFrom) : ""}
                    className="rounded-control border border-border bg-surface px-3 py-2 text-[14px] text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)]"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label htmlFor={`valid_until_${c.id}`} className="text-[12px] text-text-secondary">
                    종료일
                  </label>
                  <input
                    id={`valid_until_${c.id}`}
                    name="valid_until"
                    type="date"
                    required
                    defaultValue={utcTimestampToKstDateInputValue(c.validUntil)}
                    className="rounded-control border border-border bg-surface px-3 py-2 text-[14px] text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-[13px] text-text-primary">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={c.isActive}
                    className="h-4 w-4 rounded border-border accent-[var(--brand-500)]"
                  />
                  활성화(끄면 유효기간과 무관하게 즉시 사용 불가)
                </label>
                <button
                  type="submit"
                  className="rounded-control border border-border bg-surface px-4 py-2 text-[13px] font-medium text-text-primary transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)]"
                >
                  저장
                </button>
              </div>
            </form>
          ))}

          {codes.length === 0 && (
            <p className="rounded-control border border-border bg-surface-muted p-4 text-[13px] text-text-secondary">
              아직 만들어진 할인코드가 없습니다.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
