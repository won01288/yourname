// app/api/name 을 호출하는 클라이언트 전용 fetch 래퍼 + 화면에서 쓰는 타입 재수출.
// lib/naming/ 폴더 규칙(8.1)과 무관한 프론트엔드 전용 코드라 app/ 아래 별도로 둔다.

import type { Candidate, ElementDistribution, Gender, Manseryeok, Saju, Surname, YongsinResult } from "@/lib/naming/types";
import type { CandidateCount } from "@/lib/naming/config";
import type { NamingReport } from "@/lib/llm/explain";

export interface NameRequestPayload {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  isLunar: boolean;
  isLeapMonth?: boolean;
  surnameHangul: string;
  surnameHanja?: string;
  gender: Gender;
  /** 추천받을 이름 개수(3/5/10). CLAUDE.md 3.6(Phase 8) — 후보 개수 선택. */
  candidateCount: CandidateCount;
  /** 결제(CLAUDE.md 0.4) — candidateCount만큼 생성할 권리를 산 payment_order.id. 위저드가 결제
   * 완료 후에만 채워 넣는다 — 폼 입력 단계(초안 저장·재개)에서는 아직 없을 수 있어 선택 필드다.
   * submitNaming을 호출하는 시점에는 항상 채워져 있어야 한다(서버가 누락 시 400을 반환한다). */
  orderId?: number;
}

export interface NameApiResult {
  saju: Saju;
  elementDistribution: ElementDistribution;
  yongsin: YongsinResult;
  manseryeok: Manseryeok;
  surname: Surname;
  candidates: Candidate[];
  report: NamingReport | null;
}

export interface NameApiError {
  error: string;
  options?: string[];
  code?: string;
}

export type NameApiOutcome =
  | { ok: true; data: NameApiResult }
  | { ok: false; error: string; surnameOptions?: string[]; authRequired?: boolean; paymentRequired?: boolean };

export async function submitNaming(payload: NameRequestPayload): Promise<NameApiOutcome> {
  let response: Response;
  try {
    response = await fetch("/api/name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, error: "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요." };
  }

  if (!response.ok) {
    let body: Partial<NameApiError> = {};
    try {
      body = await response.json();
    } catch {
      // 응답 본문이 JSON이 아닌 경우 기본 메시지로 대체.
    }
    return {
      ok: false,
      error: body.error ?? `요청이 실패했습니다. (${response.status})`,
      surnameOptions: body.options,
      // 로그인 베타 — 서버가 401 + AUTH_REQUIRED로 응답하면(클라이언트 사전 체크를 건너뛰고
      // 직접 호출했거나, 제출 도중 세션이 만료된 드문 경우) 일반 에러 배너 대신 로그인 필요
      // 모달로 수렴시키기 위한 플래그.
      authRequired: response.status === 401 && body.code === "AUTH_REQUIRED",
      // 결제(CLAUDE.md 0.4) — 402 + PAYMENT_REQUIRED면 일반 에러 배너 대신 결제 모달로 수렴시킨다
      // (프론트 사전 체크를 건너뛰고 직접 호출했거나, 제출 도중 주문 상태가 바뀐 드문 경우).
      paymentRequired: response.status === 402 && body.code === "PAYMENT_REQUIRED",
    };
  }

  const data = (await response.json()) as NameApiResult;
  return { ok: true, data };
}
