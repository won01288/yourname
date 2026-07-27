import { describe, it, expect } from "vitest";
import { hangulJamoMismatchCount, isSimilarName } from "./similarity";

describe("hangulJamoMismatchCount", () => {
  it("완전히 같은 이름은 불일치 0", () => {
    expect(hangulJamoMismatchCount("규리", "규리")).toBe(0);
  });

  it("종성 하나만 다른 이름(규리/규린)은 불일치 1", () => {
    expect(hangulJamoMismatchCount("규리", "규린")).toBe(1);
  });

  it("초성+중성이 다른 둘째 글자(규리/규나)는 불일치 2", () => {
    expect(hangulJamoMismatchCount("규리", "규나")).toBe(2);
  });

  it("받침 유무만 다른 이름(미가/민가)은 불일치 1", () => {
    expect(hangulJamoMismatchCount("미가", "민가")).toBe(1);
  });

  it("완전히 다른 이름은 불일치가 크다", () => {
    expect(hangulJamoMismatchCount("서준", "하윤")).toBeGreaterThan(1);
  });

  it("길이가 다르면 Infinity", () => {
    expect(hangulJamoMismatchCount("규리", "규")).toBe(Infinity);
  });
});

describe("isSimilarName", () => {
  it("임계값 이하 불일치는 유사로 판정한다", () => {
    expect(isSimilarName("규리", "규린", 1)).toBe(true);
    expect(isSimilarName("미가", "민가", 1)).toBe(true);
  });

  it("임계값을 넘는 불일치는 유사가 아니다", () => {
    expect(isSimilarName("규리", "규나", 1)).toBe(false);
  });

  it("완전히 같은 문자열은 항상 유사(동일)로 취급한다", () => {
    expect(isSimilarName("규리", "규리", 0)).toBe(true);
  });
});
