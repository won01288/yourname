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

// CLAUDE.md 3.10 — 상극(相剋) 관계: 木克土·土克水·水克火·火克金·金克木.
// SANGSAENG_ORDER 상 +2칸 위치가 항상 상극 대상이 되는 표준 순환 구조라 별도 표를 만들지 않고
// 기존 순서에서 기계적으로 도출한다 (새 학파 판단이 아니라 상생 순서의 산술적 귀결).
export function destructiveOf(element: Element): Element {
  const idx = SANGSAENG_ORDER.indexOf(element);
  return SANGSAENG_ORDER[(idx + 2) % SANGSAENG_ORDER.length];
}

// CLAUDE.md 3.2 — 획수 기준: 원획(原劃). 필획이 아니다. DB stroke_original 컬럼 사용.
export const STROKE_RULE = "original" as const;

// CLAUDE.md 3.3 — 용신 도출 우선순위: 억부용신 기본, 조후용신은 한난조습 극단 사주에 한해 검토.
// TODO(미결정, CLAUDE.md 6장): 조후용신 우선 적용 임계값 확정 필요.
export const YONGSIN_STRATEGY = "eokbu-primary" as const;

// CLAUDE.md 3.3.1 — 지장간 가중치를 일수 비례로 정규화해, 오행 분포(ElementDistribution) 총합은 항상 8이 된다.
export const ELEMENT_DISTRIBUTION_TOTAL = 8;

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

// Phase 6 — 천간/지지 한자의 한글 독음. 만세력 표 표시용 (사실 조회, 유파 판단 아님).
export const STEM_READING: Record<string, string> = {
  甲: "갑",
  乙: "을",
  丙: "병",
  丁: "정",
  戊: "무",
  己: "기",
  庚: "경",
  辛: "신",
  壬: "임",
  癸: "계",
};

export const BRANCH_READING: Record<string, string> = {
  子: "자",
  丑: "축",
  寅: "인",
  卯: "묘",
  辰: "진",
  巳: "사",
  午: "오",
  未: "미",
  申: "신",
  酉: "유",
  戌: "술",
  亥: "해",
};

// Phase 6 — 60갑자 순서. 천간 10자·지지 12자를 각각 순환시켜 만든다 (공망 계산용).
export const STEM_SEQUENCE = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
export const BRANCH_SEQUENCE = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

// Phase 6 — 천간의 음양. 甲丙戊庚壬=양, 乙丁己辛癸=음 (통설, 진태양시 보정과 무관한 고정 배속).
export const YANG_STEMS = new Set(["甲", "丙", "戊", "庚", "壬"]);

// Phase 6 — 공망(空亡) 대조표. 60갑자를 10개씩 6개 순(旬)으로 나누고, 각 순마다 짝을 이루지
// 못하는 지지 2개가 공망이 된다 (표준 대조표, 유파차 없음). 인덱스는 60갑자 순번 ÷ 10.
export const VOID_BRANCHES_BY_GROUP: [string, string][] = [
  ["戌", "亥"], // 갑자순 (甲子~癸酉)
  ["申", "酉"], // 갑술순 (甲戌~癸未)
  ["午", "未"], // 갑신순 (甲申~癸巳)
  ["辰", "巳"], // 갑오순 (甲午~癸卯)
  ["寅", "卯"], // 갑진순 (甲辰~癸丑)
  ["子", "丑"], // 갑인순 (甲寅~癸亥)
];

// Phase 6 — 오행 한자의 한글 음. 리포트 텍스트에서 "한자(음)" 형태(예: 水(수))로 표기할 때 쓴다.
export const ELEMENT_READING: Record<Element, string> = {
  木: "목",
  火: "화",
  土: "토",
  金: "금",
  水: "수",
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

// Phase 8 — 최종 추천 후보 개수. 최초 프리미엄 결제는 사용자가 3/5/10 중 선택한다(CLAUDE.md 3.6
// "후보 개수 선택" 확정, 2026.7.27). 예전엔 CANDIDATE_COUNT=5 고정값이었으나, 순위를 없앤 대신(아래
// 참고) 더 많은 후보를 보고 스스로 고르고 싶어하는 사용자를 위해 개수를 선택지로 열었다.
export const CANDIDATE_COUNT_OPTIONS = [3, 5, 10] as const;
// Phase 20(CLAUDE.md 0.6, 2026.8.7) — "같은 사주로 더 추천받기"가 1~10개 자유 선택 + 이름당 정액
// 요금(lib/payment/config.ts MORE_CANDIDATE_PRICE_PER_NAME)을 도입하면서, 3/5/10 세 값만 유효했던
// 타입을 1~10 정수 전체로 넓혔다. 최초 결제(3/5/10, price_tier)는 여전히 CANDIDATE_COUNT_OPTIONS로
// 제한되며 이 타입 자체를 넓힌다고 그 제약이 느슨해지지 않는다 — payment_order.candidate_count
// 컬럼(더 추천받기 주문 포함)과 buildCandidates 등 순수 개수 값을 다루는 자리에서만 넓은 범위가
// 필요했다.
export type CandidateCount = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export const DEFAULT_CANDIDATE_COUNT: CandidateCount = 5;

// Phase 8 — 유사 이름 소프트 필터 임계값(CLAUDE.md 3.6, 2026.7.27). 두 이름(고정 2글자)을 초성·
// 중성·종성 단위로 비교해 다른 자모 개수가 이 값 이하면 "너무 비슷한 이름"으로 본다(예: 규리/규린은
// 종성 하나만 달라 불일치 1 → 유사로 판정). similarity.ts의 isSimilarName이 이 값을 기본값으로 쓴다.
// 완전 차단이 아니라 CANDIDATE_DIVERSITY.stages의 완화 단계를 통해 "최대한 거르되, 후보가 부족하면
// 허용"하는 정도로만 적용한다.
export const SIMILAR_NAME_MAX_JAMO_MISMATCH = 1;

// Phase 11(3.6.4 재설계, 2026.8.1) — 후보 생성 하드 필터: score.ts(3.10, 무료 채점 서비스)의
// scoreName() 총점이 이 값 이상이어야 후보로 채택한다. 이전에는 "발음오행 순방향 상생 전부(비화·
// 역상생도 전부 탈락) + 4격 전부 길수(반길도 탈락)"라는 이중 하드 필터를 썼는데, 실사용 검증
// 결과 이게 score.ts 자신의 등급 체계(상생30·비화15·역상생15·상극0, 길10·반길5·흉0)보다 훨씬
// 엄격해서(수학적으로 총점 95점 이상만 통과하는 것과 동치) 박씨 같은 일부 성씨는 통과 풀이
// 7개까지 줄어드는 문제가 있었다(6장 미결정 사항 "이름 후보 풀 확장" 참고).
//
// 90점(S등급, score.ts GRADE_THRESHOLDS)을 채택한 이유: 이 값은 수학적으로 "상극은 절대 배제,
// 비화·역상생은 발음오행 링크 2개 중 최대 1개까지만 허용"이라는 경계와 정확히 일치한다 — 상극
// 링크가 하나라도 있으면(0점) 나머지 전부 만점이어도 85점을 못 넘는다(발음15+수리40+자원20+
// 음양10=85). 즉 새 이론을 만드는 게 아니라 score.ts가 이미 확정한 등급 체계를 생성 엔진에도
// 일관되게 적용한 것뿐이다(2.1). 실측(scripts/debug, 2026.8.1): 박씨(M) 7개→106개(15배),
// 김씨(M) 150개→214개(1.4배). 자원오행·음양 배열은 여전히 이 총점 계산 안에 포함되어 있어
// 별도 하드 필터가 필요 없다.
export const CANDIDATE_MIN_TOTAL_SCORE = 90;
// CLAUDE.md 3.6.3(재설계, 6장 "후보 순위 알고리즘의 가중치" 항목 대응) — 자원오행 매치를
// 단순 이진 카운트(0/1/2 일치 × 고정값)에서 연속 점수로 세분화했다. 이유: 사주(용신)가 관여하는
// 유일한 축인 wonhaeng이 이진값이라 가능한 점수가 6단계뿐이었고, 자원오행이 NULL인 한자가
// 33%(3.5)라 동점이 매우 흔해 결국 사주와 무관한 실사용 빈도·원획 합으로 순위가 갈렸다 —
// 그 결과 같은 성씨면 사주가 달라도 상위 후보가 거의 동일해지는 문제가 실사용에서 확인됐다.
// 두 축을 추가로 반영한다:
//   (1) 주용신/보조용신 차등 — yongsin[0](신약: 인성/신강: 식상, 더 직접적인 억부 대상)과
//       yongsin[1](신약: 비겁/신강: 관성, 보조적 대상)을 다르게 가중한다(yongsin.ts 참고).
//   (2) 오행분포 부족량 비례 — 같은 "용신 일치"라도 오행분포(ElementDistribution, 이미 계산된
//       값)에서 평균(ELEMENT_DISTRIBUTION_TOTAL/5)보다 더 부족한 오행을 채우는 한자를 우선한다.
// 새로운 오행·용신 판정을 만드는 게 아니라 이미 확정된 값(용신 순서, 오행분포 수치)을 더 정밀하게
// 조합하는 것뿐이라 2.1과 충돌하지 않는다. wonhaengScore()(candidates.ts)가 이 두 값을 결합해
// 만점 6점(= commonHanja 만점과 동률 유지)이 되도록 설계됐다: 한 글자가 주용신을 완전히 부족한
// 상태로 채우면 2×(1+1)=4, 다른 글자가 보조용신을 완전히 부족한 상태로 채우면 1×(1+1)=2, 합 6.
export const CANDIDATE_SCORE_WEIGHTS = {
  wonhaengPrimaryWeight: 2,
  wonhaengSecondaryWeight: 1,
  // 성+이름 획수의 음양(홀/짝)이 한쪽으로 쏠리지 않으면(전부 홀 또는 전부 짝이 아니면) 가산.
  yinYangBalanced: 1,
  // 이름 두 글자 중 hanja.isCommon(교육용 기초한자 1,800자, CLAUDE.md 3.6·4.1)인 글자 수(0~2) × 이 값.
  // 4.1의 hanja.element가 33%만 채워진 것과 달리 isCommon은 Unihan 사실 플래그를 그대로 옮긴
  // 값이라 뜻 판단이 아니다(2.1과 충돌하지 않음).
  commonHanja: 3,
  // 2026.8.2 — given_name.is_featured(기존 상위 300개 + namechart.kr 신규 풀 상위 500개, 남녀 각)
  // 이름에 얹는 소폭 가산점. "약간의 가중치"로 90점 게이트 통과 풀 안에서 순위를 조금 올려
  // 상위 비율 무작위 선택(3.6.5)에 더 자주 들어가게 할 뿐, 다른 항목(wonhaeng 최대 6·commonHanja
  // 최대 6)보다 훨씬 작게 잡아 지배적이지 않게 한다.
  featured: 1,
} as const;

// Phase 6 — 후보 다양성 선택 (CLAUDE.md 3.6). 하드 필터(발음오행 상생 + 4격 길수)를 통과한 조합이
// 많을 때, 점수만으로는 동점이 흔해 값이 갈리지 않는 경우가 있다(3.6.3 재설계로 완화됐지만
// 여전히 발생 가능 — 예: 두 후보의 자원오행 매치·부족량·isCommon·음양균형이 우연히 같은 경우).
// 동점자를 그대로 DB 삽입 순서로 slice하면 "같은 획수 조합 안에서 한 글자만
// 고정된 채 나머지가 채워지는" 편향이 생긴다(실사용에서 확인됨: 첫 글자가 5개 후보 전부 동일,
// 서로 다른 한자인데 발음이 같은 후보가 중복 등장). selectDiverseCandidates가 이 상수들로
// 점수 동점자 사이에서 다양성을 강제한다. 발음(한글) 중복 금지는 항상 강제하고(같은 이름이
// 두 번 나오지 않도록), 글자·획수조합 중복 금지는 후보 풀이 부족할 때만 단계적으로 완화한다.
//
// Phase 8(2026.7.27) — avoidSimilar 단계 추가: "규리/규린/규나"처럼 자모 하나 차이로 거의 같게
// 들리는 이름이 한 결과에 함께 나오는 문제(실사용 피드백)에 대응한다. maxCharReuse(글자 자체의
// 재사용 횟수)만으로는 "글자는 다르지만 소리가 거의 같은" 조합을 못 거르므로, similarity.ts의
// isSimilarName(자모 단위 유사도)을 별도 차원으로 추가했다. 무조건 차단이 아니라 "최대한 거르되"
// 후보 풀이 부족하면 완화되도록, 다른 제약과 같은 단계적 relax 구조를 그대로 따른다(마지막 단계는
// 발음 완전 중복 금지만 남기고 이 필터도 끈다).
export const CANDIDATE_DIVERSITY = {
  // 완화 단계. 앞 단계부터 순서대로 시도해 요청된 개수(candidateCount)를 채우는 첫 단계를 채택한다.
  // maxCharReuse: 이름 첫 글자/끝 글자 각각이 상위 후보 안에서 몇 번까지 재사용될 수 있는지.
  // maxPerNumerologyBucket: 동일 (원격,형격,이격,정격) 4격(=동일 획수쌍)을 상위 후보가 최대 몇 개
  //   까지 공유할 수 있는지 — 너무 크면 수리사격이 전부 같은 후보만 나온다.
  // avoidSimilar: true면 이미 뽑힌 후보와 자모 유사도(SIMILAR_NAME_MAX_JAMO_MISMATCH 이내)가
  //   높은 후보를 이 단계에서는 건너뛴다.
  // 마지막 단계(Infinity/false)는 발음(hangul) 완전 중복 금지만 남기는 최종 완화 단계로, 후보 풀이
  // 아주 작은 희귀 조합에서도 가능한 만큼은 채운다.
  stages: [
    { maxCharReuse: 1, maxPerNumerologyBucket: 2, avoidSimilar: true },
    { maxCharReuse: 2, maxPerNumerologyBucket: 2, avoidSimilar: true },
    { maxCharReuse: 3, maxPerNumerologyBucket: 3, avoidSimilar: true },
    { maxCharReuse: Infinity, maxPerNumerologyBucket: Infinity, avoidSimilar: false },
  ],
} as const;

// Phase 12(3.6.5, 2026.8.1) — 게이트(90점) 통과 풀 안에서도 항상 점수 최상위만 뽑으면 같은
// 주용신(사주 핵심 요구)을 가진 사람들끼리 top5가 거의 겹치는 문제가 실측으로 확인됐다(무작위
// 사주 200개 쌍 비교: 주용신이 같은 쌍은 72.7%가 top5 중 4개 이상 겹침, 주용신이 다르면 0%).
// 결정: 점수순 최상위 N개를 그대로 쓰는 대신, 게이트 통과 개수에 따라 상위 일정 비율 안에서
// 무작위로 뽑는다 — 통과 풀이 작을수록(더 좁혀야 품질을 지키므로) 비율을 넓게, 클수록 좁게 잡는다.
export const RANDOM_SELECTION_POOL = {
  // 게이트 통과 개수가 이 값 미만이면 smallPoolTopPercent, 이상이면 largePoolTopPercent를 쓴다.
  poolSizeThreshold: 200,
  smallPoolTopPercent: 0.3,
  largePoolTopPercent: 0.2,
} as const;

// CLAUDE.md 3.6.6(Phase 13, 2026.8.2) — 게이트를 통과한 이름이라도 반대 성별 쪽에서 훨씬 더
// 흔하게 쓰이면(예: 남아로 "도연"을 추천했는데 실제로는 여아 이름으로 압도적으로 많이 쓰임)
// 추천에서 제외한다. given_name.frequency(반대 성별)가 이 이름(검색한 성별)의 frequency보다
// 이 배수 이상이면 제외. 실측(scripts/debug/cross-gender-filter-check.ts, 김·이·박·서 × 사주
// 3개 × 성별 2종): 게이트 통과 13,276건 중 1,815건(13.7%) 제거, 가장 좁은 케이스(박씨 F)도
// 88~89개가 남아 후보 개수 최대 옵션(10개, 3.6.1)보다 훨씬 여유가 있음을 확인했다.
export const CROSS_GENDER_FREQUENCY_RATIO = 2;
