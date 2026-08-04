// 진단 전용. 현재 구현(buildCandidates, /api/name과 동일 조립)으로 실제 이름 후보 100개를
// 생성해 각 후보 한자의 음(reading)·훈(hun)을 함께 출력한다. LLM 미호출, DB 읽기 전용.
// 성씨 10개 × 성별 2종 × 사주 5개 = 100개 조합, 조합당 candidateCount=1로 대표 후보 하나씩.
import { getSaju } from "../../lib/saju";
import { getSurnameByHangul, getEligibleHanjaPool, getAllNumerology81, getGivenNamesByGender } from "../../lib/db";
import { aggregateElements } from "../../lib/naming/elements";
import { deriveYongsin } from "../../lib/naming/yongsin";
import { buildCandidates } from "../../lib/naming/candidates";
import type { Gender } from "../../lib/naming/types";

const SURNAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"];

const SAMPLE_DATES: Array<[number, number, number, number]> = [
  [1988, 4, 12, 9],
  [1995, 8, 3, 21],
  [2002, 1, 20, 5],
  [2010, 6, 15, 13],
  [2018, 11, 28, 17],
];

async function main() {
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

  let no = 1;
  let emptyCount = 0;
  const rows: string[] = [];

  for (const surnameHangul of SURNAMES) {
    const surnameOptions = await getSurnameByHangul(surnameHangul);
    const surname = surnameOptions[0];

    for (const gender of ["M", "F"] as Gender[]) {
      const opposite: Gender = gender === "M" ? "F" : "M";
      const oppositeGenderFrequency = freqByGender.get(opposite)!;

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
          candidateCount: 1,
          oppositeGenderFrequency,
        });

        if (candidates.length === 0) {
          emptyCount++;
          rows.push(`${no}\t${surname.hangul}(${surname.hanja})\t${gender}\t${year}-${month}-${day} ${hour}시\t(후보 없음)`);
          no++;
          continue;
        }

        const c = candidates[0];
        const fullHangul = surname.hangul + c.hangul;
        const hanjaDetail = c.hanja
          .map((h) => `${h.char}(${h.readings.join("/")}, ${h.hun ?? "훈없음"})`)
          .join(" ");
        rows.push(
          `${no}\t${fullHangul}\t${surname.hanja}${c.hanja.map((h) => h.char).join("")}\t${gender}\t${year}-${month}-${day} ${hour}시\t${hanjaDetail}`
        );
        no++;
      }
    }
  }

  console.log("번호\t이름(한글)\t이름(한자)\t성별\t생년월일시\t한자 상세(음, 훈)");
  for (const row of rows) console.log(row);
  console.log(`\n총 ${rows.length}건 중 후보 없음: ${emptyCount}건`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
