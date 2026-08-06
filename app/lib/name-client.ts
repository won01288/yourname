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
  /** "같은 사주로 더 추천받기"(CLAUDE.md 0.6). 이 결과가 속한 세션의 naming_result.id(루트든
   * 자식이든 무관 — 서버가 매번 세션 루트를 재계산한다). 최초 생성이면 없다. */
  parentNamingResultId?: number;
}

export interface NameApiResult {
  saju: Saju;
  elementDistribution: ElementDistribution;
  yongsin: YongsinResult;
  manseryeok: Manseryeok;
  surname: Surname;
  candidates: Candidate[];
  report: NamingReport | null;
  /** CLAUDE.md 0.6·3.6.7 — 이 결과 생성 시점 기준 "같은 사주로 더 추천받기" 잔여 개수 스냅샷.
   * 레거시 데이터(이 필드 신설 이전에 저장된 결과)는 undefined — 0으로 취급한다. */
  moreAvailableCount?: number;
  /** 이 결과가 저장된 naming_result.id. DB에 저장되는 JSON 자체에는 없다(저장 시점엔 자기 id를
   * 모르는 닭-달걀 문제) — /api/name 응답에는 저장 직후 채워 보내고, 마이페이지 상세 조회 시엔
   * 라우트 파라미터 id로 채운다. "더 추천받기" 이동 대상(parentId) 계산 전용. */
  namingResultId?: number | null;
  /** CLAUDE.md 0.6 — "같은 사주로 더 추천받기" 추가 라운드로 생성된 결과인지. true면 report에
   * summary·sajuStory가 없다(LLM 비용 최소화를 위해 생성 자체를 생략했다) — 화면은 이 경우
   * 만세력·사주 요약만 보여주고 사주풀이 없이 바로 후보 설명으로 넘어간다. 저장 시점에 이미
   * 알 수 있는 값이라(namingResultId와 달리 닭-달걀 문제 없음) result JSON에 그대로 저장된다. */
  isAdditionalRound?: boolean;
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
