// 진단 전용. 등록된 성씨 전체 × 여러 사주 × 성별 2종에 대해 buildCandidates가 항상 다양한
// 후보를 안정적으로 반환하는지 스윕 테스트한다. LLM 미호출, DB 읽기 전용.
import { getDbClient } from "../../lib/db";
import { getSaju } from "../../lib/saju";
import { getSurnameByHangul, getEligibleHanjaPool, getAllNumerology81, getGivenNamesByGender } from "../../lib/db";
import { aggregateElements } from "../../lib/naming/elements";
import { deriveYongsin } from "../../lib/naming/yongsin";
import { buildCandidates } from "../../lib/naming/candidates";
import type { Gender } from "../../lib/naming/types";

const TEST_DATES: Array<[number, number, number, number]> = [
  [1990, 5, 15, 10],
  [1975, 1, 5, 0], // 자시 근처
  [2001, 12, 25, 23], // 야자시 근처
  [2015, 6, 30, 14],
  [1960, 2, 4, 6], // 입춘 근처 절기 경계
  [2023, 8, 8, 12],
];

const GENDERS: Gender[] = ["M", "F"];

async function main() {
  const client = getDbClient();
  const r = await client.execute("SELECT DISTINCT hangul FROM surname ORDER BY hangul");
  const surnames = r.rows.map((row) => row.hangul as string);
  console.log(
    `성씨 ${surnames.length}개 × 날짜 ${TEST_DATES.length}개 × 성별 ${GENDERS.length}개 = ${surnames.length * TEST_DATES.length * GENDERS.length}개 조합 스윕`
  );

  const [hanjaPool, numerologyTable] = await Promise.all([getEligibleHanjaPool(), getAllNumerology81()]);
  const givenNamesByGender = new Map<Gender, Awaited<ReturnType<typeof getGivenNamesByGender>>>();
  for (const gender of GENDERS) {
    givenNamesByGender.set(gender, await getGivenNamesByGender(gender));
  }

  let totalCombos = 0;
  let lessThan5 = 0;
  let zero = 0;
  let dupHangulFound = 0;
  const start = Date.now();

  for (const hangul of surnames) {
    const surnameOptions = await getSurnameByHangul(hangul);
    for (const surname of surnameOptions) {
      for (const [year, month, day, hour] of TEST_DATES) {
        const saju = await getSaju({ year, month, day, hour, minute: 0, isLunar: false });
        const distribution = aggregateElements(saju);
        const yongsinResult = deriveYongsin(saju, distribution);

        for (const gender of GENDERS) {
          totalCombos++;
          const candidates = buildCandidates({
            surnameStroke: surname.strokeOriginal,
            surnameElement: surname.initialElement,
            yongsin: yongsinResult.yongsin,
            distribution,
            hanjaPool,
            numerologyTable,
            curatedGivenNames: givenNamesByGender.get(gender) ?? [],
            candidateCount: 5,
          });

          if (candidates.length === 0) zero++;
          else if (candidates.length < 5) lessThan5++;

          const hangulSet = new Set(candidates.map((c) => c.hangul));
          if (hangulSet.size !== candidates.length) {
            dupHangulFound++;
            console.log(
              `[중복발음] ${surname.hangul}(${surname.hanja}) ${gender} ${year}-${month}-${day} ${hour}시 → ${candidates.map((c) => c.hangul).join(",")}`
            );
          }
          if (candidates.length < 5) {
            console.log(
              `[후보부족:${candidates.length}] ${surname.hangul}(${surname.hanja}) ${gender} ${year}-${month}-${day} ${hour}시`
            );
          }
        }
      }
    }
  }

  const elapsed = Date.now() - start;
  console.log(`\n총 조합: ${totalCombos}, 소요시간: ${elapsed}ms (평균 ${(elapsed / totalCombos).toFixed(1)}ms/조합)`);
  console.log(`후보 0개: ${zero}, 후보 1~4개(5개 미만): ${lessThan5}, 발음 중복 발견: ${dupHangulFound}`);

  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
