// given_name 후보 풀 재구성(2026.8.2) — 기존 given_name 상위 300개(남녀 각) + namechart.kr
// 기반 신규 풀 상위 500개(남녀 각)에 추천 시 약간의 가중치를 주기 위한 is_featured 컬럼 추가.
// 기존 프로덕션 Turso DB에는 스키마 변경이 필요해 schema.sql의 CREATE TABLE IF NOT EXISTS만으로는
// 반영되지 않는다. ALTER TABLE은 멱등(이미 컬럼이 있으면 에러를 무시)하게 작성했다.
// 실행 순서: 1) node scripts/db/migrate-add-given-name-featured.js
//           2) node scripts/db/seed-given-names.js (DELETE+재적재, is_featured 포함)
const { createClient } = require("@libsql/client");
const { loadEnv } = require("./env");

loadEnv();

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    await client.execute("ALTER TABLE given_name ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0");
    console.log("is_featured 컬럼을 추가했습니다.");
  } catch (err) {
    if (String(err.message ?? err).includes("duplicate column name")) {
      console.log("is_featured 컬럼이 이미 존재합니다 (건너뜀).");
    } else {
      throw err;
    }
  }

  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
