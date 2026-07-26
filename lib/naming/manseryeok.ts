// CLAUDE.md 8.2 — 만세력 상세 표(십신·지장간·공망) 계산. 순수 함수만. 외부 import 금지.
// 규칙 근거: CLAUDE.md 3.8. LLM은 이 결과를 서술만 하고 판정하지 않는다 (2.3).

import type { Saju, TenGod, HiddenStemDetail, ManseryeokPillar, Manseryeok } from "./types";
import {
  STEM_ELEMENT,
  BRANCH_ELEMENT,
  BRANCH_HIDDEN_STEMS,
  STEM_READING,
  BRANCH_READING,
  STEM_SEQUENCE,
  BRANCH_SEQUENCE,
  YANG_STEMS,
  VOID_BRANCHES_BY_GROUP,
  SANGSAENG_ORDER,
} from "./config";

function isYangStem(stem: string): boolean {
  return YANG_STEMS.has(stem);
}

// 십신(十神) 판정: 일간 대비 오행 생극 관계(diff) + 음양 동이(同異)로 정해지는 표준 공식.
// diff = (대상 오행 인덱스 - 일간 오행 인덱스) mod 5 → 0:비겁 1:식상 2:재성 3:관성 4:인성.
// 각 관계는 음양이 같으면 편(偏)측, 다르면 정(正)측이 된다 (CLAUDE.md 3.8).
const TEN_GOD_TABLE: Record<number, [TenGod, TenGod]> = {
  0: ["비견", "겁재"],
  1: ["식신", "상관"],
  2: ["편재", "정재"],
  3: ["편관", "정관"],
  4: ["편인", "정인"],
};

export function tenGodOf(dayStem: string, targetStem: string): TenGod {
  const dayElement = STEM_ELEMENT[dayStem];
  const targetElement = STEM_ELEMENT[targetStem];
  if (!dayElement || !targetElement) {
    throw new Error(`알 수 없는 천간: ${dayStem} / ${targetStem}`);
  }

  const diff =
    (SANGSAENG_ORDER.indexOf(targetElement) - SANGSAENG_ORDER.indexOf(dayElement) + SANGSAENG_ORDER.length) %
    SANGSAENG_ORDER.length;
  const sameYinYang = isYangStem(dayStem) === isYangStem(targetStem);

  return TEN_GOD_TABLE[diff][sameYinYang ? 0 : 1];
}

// 지지 하나의 지장간 상세 목록(정기 포함, 십신 계산됨)을 반환한다.
function hiddenStemDetails(branch: string, dayStem: string): HiddenStemDetail[] {
  const entries = BRANCH_HIDDEN_STEMS[branch];
  if (!entries) throw new Error(`알 수 없는 지지: ${branch}`);

  const maxDays = Math.max(...entries.map((e) => e.days));

  return entries.map(({ stem, days }) => ({
    stem,
    reading: STEM_READING[stem],
    element: STEM_ELEMENT[stem],
    days,
    tenGod: tenGodOf(dayStem, stem),
    isMain: days === maxDays,
  }));
}

// 60갑자 순서(甲子~癸亥)를 인덱스 0~59로 생성한다.
function sixtyCycle(): string[] {
  const cycle: string[] = [];
  for (let i = 0; i < 60; i++) {
    cycle.push(STEM_SEQUENCE[i % STEM_SEQUENCE.length] + BRANCH_SEQUENCE[i % BRANCH_SEQUENCE.length]);
  }
  return cycle;
}

// 일주(day pillar) 기준 공망(空亡) 지지 2개를 계산한다 (CLAUDE.md 3.8).
export function calcVoidBranches(dayStem: string, dayBranch: string): [string, string] {
  const cycle = sixtyCycle();
  const index = cycle.indexOf(dayStem + dayBranch);
  if (index === -1) throw new Error(`알 수 없는 일주: ${dayStem}${dayBranch}`);
  return VOID_BRANCHES_BY_GROUP[Math.floor(index / 10)];
}

function buildPillar(
  label: ManseryeokPillar["label"],
  pillar: { stem: string; branch: string },
  dayStem: string,
  voidBranches: [string, string]
): ManseryeokPillar {
  const stemElement = STEM_ELEMENT[pillar.stem];
  const branchElement = BRANCH_ELEMENT[pillar.branch];
  if (!stemElement || !branchElement) {
    throw new Error(`알 수 없는 간지: ${pillar.stem}${pillar.branch}`);
  }

  const hiddenStems = hiddenStemDetails(pillar.branch, dayStem);
  const mainHiddenStem = hiddenStems.find((h) => h.isMain);
  if (!mainHiddenStem) throw new Error(`정기를 찾을 수 없습니다: ${pillar.branch}`);

  return {
    label,
    stem: {
      hanja: pillar.stem,
      reading: STEM_READING[pillar.stem],
      element: stemElement,
      tenGod: tenGodOf(dayStem, pillar.stem),
    },
    branch: {
      hanja: pillar.branch,
      reading: BRANCH_READING[pillar.branch],
      element: branchElement,
      // 지지의 십신은 정기(본기) 천간을 기준으로 판정하는 것이 표준(CLAUDE.md 3.8).
      tenGod: mainHiddenStem.tenGod,
      isVoid: voidBranches.includes(pillar.branch),
    },
    hiddenStems,
  };
}

// 사주 8글자 → 만세력 상세 표(십신·지장간·공망). LLM은 이 결과를 서술만 한다 (2.3).
export function buildManseryeok(saju: Saju): Manseryeok {
  const dayStem = saju.day.stem;
  const voidBranches = calcVoidBranches(saju.day.stem, saju.day.branch);

  return {
    year: buildPillar("년주", saju.year, dayStem, voidBranches),
    month: buildPillar("월주", saju.month, dayStem, voidBranches),
    day: buildPillar("일주", saju.day, dayStem, voidBranches),
    hour: buildPillar("시주", saju.hour, dayStem, voidBranches),
    voidBranches,
  };
}
