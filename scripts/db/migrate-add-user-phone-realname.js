// SNS 로그인 프로필 파싱 버그 수정(2026.8.1) — user 테이블에 phone(휴대전화번호)·real_name(네이버
// 회원이름, 실명)을 저장할 컬럼을 추가하는 1회성 마이그레이션. 기존 프로덕션 Turso DB에는 스키마
// 변경이 필요해 schema.sql의 CREATE TABLE IF NOT EXISTS만으로는 반영되지 않는다. ALTER TABLE은
// 멱등(이미 컬럼이 있으면 에러를 무시)하게 작성했다. 실행: node scripts/db/migrate-add-user-phone-realname.js
const { createClient } = require("@libsql/client");
const { loadEnv } = require("./env");

loadEnv();

async function addColumnIfMissing(client, columnName, ddl) {
  try {
    await client.execute(ddl);
    console.log(`${columnName} 컬럼을 추가했습니다.`);
  } catch (err) {
    if (String(err.message ?? err).includes("duplicate column name")) {
      console.log(`${columnName} 컬럼이 이미 존재합니다 (건너뜀).`);
    } else {
      throw err;
    }
  }
}

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  await addColumnIfMissing(client, "phone", "ALTER TABLE user ADD COLUMN phone TEXT");
  await addColumnIfMissing(client, "real_name", "ALTER TABLE user ADD COLUMN real_name TEXT");

  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
