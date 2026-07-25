// scripts/db/schema.sql을 실제 Turso DB에 적용한다.
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

  const rawSql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
  // 줄 단위로 "--" 주석을 먼저 제거한 뒤 세미콜론으로 문장을 나눈다.
  // (주석이 CREATE TABLE 문 앞이나 안에 섞여 있으면 통짜로 잘라내는 방식은 실패한다.)
  const sql = rawSql
    .split("\n")
    .map((line) => (line.trim().startsWith("--") ? "" : line))
    .join("\n");
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    console.log("실행:", stmt.split("\n")[0].slice(0, 60), "...");
    await client.execute(stmt);
  }

  console.log("스키마 적용 완료.");
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
