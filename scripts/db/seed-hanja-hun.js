// scripts/db/data/hanja_hun.json(한국어 위키낱말사전 "부록:한문 교육용 기초 한자 1800",
// CC BY-SA 4.0, etc/parse_wiktionary_hun.py로 재현)의 훈을 hanja 테이블에 반영한다.
// 원본 표에 있는 한자만 갱신하고(약 1,787자), 나머지는 hun이 NULL로 남는다 — 3.10 원칙대로
// 근거 없는 글자는 지어내지 않고 표시를 생략한다. migrate-add-hun.js로 컬럼을 먼저 추가해야 한다.
const fs = require("fs");
const path = require("path");
const { createClient } = require("@libsql/client");
const { loadEnv } = require("./env");

loadEnv();

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const list = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "hanja_hun.json"), "utf-8"));

  const BATCH = 200;
  let updated = 0;
  for (let i = 0; i < list.length; i += BATCH) {
    const batch = list.slice(i, i + BATCH);
    const statements = batch.map((entry) => ({
      sql: `UPDATE hanja SET hun = ? WHERE char = ?`,
      args: [entry.hun, entry.char],
    }));
    await client.batch(statements, "write");
    updated += batch.length;
    console.log(`${updated} / ${list.length}`);
  }

  const result = await client.execute("SELECT COUNT(*) as cnt FROM hanja WHERE hun IS NOT NULL");
  console.log(`hun 채워진 행: ${result.rows[0].cnt}`);

  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
