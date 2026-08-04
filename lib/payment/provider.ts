// 결제(페이앱, CLAUDE.md 0.4) — PG사 교체 지점. PaymentProvider 인터페이스 하나로 PG사 종속
// 코드(체크아웃 위젯 파라미터 구성, 웹훅 서명/필드 파싱)를 전부 격리한다. 추후 토스페이먼츠로
// 바꿀 때는 이 인터페이스를 구현하는 lib/payment/toss.ts를 추가하고 PAYMENT_PROVIDER=toss로
// 바꾸기만 하면 된다 — lib/db-payment.ts·API 라우트·프론트(체크아웃 위젯 로드 분기 제외)는
// provider 구현이 무엇인지 몰라도 되도록 설계했다.

import type { PaymentOrder } from "./types";
import { payappProvider } from "./payapp";

export interface CheckoutContext {
  order: PaymentOrder;
  /** 결제창에 표시할 상품명. */
  goodName: string;
  /** 결제 상태 통보를 받을 우리 서버 웹훅 절대 URL. */
  feedbackUrl: string;
  /** 결제 완료 후(주로 모바일 풀리다이렉트) 브라우저가 돌아올 절대 URL. */
  returnUrl: string;
}

/** 프론트가 결제창을 띄우는 데 필요한, provider별로 형태가 다른 설정값 묶음. */
export interface CheckoutSession {
  provider: string;
  clientConfig: Record<string, string>;
}

export interface WebhookResult {
  /** userid/linkkey/linkval 등 PG사 자격증명이 우리 설정과 일치하는지(스푸핑 방지). */
  recognized: boolean;
  orderId: number | null;
  providerOrderId: string | null;
  status: "paid" | "canceled" | "failed" | "ignored";
  amount: number | null;
}

export interface PaymentProvider {
  name: string;
  buildCheckoutSession(ctx: CheckoutContext): CheckoutSession;
  parseWebhook(form: Record<string, string>): WebhookResult;
}

export function getPaymentProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER ?? "payapp";
  switch (name) {
    case "payapp":
      return payappProvider;
    default:
      throw new Error(`알 수 없는 PAYMENT_PROVIDER 입니다: ${name}`);
  }
}
