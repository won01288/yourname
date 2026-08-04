// 회원 문의하기 — inquiry 테이블 신규 생성. 신규 테이블이라 CREATE TABLE IF NOT EXISTS만으로
// 멱등하다(컬럼 추가 마이그레이션과 달리 try/catch 불필요). 실행: node scripts/db/migrate-add-inquiry.js
const { createClient } = require("@libsql/client");
const { loadEnv } = require("./env");

loadEnv();

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  await client.execute(`
    CREATE TABLE IF NOT EXISTS inquiry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      answer TEXT,
      answered_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("inquiry 테이블을 확인/생성했습니다.");

  await client.execute("CREATE INDEX IF NOT EXISTS idx_inquiry_user_id ON inquiry(user_id)");
  console.log("idx_inquiry_user_id 인덱스를 확인/생성했습니다.");

  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
