"use client";

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

// 결제(CLAUDE.md 0.4) — AuthRequiredModal.tsx와 동일한 스타일. 로그인은 이미 통과했지만 이번
// 추천 개수에 대해 유효한(paid, 미소비) 결제가 없을 때 최종 제출 대신 뜬다.
//
// "취소" 버튼은 PaymentCheckoutButton 안에 있다 — 결제창을 연 뒤(휴대폰에 카카오페이/네이버페이
// 승인 알림이 나갔을 수 있는 뒤)에는 그냥 닫는 게 아니라 페이앱 쪽 요청 자체를 취소해야 하는데,
// 그 orderId·폴링 상태를 이미 그 컴포넌트가 들고 있어 취소 확인·API 호출도 함께 두는 게 자연스럽다.
export default function PaymentRequiredModal({
  candidateCount,
  amount,
  payload,
  onClose,
  onPaid,
}: PaymentRequiredModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-card border border-border bg-[var(--glass-bg)] p-6 shadow-[var(--shadow-elevated)] backdrop-blur-[var(--glass-blur)] sm:p-8">
        <h2 className="mb-2 text-[16px] font-semibold text-text-primary">결제가 필요한 서비스입니다</h2>
        <p className="mb-4 text-[13px] leading-6 text-text-secondary">
          {candidateCount}개 추천 결과를 생성하려면 결제가 필요합니다. 카드·애플페이·페이코·가상계좌·휴대폰결제로 결제할 수 있습니다.
        </p>
        {amount !== null && (
          <p className="mb-6 text-[22px] font-semibold text-text-primary">{amount.toLocaleString("ko-KR")}원</p>
        )}

        <PaymentCheckoutButton candidateCount={candidateCount} payload={payload} onPaid={onPaid} onClose={onClose} />
      </div>
    </div>
  );
}
