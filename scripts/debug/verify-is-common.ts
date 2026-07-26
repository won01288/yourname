import { getDbClient } from "../../lib/db";

async function main() {
  const client = getDbClient();
  const r1 = await client.execute("SELECT COUNT(*) as c FROM hanja WHERE is_common = 1");
  const r2 = await client.execute("SELECT COUNT(*) as c FROM hanja");
  console.log("is_common=1 개수:", r1.rows[0].c);
  console.log("전체:", r2.rows[0].c);
  client.close();
}

main();
