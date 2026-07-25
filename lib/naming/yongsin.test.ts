import { describe, it, expect } from "vitest";
import { aggregateElements } from "./elements";
import { judgeStrength, deriveYongsin } from "./yongsin";
import type { Saju } from "./types";

// 1990-05-15 14:30(양력): 庚午 辛巳 庚辰 癸未. 일간 庚(金).
// 비겁(金)+인성(土) 세력 비율 ≈ 55.2%(월지 巳=火 득령 미충족) → 신강.
const STRONG_SAJU: Saju = {
  year: { stem: "庚", branch: "午" },
  month: { stem: "辛", branch: "巳" },
  day: { stem: "庚", branch: "辰" },
  hour: { stem: "癸", branch: "未" },
};

// 2000-06-15 12:00(양력): 庚辰 壬午 甲辰 庚午. 일간 甲(木).
// 비겁(木)+인성(水) 세력 비율 ≈ 31.1%(월지 午=火 득령 미충족) → 신약.
const WEAK_SAJU: Saju = {
  year: { stem: "庚", branch: "辰" },
  month: { stem: "壬", branch: "午" },
  day: { stem: "甲", branch: "辰" },
  hour: { stem: "庚", branch: "午" },
};

describe("judgeStrength", () => {
  it("비겁+인성 세력 비율이 50% 이상이면 신강으로 판정한다", () => {
    const distribution = aggregateElements(STRONG_SAJU);
    expect(judgeStrength(STRONG_SAJU, distribution)).toBe("신강");
  });

  it("비겁+인성 세력 비율이 50% 미만이면 신약으로 판정한다", () => {
    const distribution = aggregateElements(WEAK_SAJU);
    expect(judgeStrength(WEAK_SAJU, distribution)).toBe("신약");
  });
});

describe("deriveYongsin", () => {
  it("신강 사주는 설기(식상)·극제(관성) 오행을 용신으로 삼는다", () => {
    const distribution = aggregateElements(STRONG_SAJU);
    const result = deriveYongsin(STRONG_SAJU, distribution);

    expect(result.strength).toBe("신강");
    // 일간 金 → 식상(水), 관성(火)
    expect(result.yongsin).toEqual(["水", "火"]);
    expect(result.reason).toContain("신강");
  });

  it("신약 사주는 생조(인성)·부조(비겁) 오행을 용신으로 삼는다", () => {
    const distribution = aggregateElements(WEAK_SAJU);
    const result = deriveYongsin(WEAK_SAJU, distribution);

    expect(result.strength).toBe("신약");
    // 일간 木 → 인성(水), 비겁(木)
    expect(result.yongsin).toEqual(["水", "木"]);
    expect(result.reason).toContain("신약");
  });
});
