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
