"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

interface PaymentCheckoutButtonProps {
  candidateCount: CandidateCount;
  /** 결제창을 열기 전, 모바일 풀리다이렉트 복귀에 대비해 부모가 원래 입력값을 세션스토리지에
   * 저장할 수 있도록 orderId를 알려준다. */
  onOrderCreated?: (orderId: number) => void;
  onPaid: (orderId: number) => void;
}

export default function PaymentCheckoutButton({ candidateCount, onOrderCreated, onPaid }: PaymentCheckoutButtonProps) {
  const [status, setStatus] = useState<"idle" | "creating" | "waiting" | "error" | "timeout">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollDeadline = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  const pollOrder = useCallback(
    (orderId: number) => {
      pollDeadline.current = Date.now() + POLL_TIMEOUT_MS;
      pollTimer.current = setInterval(async () => {
        if (Date.now() > pollDeadline.current) {
          if (pollTimer.current) clearInterval(pollTimer.current);
          setStatus("timeout");
          return;
        }
        try {
          const res = await fetch(`/api/payment/orders/${orderId}`);
          if (!res.ok) return; // 일시적 오류는 다음 폴링에서 재시도
          const data = (await res.json()) as OrderStatusResponse;
          if (data.status === "paid") {
            if (pollTimer.current) clearInterval(pollTimer.current);
            onPaid(orderId);
          } else if (data.status === "canceled" || data.status === "failed") {
            if (pollTimer.current) clearInterval(pollTimer.current);
            setStatus("error");
            setErrorMessage("결제가 취소되었거나 실패했습니다. 다시 시도해 주세요.");
          }
        } catch {
          // 네트워크 일시 오류 — 다음 폴링에서 재시도
        }
      }, POLL_INTERVAL_MS);
    },
    [onPaid]
  );

  const handleClick = useCallback(async () => {
    setStatus("creating");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/payment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateCount }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(body.error ?? `결제 준비에 실패했습니다. (${res.status})`);
      }
      const data = (await res.json()) as CheckoutResponse;
      onOrderCreated?.(data.orderId);

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
  }, [candidateCount, onOrderCreated, pollOrder]);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "creating" || status === "waiting"}
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
    </div>
  );
}
