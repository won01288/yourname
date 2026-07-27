// 실제 /api/name 응답(직접 호출한 진짜 API 결과)을 그대로 프론트 매칭 로직(app/lib/match-report.ts)에
// 통과시켜, 화면에 표시될 해설 매칭이 실제로 맞는지 확인한다.
// Phase 8(2026.7.27) — 순위(rank)를 없앴으므로(CLAUDE.md 3.6) 더 이상 재정렬하지 않는다. API가
// 이미 무작위화해 반환한 candidates 순서를 그대로 "벤토 타일 순서"로 쓴다.
import fs from "fs";
import path from "path";
import os from "os";
import { matchReportEntry } from "../../app/lib/match-report";
import type { NameApiResult } from "../../app/lib/name-client";

const filePath = path.join(process.env.TEMP ?? os.tmpdir(), "name-api-result.json");
const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as NameApiResult;

console.log("=== 화면에 표시될 순서 (벤토 타일 순서, API가 이미 무작위화) ===");
data.candidates.forEach((c, i) => {
  const entry = matchReportEntry(data.report, c.hangul);
  console.log(`${i + 1}번째 타일 → ${data.surname.hanja}${c.hanja.map((h) => h.char).join("")} (${c.hangul})`);
  console.log(`  강점: ${c.highlights.map((h) => h.label).join(" / ")}`);
  console.log(`  클릭 시 표시될 해설 앞부분: ${entry?.explanation.slice(0, 40)}...`);
});
