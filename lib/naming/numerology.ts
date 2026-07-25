// CLAUDE.md 8.2 — 수리사격 계산 및 81수리 길흉 판정. 순수 함수만. 외부 import 금지.
// 규칙 근거: CLAUDE.md 3.2, 4.3.

// TODO(Phase 3): 성 원획 + 이름 원획(들)로 원격·형격·이격·정격 4격 산출.
export interface Sagyeok {
  won: number; // 원격
  hyeong: number; // 형격
  i: number; // 이격
  jeong: number; // 정격
}

// TODO(Phase 3): 성씨 원획, 이름 글자별 원획을 입력받아 4격을 계산한다.
export function calcSagyeok(surnameStroke: number, givenStrokes: number[]): Sagyeok {
  throw new Error("not implemented");
}

// TODO(Phase 3): numerology_81 테이블(DB) 조회 결과를 받아 길흉만 판정하는 순수 함수.
// 실제 DB 조회는 db.ts에서 하고, 여기서는 조회된 값을 판정하는 로직만 둔다.
export function isAuspiciousNumber(fortune: string): boolean {
  throw new Error("not implemented");
}
