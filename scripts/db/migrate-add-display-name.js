// SNS 로그인(구글/카카오/네이버) 도입 — user 테이블에 display_name(소셜 닉네임) 컬럼을 추가하는
// 1회성 마이그레이션. 기존 프로덕션 Turso DB에는 스키마 변경이 필요해 schema.sql의
// CREATE TABLE IF NOT EXISTS만으로는 반영되지 않는다. ALTER TABLE은 멱등(이미 컬럼이 있으면
// 에러를 무시)하게 작성했다. 실행: node scripts/db/migrate-add-display-name.js
const { createClient } = require("@libsql/client");
const { loadEnv } = require("./env");

loadEnv();

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    await client.execute("ALTER TABLE user ADD COLUMN display_name TEXT");
    console.log("display_name 컬럼을 추가했습니다.");
  } catch (err) {
    if (String(err.message ?? err).includes("duplicate column name")) {
      console.log("display_name 컬럼이 이미 존재합니다 (건너뜀).");
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
