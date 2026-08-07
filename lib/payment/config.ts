// 결제(페이앱, CLAUDE.md 0.4) — 절대 URL 생성 등 provider 구현이 공통으로 쓰는 잡다한 설정.

import type { CandidateCount } from "../naming/config";

// 관리자 테스트 편의(CLAUDE.md 0.4/0.6) — app/api/name/route.ts는 정식 출시 전 임시로 관리자
// 전용으로 게이트돼 있다(5장 Phase 6~). 관리자가 이 개수(최소 티어)를 선택하면 결제 흐름을
// 반복하지 않고 결제 없이 바로 생성할 수 있게 한다 — 나머지 파이프라인(사주 계산 → 후보 생성
// → LLM 해설)을 빠르게 반복 검증하기 위함이다. 관리자 게이트가 풀리기 전(6장 미결정, "프리미엄
// 작명 공개 오픈 여부")까지만 안전하며, 게이트를 제거할 때 이 조건도 함께 재검토해야 한다.
// route.ts(서버, 실제 강제)와 InputForm.tsx(클라이언트, 결제 모달 스킵용 UX)가 값을 공유한다.
export const ADMIN_FREE_TIER_CANDIDATE_COUNT: CandidateCount = 3;

// feedbackurl/returnurl은 페이앱이 우리 서버로 다시 호출/리다이렉트하는 절대경로라 반드시
// https://도메인 형태여야 한다. APP_BASE_URL을 명시적으로 준 경우 그걸 쓰고, 없으면 Vercel이
// 자동으로 채워주는 VERCEL_URL로 배포 도메인을 추정하며, 그마저 없으면(로컬 개발) localhost로
// 폴백한다 — 로컬에서는 페이앱이 실제로 도달할 수 없으니 ngrok 등 외부 접근 가능한 URL이
// 별도로 필요하다(README/CLAUDE.md에 안내).
export function getAppBaseUrl(): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

// 할인코드(2026.8.7) — 페이앱 최소 결제금액(1,000원, app/admin/pricing의 기존 가드와 동일 기준)
// 밑으로는 내려가지 않도록 클램프한다. 검증 API와 체크아웃 API가 정확히 같은 계산을 하도록
// 공용 함수로 뺐다 — 둘 중 하나만 고치면 표시 금액과 실제 청구 금액이 어긋나는 사고를 막는다.
export function computeDiscountedAmount(originalAmount: number, discountPercent: number): number {
  const discounted = Math.round((originalAmount * (100 - discountPercent)) / 100);
  return Math.max(1000, discounted);
}
