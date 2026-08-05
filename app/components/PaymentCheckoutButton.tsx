"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NameRequestPayload } from "@/app/lib/name-client";
import type { CandidateCount } from "@/lib/naming/config";

// 결제(CLAUDE.md 0.4) — 페이앱 JS SDK(lite.js) 결제창을 여는 버튼. 결제 성사 여부의 유일한 신뢰
// 소스는 서버 웹훅(app/api/payment/webhook)이므로, 이 컴포넌트는 결제창을 띄운 뒤 주문 상태를
// 폴링해서만 완료를 판단한다 — 브라우저 콜백을 신뢰하지 않는다.

const PAYAPP_SCRIPT_SRC = "https://lite.payapp.kr/public/api/v2/payapp-lite.js";
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

declare global {
  interface Window {
    PayApp?: {
      setDefault: (key: string, value: string) => unknown;
      setParam: (key: string, value: string) => unknown;
      call: () => void;
    };
  }
}

let scriptLoadPromise: Promise<void> | null = null;
function loadPayAppScript(): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    if (window.PayApp) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = PAYAPP_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("결제 모듈을 불러오지 못했습니다."));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

interface CheckoutResponse {
  orderId: number;
  amount: number;
  checkout: { provider: string; clientConfig: Record<string, string> };
}

interface OrderStatusResponse {
  status: "pending" | "paid" | "consumed" | "canceled" | "failed";
}

interface CancelOrderResponse {
  status: OrderStatusResponse["status"];
  /** true면 아직 페이앱 쪽 요청번호(mul_no)를 확보하지 못해 취소를 시도조차 못한 상태 — 잠시 후
   * 다시 시도해야 한다(취소 실패로 단정하지 않음). */
  retry?: boolean;
}

interface PaymentCheckoutButtonProps {
  candidateCount: CandidateCount;
  /** 결제 시작 시점의 위저드 입력값. 체크아웃 요청에 함께 실어 서버(payment_order.pending_payload)에
   * 스냅샷으로 저장한다 — 모바일 풀리다이렉트(카카오페이 등 앱 전환) 복귀 시 브라우저 탭/컨텍스트가
   * 바뀌어 sessionStorage가 유실돼도 orderId만으로 복원할 수 있게 하기 위함(2026.8.5). */
  payload: NameRequestPayload;
  onPaid: (orderId: number) => void;
  /** 결제 요청 자체가 취소되어(또는 애초에 시작 전이라) 모달을 닫아도 될 때 호출된다. */
  onClose: () => void;
}

export default function PaymentCheckoutButton({ candidateCount, payload, onPaid, onClose }: PaymentCheckoutButtonProps) {
  const [status, setStatus] = useState<"idle" | "creating" | "waiting" | "error" | "timeout">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);
  // 결제창을 연 뒤(=휴대폰에 승인 알림이 나갔을 수 있는 뒤)에 취소를 누르면, 곧바로 닫지 않고
  // "결제 요청도 취소됩니다" 확인을 한 번 더 받는다 — 원래 버그(취소했다고 여겼지만 알림은 유효해
  // 결제가 그대로 진행됨)를 막는 지점.
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollDeadline = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const pollOrder = useCallback(
    (id: number) => {
      pollDeadline.current = Date.now() + POLL_TIMEOUT_MS;
      pollTimer.current = setInterval(async () => {
        if (Date.now() > pollDeadline.current) {
          stopPolling();
          setStatus("timeout");
          return;
        }
        try {
          const res = await fetch(`/api/payment/orders/${id}`);
          if (!res.ok) return; // 일시적 오류는 다음 폴링에서 재시도
          const data = (await res.json()) as OrderStatusResponse;
          if (data.status === "paid") {
            stopPolling();
            onPaid(id);
          } else if (data.status === "canceled" || data.status === "failed") {
            stopPolling();
            setStatus("error");
            setErrorMessage("결제가 취소되었거나 실패했습니다. 다시 시도해 주세요.");
          }
        } catch {
          // 네트워크 일시 오류 — 다음 폴링에서 재시도
        }
      }, POLL_INTERVAL_MS);
    },
    [onPaid, stopPolling]
  );

  const handleClick = useCallback(async () => {
    setStatus("creating");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/payment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateCount, payload }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(body.error ?? `결제 준비에 실패했습니다. (${res.status})`);
      }
      const data = (await res.json()) as CheckoutResponse;
      setOrderId(data.orderId);

      await loadPayAppScript();
      const payApp = window.PayApp;
      if (!payApp) throw new Error("결제 모듈을 불러오지 못했습니다.");

      const { clientConfig } = data.checkout;
      payApp.setDefault("userid", clientConfig.userid);
      payApp.setDefault("shopname", clientConfig.shopname);
      payApp.setDefault("feedbackurl", clientConfig.feedbackurl);
      payApp.setParam("goodname", clientConfig.goodname);
      payApp.setParam("price", clientConfig.price);
      payApp.setParam("var1", clientConfig.var1);
      payApp.setParam("returnurl", clientConfig.returnurl);
      payApp.setParam("openpaytype", clientConfig.openpaytype);
      payApp.setParam("smsuse", clientConfig.smsuse);
      payApp.call();

      setStatus("waiting");
      pollOrder(data.orderId);
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "결제를 시작하지 못했습니다.");
    }
  }, [candidateCount, payload, pollOrder]);

  const handleCancelClick = useCallback(() => {
    // 결제창을 아직 연 적이 없으면(주문 미생성) 무효화할 요청 자체가 없으므로 바로 닫는다.
    if (orderId === null) {
      onClose();
      return;
    }
    setCancelError(null);
    setConfirmingCancel(true);
  }, [orderId, onClose]);

  const handleCancelConfirmed = useCallback(async () => {
    if (orderId === null) {
      onClose();
      return;
    }
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/payment/orders/${orderId}/cancel`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as Partial<CancelOrderResponse>;

      if (data.status === "paid" || data.status === "consumed") {
        // 취소를 누른 순간 이미 휴대폰 승인이 끝난 경우 — 결제는 정상 처리된 것이므로 취소가
        // 아니라 결제 완료 흐름으로 그대로 이어간다. 이게 이번 수정의 핵심이다: 알림이 유효한
        // 채로 화면만 닫혀 결과를 못 보는 상황을 없앤다.
        stopPolling();
        setConfirmingCancel(false);
        setCancelling(false);
        onPaid(orderId);
        return;
      }

      if (data.status === "canceled") {
        stopPolling();
        setConfirmingCancel(false);
        setCancelling(false);
        onClose();
        return;
      }

      // pending으로 남아있다는 건 페이앱 쪽 요청번호를 아직 확보 못했거나(retry) 취소 API 자체가
      // 실패했다는 뜻 — 모달을 닫지 않고 다시 시도할 수 있게 둔다.
      setCancelling(false);
      setCancelError(
        data.retry
          ? "결제 요청을 확인하는 중입니다. 잠시 후 다시 시도해 주세요."
          : "결제 취소에 실패했습니다. 잠시 후 다시 시도해 주세요."
      );
    } catch {
      setCancelling(false);
      setCancelError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    }
  }, [orderId, onClose, onPaid, stopPolling]);

  const busy = status === "creating" || status === "waiting" || confirmingCancel || cancelling;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="flex-1 rounded-control bg-gradient-to-r from-brand-400 to-brand-600 px-4 py-3 text-[14px] font-medium text-white shadow-[var(--shadow-brand-glow)] transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
      >
        {status === "creating" && "결제 준비 중…"}
        {status === "waiting" && "결제 확인 중…"}
        {(status === "idle" || status === "error" || status === "timeout") && "결제하기"}
      </button>
      {status === "waiting" && (
        <p className="text-[12px] leading-5 text-text-secondary">
          결제창에서 결제를 완료하면 자동으로 다음 단계로 진행됩니다. 창을 닫지 말고 잠시 기다려 주세요.
        </p>
      )}
      {status === "timeout" && (
        <p className="text-[12px] leading-5 text-[var(--status-alert)]">
          결제 확인이 지연되고 있습니다. 결제를 완료하셨다면 페이지를 새로고침해 확인해 주세요.
        </p>
      )}
      {status === "error" && errorMessage && (
        <p role="alert" className="text-[12px] leading-5 text-[var(--status-alert)]">
          {errorMessage}
        </p>
      )}

      <button
        type="button"
        onClick={handleCancelClick}
        disabled={status === "creating" || cancelling}
        className="w-full rounded-control border border-border bg-surface px-4 py-3 text-[14px] font-medium text-text-primary transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
      >
        취소
      </button>

      {confirmingCancel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-card border border-border bg-[var(--glass-bg)] p-6 shadow-[var(--shadow-elevated)] backdrop-blur-[var(--glass-blur)] sm:p-8">
            <h2 className="mb-2 text-[16px] font-semibold text-text-primary">결제 요청도 취소됩니다</h2>
            <p className="mb-5 text-[13px] leading-6 text-text-secondary">
              휴대폰으로 간 결제 승인 요청이 아직 유효합니다. 지금 취소하면 그 요청도 함께 무효화되어
              나중에 승인해도 결제가 진행되지 않습니다. 정말로 취소하시겠습니까?
            </p>
            {cancelError && (
              <p
                role="alert"
                className="mb-5 rounded-control bg-[color-mix(in_srgb,var(--status-alert)_12%,transparent)] px-3.5 py-2.5 text-[13px] leading-5 text-[var(--status-alert)]"
              >
                {cancelError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmingCancel(false)}
                disabled={cancelling}
                className="flex-1 rounded-control border border-border bg-surface px-4 py-3 text-[14px] font-medium text-text-primary transition-colors hover:bg-surface-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
              >
                계속 결제하기
              </button>
              <button
                type="button"
                onClick={handleCancelConfirmed}
                disabled={cancelling}
                className="flex-1 rounded-control bg-[var(--status-alert)] px-4 py-3 text-[14px] font-medium text-white transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
              >
                {cancelling ? "취소 처리 중…" : "취소하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
