// 결제(페이앱, CLAUDE.md 0.4) — payment_order.pay_type 컬럼 추가(2026.8.7).
// 카카오페이/네이버페이가 페이앱 정책상 불가해져 애플페이·페이코·가상계좌·휴대폰결제로
// 재구성하면서, 주문마다 실제 사용된 결제수단을 관리자 화면에서 볼 수 있게 저장한다.
// 기존 프로덕션 Turso DB에는 스키마 변경이 필요해 schema.sql의 CREATE TABLE IF NOT EXISTS만으로는
// 반영되지 않는다. ALTER TABLE은 멱등(이미 컬럼이 있으면 에러를 무시)하게 작성했다.
// 실행: node scripts/db/migrate-add-payment-pay-type.js
const { createClient } = require("@libsql/client");
const { loadEnv } = require("./env");

loadEnv();

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    await client.execute("ALTER TABLE payment_order ADD COLUMN pay_type TEXT");
    console.log("pay_type 컬럼을 추가했습니다.");
  } catch (err) {
    if (String(err.message ?? err).includes("duplicate column name")) {
      console.log("pay_type 컬럼이 이미 존재합니다 (건너뜀).");
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
