// 결제(페이앱, CLAUDE.md 0.4) — payment_order.pending_payload 컬럼 추가(2026.8.5).
// 모바일 풀리다이렉트(카카오페이 등 앱 전환) 복귀 시 sessionStorage가 유실되는 경우가 있어,
// 결제 시작 시점의 NameRequestPayload(JSON)를 서버에도 스냅샷으로 저장해 orderId만으로 복원할
// 수 있게 한다. 기존 프로덕션 Turso DB에는 스키마 변경이 필요해 schema.sql의
// CREATE TABLE IF NOT EXISTS만으로는 반영되지 않는다. ALTER TABLE은 멱등(이미 컬럼이 있으면
// 에러를 무시)하게 작성했다.
// 실행: node scripts/db/migrate-add-payment-pending-payload.js
const { createClient } = require("@libsql/client");
const { loadEnv } = require("./env");

loadEnv();

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    await client.execute("ALTER TABLE payment_order ADD COLUMN pending_payload TEXT");
    console.log("pending_payload 컬럼을 추가했습니다.");
  } catch (err) {
    if (String(err.message ?? err).includes("duplicate column name")) {
      console.log("pending_payload 컬럼이 이미 존재합니다 (건너뜀).");
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
