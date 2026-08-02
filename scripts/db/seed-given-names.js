// scripts/db/data/given_names.json(etc/build_final_given_names.py 출력)을 Turso given_name
// 테이블에 적재한다. CLAUDE.md 3.6 확장 — 후보 생성의 이름 후보 풀 원본.
//
// 2026.8.2 — given_name을 "누적 UPSERT"가 아니라 "완전 교체"로 바꿨다. 이 테이블의 유일한
// 출처는 항상 given_names.json 하나뿐이라(3.7), 그 파일이 바뀌면 옛 행이 남아있을 이유가
// 없다 — DELETE 없이 UPSERT만 하면 새 목록에서 빠진 이름이 계속 후보 풀에 남는 문제가 있었다.
// DELETE와 첫 배치를 하나의 client.batch(..., "write") 호출에 묶어, 중간 실패 시 테이블이
// 빈 채로 남는 위험 없이 원자적으로 교체되게 했다.
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
      sql: `INSERT INTO given_name (hangul, gender, frequency, is_featured)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(hangul, gender) DO UPDATE SET frequency=excluded.frequency, is_featured=excluded.is_featured`,
      args: [n.hangul, n.gender, n.frequency, n.isFeatured ? 1 : 0],
    }));
    if (i === 0) {
      statements.unshift({ sql: "DELETE FROM given_name", args: [] });
    }
    await client.batch(statements, "write");
    inserted += batch.length;
    console.log(`${inserted} / ${list.length}`);
  }

  console.log("given_name 전량 교체 완료.");
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
