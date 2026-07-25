import { describe, it, expect } from "vitest";
import { aggregateElements } from "./elements";
import type { Saju } from "./types";

// 1990-05-15 14:30(양력) 사주: 庚午 辛巳 庚辰 癸未 (@fullstackfamily/manseryeok calculateSaju로 검산).
// 손으로 검산한 지장간 일수 비례 집계값을 기대값으로 고정한다 (CLAUDE.md 8.4).
const SAJU_1990_05_15: Saju = {
  year: { stem: "庚", branch: "午" },
  month: { stem: "辛", branch: "巳" },
  day: { stem: "庚", branch: "辰" },
  hour: { stem: "癸", branch: "未" },
};

describe("aggregateElements", () => {
  it("천간 4개 + 지지 4개의 지장간(일수 비례)을 오행으로 환산해 집계한다", () => {
    const result = aggregateElements(SAJU_1990_05_15);

    expect(result.木).toBeCloseTo(12 / 30, 10);
    expect(result.火).toBeCloseTo(46 / 30, 10);
    expect(result.土).toBeCloseTo(52 / 30, 10);
    expect(result.金).toBeCloseTo(97 / 30, 10);
    expect(result.水).toBeCloseTo(33 / 30, 10);
  });

  it("오행 분포의 총합은 항상 8이다 (천간 4 + 지지 4 x 지장간 가중치 합 1)", () => {
    const result = aggregateElements(SAJU_1990_05_15);
    const total = result.木 + result.火 + result.土 + result.金 + result.水;
    expect(total).toBeCloseTo(8, 10);
  });

  it("알 수 없는 천간/지지가 들어오면 에러를 던진다", () => {
    const invalid: Saju = {
      year: { stem: "?", branch: "午" },
      month: { stem: "辛", branch: "巳" },
      day: { stem: "庚", branch: "辰" },
      hour: { stem: "癸", branch: "未" },
    };
    expect(() => aggregateElements(invalid)).toThrow();
  });
});
