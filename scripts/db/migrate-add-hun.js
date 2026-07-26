// CLAUDE.md 3.10/4.1 — hanja 테이블에 hun(한글 훈 한 단어) 컬럼을 추가하는 1회성 마이그레이션.
// 기존 프로덕션 Turso DB(hanja 9,063행)에는 스키마 변경이 필요해 schema.sql의 CREATE TABLE IF NOT
// EXISTS만으로는 반영되지 않는다. ALTER TABLE은 멱등(이미 컬럼이 있으면 에러를 무시)하게 작성했다.
// 실행 순서: 1) node scripts/db/migrate-add-hun.js  2) node scripts/db/seed-hanja-hun.js
// (LLM 번역이 아니라 한국어 위키낱말사전의 공개 라이선스(CC BY-SA 4.0) 훈음표를 재사용한다 — 크레딧 비용 없음.)
const { createClient } = require("@libsql/client");
const { loadEnv } = require("./env");

loadEnv();

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    await client.execute("ALTER TABLE hanja ADD COLUMN hun TEXT");
    console.log("hun 컬럼을 추가했습니다.");
  } catch (err) {
    if (String(err.message ?? err).includes("duplicate column name")) {
      console.log("hun 컬럼이 이미 존재합니다 (건너뜀).");
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
