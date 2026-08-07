"use client";

import { useCallback, useState } from "react";
import type { NameRequestPayload } from "@/app/lib/name-client";
import type { CandidateCount } from "@/lib/naming/config";
import PaymentCheckoutButton from "./PaymentCheckoutButton";

interface PaymentRequiredModalProps {
  candidateCount: CandidateCount;
  amount: number | null;
  /** PaymentCheckoutButton에 그대로 전달 — 체크아웃 시점에 서버(payment_order.pending_payload)에
   * 스냅샷으로 저장돼 모바일 풀리다이렉트 복귀 시 복원에 쓰인다(2026.8.5). */
  payload: NameRequestPayload;
  onClose: () => void;
  onPaid: (orderId: number) => void;
}

interface AppliedDiscount {
  code: string;
  discountPercent: number;
  discountedAmount: number;
}

interface ValidateResponse {
  valid: boolean;
  error?: string;
  code?: string;
  discountPercent?: number;
  discountedAmount?: number;
}

// 결제(CLAUDE.md 0.4) — AuthRequiredModal.tsx와 동일한 스타일. 로그인은 이미 통과했지만 이번
// 추천 개수에 대해 유효한(paid, 미소비) 결제가 없을 때 최종 제출 대신 뜬다.
//
// "취소" 버튼은 PaymentCheckoutButton 안에 있다 — 결제창을 연 뒤(휴대폰에 카카오페이/네이버페이
// 승인 알림이 나갔을 수 있는 뒤)에는 그냥 닫는 게 아니라 페이앱 쪽 요청 자체를 취소해야 하는데,
// 그 orderId·폴링 상태를 이미 그 컴포넌트가 들고 있어 취소 확인·API 호출도 함께 두는 게 자연스럽다.
//
// 할인코드(2026.8.7) — 여기서 계산해 보여주는 discountedAmount는 순전히 표시용 미리보기다.
// "적용"을 누르면 /api/payment/discount-code/validate로 서버에 조회하고, 실제 청구 금액은
// PaymentCheckoutButton이 체크아웃 API를 호출할 때 서버가 코드를 다시 조회해 독립적으로
// 재계산한다 — 이 컴포넌트가 계산한 값을 신뢰해 그대로 결제하지 않는다.
export default function PaymentRequiredModal({
  candidateCount,
  amount,
  payload,
  onClose,
  onPaid,
}: PaymentRequiredModalProps) {
  const [showDiscountField, setShowDiscountField] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [applied, setApplied] = useState<AppliedDiscount | null>(null);

  const handleApplyCode = useCallback(async () => {
    const trimmed = codeInput.trim();
    if (!trimmed) return;
    setChecking(true);
    setDiscountError(null);
    try {
      const res = await fetch("/api/payment/discount-code/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, candidateCount }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<ValidateResponse>;
      if (!res.ok || !data.valid || data.discountPercent === undefined || data.discountedAmount === undefined) {
        setApplied(null);
        setDiscountError(data.error ?? "유효하지 않거나 만료된 할인코드입니다.");
        return;
      }
      setApplied({
        code: data.code ?? trimmed.toUpperCase(),
        discountPercent: data.discountPercent,
        discountedAmount: data.discountedAmount,
      });
    } catch {
      setApplied(null);
      setDiscountError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setChecking(false);
    }
  }, [codeInput, candidateCount]);

  const handleRemoveApplied = useCallback(() => {
    setApplied(null);
    setCodeInput("");
    setDiscountError(null);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-card border border-border bg-[var(--glass-bg)] p-6 shadow-[var(--shadow-elevated)] backdrop-blur-[var(--glass-blur)] sm:p-8">
        <h2 className="mb-2 text-[16px] font-semibold text-text-primary">결제가 필요한 서비스입니다</h2>
        <p className="mb-4 text-[13px] leading-6 text-text-secondary">
          {candidateCount}개 추천 결과를 생성하려면 결제가 필요합니다. 카드·애플페이·페이코·가상계좌·휴대폰결제로 결제할 수 있습니다.
        </p>

        {amount !== null && (
          <div className="mb-4">
            {applied ? (
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="rounded-control bg-[color-mix(in_srgb,var(--brand-500)_14%,transparent)] px-2 py-0.5 text-[11px] font-semibold text-brand-600">
                  시크릿 할인 {applied.discountPercent}%
                </span>
                <span className="text-[14px] text-text-secondary line-through">{amount.toLocaleString("ko-KR")}원</span>
                <span className="text-[22px] font-semibold text-text-primary">
                  {applied.discountedAmount.toLocaleString("ko-KR")}원
                </span>
              </div>
            ) : (
              <p className="text-[22px] font-semibold text-text-primary">{amount.toLocaleString("ko-KR")}원</p>
            )}
          </div>
        )}

        <div className="mb-6">
          {!showDiscountField && !applied && (
            <button
              type="button"
              onClick={() => setShowDiscountField(true)}
              className="text-[13px] font-medium text-brand-600 hover:underline"
            >
              할인코드가 있으신가요?
            </button>
          )}

          {applied && (
            <button
              type="button"
              onClick={handleRemoveApplied}
              className="text-[12px] text-text-secondary hover:underline"
            >
              적용된 할인코드 &quot;{applied.code}&quot; 취소
            </button>
          )}

          {showDiscountField && !applied && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={codeInput}
                  onChange={(event) => setCodeInput(event.target.value.toUpperCase())}
                  placeholder="예: XXLX2026"
                  className="min-w-0 flex-1 rounded-control border border-border bg-surface px-3 py-2 text-[14px] uppercase tracking-wide text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)]"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleApplyCode();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleApplyCode}
                  disabled={checking || codeInput.trim() === ""}
                  className="shrink-0 rounded-control border border-border bg-surface px-4 py-2 text-[13px] font-medium text-text-primary transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {checking ? "확인 중…" : "적용"}
                </button>
              </div>
              {discountError && (
                <p role="alert" className="text-[12px] leading-5 text-[var(--status-alert)]">
                  {discountError}
                </p>
              )}
            </div>
          )}
        </div>

        <PaymentCheckoutButton
          candidateCount={candidateCount}
          payload={payload}
          discountCode={applied?.code ?? null}
          onPaid={onPaid}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
