// 결과 화면 상단에 "어떤 조건으로 검색했는지" 1줄로 보여주기 위한 순수 포맷터.
// 계산 로직이 아니라 이미 사용자가 입력한 값(request payload)을 그대로 문장으로 옮기는
// 표시 전용 유틸이라 lib/naming/ 8.1 규칙과 무관하게 app/lib/ 아래에 둔다.

import type { Gender } from "@/lib/naming/types";

interface BirthInfo {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  isLunar: boolean;
  isLeapMonth?: boolean;
}

export function formatBirthLine(info: BirthInfo): string {
  const calendar = info.isLunar ? (info.isLeapMonth ? "음력(윤달)" : "음력") : "양력";
  const hh = String(info.hour).padStart(2, "0");
  const mm = String(info.minute).padStart(2, "0");
  return `${info.year}년 ${info.month}월 ${info.day}일 ${calendar} ${hh}시 ${mm}분생`;
}

export function formatGenderLabel(gender: Gender): string {
  return gender === "F" ? "여자" : "남자";
}
