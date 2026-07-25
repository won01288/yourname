import { describe, it, expect } from "vitest";
import { getInitialConsonant, getElementForSyllable, isPhoneticSangsaeng } from "./phonetic";

describe("getInitialConsonant", () => {
  it("한글 음절에서 초성을 추출한다", () => {
    expect(getInitialConsonant("민")).toBe("ㅁ");
    expect(getInitialConsonant("수")).toBe("ㅅ");
    expect(getInitialConsonant("아")).toBe("ㅇ");
  });

  it("한글 음절이 아니면 에러를 던진다", () => {
    expect(() => getInitialConsonant("金")).toThrow();
    expect(() => getInitialConsonant("A")).toThrow();
  });
});

describe("getElementForSyllable", () => {
  it("초성 오행 매핑 결과를 반환한다 (ㅇㅎ=土, ㅁㅂㅍ=水 통설)", () => {
    expect(getElementForSyllable("안")).toBe("土"); // ㅇ
    expect(getElementForSyllable("민")).toBe("水"); // ㅁ
    expect(getElementForSyllable("김")).toBe("木"); // ㄱ
    expect(getElementForSyllable("나")).toBe("火"); // ㄴ
    expect(getElementForSyllable("서")).toBe("金"); // ㅅ
  });
});

describe("isPhoneticSangsaeng", () => {
  it("순방향 상생 흐름이면 true", () => {
    expect(isPhoneticSangsaeng(["木", "火", "土"])).toBe(true); // 木生火, 火生土
    expect(isPhoneticSangsaeng(["水", "木"])).toBe(true); // 水生木
  });

  it("상극이면 false", () => {
    expect(isPhoneticSangsaeng(["木", "土"])).toBe(false); // 木克土
  });

  it("역방향 상생(피생)이면 false (순방향만 길로 인정)", () => {
    expect(isPhoneticSangsaeng(["火", "木"])).toBe(false); // 木生火의 역방향
  });

  it("비화(동일 오행)이면 false", () => {
    expect(isPhoneticSangsaeng(["木", "木"])).toBe(false);
  });
});
