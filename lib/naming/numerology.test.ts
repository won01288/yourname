import { describe, it, expect } from "vitest";
import { calcSagyeok, isAuspiciousNumber } from "./numerology";

describe("calcSagyeok", () => {
  it("성 1자 + 이름 2자: 원격=이름 합, 형격=성+첫글자, 이격=성+끝글자, 정격=총획", () => {
    // 예: 성 10획 + 이름 3획·5획
    const result = calcSagyeok(10, [3, 5]);
    expect(result).toEqual({ won: 8, hyeong: 13, i: 15, jeong: 18 });
  });

  it("이름이 1글자면 형격과 이격이 같아진다", () => {
    const result = calcSagyeok(10, [7]);
    expect(result).toEqual({ won: 7, hyeong: 17, i: 17, jeong: 17 });
  });

  it("이름이 3글자 이상이면 원격은 이름 전체 합, 이격은 성+마지막 글자", () => {
    const result = calcSagyeok(6, [4, 5, 9]);
    expect(result).toEqual({ won: 18, hyeong: 10, i: 15, jeong: 24 });
  });

  it("이름 획수가 비어 있으면 에러를 던진다", () => {
    expect(() => calcSagyeok(10, [])).toThrow();
  });
});

describe("isAuspiciousNumber", () => {
  it("길이면 true", () => {
    expect(isAuspiciousNumber("길")).toBe(true);
  });

  it("흉이면 false", () => {
    expect(isAuspiciousNumber("흉")).toBe(false);
  });

  it("반길은 확정적 길수가 아니므로 false", () => {
    expect(isAuspiciousNumber("반길")).toBe(false);
  });
});
