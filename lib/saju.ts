// CLAUDE.md 8.2 — @fullstackfamily/manseryeok 를 감싸 Saju 타입을 반환하는 얇은 모듈.
// lib/naming/ 은 이 파일을 import하지 않는다 (반대 방향: 여기서 naming의 타입을 가져다 쓴다).

import { calculateSaju, lunarToSolar } from "@fullstackfamily/manseryeok";
import type { Saju } from "./naming/types";

export interface BirthInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  isLunar: boolean;
  /** 음력 윤달 여부. isLunar가 true일 때만 의미가 있다. */
  isLeapMonth?: boolean;
}

// 간지 한자 2글자(예: "庚午")를 천간/지지로 분리한다.
function splitPillar(pillarHanja: string | null, label: string): { stem: string; branch: string } {
  if (!pillarHanja || pillarHanja.length !== 2) {
    throw new Error(`${label} 간지를 계산할 수 없습니다: ${pillarHanja}`);
  }
  return { stem: pillarHanja[0], branch: pillarHanja[1] };
}

// @fullstackfamily/manseryeok으로 생년월일시 → 팔자(연/월/일/시주) 변환.
// calculateSaju가 진태양시 보정과 절기 기준 월주를 내부적으로 처리한다 (CLAUDE.md 2.1).
export async function getSaju(input: BirthInput): Promise<Saju> {
  const { year, month, day, hour, minute, isLunar, isLeapMonth } = input;

  const solar = isLunar ? lunarToSolar(year, month, day, isLeapMonth ?? false).solar : { year, month, day };

  const result = calculateSaju(solar.year, solar.month, solar.day, hour, minute);

  return {
    year: splitPillar(result.yearPillarHanja, "년주"),
    month: splitPillar(result.monthPillarHanja, "월주"),
    day: splitPillar(result.dayPillarHanja, "일주"),
    hour: splitPillar(result.hourPillarHanja, "시주"),
  };
}
