// app/api/name 을 호출하는 클라이언트 전용 fetch 래퍼 + 화면에서 쓰는 타입 재수출.
// lib/naming/ 폴더 규칙(8.1)과 무관한 프론트엔드 전용 코드라 app/ 아래 별도로 둔다.

import type { Candidate, ElementDistribution, Saju, Surname, YongsinResult } from "@/lib/naming/types";
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
}

export interface NameApiResult {
  saju: Saju;
  elementDistribution: ElementDistribution;
  yongsin: YongsinResult;
  surname: Surname;
  candidates: Candidate[];
  report: NamingReport | null;
}

export interface NameApiError {
  error: string;
  options?: string[];
}

export type NameApiOutcome =
  | { ok: true; data: NameApiResult }
  | { ok: false; error: string; surnameOptions?: string[] };

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
    };
  }

  const data = (await response.json()) as NameApiResult;
  return { ok: true, data };
}
