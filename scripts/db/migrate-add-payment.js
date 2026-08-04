// 결제(페이앱, CLAUDE.md 0.4) — price_tier/payment_order 테이블 신규 생성 + 기본 가격 시딩.
// 두 테이블 다 신규라 CREATE TABLE IF NOT EXISTS만으로 멱등하다(컬럼 추가 마이그레이션과 달리
// try/catch 불필요). 실행: node scripts/db/migrate-add-payment.js
const { createClient } = require("@libsql/client");
const { loadEnv } = require("./env");

loadEnv();

const DEFAULT_PRICES = [
  { candidateCount: 3, price: 5900 },
  { candidateCount: 5, price: 8900 },
  { candidateCount: 10, price: 14900 },
];

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  await client.execute(`
    CREATE TABLE IF NOT EXISTS price_tier (
      candidate_count INTEGER PRIMARY KEY CHECK (candidate_count IN (3, 5, 10)),
      price INTEGER NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("price_tier 테이블을 확인/생성했습니다.");

  await client.execute(`
    CREATE TABLE IF NOT EXISTS payment_order (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      candidate_count INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'consumed', 'canceled', 'failed')),
      provider TEXT NOT NULL DEFAULT 'payapp',
      provider_order_id TEXT,
      naming_result_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("payment_order 테이블을 확인/생성했습니다.");

  await client.execute(
    "CREATE INDEX IF NOT EXISTS idx_payment_order_user_id ON payment_order(user_id)"
  );

  for (const { candidateCount, price } of DEFAULT_PRICES) {
    await client.execute({
      sql: "INSERT OR IGNORE INTO price_tier (candidate_count, price) VALUES (?, ?)",
      args: [candidateCount, price],
    });
  }
  console.log("price_tier 기본 가격을 시딩했습니다(이미 있으면 건너뜀): 3개=5900원, 5개=8900원, 10개=14900원.");

  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
