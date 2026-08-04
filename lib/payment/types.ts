// 결제(페이앱, CLAUDE.md 0.4) — DB/PG사와 무관한 공용 타입. lib/db-payment.ts와 lib/payment/*가
// 함께 참조한다.

import type { CandidateCount } from "../naming/config";

export type PaymentStatus = "pending" | "paid" | "consumed" | "canceled" | "failed";

export interface PaymentOrder {
  id: number;
  userId: number;
  candidateCount: CandidateCount;
  /** 주문 시점 price_tier 가격 스냅샷. 이후 관리자가 가격을 바꿔도 이미 만든 주문엔 영향 없다. */
  amount: number;
  status: PaymentStatus;
  provider: string;
  providerOrderId: string | null;
  namingResultId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PriceTier {
  candidateCount: CandidateCount;
  price: number;
  updatedAt: string;
}
