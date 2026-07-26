import { getDbClient } from "../../lib/db";

async function main() {
  const client = getDbClient();
  // 서준/민준은 남자이름 시트 1,2위, 서윤/지우는 여자이름 시트 1,3위.
  const samples = ["서준", "민준", "서윤", "지우"];
  for (const name of samples) {
    const r = await client.execute({
      sql: "SELECT hangul, gender, frequency FROM given_name WHERE hangul = ?",
      args: [name],
    });
    console.log(name, "->", r.rows.map((row) => `${row.gender}(freq ${row.frequency})`).join(", "));
  }
  const counts = await client.execute("SELECT gender, COUNT(*) as c FROM given_name GROUP BY gender");
  console.log("gender counts:", counts.rows);
  client.close();
}

main();
