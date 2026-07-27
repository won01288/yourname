// CLAUDE.md 8.2 — Phase 8: 이름 두 글자(GIVEN_NAME_LENGTH=2 고정)가 서로 얼마나 비슷하게 들리는지
// 판정하는 순수 함수. 뜻·오행 판단이 아니라 한글 완성형 음절을 유니코드 규칙으로 초성·중성·종성
// 인덱스로 분해해 기계적으로 비교하는 것뿐이라 새 학파 판단이 아니다 (2.1과 충돌 없음).
// 후보 다양성 선택(candidates.ts)에서 "규리/규린/규나"처럼 자모 하나 차이인 이름이 한 결과에
// 몰리는 것을 거르는 데 쓴다 (3.6).

const HANGUL_SYLLABLE_BASE = 0xac00;
const HANGUL_SYLLABLE_LAST = 0xd7a3;
const JUNGSEONG_COUNT = 28 * 21; // 종성 개수(28) × 중성 개수(21)를 곱한 초성 하나당 블록 크기.
const JONGSEONG_COUNT = 28;

// 완성형 한글 음절 한 글자를 (초성, 중성, 종성) 인덱스로 분해한다. 완성형 한글이 아니면 null.
function decomposeSyllable(char: string): [number, number, number] | null {
  const code = char.codePointAt(0);
  if (code === undefined || code < HANGUL_SYLLABLE_BASE || code > HANGUL_SYLLABLE_LAST) return null;
  const offset = code - HANGUL_SYLLABLE_BASE;
  const cho = Math.floor(offset / JUNGSEONG_COUNT);
  const jung = Math.floor((offset % JUNGSEONG_COUNT) / JONGSEONG_COUNT);
  const jong = offset % JONGSEONG_COUNT;
  return [cho, jung, jong];
}

// 길이가 같은 두 이름(현재는 항상 2글자) 사이의 자모 불일치 개수를 센다. 각 글자의 초성·중성·종성을
// 자리별로 비교해 다르면 1씩 누적한다(글자당 최대 3, 이름 전체 최대 3×길이). 완성형 한글이 아닌
// 글자가 섞여 있거나 길이가 다르면 비교 자체가 무의미하므로 Infinity(= 절대 유사하지 않음)를 반환한다.
export function hangulJamoMismatchCount(a: string, b: string): number {
  if (a.length !== b.length) return Infinity;
  let mismatches = 0;
  for (let i = 0; i < a.length; i++) {
    const da = decomposeSyllable(a[i]);
    const db = decomposeSyllable(b[i]);
    if (!da || !db) return Infinity;
    for (let j = 0; j < 3; j++) {
      if (da[j] !== db[j]) mismatches++;
    }
  }
  return mismatches;
}

// 두 이름이 "너무 비슷한 이름"인지 판정한다. maxMismatch 이하로 다르면 유사로 본다
// (config.ts SIMILAR_NAME_MAX_JAMO_MISMATCH가 기본 임계값).
export function isSimilarName(a: string, b: string, maxMismatch: number): boolean {
  if (a === b) return true;
  return hangulJamoMismatchCount(a, b) <= maxMismatch;
}
