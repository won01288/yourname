import { describe, it, expect } from "vitest";
import {
  classifyPhoneticLink,
  scorePhoneticFlow,
  scoreNumerology,
  scoreYinYang,
  scoreWonhaeng,
  scoreName,
} from "./score";
import type { Element, Hanja, Numerology81 } from "./types";

const ELEMENTS: Element[] = ["木", "火", "土", "金", "水"];

function makeHanja(overrides: Partial<Hanja> & Pick<Hanja, "char" | "strokeOriginal">): Hanja {
  return {
    readings: [],
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

describe("classifyPhoneticLink", () => {
  it("순방향 상생(nextElement)이면 상생", () => {
    expect(classifyPhoneticLink("金", "水")).toBe("상생");
    expect(classifyPhoneticLink("木", "火")).toBe("상생");
  });

  it("같은 오행이면 비화", () => {
    expect(classifyPhoneticLink("土", "土")).toBe("비화");
  });

  it("뒤 글자가 앞 글자를 생하면(역방향) 역상생", () => {
    // nextElement(木) = 火 이므로 火→木은 木이 火를 낳는 역방향.
    expect(classifyPhoneticLink("火", "木")).toBe("역상생");
  });

  it("파괴 관계(양방향 모두)는 상극", () => {
    expect(classifyPhoneticLink("木", "土")).toBe("상극"); // 木克土
    expect(classifyPhoneticLink("土", "木")).toBe("상극"); // 반대 방향도 상극으로 처리
  });

  it("5×5 모든 조합이 정확히 비화5·상생5·역상생5·상극10으로 분류된다", () => {
    const counts: Record<string, number> = { 상생: 0, 비화: 0, 역상생: 0, 상극: 0 };
    for (const from of ELEMENTS) {
      for (const to of ELEMENTS) {
        counts[classifyPhoneticLink(from, to)] += 1;
      }
    }
    expect(counts).toEqual({ 상생: 5, 비화: 5, 역상생: 5, 상극: 10 });
  });
});

describe("scorePhoneticFlow", () => {
  it("두 링크 모두 순방향 상생이면 만점(30)", () => {
    const result = scorePhoneticFlow(["金", "水", "木"]);
    expect(result.points).toBe(30);
    expect(result.maxPoints).toBe(30);
    expect(result.links.map((l) => l.grade)).toEqual(["상생", "상생"]);
  });

  it("상극이 섞이면 그만큼 감점된다", () => {
    const result = scorePhoneticFlow(["木", "土", "土"]); // 木→土 상극(0), 土→土 비화(7.5)
    expect(result.links.map((l) => l.grade)).toEqual(["상극", "비화"]);
    expect(result.points).toBe(0 + 7.5);
  });
});

describe("scoreNumerology", () => {
  const table = new Map<number, Numerology81>([
    [11, { number: 11, fortune: "길", title: null, description: null }],
    [13, { number: 13, fortune: "반길", title: null, description: null }],
    [14, { number: 14, fortune: "흉", title: null, description: null }],
    [19, { number: 19, fortune: "길", title: null, description: null }],
  ]);

  it("길=10점, 반길=5점, 흉=0점으로 4격을 채점한다", () => {
    const result = scoreNumerology({ won: 11, hyeong: 13, i: 14, jeong: 19 }, table);
    expect(result.gyeoks.map((g) => g.points)).toEqual([10, 5, 0, 10]);
    expect(result.points).toBe(25);
    expect(result.maxPoints).toBe(40);
  });

  it("DB에 없는 수(누락)는 흉으로 취급해 0점 처리한다", () => {
    const result = scoreNumerology({ won: 999, hyeong: 11, i: 11, jeong: 11 }, table);
    expect(result.gyeoks[0].fortune).toBe("흉");
    expect(result.gyeoks[0].points).toBe(0);
  });
});

describe("scoreYinYang", () => {
  it("홀짝이 섞이면 균형(10점)", () => {
    expect(scoreYinYang([8, 5, 6])).toEqual({ points: 10, maxPoints: 10, balanced: true });
  });

  it("전부 홀 또는 전부 짝이면 불균형(0점)", () => {
    expect(scoreYinYang([8, 4, 6])).toEqual({ points: 0, maxPoints: 10, balanced: false });
  });
});

describe("scoreWonhaeng", () => {
  it("자원오행이 둘 다 NULL이면 applicable=false로 항목 자체를 건너뛴다", () => {
    const result = scoreWonhaeng(
      [makeHanja({ char: "水", strokeOriginal: 5 }), makeHanja({ char: "木", strokeOriginal: 6 })],
      ["水"]
    );
    expect(result).toEqual({ points: 0, maxPoints: 0, applicable: false });
  });

  it("한 글자만 자원오행이 있으면 그 글자 기준으로만 비례 배점한다", () => {
    const result = scoreWonhaeng(
      [
        makeHanja({ char: "淵", strokeOriginal: 5, element: "水" }),
        makeHanja({ char: "厄", strokeOriginal: 6, element: null }),
      ],
      ["水", "木"]
    );
    expect(result).toEqual({ points: 10, maxPoints: 10, applicable: true });
  });

  it("두 글자 다 자원오행이 있고 용신과 일치하면 만점(20)", () => {
    const result = scoreWonhaeng(
      [
        makeHanja({ char: "淵", strokeOriginal: 5, element: "水" }),
        makeHanja({ char: "杰", strokeOriginal: 6, element: "木" }),
      ],
      ["水", "木"]
    );
    expect(result).toEqual({ points: 20, maxPoints: 20, applicable: true });
  });
});

describe("scoreName", () => {
  const numerologyTable = new Map<number, Numerology81>([
    [11, { number: 11, fortune: "길", title: null, description: null }],
    [13, { number: 13, fortune: "반길", title: null, description: null }],
    [14, { number: 14, fortune: "흉", title: null, description: null }],
    [19, { number: 19, fortune: "길", title: null, description: null }],
  ]);

  it("발음30(만점)+수리25/40+자원10/10+음양10(만점) → 90점 만점 중 75점 → 재환산 83점 A등급", () => {
    // surnameElement=金, surnameStroke=8. "미"(ㅁ=水)→"가"(ㄱ=木): 金→水→木 순방향 상생 2링크(30점 만점).
    // sagyeok(8,[5,6]) = won11/hyeong13/i14/jeong19 → numerologyTable 기준 10+5+0+10=25/40.
    // 획수 [8,5,6] 홀짝 혼재 → 균형 10/10. 용신=[水,木], 淵(水)만 자원오행 있어 매치 → 10/10 (厄은 NULL).
    const result = scoreName({
      surnameElement: "金",
      surnameStroke: 8,
      givenSyllables: ["미", "가"],
      givenHanja: [
        makeHanja({ char: "淵", strokeOriginal: 5, element: "水" }),
        makeHanja({ char: "厄", strokeOriginal: 6, element: null, isNameAllowed: false, isForbidden: true, forbiddenReason: "나쁜 뜻" }),
      ],
      yongsin: ["水", "木"],
      numerologyTable,
    });

    expect(result.categories).toEqual([
      { key: "phonetic", label: "발음오행 상생", points: 30, maxPoints: 30, applicable: true },
      { key: "numerology", label: "수리사격(4격)", points: 25, maxPoints: 40, applicable: true },
      { key: "wonhaeng", label: "자원오행 용신 일치", points: 10, maxPoints: 10, applicable: true },
      { key: "yinYang", label: "음양 배열", points: 10, maxPoints: 10, applicable: true },
    ]);
    // earned 75 / max 90 → round(83.33) = 83.
    expect(result.totalScore).toBe(83);
    expect(result.grade).toBe("A");
    expect(result.warnings).toEqual([
      {
        type: "not-name-allowed",
        char: "厄",
        message: expect.stringContaining("인명용 한자 목록에서 확인되지 않았습니다"),
      },
      { type: "forbidden", char: "厄", message: "나쁜 뜻" },
    ]);
  });

  it("자원오행이 둘 다 NULL이면 나머지 3항목(80점 만점)으로 재환산한다", () => {
    const result = scoreName({
      surnameElement: "金",
      surnameStroke: 8,
      givenSyllables: ["미", "가"],
      givenHanja: [
        makeHanja({ char: "美", strokeOriginal: 5, element: null }),
        makeHanja({ char: "佳", strokeOriginal: 6, element: null }),
      ],
      yongsin: ["水", "木"],
      numerologyTable,
    });

    const wonhaengCategory = result.categories.find((c) => c.key === "wonhaeng");
    expect(wonhaengCategory?.applicable).toBe(false);
    // earned 30+25+10=65 / max 30+40+10=80 → round(81.25) = 81.
    expect(result.totalScore).toBe(81);
    expect(result.warnings).toEqual([]);
  });
});
