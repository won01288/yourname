// 진단 전용. getEligibleHanjaPool()에 hun IS NOT NULL 조건을 추가한 뒤(2026.8.3),
// 성씨당 게이트(90점) 통과 개수가 얼마나 줄어드는지 확인한다. 특히 CLAUDE.md 3.6.4가 이미
// "성씨당 고정 통과 풀"이 구조적으로 좁다고 지적한 水초성(박·문·민·백·마·모·명·배·변·방·반·편·표)·
// 金초성(서·석·선·설·소·신·심 등) 그룹을 집중 확인한다. LLM 미호출, DB 읽기 전용.
import { getSaju } from "../../lib/saju";
import { getSurnameByHangul, getEligibleHanjaPool, getAllNumerology81, getGivenNamesByGender } from "../../lib/db";
import { aggregateElements } from "../../lib/naming/elements";
import { deriveYongsin } from "../../lib/naming/yongsin";
import { buildCandidates } from "../../lib/naming/candidates";
import type { Gender } from "../../lib/naming/types";

// 3.6.4가 지목한 구조적으로 좁은 성씨군(水초성·金초성) + 대조군으로 넓은 木초성(김) 포함.
const SURNAMES = ["박", "문", "민", "백", "서", "석", "신", "심", "김", "이"];
const GENDERS: Gender[] = ["M", "F"];
const DATE: [number, number, number, number] = [1990, 5, 15, 10];

async function main() {
  const [hanjaPool, numerologyTable] = await Promise.all([getEligibleHanjaPool(), getAllNumerology81()]);
  console.log(`hun 필터 적용 후 eligible 한자 풀: ${hanjaPool.length}자\n`);

  const givenNamesByGender = new Map<Gender, Awaited<ReturnType<typeof getGivenNamesByGender>>>();
  for (const gender of GENDERS) givenNamesByGender.set(gender, await getGivenNamesByGender(gender));
  const freqByGender = new Map<Gender, Map<string, number>>();
  for (const gender of GENDERS) {
    const map = new Map<string, number>();
    for (const e of givenNamesByGender.get(gender)!) map.set(e.hangul, e.frequency);
    freqByGender.set(gender, map);
  }

  const [year, month, day, hour] = DATE;
  const saju = await getSaju({ year, month, day, hour, minute: 0, isLunar: false });
  const distribution = aggregateElements(saju);
  const yongsinResult = deriveYongsin(saju, distribution);

  for (const surnameHangul of SURNAMES) {
    const surnameOptions = await getSurnameByHangul(surnameHangul);
    if (surnameOptions.length === 0) {
      console.log(`${surnameHangul}: DB에 없음`);
      continue;
    }
    const surname = surnameOptions[0];

    for (const gender of GENDERS) {
      const opposite: Gender = gender === "M" ? "F" : "M";
      const candidates = buildCandidates({
        surnameStroke: surname.strokeOriginal,
        surnameElement: surname.initialElement,
        yongsin: yongsinResult.yongsin,
        distribution,
        hanjaPool,
        numerologyTable,
        curatedGivenNames: givenNamesByGender.get(gender)!,
        candidateCount: 10,
        oppositeGenderFrequency: freqByGender.get(opposite)!,
      });
      console.log(
        `${surname.hangul}(${surname.hanja}, 초성오행=${surname.initialElement}) ${gender}: 후보 ${candidates.length}개`
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
