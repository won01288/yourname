// 진단 전용(임시). 사용자 아이디어 검증: "게이트(총점 90) 통과 이름 중, 반대 성별 given_name의
// count가 이 성별 count의 2배 이상이면 후보에서 제외" 규칙을 적용했을 때
//   (1) 게이트 통과 풀에서 몇 개가 걸러지는지
//   (2) 걸러내고도 추천 가능한 이름 풀이 충분히 남는지
// 를 샘플 성씨×사주 조합으로 확인한다. LLM 미호출, DB 읽기 전용. 프로덕션 코드 변경 없음.
import { getDbClient } from "../../lib/db";
import { getSaju } from "../../lib/saju";
import { getSurnameByHangul, getEligibleHanjaPool, getAllNumerology81, getGivenNamesByGender } from "../../lib/db";
import { aggregateElements } from "../../lib/naming/elements";
import { deriveYongsin } from "../../lib/naming/yongsin";
import { getElementForSyllable } from "../../lib/naming/phonetic";
import { scoreName, scorePhoneticFlow } from "../../lib/naming/score";
import { CANDIDATE_MIN_TOTAL_SCORE, GIVEN_NAME_LENGTH } from "../../lib/naming/config";
import type { Element, Gender, GivenNameEntry, Hanja, Numerology81 } from "../../lib/naming/types";

const MIN_PHONETIC_POINTS_FOR_GATE = 22.5; // candidates.ts와 동일한 사전 가지치기 값(중복 정의, 진단용).

const SAMPLE_SURNAMES = ["김", "이", "박", "서"]; // 초성 오행이 서로 다른 성씨 섞음(木/木/水/金).
const SAMPLE_DATES: Array<[number, number, number, number]> = [
  [1990, 5, 15, 10],
  [1975, 1, 5, 0],
  [2001, 12, 25, 23],
];
const GENDERS: Gender[] = ["M", "F"];
const CROSS_GENDER_RATIO = 2; // 사용자 지시: 반대 성별 count가 2배 이상이면 제외.

function groupBySyllable(pool: Hanja[]): Map<string, Hanja[]> {
  const map = new Map<string, Hanja[]>();
  for (const hanja of pool) {
    const syllable = hanja.readings[0];
    if (!syllable) continue;
    const bucket = map.get(syllable);
    if (bucket) bucket.push(hanja);
    else map.set(syllable, [hanja]);
  }
  return map;
}

// candidates.ts의 bestRealization과 동일한 게이트 통과 여부만 판정한다(최고점 실현 자체는 이번
// 진단에 불필요 — "이 이름이 게이트를 통과하는가"만 알면 됨).
function passesGate(
  listA: Hanja[],
  listB: Hanja[],
  surnameStroke: number,
  surnameElement: Element,
  givenSyllables: [string, string],
  yongsin: Element[],
  numerologyTable: Map<number, Numerology81>
): boolean {
  for (const h1 of listA) {
    for (const h2 of listB) {
      if (h1.char === h2.char) continue;
      const gate = scoreName({
        surnameElement,
        surnameStroke,
        givenSyllables,
        givenHanja: [h1, h2],
        yongsin,
        numerologyTable,
      });
      if (gate.totalScore >= CANDIDATE_MIN_TOTAL_SCORE) return true;
    }
  }
  return false;
}

function opposite(gender: Gender): Gender {
  return gender === "M" ? "F" : "M";
}

async function main() {
  getDbClient();

  const [hanjaPool, numerologyTable] = await Promise.all([getEligibleHanjaPool(), getAllNumerology81()]);
  const syllableIndex = groupBySyllable(hanjaPool);

  const givenNamesByGender = new Map<Gender, GivenNameEntry[]>();
  const freqByGender = new Map<Gender, Map<string, number>>();
  for (const gender of GENDERS) {
    const list = await getGivenNamesByGender(gender);
    givenNamesByGender.set(gender, list);
    const freqMap = new Map<string, number>();
    for (const entry of list) freqMap.set(entry.hangul, entry.frequency);
    freqByGender.set(gender, freqMap);
  }
  console.log(
    `given_name 풀 크기: M=${givenNamesByGender.get("M")!.length}, F=${givenNamesByGender.get("F")!.length}\n`
  );

  let grandGate = 0;
  let grandFiltered = 0;

  for (const hangul of SAMPLE_SURNAMES) {
    const surnameOptions = await getSurnameByHangul(hangul);
    if (surnameOptions.length === 0) {
      console.log(`[스킵] 성씨 "${hangul}" DB에 없음`);
      continue;
    }
    const surname = surnameOptions[0];

    for (const [year, month, day, hour] of SAMPLE_DATES) {
      const saju = await getSaju({ year, month, day, hour, minute: 0, isLunar: false });
      const distribution = aggregateElements(saju);
      const yongsinResult = deriveYongsin(saju, distribution);

      for (const gender of GENDERS) {
        const curatedGivenNames = givenNamesByGender.get(gender)!;
        const oppositeFreqMap = freqByGender.get(opposite(gender))!;
        const ownFreqMap = freqByGender.get(gender)!;

        const gatePassed: string[] = [];
        for (const entry of curatedGivenNames) {
          if (entry.hangul.length !== GIVEN_NAME_LENGTH) continue;
          const syllables = Array.from(entry.hangul);
          let syllableElements: Element[];
          try {
            syllableElements = syllables.map((s) => getElementForSyllable(s));
          } catch {
            continue;
          }
          const phoneticPoints = scorePhoneticFlow([surname.initialElement, ...syllableElements]).points;
          if (phoneticPoints < MIN_PHONETIC_POINTS_FOR_GATE) continue;

          const listA = syllableIndex.get(syllables[0]) ?? [];
          const listB = syllableIndex.get(syllables[1]) ?? [];
          if (listA.length === 0 || listB.length === 0) continue;

          const ok = passesGate(
            listA,
            listB,
            surname.strokeOriginal,
            surname.initialElement,
            [syllables[0], syllables[1]],
            yongsinResult.yongsin,
            numerologyTable
          );
          if (ok) gatePassed.push(entry.hangul);
        }

        const filtered: Array<{ hangul: string; own: number; opp: number }> = [];
        for (const nameHangul of gatePassed) {
          const own = ownFreqMap.get(nameHangul) ?? 0;
          const opp = oppositeFreqMap.get(nameHangul);
          if (opp !== undefined && opp >= own * CROSS_GENDER_RATIO) {
            filtered.push({ hangul: nameHangul, own, opp });
          }
        }

        grandGate += gatePassed.length;
        grandFiltered += filtered.length;

        console.log(
          `${surname.hangul}(${surname.hanja}) ${gender} ${year}-${month}-${day} ${hour}시  ` +
            `게이트통과=${gatePassed.length}  교차필터제거=${filtered.length}  잔여=${gatePassed.length - filtered.length}`
        );
        if (filtered.length > 0) {
          const sample = filtered
            .slice(0, 8)
            .map((f) => `${f.hangul}(본${f.own}/반대${f.opp})`)
            .join(", ");
          console.log(`  제거예시: ${sample}${filtered.length > 8 ? " ..." : ""}`);
        }
      }
    }
  }

  console.log(
    `\n합계: 게이트통과 ${grandGate}건 중 교차필터로 ${grandFiltered}건 제거 (${((grandFiltered / grandGate) * 100).toFixed(1)}%), 잔여 ${grandGate - grandFiltered}건`
  );

  // 참고용 — 성씨/사주와 무관한 전역 통계: given_name 전체 풀에서 이 규칙에 걸리는 이름이 각
  // 성별에 몇 개나 있는지(게이트 통과 여부와 무관하게, "구조적으로 반대 성별 쪽이 훨씬 우세한
  // 이름"이 전체 중 얼마나 되는지 감 잡기용).
  console.log("\n--- 전역 통계(게이트 무관, given_name 테이블 전체) ---");
  for (const gender of GENDERS) {
    const own = givenNamesByGender.get(gender)!;
    const oppMap = freqByGender.get(opposite(gender))!;
    let count = 0;
    for (const entry of own) {
      const opp = oppMap.get(entry.hangul);
      if (opp !== undefined && opp >= entry.frequency * CROSS_GENDER_RATIO) count++;
    }
    console.log(`${gender}: 전체 ${own.length}개 중 ${count}개(${((count / own.length) * 100).toFixed(1)}%)가 반대 성별 count 2배 이상 규칙에 해당`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
