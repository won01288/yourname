// 할인코드(CLAUDE.md 0.4 연장, 2026.8.7) — discount_code 테이블 신설 + payment_order에
// discount_code/discount_percent/original_amount 컬럼 추가.
// 기존 프로덕션 Turso DB에는 스키마 변경이 필요해 schema.sql의 CREATE TABLE IF NOT EXISTS만으로는
// 반영되지 않는다. 전부 멱등(이미 있으면 에러를 무시)하게 작성했다.
// 실행: node scripts/db/migrate-add-discount-code.js
const { createClient } = require("@libsql/client");
const { loadEnv } = require("./env");

loadEnv();

async function addColumnIfMissing(client, table, columnDef, columnName) {
  try {
    await client.execute(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
    console.log(`${table}.${columnName} 컬럼을 추가했습니다.`);
  } catch (err) {
    if (String(err.message ?? err).includes("duplicate column name")) {
      console.log(`${table}.${columnName} 컬럼이 이미 존재합니다 (건너뜀).`);
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

  await client.execute(`
    CREATE TABLE IF NOT EXISTS discount_code (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
      valid_from TEXT,
      valid_until TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("discount_code 테이블을 확인/생성했습니다.");

  await addColumnIfMissing(client, "payment_order", "discount_code TEXT", "discount_code");
  await addColumnIfMissing(client, "payment_order", "discount_percent INTEGER", "discount_percent");
  await addColumnIfMissing(client, "payment_order", "original_amount INTEGER", "original_amount");

  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
