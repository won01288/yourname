// CLAUDE.md 8.2 — lib/naming/ 공용 타입. 이 폴더 밖(Next/Turso/SDK)을 import하지 않는다.

export type Element = "木" | "火" | "土" | "金" | "水";

export type YinYang = "양" | "음";

// @fullstackfamily/manseryeok 결과를 이 형태로 매핑한다 (saju.ts).
// stem/branch는 한자 1글자(예: "庚"/"午")다. config.ts의 STEM_ELEMENT/BRANCH_ELEMENT/BRANCH_HIDDEN_STEMS 키와 맞춘다.
export interface Saju {
  year: { stem: string; branch: string };
  month: { stem: string; branch: string };
  day: { stem: string; branch: string };
  hour: { stem: string; branch: string };
}

// TODO(Phase 2): elements.ts에서 채운다.
export interface ElementDistribution {
  木: number;
  火: number;
  土: number;
  金: number;
  水: number;
}

// TODO(Phase 2): yongsin.ts에서 채운다. 판정 근거를 구조화해 LLM 해설에 재사용한다 (CLAUDE.md 3.3).
export interface YongsinResult {
  strength: "신강" | "신약";
  yongsin: Element[];
  reason: string;
}

// TODO(Phase 3): DB(hanja 테이블, CLAUDE.md 4.1)에서 채운다.
export interface Hanja {
  char: string;
  readings: string[];
  strokeOriginal: number;
  strokeActual: number;
  radical: string;
  element: Element;
  meaning: string;
  isNameAllowed: boolean;
  isForbidden: boolean;
  forbiddenReason: string | null;
}

// TODO(Phase 4): 작명 엔진 출력 후보. LLM은 이 값을 서술만 한다 (CLAUDE.md 2.3).
export interface Candidate {
  hanja: Hanja[];
  hangul: string;
  numerologyNumbers: number[];
  phoneticElements: Element[];
}
