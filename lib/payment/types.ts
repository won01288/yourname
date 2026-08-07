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
  /** 실제 사용된 결제수단(정규화된 문자열, 웹훅 결제/취소 통보 시점에 채워짐). 관리자 가시성 전용. */
  payType: string | null;
  /** 결제 시작 시점의 NameRequestPayload(JSON 문자열) 스냅샷. 모바일 풀리다이렉트 복귀 시
   * sessionStorage가 유실돼도 orderId만으로 원래 입력값을 복원하기 위한 용도(2026.8.5). */
  pendingPayload: string | null;
  /** 적용된 할인코드(대문자 정규화), 없으면 null (2026.8.7, 할인코드). */
  discountCode: string | null;
  /** 적용 당시 할인율 스냅샷 — discount_code.discount_percent가 나중에 바뀌어도 이 주문엔 영향 없음. */
  discountPercent: number | null;
  /** 할인 전 price_tier 가격 스냅샷. discountCode가 없으면 null(=amount와 동일하다는 뜻). */
  originalAmount: number | null;
  namingResultId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PriceTier {
  candidateCount: CandidateCount;
  price: number;
  updatedAt: string;
}

export interface DiscountCode {
  id: number;
  code: string;
  discountPercent: number;
  validFrom: string | null;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
