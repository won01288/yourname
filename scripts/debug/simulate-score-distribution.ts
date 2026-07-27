// 진단 전용. 실사용 빈도가 높은 이름(given_name 테이블) 20개를 골라, 서로 다른 사주·성씨
// 조합에 대해 이름 점수 확인 서비스(lib/naming/score.ts)를 시뮬레이션하고 평균/분포를 낸다.
// LLM 미호출, DB 읽기 전용. CLAUDE.md 3.10 채점 로직을 그대로 사용한다.
import { getDbClient } from "../../lib/db";
import { getSaju } from "../../lib/saju";
import {
  getSurnameByHangul,
  getGivenNamesByGender,
  getHanjaByReading,
  getAllNumerology81,
} from "../../lib/db";
import { aggregateElements } from "../../lib/naming/elements";
import { deriveYongsin } from "../../lib/naming/yongsin";
import { scoreName } from "../../lib/naming/score";
import type { Gender, Hanja } from "../../lib/naming/types";

const NAMES_PER_GENDER = 10; // 성별당 10개 × 2 = 총 20개

// 사주 다양성(계절·오행 편중)과 성씨 다양성(획수·발음오행)을 함께 흔들기 위한 조합.
// 성씨는 2015 인구총조사 상위권(surname 테이블 30개 중 일부)에서 임의로 골랐다.
const TEST_CASES: Array<{ surnameHangul: string; year: number; month: number; day: number; hour: number }> = [
  { surnameHangul: "김", year: 1990, month: 5, day: 15, hour: 10 },
  { surnameHangul: "이", year: 1975, month: 1, day: 5, hour: 0 },
  { surnameHangul: "박", year: 2001, month: 12, day: 25, hour: 23 },
  { surnameHangul: "최", year: 2015, month: 6, day: 30, hour: 14 },
  { surnameHangul: "정", year: 1960, month: 2, day: 4, hour: 6 },
  { surnameHangul: "강", year: 2023, month: 8, day: 8, hour: 12 },
];

// 이름 한 글자(음절)에 대해 "한자 찾기"와 동일한 조회로 가장 우선순위 높은 한자 하나를 고른다
// (getHanjaByReading은 is_name_allowed DESC, is_forbidden ASC, is_common DESC, stroke ASC 정렬).
async function pickHanjaForSyllable(syllable: string): Promise<Hanja | null> {
  const candidates = await getHanjaByReading(syllable);
  return candidates[0] ?? null;
}

async function main() {
  const client = getDbClient();

  const [maleNames, femaleNames, numerologyTable] = await Promise.all([
    getGivenNamesByGender("M" as Gender),
    getGivenNamesByGender("F" as Gender),
    getAllNumerology81(),
  ]);

  const topMale = [...maleNames].sort((a, b) => b.frequency - a.frequency).slice(0, NAMES_PER_GENDER);
  const topFemale = [...femaleNames].sort((a, b) => b.frequency - a.frequency).slice(0, NAMES_PER_GENDER);
  const names = [
    ...topMale.map((n) => ({ ...n, gender: "M" as Gender })),
    ...topFemale.map((n) => ({ ...n, gender: "F" as Gender })),
  ];

  console.log(`이름 ${names.length}개(남 ${topMale.length}, 여 ${topFemale.length}) × 사주/성씨 조합 ${TEST_CASES.length}개 시뮬레이션\n`);

  // 이름별 대표 한자(음절당 최우선 한자)를 미리 확정 — 사주와 무관하므로 한 번만 조회.
  const nameHanja = new Map<string, [Hanja, Hanja] | null>();
  for (const n of names) {
    const [c1, c2] = n.hangul;
    const [h1, h2] = await Promise.all([pickHanjaForSyllable(c1), pickHanjaForSyllable(c2)]);
    if (!h1 || !h2) {
      console.log(`[한자 없음] ${n.hangul} → ${!h1 ? c1 : ""}${!h2 ? c2 : ""} 훈 있는 한자를 찾지 못함, 제외`);
      nameHanja.set(n.hangul, null);
    } else {
      nameHanja.set(n.hangul, [h1, h2]);
    }
  }

  // 사주/성씨 조합 미리 계산.
  const cases = [];
  for (const tc of TEST_CASES) {
    const surnameOptions = await getSurnameByHangul(tc.surnameHangul);
    const surname = surnameOptions[0];
    const saju = await getSaju({ year: tc.year, month: tc.month, day: tc.day, hour: tc.hour, minute: 0, isLunar: false });
    const distribution = aggregateElements(saju);
    const yongsinResult = deriveYongsin(saju, distribution);
    cases.push({ tc, surname, yongsin: yongsinResult.yongsin });
  }

  const allScores: number[] = [];
  const gradeCounts: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };
  const perNameAvg: Array<{ name: string; gender: Gender; avg: number; scores: number[] }> = [];
  let warningCount = 0;

  for (const n of names) {
    const hanja = nameHanja.get(n.hangul);
    if (!hanja) continue;
    const scores: number[] = [];
    for (const c of cases) {
      const result = scoreName({
        surnameElement: c.surname.initialElement,
        surnameStroke: c.surname.strokeOriginal,
        givenSyllables: [n.hangul[0], n.hangul[1]],
        givenHanja: hanja,
        yongsin: c.yongsin,
        numerologyTable,
      });
      scores.push(result.totalScore);
      gradeCounts[result.grade]++;
      allScores.push(result.totalScore);
      if (result.warnings.length > 0) warningCount++;
    }
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    perNameAvg.push({ name: n.hangul, gender: n.gender, avg, scores });
  }

  console.log("=== 이름별 평균 점수 (성씨/사주 6조합 평균) ===");
  for (const p of perNameAvg.sort((a, b) => b.avg - a.avg)) {
    console.log(
      `${p.name}(${p.gender})  평균 ${p.avg.toFixed(1)}점  [${p.scores.join(", ")}]`
    );
  }

  const overallAvg = allScores.reduce((s, v) => s + v, 0) / allScores.length;
  const sorted = [...allScores].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  console.log(`\n=== 전체 분포 (총 ${allScores.length}회 채점) ===`);
  console.log(`평균: ${overallAvg.toFixed(1)}점, 중앙값: ${median}점, 최저: ${sorted[0]}점, 최고: ${sorted[sorted.length - 1]}점`);
  console.log(`등급 분포: S=${gradeCounts.S}, A=${gradeCounts.A}, B=${gradeCounts.B}, C=${gradeCounts.C}, D=${gradeCounts.D}`);
  console.log(`경고(인명용 아님/불용문자) 발생 횟수: ${warningCount}`);

  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
