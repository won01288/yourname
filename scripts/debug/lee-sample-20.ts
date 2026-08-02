// 진단 전용. 이씨(李) 남성/여성 각 20개 표본 사주로 buildCandidates(candidateCount=5)를 실제
// 호출해(반대 성별 교차 필터 3.6.6 포함, /api/name과 동일한 조립) 추천 결과를 눈으로 확인한다.
// LLM 미호출, DB 읽기 전용. Math.random 그대로 사용(실사용과 동일 조건).
import { getSaju } from "../../lib/saju";
import { getSurnameByHangul, getEligibleHanjaPool, getAllNumerology81, getGivenNamesByGender } from "../../lib/db";
import { aggregateElements } from "../../lib/naming/elements";
import { deriveYongsin } from "../../lib/naming/yongsin";
import { buildCandidates } from "../../lib/naming/candidates";
import type { Gender } from "../../lib/naming/types";

// 연도/월/일/시를 다양하게 흩어 20개 표본 생성(고정 목록 — 재현 가능하도록).
const SAMPLE_DATES: Array<[number, number, number, number]> = [
  [1970, 3, 12, 4], [1975, 7, 28, 14], [1980, 1, 9, 22], [1983, 11, 3, 8],
  [1986, 5, 21, 17], [1989, 9, 15, 2], [1992, 2, 4, 12], [1994, 6, 30, 6],
  [1996, 12, 25, 23], [1998, 4, 8, 10], [2000, 8, 19, 15], [2002, 10, 1, 3],
  [2004, 1, 17, 20], [2006, 3, 5, 7], [2008, 7, 22, 13], [2010, 11, 11, 0],
  [2012, 5, 6, 18], [2015, 9, 9, 9], [2018, 2, 27, 16], [2021, 6, 14, 5],
];

async function main() {
  const surnameOptions = await getSurnameByHangul("이");
  const surname = surnameOptions[0];
  console.log(`성씨: ${surname.hangul}(${surname.hanja}) 원획=${surname.strokeOriginal} 초성오행=${surname.initialElement}\n`);

  const [hanjaPool, numerologyTable] = await Promise.all([getEligibleHanjaPool(), getAllNumerology81()]);

  const givenNamesByGender = new Map<Gender, Awaited<ReturnType<typeof getGivenNamesByGender>>>();
  for (const gender of ["M", "F"] as Gender[]) {
    givenNamesByGender.set(gender, await getGivenNamesByGender(gender));
  }
  const freqByGender = new Map<Gender, Map<string, number>>();
  for (const gender of ["M", "F"] as Gender[]) {
    const map = new Map<string, number>();
    for (const e of givenNamesByGender.get(gender)!) map.set(e.hangul, e.frequency);
    freqByGender.set(gender, map);
  }

  for (const gender of ["M", "F"] as Gender[]) {
    console.log(`\n===== 이씨 ${gender === "M" ? "남성" : "여성"} 20개 표본 =====`);
    const opposite: Gender = gender === "M" ? "F" : "M";
    const oppositeGenderFrequency = freqByGender.get(opposite)!;

    let emptyCount = 0;
    let lessThan5Count = 0;

    for (const [year, month, day, hour] of SAMPLE_DATES) {
      const saju = await getSaju({ year, month, day, hour, minute: 0, isLunar: false });
      const distribution = aggregateElements(saju);
      const yongsinResult = deriveYongsin(saju, distribution);

      const candidates = buildCandidates({
        surnameStroke: surname.strokeOriginal,
        surnameElement: surname.initialElement,
        yongsin: yongsinResult.yongsin,
        distribution,
        hanjaPool,
        numerologyTable,
        curatedGivenNames: givenNamesByGender.get(gender)!,
        candidateCount: 5,
        oppositeGenderFrequency,
      });

      if (candidates.length === 0) emptyCount++;
      else if (candidates.length < 5) lessThan5Count++;

      const names = candidates
        .map((c) => `${c.hangul}(${c.hanja.map((h) => h.char).join("")})`)
        .join(", ");
      console.log(
        `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}시  ` +
          `용신=[${yongsinResult.yongsin.join(",")}]  → ${names || "(없음)"}`
      );
    }

    console.log(`  → 20건 중 후보 0개: ${emptyCount}건, 5개 미만: ${lessThan5Count}건`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
