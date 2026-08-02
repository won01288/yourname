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
  // Phase 7 — 한글 훈(訓) 한 단어(예: "하늘"). 한국어 위키낱말사전 "부록:한문 교육용 기초
  // 한자 1800"(CC BY-SA 4.0)에서 가져온 값으로, LLM 번역이 아니라 공개 라이선스 데이터
  // 재사용이다(CLAUDE.md 3.10·4.1). 이 표에 없는 한자(교육용 밖 한자)는 null — 3.9의
  // hanjaGlosses(LLM 번역)와 달리 여기는 없는 값을 만들어내지 않고 표시를 생략한다.
  hun: string | null;
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

// Phase 8 — 순위를 없앤 대신(CLAUDE.md 3.6 "후보 개수/순위 확정", 2026.7.27) 각 후보가 왜
// 좋은 후보인지 코드가 결정적으로 계산한 강점 태그. LLM이 만든 판단이 아니라 이미 계산된 값
// (자원오행 일치·isCommon·음양균형·실사용 빈도)을 그대로 옮긴 사실이라 2.1·2.3과 충돌하지 않는다.
export interface CandidateHighlight {
  key: "phoneticFlow" | "numerology" | "wonhaeng" | "common" | "yinYang" | "frequency";
  label: string;
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
  // Phase 8 — 이 후보의 강점을 부각하는 태그 목록(candidates.ts에서 결정적으로 계산, 3.6 참고).
  // 순위 대신 각 후보의 장점을 보여주기 위한 것이라 항상 1개 이상 채워진다.
  highlights: CandidateHighlight[];
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
  // 2026.8.2 — 추천 시 약간의 가중치를 줄 이름인지(기존 상위 300개 + 신규 풀 상위 500개,
  // etc/build_final_given_names.py). 생략 시 false로 취급(기존 테스트 mock 호환).
  isFeatured?: boolean;
}

// Phase 7 — 이름 점수 확인 서비스(CLAUDE.md 3.10). 이미 정해진 이름을 채점한다 — 후보 생성(Candidate)과
// 달리 하드 필터로 탈락시키지 않고 등급을 매긴다. LLM을 전혀 쓰지 않는 결정적 계산 결과만 담는다.

// 발음오행 인접 두 글자 사이의 관계 등급. 상생(뒤 글자가 앞 글자를 순방향으로 생함) > 비화(같은 오행)
// = 역상생(앞 글자가 뒤 글자를 생함, 방향이 반대일 뿐 생하는 관계이므로 상극보다는 낫다고 봄) > 상극(파괴).
export type PhoneticLinkGrade = "상생" | "비화" | "역상생" | "상극";

export interface PhoneticLinkResult {
  from: Element;
  to: Element;
  grade: PhoneticLinkGrade;
  points: number;
  maxPoints: number;
}

export interface NumerologyGyeokScore {
  label: "원격" | "형격" | "이격" | "정격";
  number: number;
  fortune: string;
  points: number;
  maxPoints: number;
}

export type ScoreCategoryKey = "phonetic" | "numerology" | "wonhaeng" | "yinYang";

// 항목별 획득/만점. applicable=false는 자원오행처럼 판단 근거가 없어(hanja.element가 둘 다 NULL)
// 이 항목 자체를 총점 분모에서 제외했다는 뜻이다(CLAUDE.md 3.5의 "판단 보류" 원칙과 동일).
export interface ScoreCategoryResult {
  key: ScoreCategoryKey;
  label: string;
  points: number;
  maxPoints: number;
  applicable: boolean;
}

// 점수(totalScore)를 구간화해 보여주는 표시 전용 값 — 새로운 판정이 아니라 이미 계산된 숫자의
// UI 버킷팅이다(CLAUDE.md 3.10).
export type ScoreGrade = "S" | "A" | "B" | "C" | "D";

export interface ScoreWarning {
  type: "not-name-allowed" | "forbidden";
  char: string;
  message: string;
}

export interface NameScoreResult {
  totalScore: number;
  grade: ScoreGrade;
  categories: ScoreCategoryResult[];
  phoneticLinks: PhoneticLinkResult[];
  numerology: NumerologyGyeokScore[];
  warnings: ScoreWarning[];
}
