import { describe, it, expect } from "vitest";
import { requiredPhoneticElements, buildCandidates, selectDiverseCandidates, buildRandomizedSelectionPool } from "./candidates";
import { isPhoneticSangsaeng } from "./phonetic";
import type { Candidate, Element, ElementDistribution, Hanja, Numerology81 } from "./types";

// CLAUDE.md 3.6.3 — 오행분포가 모든 오행에 평균(8/5=1.6)만큼 있는 "중립" 상태. 부족량 비례
// 가중(A)이 0이 되므로, 주용신/보조용신 차등(B)만 순수하게 검증하고 싶을 때 쓴다.
const NEUTRAL_DISTRIBUTION: ElementDistribution = { 木: 1.6, 火: 1.6, 土: 1.6, 金: 1.6, 水: 1.6 };

// CLAUDE.md 3.6.5 — buildCandidates는 기본으로 Math.random을 써서 상위 비율 안을 섞는다(무작위
// 선택 자체를 검증하는 테스트가 아니면). 셔플 로직(candidates.ts shuffle)은 Fisher-Yates라
// random()이 항상 1에 아주 가까운 값(스왑 인덱스가 항상 자기 자신)을 반환하면 순서가 그대로
// 유지된다 — 점수/동점 로직만 검증하려는 기존 테스트가 흔들리지 않게 하는 용도.
const NO_SHUFFLE = () => 0.999999;

function makeHanja(overrides: Partial<Hanja> & Pick<Hanja, "char" | "readings" | "strokeOriginal">): Hanja {
  return {
    strokeActual: overrides.strokeOriginal,
    radical: null,
    element: null,
    meaning: null,
    isNameAllowed: true,
    isForbidden: false,
    forbiddenReason: null,
    verificationStatus: "confirmed",
    isCommon: false,
    hun: null,
    ...overrides,
  };
}

describe("requiredPhoneticElements", () => {
  it("성 오행 뒤로 순방향 상생 체인을 이어 반환한다 (isPhoneticSangsaeng과 일관됨)", () => {
    const elements: Element[] = ["木", "火", "土", "金", "水"];
    for (const surnameElement of elements) {
      const required = requiredPhoneticElements(surnameElement, 2);
      expect(isPhoneticSangsaeng([surnameElement, ...required])).toBe(true);
    }
  });

  it("金 성씨는 이름에 [水, 木]을 요구한다", () => {
    expect(requiredPhoneticElements("金", 2)).toEqual(["水", "木"]);
  });
});

// 실사용에서 재현된 버그(같은 획수 조합 안에서 점수가 전부 동점이라 첫 글자가 5개 전부 고정되고,
// 서로 다른 한자인데 발음이 같은 후보가 중복 등장)를 최소 재현하는 테스트. score/candidate만 있으면
// 되므로 hanja는 char만 의미 있게 채운다.
function makeCandidate(hangul: string, chars: [string, string], numerologyNumbers: number[]): Candidate {
  return {
    hangul,
    hanja: chars.map((char) => makeHanja({ char, readings: [], strokeOriginal: 0 })),
    numerologyNumbers,
    phoneticElements: [],
    frequency: 0,
    highlights: [],
  };
}

describe("selectDiverseCandidates", () => {
  it("같은 한글 발음(hangul)인 후보는 점수가 같아도 중복으로 뽑지 않는다", () => {
    const scored = [
      { candidate: makeCandidate("미가", ["美", "佳"], [1, 2, 3, 4]), score: 5 },
      { candidate: makeCandidate("미가", ["薇", "佳"], [1, 2, 3, 4]), score: 5 }, // 다른 한자, 같은 발음
      { candidate: makeCandidate("민나", ["民", "那"], [5, 6, 7, 8]), score: 5 },
    ];
    const result = selectDiverseCandidates(scored, 3);
    const hangulList = result.map((c) => c.hangul);
    expect(hangulList.filter((h) => h === "미가")).toHaveLength(1);
    // 정렬 순서상 먼저 온 것(美佳)이 채택되고 薇佳는 버려진다.
    expect(result.find((c) => c.hangul === "미가")?.hanja.map((h) => h.char)).toEqual(["美", "佳"]);
  });

  it("점수가 동점인 조합이 많아도 글자 재사용을 우선 제한해 다양성을 확보한다", () => {
    // 6개 모두 동점. 앞 4개는 완전히 서로 다른 글자, 마지막은 5번째 후보의 첫 글자를 재사용.
    const scored = [
      { candidate: makeCandidate("미가", ["美", "佳"], [1, 1, 1, 1]), score: 5 },
      { candidate: makeCandidate("민나", ["民", "那"], [2, 2, 2, 2]), score: 5 },
      { candidate: makeCandidate("빈다", ["彬", "茶"], [3, 3, 3, 3]), score: 5 },
      { candidate: makeCandidate("성라", ["成", "羅"], [4, 4, 4, 4]), score: 5 },
      { candidate: makeCandidate("성마", ["成", "麻"], [5, 5, 5, 5]), score: 5 }, // 첫 글자 成 재사용
    ];
    const result = selectDiverseCandidates(scored, 5);
    expect(result).toHaveLength(5); // 완화 단계를 거쳐서라도 5개를 채운다.
    const firstChars = result.map((c) => c.hanja[0].char);
    // 1단계(재사용 1회)에서는 4개까지만 채워지고, 5번째는 재사용을 허용하는 완화 단계에서 채택된다.
    expect(firstChars.filter((c) => c === "成")).toHaveLength(2);
  });

  it("동일 4격(수리) 조합은 상위 후보 안에서 최대 개수(기본 2개)까지만 허용한다", () => {
    const sameBucket = [1, 2, 3, 4];
    const scored = [
      { candidate: makeCandidate("가나", ["加", "那"], sameBucket), score: 5 },
      { candidate: makeCandidate("다라", ["多", "羅"], sameBucket), score: 5 },
      { candidate: makeCandidate("마바", ["馬", "波"], sameBucket), score: 5 }, // 같은 버킷 3번째 — 1단계에서 제외
      { candidate: makeCandidate("사아", ["士", "阿"], [9, 9, 9, 9]), score: 4 },
    ];
    const result = selectDiverseCandidates(scored, 3);
    const bucketCounts = result.filter((c) => c.numerologyNumbers.join(",") === sameBucket.join(","));
    expect(bucketCounts).toHaveLength(2);
    expect(result.map((c) => c.hangul)).toContain("사아"); // 버킷 제한으로 빠진 자리를 다른 버킷이 채운다.
  });

  // CLAUDE.md 3.6(Phase 8) — "규리/규린/규나"처럼 자모 하나 차이로 거의 같게 들리는 이름이 한
  // 결과에 몰리지 않도록 거르는 avoidSimilar 단계 검증. "규리"/"유리"는 첫 글자(규/유)가 달라
  // maxCharReuse로는 걸러지지 않지만, 자모 불일치가 1(초성만 다름)이라 유사로 판정돼야 한다.
  it("자모 유사도가 높은 이름은(첫 글자가 달라도) 최대한 거르되, 채워야 하면 완화 단계에서 포함한다", () => {
    const scored = [
      { candidate: makeCandidate("규리", ["圭", "李"], [1, 1, 1, 1]), score: 5 },
      { candidate: makeCandidate("유리", ["柳", "梨"], [2, 2, 2, 2]), score: 5 }, // 규리와 자모 불일치 1
      { candidate: makeCandidate("성라", ["成", "羅"], [3, 3, 3, 3]), score: 5 },
    ];

    const limited = selectDiverseCandidates(scored, 2);
    expect(limited.map((c) => c.hangul)).toEqual(["규리", "성라"]); // 유사한 유리는 2개만 필요하면 제외.

    const full = selectDiverseCandidates(scored, 3);
    expect(full.map((c) => c.hangul)).toEqual(["규리", "유리", "성라"]); // 3개를 다 채워야 하면 완화되어 포함.
  });
});

// CLAUDE.md 3.6.5(Phase 12) — 게이트 통과 개수에 따라 상위 30%(200 미만) 또는 20%(200 이상) 안에서만
// 순서를 섞고, 그 밖은 원래 점수순을 그대로 유지하는지 검증한다. 무작위성 자체는 통계적으로만
// 검증 가능하지만, "섞이는 범위"는 random 함수와 무관하게 항상 참이어야 하는 구조적 성질이라
// 결정적으로(매 실행 동일하게) 테스트할 수 있다.
describe("buildRandomizedSelectionPool", () => {
  function makeManyScored(n: number): Array<{ candidate: Candidate; score: number }> {
    // score가 n,n-1,...,1로 엄격히 감소하므로 정렬 순서(=원래 순위)가 항상 명확하다.
    return Array.from({ length: n }, (_, i) => ({
      candidate: makeCandidate(`이${i}`, [`h${i}a`, `h${i}b`], [i, i, i, i]),
      score: n - i,
    }));
  }

  it("게이트 통과 개수가 200 미만이면 상위 30%(최소 candidateCount) 범위 안에서만 순서가 섞인다", () => {
    const scored = makeManyScored(30); // 30 < 200 → 30%. topCount = max(5, ceil(30*0.3)=9) = 9.
    const pool = buildRandomizedSelectionPool(scored, 5, () => 0.4);

    const shuffledPart = pool.slice(0, 9).map((p) => p.candidate.hangul);
    const originalTop9 = scored.slice(0, 9).map((p) => p.candidate.hangul);
    expect(new Set(shuffledPart)).toEqual(new Set(originalTop9)); // 섞였어도 "누가 상위 9인지"는 그대로.

    const untouchedRemainder = pool.slice(9);
    expect(untouchedRemainder).toEqual(scored.slice(9)); // 상위 밖은 순서·내용 모두 그대로.
  });

  it("게이트 통과 개수가 200 이상이면 상위 20% 범위 안에서만 순서가 섞인다", () => {
    const scored = makeManyScored(250); // 250 >= 200 → 20%. topCount = max(5, ceil(250*0.2)=50) = 50.
    const pool = buildRandomizedSelectionPool(scored, 5, () => 0.4);

    const shuffledPart = new Set(pool.slice(0, 50).map((p) => p.candidate.hangul));
    const originalTop50 = new Set(scored.slice(0, 50).map((p) => p.candidate.hangul));
    expect(shuffledPart).toEqual(originalTop50);

    expect(pool.slice(50)).toEqual(scored.slice(50));
  });

  it("random이 항상 1에 가까운 값을 반환하면(NO_SHUFFLE) 순서가 그대로 유지된다", () => {
    const scored = makeManyScored(30);
    const pool = buildRandomizedSelectionPool(scored, 5, NO_SHUFFLE);
    expect(pool).toEqual(scored);
  });

  it("실제로 순서를 바꾸는 random을 주면 상위 구간의 순서가 원래와 달라진다", () => {
    const scored = makeManyScored(30);
    // 0.4는 Fisher-Yates에서 항상 자기 자신보다 앞쪽 인덱스로 스왑을 유도해 순서를 바꾼다.
    const pool = buildRandomizedSelectionPool(scored, 5, () => 0.4);
    const shuffledOrder = pool.slice(0, 9).map((p) => p.candidate.hangul);
    const originalOrder = scored.slice(0, 9).map((p) => p.candidate.hangul);
    expect(shuffledOrder).not.toEqual(originalOrder);
  });

  it("풀 크기가 candidateCount보다 작아도(상위 비율이 candidateCount에 못 미쳐도) 최소 candidateCount만큼은 섞는다", () => {
    const scored = makeManyScored(3); // 30%면 1개뿐이지만 candidateCount=5가 하한.
    const pool = buildRandomizedSelectionPool(scored, 5, NO_SHUFFLE);
    expect(pool).toEqual(scored); // topCount = min(3, max(5,1)) = 3 → 전체가 셔플 대상.
  });
});

// Phase 6 확정(3.6 확장) — 이름(hangul) 후보는 curatedGivenNames(성별 given_name 테이블)에 있는
// 것만 나온다. 자유 조합은 하지 않는다.
describe("buildCandidates", () => {
  // 성 金(金=8획, 오행 金) → 이름 요구 발음오행 [水(ㅁㅂㅍ), 木(ㄱㅋ)].
  const surnameStroke = 8;
  const surnameElement: Element = "金";

  const hanjaPool: Hanja[] = [
    // 水 그룹 (이름 첫 글자 후보)
    makeHanja({ char: "美", readings: ["미"], strokeOriginal: 5, element: "水" }), // 자원오행 용신 일치
    makeHanja({ char: "敏", readings: ["민"], strokeOriginal: 4, element: null }),
    makeHanja({ char: "帆", readings: ["범"], strokeOriginal: 6, element: null, isCommon: true }),
    // 木 그룹 (이름 끝 글자 후보)
    makeHanja({ char: "佳", readings: ["가"], strokeOriginal: 3, element: "木" }), // 자원오행 용신 일치
    makeHanja({ char: "建", readings: ["건"], strokeOriginal: 2, element: null }),
    makeHanja({ char: "考", readings: ["고"], strokeOriginal: 7, element: null, isCommon: true }),
  ];

  function makeNumerologyTable(auspicious: number[]): Map<number, Numerology81> {
    const map = new Map<number, Numerology81>();
    for (let n = 1; n <= 30; n++) {
      map.set(n, { number: n, fortune: auspicious.includes(n) ? "길" : "흉", title: null, description: null });
    }
    return map;
  }

  const ALL_AUSPICIOUS = makeNumerologyTable(Array.from({ length: 30 }, (_, i) => i + 1));

  it("curatedGivenNames에 없는 이름은 후보로 나오지 않는다", () => {
    // 敏(민)+佳(가) 조합도 통과 가능하지만 "민가"가 큐레이션 목록에 없으므로 나오지 않는다.
    // yongsin은 美(水)·佳(木)와 실제로 일치하는 값을 준다 — yongsin=[]이면 scoreWonhaeng이
    // "적용 가능하지만 매치 없음"으로 20점을 통째로 잃어 총점이 90 밑으로 떨어진다(3.6.4).
    const result = buildCandidates({
      surnameStroke,
      surnameElement,
      yongsin: ["水", "木"],
      distribution: NEUTRAL_DISTRIBUTION,
      hanjaPool,
      numerologyTable: ALL_AUSPICIOUS,
      candidateCount: 5,
      random: NO_SHUFFLE,
      curatedGivenNames: [{ hangul: "미가", frequency: 100 }],
    });
    expect(result.map((c) => c.hangul)).toEqual(["미가"]);
  });

  it("발음오행 순방향 상생과 맞지 않는 이름은 건너뛴다", () => {
    // "가미"는 木(가)→水(미)로, 요구된 순서([水,木])와 반대라 상생이 아니다.
    const result = buildCandidates({
      surnameStroke,
      surnameElement,
      yongsin: [],
      distribution: NEUTRAL_DISTRIBUTION,
      hanjaPool,
      numerologyTable: ALL_AUSPICIOUS,
      candidateCount: 5,
      random: NO_SHUFFLE,
      curatedGivenNames: [{ hangul: "가미", frequency: 100 }],
    });
    expect(result).toEqual([]);
  });

  it("발음오행은 맞지만 한자 풀에 없는 음절로 된 이름은 건너뛴다", () => {
    // 무(ㅁ→水)+구(ㄱ→木)는 발음오행 요구([水,木])를 만족하지만, 이 테스트의 작은 hanjaPool에는
    // "무"·"구"로 읽는 한자가 없다.
    const result = buildCandidates({
      surnameStroke,
      surnameElement,
      yongsin: [],
      distribution: NEUTRAL_DISTRIBUTION,
      hanjaPool,
      numerologyTable: ALL_AUSPICIOUS,
      candidateCount: 5,
      random: NO_SHUFFLE,
      curatedGivenNames: [{ hangul: "무구", frequency: 100 }],
    });
    expect(result).toEqual([]);
  });

  it("4격이 전부 길수인 이름만 후보로 남긴다", () => {
    // 미가(美5+佳3): won=8,hyeong=13,i=11,jeong=16 → 전부 길 → 총점 100.
    // 민가(敏4+佳3): won=7,hyeong=12,i=11,jeong=15 → hyeong(12)을 흉으로 설정하면 수리 30/40(75%)이
    // 되어, 나머지가 전부 만점이어도 총점이 약 89로 90 밑에 머문다(3.6.4 — 4격 하나가 흉이면
    // 최대치조차 90을 못 넘는 걸 보여준다).
    const numerologyTable = makeNumerologyTable([8, 13, 11, 16, 7, 11, 15]); // 12는 포함 안 함(흉)

    const result = buildCandidates({
      surnameStroke,
      surnameElement,
      yongsin: ["水", "木"],
      distribution: NEUTRAL_DISTRIBUTION,
      hanjaPool,
      numerologyTable,
      candidateCount: 5,
      random: NO_SHUFFLE,
      curatedGivenNames: [
        { hangul: "미가", frequency: 100 },
        { hangul: "민가", frequency: 100 },
      ],
    });

    expect(result.map((c) => c.hangul)).toEqual(["미가"]);
  });

  it("자원오행이 용신과 일치하는 이름이 더 높은 점수로 상위에 온다", () => {
    // 미가(美水+佳木, 주용신·보조용신 둘 다 일치) vs 민가(敏+佳, 보조용신만 일치) vs
    // 미건(美+建, 주용신만 일치) vs 민건(敏+建, 불일치+strokes[8,4,2] 음양 쏠림). yongsin=["水","木"]
    // 이라 水=주용신(가중2), 木=보조용신(가중1). 셋(미가·미건·민가)은 모두 score.ts 총점 100으로
    // 게이트(3.6.4)를 통과하고, 그 안에서의 순서는 순수히 주용신/보조용신 차등(3.6.3 B)만으로
    // 갈린다: 미가(2+1=3) > 미건(2) > 민가(1). 민건은 자원오행 둘 다 NULL이라 wonhaeng 항목 자체가
    // 총점 분모에서 빠지는데, 거기에 획수 음양까지 쏠려(8,4,2 전부 짝) 총점이 87.5(<90)에 그쳐
    // 게이트 자체를 통과하지 못한다 — 이전엔 순위만 4위였지만 이제는 애초에 후보 자격이 없다.
    const numerologyTable = makeNumerologyTable([8, 13, 11, 16, 7, 12, 11, 15, 7, 13, 10, 15, 6, 12, 10, 14]);

    const result = buildCandidates({
      surnameStroke,
      surnameElement,
      yongsin: ["水", "木"],
      distribution: NEUTRAL_DISTRIBUTION,
      hanjaPool,
      numerologyTable,
      candidateCount: 5,
      random: NO_SHUFFLE,
      curatedGivenNames: [
        { hangul: "미가", frequency: 1 },
        { hangul: "민가", frequency: 1 },
        { hangul: "미건", frequency: 1 },
        { hangul: "민건", frequency: 1 },
      ],
    });

    expect(result.map((c) => c.hangul)).toEqual(["미가", "미건", "민가"]);
  });

  it("보조용신이라도 그 오행이 사주에 전혀 없으면(완전 부족), 부족하지 않은 주용신 매치와 동점을 이룰 수 있다", () => {
    // CLAUDE.md 3.6.3의 두 축(A: 부족량 비례, B: 주/보조 차등)이 실제로 상호작용하는지 확인한다.
    // 水(주용신, 가중2)는 평균(1.6)만큼 있어 전혀 부족하지 않음(shortageRatio=0) → 2×(1+0)=2.
    // 木(보조용신, 가중1)은 0으로 완전히 부족함(shortageRatio=1) → 1×(1+1)=2. 정확히 동점(2)이 되어
    // 그 아래 동점자 처리(실사용 빈도)로 순위가 갈린다.
    const distribution: ElementDistribution = { 木: 0, 火: 3.6, 土: 1.2, 金: 1.6, 水: 1.6 };
    const numerologyTable = makeNumerologyTable([8, 13, 11, 16, 7, 12, 11, 15, 7, 13, 10, 15]);

    const result = buildCandidates({
      surnameStroke,
      surnameElement,
      yongsin: ["水", "木"],
      distribution,
      hanjaPool,
      numerologyTable,
      candidateCount: 5,
      random: NO_SHUFFLE,
      curatedGivenNames: [
        { hangul: "민가", frequency: 200 }, // 敏(null)+佳(木, 보조용신·완전 부족) → 점수 2
        { hangul: "미건", frequency: 50 }, // 美(水, 주용신·부족하지 않음)+建(null) → 점수 2
      ],
    });

    expect(result[0].hangul).toBe("민가"); // 동점이므로 실사용 빈도가 높은 쪽이 앞선다.
  });

  it("자원오행 일치와 isCommon(교육용 기초한자) 가중치가 동등한 만점으로 맞춰져 있다", () => {
    // CLAUDE.md 3.6.3 — wonhaeng 만점(6)과 commonHanja 만점(2*3=6)이 여전히 동률이도록 설계됐다.
    // wonhaeng이 만점에 도달하려면 주용신·보조용신 둘 다 일치 + 둘 다 완전히 부족(distribution=0)
    // 해야 한다: 美(水,주용신)=2×(1+1)=4, 佳(木,보조용신)=1×(1+1)=2, 합 6.
    // 미가: wonhaeng 6, common 0, 음양균형(strokes 8,5,3 → 부동) +1 = 7.
    // 범고(帆6+考7): wonhaeng 0, common 2*3=6, 음양균형(strokes 8,6,7 → 부동) +1 = 7 → 동점.
    // 동점이므로 실사용 빈도(frequency)가 높은 쪽이 앞선다 — 가중치가 아니라 빈도가 갈랐다는 것을 확인.
    const distribution: ElementDistribution = { 木: 0, 火: 4, 土: 0, 金: 4, 水: 0 };
    const numerologyTable = makeNumerologyTable([8, 13, 11, 16, 13, 14, 15, 21]);

    const result = buildCandidates({
      surnameStroke,
      surnameElement,
      yongsin: ["水", "木"],
      distribution,
      hanjaPool,
      numerologyTable,
      candidateCount: 5,
      random: NO_SHUFFLE,
      curatedGivenNames: [
        { hangul: "미가", frequency: 1 },
        { hangul: "범고", frequency: 100 },
      ],
    });

    expect(result[0].hangul).toBe("범고");
  });

  it("점수가 동점이면 실사용 빈도(frequency)가 높은 이름을 우선한다", () => {
    // yongsin=["木"] 하나만 줘서, 두 이름 모두 佳(木)만 매치하고 美/敏(水)는 매치 대상이 아니게
    // 만든다 — 美(水)는 yongsin에 없어 내부 순위 점수(wonhaengScore)에 기여하지 않으므로
    // 미가·민가 모두 佳만으로 내부 점수 2 + 음양균형 1 = 3점 동점이다(3.6.3). score.ts 게이트도
    // 둘 다 90 이상(미가=90, 민가=100 — 敏이 NULL이라 wonhaeng 분모 자체가 줄어 100%를 채움)이라
    // 통과하며, 내부 순위가 동점이므로 실사용 빈도가 갈랐다는 것을 확인한다.
    const numerologyTable = makeNumerologyTable([8, 13, 11, 16, 7, 12, 11, 15]);

    const result = buildCandidates({
      surnameStroke,
      surnameElement,
      yongsin: ["木"],
      distribution: NEUTRAL_DISTRIBUTION,
      hanjaPool,
      numerologyTable,
      candidateCount: 5,
      random: NO_SHUFFLE,
      curatedGivenNames: [
        { hangul: "민가", frequency: 50 },
        { hangul: "미가", frequency: 200 },
      ],
    });

    expect(result[0].hangul).toBe("미가");
  });

  it("같은 이름(hangul)에 여러 한자 조합이 가능해도 최고점 하나만 후보로 남긴다", () => {
    // "미가"는 美+佳 조합 하나뿐이지만(현재 풀 기준), 만약 여러 조합이 있어도 결과에는
    // 이 이름이 한 번만 나와야 한다(발음 중복 방지, CLAUDE.md 3.6). yongsin은 게이트(3.6.4)를
    // 통과시키기 위해 美水/佳木과 실제로 일치하는 값을 준다.
    const result = buildCandidates({
      surnameStroke,
      surnameElement,
      yongsin: ["水", "木"],
      distribution: NEUTRAL_DISTRIBUTION,
      hanjaPool,
      numerologyTable: ALL_AUSPICIOUS,
      candidateCount: 5,
      random: NO_SHUFFLE,
      curatedGivenNames: [{ hangul: "미가", frequency: 100 }],
    });
    const count = result.filter((c) => c.hangul === "미가").length;
    expect(count).toBeLessThanOrEqual(1);
  });
});
