import { describe, it, expect } from "vitest";
import { getSaju } from "./saju";

describe("getSaju", () => {
  it("양력 생년월일시를 사주 4주(간지)로 변환한다", async () => {
    // @fullstackfamily/manseryeok calculateSaju(1990,5,15,14,30)로 검산: 庚午 辛巳 庚辰 癸未.
    const saju = await getSaju({
      year: 1990,
      month: 5,
      day: 15,
      hour: 14,
      minute: 30,
      isLunar: false,
    });

    expect(saju).toEqual({
      year: { stem: "庚", branch: "午" },
      month: { stem: "辛", branch: "巳" },
      day: { stem: "庚", branch: "辰" },
      hour: { stem: "癸", branch: "未" },
    });
  });

  it("음력 입력은 대응하는 양력 날짜와 같은 사주를 낸다", async () => {
    // solarToLunar(2000,6,15) => 음력 2000-05-14 (평달)로 검산됨.
    const fromLunar = await getSaju({
      year: 2000,
      month: 5,
      day: 14,
      hour: 12,
      minute: 0,
      isLunar: true,
    });
    const fromSolar = await getSaju({
      year: 2000,
      month: 6,
      day: 15,
      hour: 12,
      minute: 0,
      isLunar: false,
    });

    expect(fromLunar).toEqual(fromSolar);
  });
});
