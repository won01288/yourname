// CLAUDE.md 3.6 — hanja 테이블에 is_common(교육용 기초한자 여부) 컬럼을 추가하는 1회성 마이그레이션.
// 기존 프로덕션 Turso DB(hanja 9,063행)에는 스키마 변경이 필요해 schema.sql의 CREATE TABLE IF NOT
// EXISTS만으로는 반영되지 않는다. ALTER TABLE은 멱등(이미 컬럼이 있으면 에러를 무시)하게 작성했다.
// 실행 순서: 1) node scripts/db/migrate-add-is-common.js  2) node scripts/db/seed-hanja.js
// (seed-hanja.js가 final_hanja.json의 isCommon 값으로 9,063행 전체를 UPDATE한다.)
const { createClient } = require("@libsql/client");
const { loadEnv } = require("./env");

loadEnv();

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    await client.execute("ALTER TABLE hanja ADD COLUMN is_common INTEGER NOT NULL DEFAULT 0");
    console.log("is_common 컬럼을 추가했습니다.");
  } catch (err) {
    if (String(err.message ?? err).includes("duplicate column name")) {
      console.log("is_common 컬럼이 이미 존재합니다 (건너뜀).");
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
