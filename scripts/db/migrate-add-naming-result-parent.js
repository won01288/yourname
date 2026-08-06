// "같은 사주로 이름 더 추천받기" — naming_result.parent_naming_result_id 컬럼 추가.
// 항상 세션의 루트 naming_result.id를 가리키는 star topology(체인이 아님)로 쓴다 — NULL이면
// 이 행 자체가 루트. 기존 프로덕션 Turso DB에는 스키마 변경이 필요해 schema.sql의
// CREATE TABLE IF NOT EXISTS만으로는 반영되지 않는다. ALTER TABLE은 멱등하게 작성했다.
// 실행: node scripts/db/migrate-add-naming-result-parent.js
const { createClient } = require("@libsql/client");
const { loadEnv } = require("./env");

loadEnv();

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    await client.execute("ALTER TABLE naming_result ADD COLUMN parent_naming_result_id INTEGER");
    console.log("parent_naming_result_id 컬럼을 추가했습니다.");
  } catch (err) {
    if (String(err.message ?? err).includes("duplicate column name")) {
      console.log("parent_naming_result_id 컬럼이 이미 존재합니다 (건너뜀).");
    } else {
      throw err;
    }
  }

  await client.execute(
    "CREATE INDEX IF NOT EXISTS idx_naming_result_parent ON naming_result(parent_naming_result_id)"
  );
  console.log("idx_naming_result_parent 인덱스를 확인했습니다.");

  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
