// CLAUDE.md 8.2 — @fullstackfamily/manseryeok 를 감싸 Saju 타입을 반환하는 얇은 모듈.
// lib/naming/ 은 이 파일을 import하지 않는다 (반대 방향: 여기서 naming의 타입을 가져다 쓴다).

import type { Saju } from "./naming/types";

export interface BirthInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  isLunar: boolean;
}

// TODO(Phase 2): @fullstackfamily/manseryeok으로 생년월일시 → 팔자(연/월/일/시주) 변환.
// 진태양시 보정, 절기 기준 월주, 야자시/조자시 처리 포함 (CLAUDE.md 2.1).
export async function getSaju(input: BirthInput): Promise<Saju> {
  throw new Error("not implemented");
}
