// 진단 전용 스크립트. LLM(Claude API) 호출 없이 saju→db→naming 파이프라인만 실행해
// 후보 다양성 문제를 재현/측정한다. DB는 읽기 전용 SELECT만 수행한다.
import { getSaju } from "../../lib/saju";
import { getSurnameByHangul, getEligibleHanjaPool, getAllNumerology81, getGivenNamesByGender } from "../../lib/db";
import { aggregateElements } from "../../lib/naming/elements";
import { deriveYongsin } from "../../lib/naming/yongsin";
import { buildCandidates } from "../../lib/naming/candidates";
import type { Gender } from "../../lib/naming/types";

async function main() {
  const surnameHangul = process.argv[2] ?? "김";
  const year = Number(process.argv[3] ?? 1990);
  const month = Number(process.argv[4] ?? 5);
  const day = Number(process.argv[5] ?? 15);
  const hour = Number(process.argv[6] ?? 10);
  const gender = (process.argv[7] as Gender | undefined) ?? "M";

  const surnames = await getSurnameByHangul(surnameHangul);
  const surname = surnames[0];
  if (!surname) {
    console.error(`성씨를 찾을 수 없습니다: ${surnameHangul}`);
    process.exit(1);
  }

  const saju = await getSaju({ year, month, day, hour, minute: 0, isLunar: false });
  const distribution = aggregateElements(saju);
  const yongsinResult = deriveYongsin(saju, distribution);

  const [hanjaPool, numerologyTable, curatedGivenNames] = await Promise.all([
    getEligibleHanjaPool(),
    getAllNumerology81(),
    getGivenNamesByGender(gender),
  ]);

  console.log(`성씨: ${surname.hangul}(${surname.hanja}) 원획${surname.strokeOriginal} 오행${surname.initialElement}`);
  console.log(`사주: ${JSON.stringify(saju)}`);
  console.log(`오행분포: ${JSON.stringify(distribution)}`);
  console.log(`${yongsinResult.strength} / 용신: ${yongsinResult.yongsin.join(",")}`);
  console.log(`한자풀 크기: ${hanjaPool.length}, 이름 후보 풀(${gender}): ${curatedGivenNames.length}`);

  const candidates = buildCandidates({
    surnameStroke: surname.strokeOriginal,
    surnameElement: surname.initialElement,
    yongsin: yongsinResult.yongsin,
    distribution,
    hanjaPool,
    numerologyTable,
    curatedGivenNames,
    candidateCount: 5,
  });

  console.log(`\n=== 후보 ${candidates.length}개 ===`);
  for (const c of candidates) {
    const hanjaStr = c.hanja.map((h) => `${h.char}(${h.element ?? "-"})`).join("");
    console.log(`${surname.hanja}${hanjaStr} — ${c.hangul} — 수리 ${c.numerologyNumbers.join("-")} — 빈도 ${c.frequency}`);
  }

  // 다양성 측정
  const hangulSet = new Set(candidates.map((c) => c.hangul));
  const firstCharSet = new Set(candidates.map((c) => c.hanja[0].char));
  const secondCharSet = new Set(candidates.map((c) => c.hanja[1].char));
  console.log(`\n고유 발음(hangul): ${hangulSet.size}/${candidates.length}`);
  console.log(`고유 첫글자: ${firstCharSet.size}/${candidates.length}`);
  console.log(`고유 끝글자: ${secondCharSet.size}/${candidates.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
