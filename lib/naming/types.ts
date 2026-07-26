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

// DB(hanja 테이블, CLAUDE.md 4.1)에서 채운다.
// element가 nullable인 이유: 자원오행은 부수 의미가 명확한 극소수 부수에만 배속했다
// (config.ts RADICAL_ELEMENT, 부분표). 배속 안 된 부수의 한자는 element가 null이다.
export interface Hanja {
  char: string;
  readings: string[];
  strokeOriginal: number;
  strokeActual: number;
  radical: string | null;
  element: Element | null;
  meaning: string | null;
  isNameAllowed: boolean;
  isForbidden: boolean;
  forbiddenReason: string | null;
  // 교육용 기초한자(Unihan kKoreanEducationHanja, 대한민국 교육부 공식 1,800자) 포함 여부.
  // 뜻 판단이 아니라 Unihan 사실 플래그 조회이며, 후보 생성에서 "생소한 한자" 억제용 가산점으로만
  // 쓴다(CLAUDE.md 3.6). 값 자체는 한자의 좋고 나쁨을 뜻하지 않는다 — 교육용 목록 밖 한자도
  // 인명용/불용 여부는 별도로 판정된다.
  isCommon: boolean;
  // Phase 3 — OCR로 원문(PDF)을 판독한 데이터라 정확도 검증 상태를 남긴다.
  // "confirmed": Unicode Unihan 공식 한국어 독음과 교차검증되어 일치함.
  // 현재 DB에는 confirmed만 적재되어 있고("unverified"는 이번 Phase에서 보류),
  // 향후 보강 시 "unverified"도 채워질 수 있다.
  verificationStatus: "confirmed" | "unverified";
}

// Phase 6 — 십신(十神). 일간과 다른 간지의 오행 생극·음양 관계로 결정적으로 계산한다 (manseryeok.ts).
export type TenGod = "비견" | "겁재" | "식신" | "상관" | "편재" | "정재" | "편관" | "정관" | "편인" | "정인";

// Phase 6 — 만세력 표 한 칸(지장간 하나)의 상세 정보. isMain=true인 항목이 그 지지의 정기(본기)다.
export interface HiddenStemDetail {
  stem: string;
  reading: string;
  element: Element;
  days: number;
  tenGod: TenGod;
  isMain: boolean;
}

export interface ManseryeokPillar {
  label: "년주" | "월주" | "일주" | "시주";
  stem: { hanja: string; reading: string; element: Element; tenGod: TenGod };
  branch: { hanja: string; reading: string; element: Element; tenGod: TenGod; isVoid: boolean };
  hiddenStems: HiddenStemDetail[];
}

// Phase 6 — 만세력 상세 표 (CLAUDE.md 3.8). 십신·지장간·공망을 결정적으로 계산한 결과.
export interface Manseryeok {
  year: ManseryeokPillar;
  month: ManseryeokPillar;
  day: ManseryeokPillar;
  hour: ManseryeokPillar;
  voidBranches: [string, string];
}

// DB(surname 테이블, CLAUDE.md 4.2)에서 채운다.
export interface Surname {
  hangul: string;
  hanja: string;
  strokeOriginal: number;
  initialElement: Element;
}

// DB(numerology_81 테이블, CLAUDE.md 4.3)에서 채운다.
export interface Numerology81 {
  number: number;
  fortune: string;
  title: string | null;
  description: string | null;
}

// TODO(Phase 4): 작명 엔진 출력 후보. LLM은 이 값을 서술만 한다 (CLAUDE.md 2.3).
export interface Candidate {
  hanja: Hanja[];
  hangul: string;
  numerologyNumbers: number[];
  phoneticElements: Element[];
  // Phase 6 확정(3.6) — 이 후보 이름(hangul)의 given_name 테이블 실사용 빈도.
  // 후보 자체가 이제 이 표에서만 나오므로 항상 값이 있다 (db.ts getGivenNamesByGender).
  frequency: number;
}

// Phase 6 확정(3.6) — 성별에 따라 다른 이름 후보 풀(given_name 테이블)을 쓴다.
// 사주/용신 계산에는 영향 없음 (CLAUDE.md는 사주 계산에 성별을 쓰지 않는다) — 오직 이름 후보 풀
// 선택에만 쓰인다.
export type Gender = "M" | "F";

// DB(given_name 테이블) 조회 결과. CLAUDE.md 3.6 확장 — 사용자 제공 etc/korean_name.xlsx의
// A열(이름)만을 후보 풀로 쓴다는 결정에 따른 참조 데이터.
export interface GivenNameEntry {
  hangul: string;
  frequency: number;
}
