import { describe, it, expect } from "vitest";
import { requiredPhoneticElements, groupByPhoneticElement, buildCandidates } from "./candidates";
import { isPhoneticSangsaeng } from "./phonetic";
import type { Element, Hanja, Numerology81 } from "./types";

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

describe("groupByPhoneticElement", () => {
  it("대표음(readings[0]) 초성 오행 기준으로 그룹핑한다", () => {
    const pool: Hanja[] = [
      makeHanja({ char: "美", readings: ["미"], strokeOriginal: 9 }), // ㅁ → 水
      makeHanja({ char: "家", readings: ["가"], strokeOriginal: 10 }), // ㄱ → 木
      makeHanja({ char: "無讀音", readings: [], strokeOriginal: 3 }), // 대표음 없음 → 제외
    ];
    const grouped = groupByPhoneticElement(pool);
    expect(grouped.水.map((h) => h.char)).toEqual(["美"]);
    expect(grouped.木.map((h) => h.char)).toEqual(["家"]);
    expect(grouped.火).toEqual([]);
  });
});

describe("buildCandidates", () => {
  // 성 金(金=8획, 오행 金) → 이름 요구 발음오행 [水(ㅁㅂㅍ), 木(ㄱㅋ)].
  const surnameStroke = 8;
  const surnameElement: Element = "金";

  const hanjaPool: Hanja[] = [
    // 水 그룹 (이름 첫 글자 후보)
    makeHanja({ char: "美", readings: ["미"], strokeOriginal: 5, element: "水" }), // 자원오행 용신 일치
    makeHanja({ char: "敏", readings: ["민"], strokeOriginal: 4, element: null }),
    // 木 그룹 (이름 끝 글자 후보)
    makeHanja({ char: "佳", readings: ["가"], strokeOriginal: 3, element: "木" }), // 자원오행 용신 일치
    makeHanja({ char: "建", readings: ["건"], strokeOriginal: 2, element: null }),
  ];

  function makeNumerologyTable(auspicious: number[]): Map<number, Numerology81> {
    const map = new Map<number, Numerology81>();
    for (let n = 1; n <= 30; n++) {
      map.set(n, { number: n, fortune: auspicious.includes(n) ? "길" : "흉", title: null, description: null });
    }
    return map;
  }

  it("4격이 전부 길수인 조합만 후보로 남긴다", () => {
    // stroke1=5(美), stroke2=3(佳): won=8, hyeong=13, i=11, jeong=16 → 전부 길로 설정.
    // stroke1=4(敏), stroke2=3(佳): won=7, hyeong=12, i=11, jeong=15 → hyeong(12)을 흉으로 설정해 탈락시킨다.
    const numerologyTable = makeNumerologyTable([8, 13, 11, 16, 7, 11, 15]); // 12는 포함 안 함(흉)

    const result = buildCandidates({
      surnameStroke,
      surnameElement,
      yongsin: ["水", "木"],
      hanjaPool,
      numerologyTable,
    });

    const chars = result.map((c) => c.hanja.map((h) => h.char).join(""));
    expect(chars).toContain("美佳"); // 통과
    expect(chars).not.toContain("敏佳"); // hyeong 12 흉으로 탈락
  });

  it("자원오행이 용신과 일치하는 후보가 더 높은 점수로 상위에 온다", () => {
    // 모든 조합의 4격을 길로 설정해 필터를 통과시키고 점수 정렬만 검증한다.
    const numerologyTable = makeNumerologyTable([8, 13, 11, 16, 7, 12, 15, 9, 14, 10]);

    const result = buildCandidates({
      surnameStroke,
      surnameElement,
      yongsin: ["水", "木"],
      hanjaPool,
      numerologyTable,
    });

    expect(result.length).toBeGreaterThan(0);
    // 美(水 용신 일치)+佳(木 용신 일치) 조합이 자원오행 2개 일치로 최고점 → 1위.
    expect(result[0].hanja.map((h) => h.char)).toEqual(["美", "佳"]);
  });

  it("이름 두 글자가 같은 한자인 조합은 만들지 않는다", () => {
    const numerologyTable = makeNumerologyTable(Array.from({ length: 30 }, (_, i) => i + 1)); // 전부 길
    const result = buildCandidates({
      surnameStroke,
      surnameElement,
      yongsin: [],
      hanjaPool,
      numerologyTable,
    });
    for (const candidate of result) {
      expect(candidate.hanja[0].char).not.toBe(candidate.hanja[1].char);
    }
  });
});
