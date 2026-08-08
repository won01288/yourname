import type { ElementDistribution, Manseryeok } from "@/lib/naming/types";

// design.md 3.9 — 랜딩 신뢰 증명 섹션에서 실제 ManseryeokTable/ElementDistributionChart
// 컴포넌트를 그대로 재사용하기 위한 예시 데이터. 계산 결과가 아니라 손으로 구성한 정적
// 예시이므로(사용자 입력에서 나온 값이 아님), 화면에는 반드시 "예시" 라벨과 함께 노출한다.
// 십신·지장간·공망 값은 일간 戊(土) 기준으로 CLAUDE.md 3.8 공식(diff = (대상오행 - 일간오행)
// mod 5, 음양 동이)에 맞춰 손으로 검산했다.

export const SAMPLE_ELEMENT_DISTRIBUTION: ElementDistribution = {
  木: 3,
  火: 1,
  土: 2,
  金: 1,
  水: 1,
};

export const SAMPLE_DAY_STEM = "戊";

export const SAMPLE_MANSERYEOK: Manseryeok = {
  hour: {
    label: "시주",
    stem: { hanja: "庚", reading: "경", element: "金", tenGod: "식신" },
    branch: { hanja: "申", reading: "신", element: "金", tenGod: "식신", isVoid: false },
    hiddenStems: [
      { stem: "戊", reading: "무", element: "土", days: 7, tenGod: "비견", isMain: false },
      { stem: "壬", reading: "임", element: "水", days: 7, tenGod: "편재", isMain: false },
      { stem: "庚", reading: "경", element: "金", days: 16, tenGod: "식신", isMain: true },
    ],
  },
  day: {
    label: "일주",
    stem: { hanja: "戊", reading: "무", element: "土", tenGod: "비견" },
    branch: { hanja: "午", reading: "오", element: "火", tenGod: "정인", isVoid: false },
    hiddenStems: [
      { stem: "丙", reading: "병", element: "火", days: 10, tenGod: "편인", isMain: false },
      { stem: "己", reading: "기", element: "土", days: 9, tenGod: "겁재", isMain: false },
      { stem: "丁", reading: "정", element: "火", days: 11, tenGod: "정인", isMain: true },
    ],
  },
  month: {
    label: "월주",
    stem: { hanja: "丙", reading: "병", element: "火", tenGod: "편인" },
    branch: { hanja: "寅", reading: "인", element: "木", tenGod: "편관", isVoid: false },
    hiddenStems: [
      { stem: "戊", reading: "무", element: "土", days: 7, tenGod: "비견", isMain: false },
      { stem: "丙", reading: "병", element: "火", days: 7, tenGod: "편인", isMain: false },
      { stem: "甲", reading: "갑", element: "木", days: 16, tenGod: "편관", isMain: true },
    ],
  },
  year: {
    label: "년주",
    stem: { hanja: "甲", reading: "갑", element: "木", tenGod: "편관" },
    branch: { hanja: "子", reading: "자", element: "水", tenGod: "정재", isVoid: true },
    hiddenStems: [{ stem: "癸", reading: "계", element: "水", days: 30, tenGod: "정재", isMain: true }],
  },
  voidBranches: ["子", "丑"],
};
