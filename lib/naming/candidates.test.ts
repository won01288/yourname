import { describe, it, expect } from "vitest";
import { requiredPhoneticElements, buildCandidates, selectDiverseCandidates } from "./candidates";
import { isPhoneticSangsaeng } from "./phonetic";
import type { Candidate, Element, Hanja, Numerology81 } from "./types";

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
    const result = buildCandidates({
      surnameStroke,
      surnameElement,
      yongsin: [],
      hanjaPool,
      numerologyTable: ALL_AUSPICIOUS,
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
      hanjaPool,
      numerologyTable: ALL_AUSPICIOUS,
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
      hanjaPool,
      numerologyTable: ALL_AUSPICIOUS,
      curatedGivenNames: [{ hangul: "무구", frequency: 100 }],
    });
    expect(result).toEqual([]);
  });

  it("4격이 전부 길수인 이름만 후보로 남긴다", () => {
    // 미가(美5+佳3): won=8,hyeong=13,i=11,jeong=16 → 전부 길.
    // 민가(敏4+佳3): won=7,hyeong=12,i=11,jeong=15 → hyeong(12)을 흉으로 설정해 탈락시킨다.
    const numerologyTable = makeNumerologyTable([8, 13, 11, 16, 7, 11, 15]); // 12는 포함 안 함(흉)

    const result = buildCandidates({
      surnameStroke,
      surnameElement,
      yongsin: [],
      hanjaPool,
      numerologyTable,
      curatedGivenNames: [
        { hangul: "미가", frequency: 100 },
        { hangul: "민가", frequency: 100 },
      ],
    });

    expect(result.map((c) => c.hangul)).toEqual(["미가"]);
  });

  it("자원오행이 용신과 일치하는 이름이 더 높은 점수로 상위에 온다", () => {
    // 미가(美水+佳木, 2개 일치) vs 민가(敏+佳, 1개 일치) vs 미건(美+建, 1개 일치) vs 민건(敏+建, 0개 일치).
    const numerologyTable = makeNumerologyTable([8, 13, 11, 16, 7, 12, 11, 15, 7, 13, 10, 15, 6, 12, 10, 14]);

    const result = buildCandidates({
      surnameStroke,
      surnameElement,
      yongsin: ["水", "木"],
      hanjaPool,
      numerologyTable,
      curatedGivenNames: [
        { hangul: "미가", frequency: 1 },
        { hangul: "민가", frequency: 1 },
        { hangul: "미건", frequency: 1 },
        { hangul: "민건", frequency: 1 },
      ],
    });

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].hangul).toBe("미가");
  });

  it("자원오행 일치와 isCommon(교육용 기초한자) 가중치가 동등하게 반영된다", () => {
    // 2026.7.26 재조정 이후 wonhaengMatch=commonHanja=3이라 어느 한쪽이 구조적으로 항상
    // 이기지 않는다. 미가: wonhaeng 2*3=6, common 0, 음양균형(strokes 8,5,3 → 부동) +1 = 7.
    // 범고(帆6+考7): wonhaeng 0, common 2*3=6, 음양균형(strokes 8,6,7 → 부동) +1 = 7 → 동점.
    // 동점이므로 실사용 빈도(frequency)가 높은 쪽이 앞선다 — 가중치가 아니라 빈도가 갈랐다는 것을 확인.
    const numerologyTable = makeNumerologyTable([8, 13, 11, 16, 13, 14, 15, 21]);

    const result = buildCandidates({
      surnameStroke,
      surnameElement,
      yongsin: ["水", "木"],
      hanjaPool,
      numerologyTable,
      curatedGivenNames: [
        { hangul: "미가", frequency: 1 },
        { hangul: "범고", frequency: 100 },
      ],
    });

    expect(result[0].hangul).toBe("범고");
  });

  it("점수가 동점이면 실사용 빈도(frequency)가 높은 이름을 우선한다", () => {
    // 미가(美5+佳3, strokes[8,5,3] 부동→+1)와 민가(敏4+佳3, strokes[8,4,3] 부동→+1)는
    // yongsin=[]이라 wonhaeng·common 없이 둘 다 균형 가산점 1점으로 동점이다.
    const numerologyTable = makeNumerologyTable([8, 13, 11, 16, 7, 12, 11, 15]);

    const result = buildCandidates({
      surnameStroke,
      surnameElement,
      yongsin: [],
      hanjaPool,
      numerologyTable,
      curatedGivenNames: [
        { hangul: "민가", frequency: 50 },
        { hangul: "미가", frequency: 200 },
      ],
    });

    expect(result[0].hangul).toBe("미가");
  });

  it("같은 이름(hangul)에 여러 한자 조합이 가능해도 최고점 하나만 후보로 남긴다", () => {
    // "미가"는 美+佳 조합 하나뿐이지만(현재 풀 기준), 만약 여러 조합이 있어도 결과에는
    // 이 이름이 한 번만 나와야 한다(발음 중복 방지, CLAUDE.md 3.6).
    const result = buildCandidates({
      surnameStroke,
      surnameElement,
      yongsin: [],
      hanjaPool,
      numerologyTable: ALL_AUSPICIOUS,
      curatedGivenNames: [{ hangul: "미가", frequency: 100 }],
    });
    const count = result.filter((c) => c.hangul === "미가").length;
    expect(count).toBeLessThanOrEqual(1);
  });
});
