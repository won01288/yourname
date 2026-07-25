// CLAUDE.md 8.2 — 발음오행: 초성→오행 배속, 상생 판정. 순수 함수만. 외부 import 금지.
// 규칙 근거: CLAUDE.md 3.1.

import type { Element } from "./types";
import { INITIAL_CONSONANT_ELEMENT, SANGSAENG_ORDER } from "./config";

// 유니코드 완성형 한글 음절의 초성 19자모 (인덱스 0~18).
const CHOSEONG = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
] as const;

const HANGUL_SYLLABLE_START = 0xac00;
const HANGUL_SYLLABLE_END = 0xd7a3;

// 한글 음절(예: "민") 하나에서 초성 자음(예: "ㅁ")을 추출한다.
export function getInitialConsonant(syllable: string): string {
  const code = syllable.codePointAt(0);
  if (code === undefined || code < HANGUL_SYLLABLE_START || code > HANGUL_SYLLABLE_END) {
    throw new Error(`한글 음절이 아닙니다: ${syllable}`);
  }
  const choseongIndex = Math.floor((code - HANGUL_SYLLABLE_START) / (21 * 28));
  return CHOSEONG[choseongIndex];
}

// config.ts의 INITIAL_CONSONANT_ELEMENT로 초성→오행 매핑.
export function getElementForSyllable(syllable: string): Element {
  const consonant = getInitialConsonant(syllable);
  const element = INITIAL_CONSONANT_ELEMENT[consonant];
  if (!element) {
    throw new Error(`초성 '${consonant}'에 대한 오행 매핑이 없습니다.`);
  }
  return element;
}

// 성 초성 → 이름 첫 글자 초성 → 이름 끝 글자 초성 순서로 상생 흐름 검사.
// CLAUDE.md 3.1 "상생 흐름(木生火·火生土·土生金·金生水·水生木)을 이루면 길"의 순방향 해석:
// 인접한 두 오행이 SANGSAENG_ORDER 상 정확히 다음 오행으로 이어질 때만 길로 본다.
// 역방향 상생(피생)이나 비화(동일 오행)는 "흐름"을 이룬다고 보지 않아 흉으로 처리한다.
export function isPhoneticSangsaeng(elements: Element[]): boolean {
  for (let i = 0; i < elements.length - 1; i++) {
    const currentIndex = SANGSAENG_ORDER.indexOf(elements[i]);
    const expectedNext = SANGSAENG_ORDER[(currentIndex + 1) % SANGSAENG_ORDER.length];
    if (elements[i + 1] !== expectedNext) return false;
  }
  return true;
}
