import { describe, it, expect } from "vitest";
import { tenGodOf, calcVoidBranches, buildManseryeok } from "./manseryeok";
import type { Saju } from "./types";

// 연주 癸酉 / 월주 庚申 / 일주 丙子 / 시주 丙申. 일간 丙(火).
const SAMPLE_SAJU: Saju = {
  year: { stem: "癸", branch: "酉" },
  month: { stem: "庚", branch: "申" },
  day: { stem: "丙", branch: "子" },
  hour: { stem: "丙", branch: "申" },
};

describe("tenGodOf", () => {
  it("일간과 같은 오행·같은 음양이면 비견이다", () => {
    expect(tenGodOf("丙", "丙")).toBe("비견");
  });

  it("일간이 극하는 오행·같은 음양이면 편재다", () => {
    // 丙(火) 극 庚(金), 둘 다 양간.
    expect(tenGodOf("丙", "庚")).toBe("편재");
  });

  it("일간을 극하는 오행·다른 음양이면 정관이다", () => {
    // 癸(水) 극 丙(火), 丙은 양간·癸는 음간.
    expect(tenGodOf("丙", "癸")).toBe("정관");
  });

  it("일간을 생하는 오행·다른 음양이면 정인이다", () => {
    // 乙(木) 생 丙(火), 丙은 양간·乙은 음간.
    expect(tenGodOf("丙", "乙")).toBe("정인");
  });
});

describe("calcVoidBranches", () => {
  it("일주 丙子(갑술순)는 申·酉가 공망이다", () => {
    expect(calcVoidBranches("丙", "子")).toEqual(["申", "酉"]);
  });

  it("일주 甲子(갑자순)는 戌·亥가 공망이다", () => {
    expect(calcVoidBranches("甲", "子")).toEqual(["戌", "亥"]);
  });
});

describe("buildManseryeok", () => {
  const result = buildManseryeok(SAMPLE_SAJU);

  it("각 기둥의 천간 십신을 일간 丙 기준으로 계산한다", () => {
    expect(result.year.stem.tenGod).toBe("정관"); // 癸
    expect(result.month.stem.tenGod).toBe("편재"); // 庚
    expect(result.day.stem.tenGod).toBe("비견"); // 丙(일간 자신)
    expect(result.hour.stem.tenGod).toBe("비견"); // 丙
  });

  it("지지의 십신은 정기(본기) 지장간 기준으로 계산한다", () => {
    expect(result.year.branch.tenGod).toBe("정재"); // 酉 정기 辛
    expect(result.month.branch.tenGod).toBe("편재"); // 申 정기 庚
    expect(result.day.branch.tenGod).toBe("정관"); // 子 정기 癸
    expect(result.hour.branch.tenGod).toBe("편재"); // 申 정기 庚
  });

  it("일주 丙子 기준 공망은 申·酉이며 해당 지지에 isVoid가 표시된다", () => {
    expect(result.voidBranches).toEqual(["申", "酉"]);
    expect(result.year.branch.isVoid).toBe(true); // 酉
    expect(result.month.branch.isVoid).toBe(true); // 申
    expect(result.day.branch.isVoid).toBe(false); // 子
    expect(result.hour.branch.isVoid).toBe(true); // 申
  });

  it("지장간은 일수 비례 순서를 유지하고 정기 하나만 isMain=true다", () => {
    const hiddenStems = result.hour.hiddenStems; // 申: 戊7 壬7 庚16
    expect(hiddenStems.map((h) => h.stem)).toEqual(["戊", "壬", "庚"]);
    expect(hiddenStems.filter((h) => h.isMain)).toHaveLength(1);
    expect(hiddenStems.find((h) => h.isMain)?.stem).toBe("庚");
  });
});
