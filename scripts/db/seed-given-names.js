// scripts/db/data/given_names.json(etc/parse_korean_names.py 재현 스크립트 출력)을
// Turso given_name 테이블에 적재한다. CLAUDE.md 3.6 확장 — 후보 생성의 이름 후보 풀 원본.
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

  const list = JSON.parse(
    fs.readFileSync(path.join(__dirname, "data", "given_names.json"), "utf-8")
  );

  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < list.length; i += BATCH) {
    const batch = list.slice(i, i + BATCH);
    const statements = batch.map((n) => ({
      sql: `INSERT INTO given_name (hangul, gender, frequency)
            VALUES (?, ?, ?)
            ON CONFLICT(hangul, gender) DO UPDATE SET frequency=excluded.frequency`,
      args: [n.hangul, n.gender, n.frequency],
    }));
    await client.batch(statements, "write");
    inserted += batch.length;
    console.log(`${inserted} / ${list.length}`);
  }

  console.log("given_name 적재 완료.");
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
