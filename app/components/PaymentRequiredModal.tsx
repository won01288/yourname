"use client";

import type { CandidateCount } from "@/lib/naming/config";
import PaymentCheckoutButton from "./PaymentCheckoutButton";

interface PaymentRequiredModalProps {
  candidateCount: CandidateCount;
  amount: number | null;
  onClose: () => void;
  onPaid: (orderId: number) => void;
}

// 결제(CLAUDE.md 0.4) — AuthRequiredModal.tsx와 동일한 스타일. 로그인은 이미 통과했지만 이번
// 추천 개수에 대해 유효한(paid, 미소비) 결제가 없을 때 최종 제출 대신 뜬다.
export default function PaymentRequiredModal({
  candidateCount,
  amount,
  onClose,
  onPaid,
}: PaymentRequiredModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-card border border-border bg-[var(--glass-bg)] p-6 shadow-[var(--shadow-elevated)] backdrop-blur-[var(--glass-blur)] sm:p-8">
        <h2 className="mb-2 text-[16px] font-semibold text-text-primary">결제가 필요한 서비스입니다</h2>
        <p className="mb-4 text-[13px] leading-6 text-text-secondary">
          {candidateCount}개 추천 결과를 생성하려면 결제가 필요합니다. 카드·카카오페이·네이버페이로 결제할 수 있습니다.
        </p>
        {amount !== null && (
          <p className="mb-6 text-[22px] font-semibold text-text-primary">{amount.toLocaleString("ko-KR")}원</p>
        )}

        <PaymentCheckoutButton candidateCount={candidateCount} onPaid={onPaid} />

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-control border border-border bg-surface px-4 py-3 text-[14px] font-medium text-text-primary transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
        >
          취소
        </button>
      </div>
    </div>
  );
}
