import { getDbClient } from "../../lib/db";

async function main() {
  const client = getDbClient();
  const r = await client.execute("SELECT hangul, hanja, stroke_original, initial_element FROM surname ORDER BY hangul");
  for (const row of r.rows) {
    console.log(`${row.hangul}(${row.hanja}) 원획${row.stroke_original} ${row.initial_element}`);
  }
  console.log("count:", r.rows.length);
  client.close();
}

main();
