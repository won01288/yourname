// scripts/db/data/numerology_81.json을 Turso numerology_81 테이블에 적재한다.
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
    fs.readFileSync(path.join(__dirname, "data", "numerology_81.json"), "utf-8")
  );

  const statements = list.map((n) => ({
    sql: `INSERT INTO numerology_81 (number, fortune, title, description)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(number) DO UPDATE SET
            fortune=excluded.fortune, title=excluded.title, description=excluded.description`,
    args: [n.number, n.fortune, n.title, n.description],
  }));

  await client.batch(statements, "write");
  console.log(`numerology_81 적재 완료 (${list.length}건).`);
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
