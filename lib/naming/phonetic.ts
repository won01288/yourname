// CLAUDE.md 8.2 — 발음오행: 초성→오행 배속, 상생 판정. 순수 함수만. 외부 import 금지.
// 규칙 근거: CLAUDE.md 3.1.

import type { Element } from "./types";

// TODO(Phase 2): 한글 음절에서 초성 자음을 추출한다 (유니코드 분해).
export function getInitialConsonant(syllable: string): string {
  throw new Error("not implemented");
}

// TODO(Phase 2): config.ts의 INITIAL_CONSONANT_ELEMENT로 초성→오행 매핑.
export function getElementForSyllable(syllable: string): Element {
  throw new Error("not implemented");
}

// TODO(Phase 2): 성 초성 → 이름 첫 글자 초성 → 이름 끝 글자 초성 순서로 상생 흐름 검사.
export function isPhoneticSangsaeng(elements: Element[]): boolean {
  throw new Error("not implemented");
}
