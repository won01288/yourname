// 진단/샘플링 전용. 실제 DB(getGivenNamesByGender, given_name 테이블 — 2026.8.2 재구성 +
// is_featured 가중치 반영)로 김씨 무작위 사주 20개(남/여 각)에 대해 buildCandidates가 실제로
// 어떤 후보를 내놓는지 확인한다. LLM 미호출.
import fs from "fs";
import path from "path";
import { getSaju } from "../../lib/saju";
import {
  getDbClient,
  getSurnameByHangul,
  getEligibleHanjaPool,
  getAllNumerology81,
  getGivenNamesByGender,
} from "../../lib/db";
import { aggregateElements } from "../../lib/naming/elements";
import { deriveYongsin } from "../../lib/naming/yongsin";
import { buildCandidates } from "../../lib/naming/candidates";
import type { Gender } from "../../lib/naming/types";

function loadEnv() {
  const envPath = path.join(__dirname, "..", "..", ".env.local");
  const text = fs.readFileSync(envPath, "utf-8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (value && !process.env[key]) process.env[key] = value;
  }
}
loadEnv();

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomBirth() {
  return {
    year: randomInt(1970, 2023),
    month: randomInt(1, 12),
    day: randomInt(1, 28),
    hour: randomInt(0, 23),
    minute: randomInt(0, 59),
    isLunar: false as const,
  };
}

async function sample(gender: Gender, label: string) {
  const curatedGivenNames = await getGivenNamesByGender(gender);
  console.log(`\n=== ${label} (DB given_name, ${curatedGivenNames.length}개, featured ${curatedGivenNames.filter((n) => n.isFeatured).length}개) ===`);

  const surnameOptions = await getSurnameByHangul("김");
  const surname = surnameOptions[0];

  const [hanjaPool, numerologyTable] = await Promise.all([getEligibleHanjaPool(), getAllNumerology81()]);

  for (let i = 1; i <= 20; i++) {
    const birth = randomBirth();
    const saju = await getSaju(birth);
    const distribution = aggregateElements(saju);
    const yongsinResult = deriveYongsin(saju, distribution);

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

    const names = candidates.map((c) => {
      const hanjaStr = c.hanja.map((h) => h.char).join("");
      const entry = curatedGivenNames.find((n) => n.hangul === c.hangul);
      const tag = entry?.isFeatured ? "*" : "";
      return `${surname.hangul}${c.hangul}${tag}(${surname.hanja}${hanjaStr})`;
    });
    console.log(
      `[${i}] ${birth.year}-${String(birth.month).padStart(2, "0")}-${String(birth.day).padStart(2, "0")} ${String(birth.hour).padStart(2, "0")}:${String(birth.minute).padStart(2, "0")} | ${yongsinResult.strength} | 용신 ${yongsinResult.yongsin.join(",")}`
    );
    console.log(`   ${names.join(" · ") || "(후보 없음)"}`);
  }
}

async function main() {
  await sample("M", "김씨 남자");
  await sample("F", "김씨 여자");
  getDbClient().close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
