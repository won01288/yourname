// CLAUDE.md 8.2 — 수리사격 계산 및 81수리 길흉 판정. 순수 함수만. 외부 import 금지.
// 규칙 근거: CLAUDE.md 3.2, 4.3.

export interface Sagyeok {
  won: number; // 원격(元格) — 이름 글자 획수의 합. 초년운.
  hyeong: number; // 형격(亨格) — 성 + 이름 첫 글자. 중년운(주운).
  i: number; // 이격(利格) — 성 + 이름 끝 글자. 보조운.
  jeong: number; // 정격(貞格) — 성 + 이름 전체 획수 합(총획). 말년운.
}

// 성 원획, 이름 글자별 원획(왼쪽부터)을 받아 4격을 계산한다.
// 전통 4격 이론은 "성 1자 + 이름 2자"(가장 흔한 한국 이름 형태) 기준으로 정의되어 있어
// 이름이 2글자일 때 결과가 표준과 정확히 일치한다. 이름이 1글자·3글자 이상인 경우의
// 확장은 학파마다 조금씩 다른데, 여기서는 "원격=이름 전체 합, 이격=성+이름 끝 글자"로
// 일반화했다 (2글자 케이스와 동일한 식이 되도록). 이름 1글자인 경우의 보정(가상 획수 추가
// 등)은 별도 학파 결정이 필요해 아직 적용하지 않았다 — CLAUDE.md 6장에 미결정 사항으로 남긴다.
export function calcSagyeok(surnameStroke: number, givenStrokes: number[]): Sagyeok {
  if (givenStrokes.length === 0) {
    throw new Error("givenStrokes는 최소 1글자 이상이어야 합니다.");
  }
  const won = givenStrokes.reduce((sum, s) => sum + s, 0);
  const hyeong = surnameStroke + givenStrokes[0];
  const i = surnameStroke + givenStrokes[givenStrokes.length - 1];
  const jeong = surnameStroke + won;
  return { won, hyeong, i, jeong };
}

// numerology_81 테이블(DB) 조회 결과(fortune 문자열)를 받아 길흉만 판정하는 순수 함수.
// 실제 DB 조회는 db.ts에서 하고, 여기서는 조회된 값을 판정하는 로직만 둔다.
// "반길"(선흉후길 등 혼합)은 확정적 길수가 아니므로 보수적으로 흉과 함께 false 처리한다.
export function isAuspiciousNumber(fortune: string): boolean {
  return fortune === "길";
}
