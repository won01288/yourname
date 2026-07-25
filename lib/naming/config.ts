// CLAUDE.md 8.2 — 학파 설정 상수. 3장 규칙 변경 시 코드가 아니라 CLAUDE.md를 먼저 고치고 여기에 반영한다.

import type { Element } from "./types";

// CLAUDE.md 3.1 — 발음오행(초성 자음 → 오행). ㅇㅎ=土, ㅁㅂㅍ=水 (통설 채택, 훈민정음 운해본 반대).
export const INITIAL_CONSONANT_ELEMENT: Record<string, Element> = {
  ㄱ: "木",
  ㅋ: "木",
  ㄴ: "火",
  ㄷ: "火",
  ㄹ: "火",
  ㅌ: "火",
  ㅇ: "土",
  ㅎ: "土",
  ㅅ: "金",
  ㅈ: "金",
  ㅊ: "金",
  ㅁ: "水",
  ㅂ: "水",
  ㅍ: "水",
  // 경음(된소리)은 한자 독음(한국 한자음)의 초성으로 실질적으로 쓰이지 않지만(한자음은 경음으로
  // 시작하지 않는 것이 원칙), 방어적으로 같은 조음위치의 예사소리와 같은 오행으로 매핑해 둔다.
  // 새로운 학파 판단이 아니라 기계적 확장이다.
  ㄲ: "木",
  ㄸ: "火",
  ㅃ: "水",
  ㅆ: "金",
  ㅉ: "金",
};

// CLAUDE.md 3.1 — 상생 흐름: 木生火·火生土·土生金·金生水·水生木.
export const SANGSAENG_ORDER: Element[] = ["木", "火", "土", "金", "水"];

// CLAUDE.md 3.2 — 획수 기준: 원획(原劃). 필획이 아니다. DB stroke_original 컬럼 사용.
export const STROKE_RULE = "original" as const;

// CLAUDE.md 3.3 — 용신 도출 우선순위: 억부용신 기본, 조후용신은 한난조습 극단 사주에 한해 검토.
// TODO(미결정, CLAUDE.md 6장): 조후용신 우선 적용 임계값 확정 필요.
export const YONGSIN_STRATEGY = "eokbu-primary" as const;

// Phase 2 — 천간(天干) 10자 → 오행. 한자 키.
export const STEM_ELEMENT: Record<string, Element> = {
  甲: "木",
  乙: "木",
  丙: "火",
  丁: "火",
  戊: "土",
  己: "土",
  庚: "金",
  辛: "金",
  壬: "水",
  癸: "水",
};

// Phase 2 — 지지(地支) 12자 → 오행(본기/정기 기준). 월지 세력 판단 등 "지지 자체의 대표 오행"이 필요할 때 참조.
// 오행 분포 집계(elements.ts)는 이 표가 아니라 아래 BRANCH_HIDDEN_STEMS(지장간)를 사용한다.
export const BRANCH_ELEMENT: Record<string, Element> = {
  子: "水",
  丑: "土",
  寅: "木",
  卯: "木",
  辰: "土",
  巳: "火",
  午: "火",
  未: "土",
  申: "金",
  酉: "金",
  戌: "土",
  亥: "水",
};

// Phase 2 — 지장간(支藏干) 일수 비례표 (30일 기준, 전통 월률분야 표준값).
// 오행 분포 산출 시 지지 하나당 지장간 각각을 days/30 가중치로 반영한다 (CLAUDE.md 2.1).
export const BRANCH_HIDDEN_STEMS: Record<string, { stem: string; days: number }[]> = {
  子: [{ stem: "壬", days: 10 }, { stem: "癸", days: 20 }],
  丑: [{ stem: "癸", days: 9 }, { stem: "辛", days: 3 }, { stem: "己", days: 18 }],
  寅: [{ stem: "戊", days: 7 }, { stem: "丙", days: 7 }, { stem: "甲", days: 16 }],
  卯: [{ stem: "甲", days: 10 }, { stem: "乙", days: 20 }],
  辰: [{ stem: "乙", days: 9 }, { stem: "癸", days: 3 }, { stem: "戊", days: 18 }],
  巳: [{ stem: "戊", days: 7 }, { stem: "庚", days: 7 }, { stem: "丙", days: 16 }],
  午: [{ stem: "丙", days: 10 }, { stem: "己", days: 9 }, { stem: "丁", days: 11 }],
  未: [{ stem: "丁", days: 9 }, { stem: "乙", days: 3 }, { stem: "己", days: 18 }],
  申: [{ stem: "戊", days: 7 }, { stem: "壬", days: 7 }, { stem: "庚", days: 16 }],
  酉: [{ stem: "庚", days: 10 }, { stem: "辛", days: 20 }],
  戌: [{ stem: "辛", days: 9 }, { stem: "丁", days: 3 }, { stem: "戊", days: 18 }],
  亥: [{ stem: "戊", days: 7 }, { stem: "甲", days: 7 }, { stem: "壬", days: 16 }],
};

// Phase 2 — 신강/신약 판정: 월지 가중 점수제 (CLAUDE.md 3.3).
// 비겁+인성 세력 비율(월지 득령 보너스 포함)이 이 값 이상이면 신강, 미만이면 신약.
export const STRENGTH_THRESHOLD = 0.5;

// Phase 2 — 월지가 비겁/인성에 해당할 때("득령") 추가로 실어주는 가중치.
// 분자·분모에 함께 반영해 월령의 비중을 다른 7글자보다 높게 둔다.
export const MONTH_BRANCH_STRENGTH_BONUS = 1;

// Phase 3 — 자원오행(한자 부수 → 오행) 배속표. 강희자전 214부수 번호를 키로 쓴다.
// (부수 번호는 lib/db.ts가 저장하는 hanja.radical 원문자를 이 표의 값과 대조하는 게 아니라,
// 데이터 적재 스크립트(scripts/db/*)에서 부수번호 기준으로 미리 계산해 hanja.element 컬럼에 채운다.)
//
// 결정: "214부수 전체를 배속한 업계 표준표"는 조사 결과 존재하지 않는다 (CLAUDE.md 3.5,
// 6장 참고 — 전문 작명원도 자체 표 없이 유료 자전을 안내하고, 山/石 같은 흔한 부수조차
// 출처마다 배속이 갈린다. 예: 石은 학술 논문에서 金으로 분류되지만 다른 자료는 土로 분류 —
// 그래서 石(112)은 의도적으로 뺐다). 따라서 이 표는 "언젠가 214개를 채울 미완성 표"가
// 아니라, **의미가 명확히 하나의 오행에 대응하는 부수만 담는 영구적으로 부분적인 표**다.
// 王/玉(금 vs 토), 石(금 vs 토), 酉(수 vs 금)처럼 출처마다 배속이 갈리는 부수는 넣지
// 않는다 — 틀린 배속을 넣는 것보다 비워두는(NULL) 쪽이 CLAUDE.md 2.1의 "환각 금지"
// 원칙에 맞다. 더 채우려면 특정 참고서적/유파 하나를 선택해 전부 따르는 결정이 필요하다
// (CLAUDE.md 6장 미결정 사항).
export const RADICAL_ELEMENT: Record<number, Element> = {
  // 木 — 나무·식물
  75: "木", // 木
  140: "木", // 艸/艹
  118: "木", // 竹
  115: "木", // 禾
  119: "木", // 米
  // 火 — 불·빛
  86: "火", // 火/灬
  72: "火", // 日
  155: "火", // 赤
  // 土 — 흙·땅
  32: "土", // 土
  46: "土", // 山
  170: "土", // 阜/阝(좌부방)
  // 金 — 쇠·금속·도구
  167: "金", // 金
  18: "金", // 刀/刂
  69: "金", // 斤
  // 水 — 물
  85: "水", // 水/氵
  173: "水", // 雨
  15: "水", // 冫
  47: "水", // 巛/川
};

// Phase 4 — 이름 글자 수. 4격 이론(numerology.ts calcSagyeok)이 표준과 정확히 일치하는
// "성 1자 + 이름 2자" 형태만 지원한다. 1글자·3글자 이상 이름의 확장은 미결정(CLAUDE.md 6장)이라
// Phase 4에서는 다루지 않는다.
export const GIVEN_NAME_LENGTH = 2;

// Phase 4 — 최종 추천 후보 개수 (CLAUDE.md 0장 "이름 후보 3~5개").
export const CANDIDATE_COUNT = 5;

// Phase 4 — 후보 하드 필터: 4격(원형이정)이 전부 길수여야 후보로 채택한다.
// isAuspiciousNumber()는 반길도 흉과 함께 false로 처리하므로(numerology.ts), 4격 중
// 하나라도 길이 아니면 탈락하는 엄격한 기준이다. 발음오행(성→이름1→이름2 순방향 상생,
// phonetic.ts isPhoneticSangsaeng)도 동일하게 하드 필터로 적용한다.
//
// 자원오행(hanja.element가 용신과 일치)과 음양 배열(획수 홀짝이 한쪽으로 쏠리지 않음)은
// element가 NULL인 한자가 많아(CLAUDE.md 3.5, 약 33%) 하드 필터로 쓰면 후보 풀이 지나치게
// 좁아진다 — 그래서 이 둘은 하드 필터가 아니라 가산점(soft score)으로만 반영한다.
export const CANDIDATE_SCORE_WEIGHTS = {
  // 이름 두 글자 중 자원오행이 용신과 일치하는 글자 수(0~2) × 이 값.
  wonhaengMatch: 2,
  // 성+이름 획수의 음양(홀/짝)이 한쪽으로 쏠리지 않으면(전부 홀 또는 전부 짝이 아니면) 가산.
  yinYangBalanced: 1,
} as const;
