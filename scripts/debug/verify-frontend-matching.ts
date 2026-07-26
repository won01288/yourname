// 실제 /api/name 응답(scripts/debug/sweep로 만든 것이 아니라 진짜 API 호출 결과)을 그대로 프론트
// 매칭 로직(app/lib/match-report.ts)에 통과시켜, 화면에 표시될 순서·해설 매칭이 실제로 맞는지 확인.
import fs from "fs";
import path from "path";
import os from "os";
import { orderCandidatesByReport, matchReportEntry } from "../../app/lib/match-report";
import type { NameApiResult } from "../../app/lib/name-client";

const filePath = path.join(process.env.TEMP ?? os.tmpdir(), "name-api-result.json");
const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as NameApiResult;

const ordered = orderCandidatesByReport(data.candidates, data.report);

console.log("=== 화면에 표시될 순서 (벤토 타일 순서) ===");
ordered.forEach((c, i) => {
  const entry = matchReportEntry(data.report, c.hangul);
  console.log(`${i + 1}순위 타일 → ${data.surname.hanja}${c.hanja.map((h) => h.char).join("")} (${c.hangul})`);
  console.log(`  클릭 시 표시될 해설의 report rank: ${entry?.rank}, 해설 앞부분: ${entry?.explanation.slice(0, 40)}...`);
});
