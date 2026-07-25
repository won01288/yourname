// scripts/db/data/surname.json을 Turso surname 테이블에 적재한다.
// 원획은 Unihan 데이터 기준(scripts/db/seed-hanja.js와 같은 소스), 초성 발음오행은
// lib/naming/config.ts의 INITIAL_CONSONANT_ELEMENT 규칙을 그대로 적용한다.
const fs = require("fs");
const path = require("path");
const { createClient } = require("@libsql/client");
const { loadEnv } = require("./env");

loadEnv();

// lib/naming/config.ts INITIAL_CONSONANT_ELEMENT와 동일하게 유지할 것.
const INITIAL_CONSONANT_ELEMENT = {
  ㄱ: "木", ㅋ: "木",
  ㄴ: "火", ㄷ: "火", ㄹ: "火", ㅌ: "火",
  ㅇ: "土", ㅎ: "土",
  ㅅ: "金", ㅈ: "金", ㅊ: "金",
  ㅁ: "水", ㅂ: "水", ㅍ: "水",
};

const CHO = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

function initialConsonant(syllable) {
  const code = syllable.charCodeAt(0) - 0xac00;
  return CHO[Math.floor(code / 588)];
}

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const list = JSON.parse(
    fs.readFileSync(path.join(__dirname, "data", "surname.json"), "utf-8")
  );

  const statements = list.map((s) => {
    const cho = initialConsonant(s.hangul);
    const element = INITIAL_CONSONANT_ELEMENT[cho];
    if (!element) throw new Error(`초성 오행을 못 찾음: ${s.hangul} (${cho})`);
    return {
      sql: `INSERT INTO surname (hangul, hanja, stroke_original, initial_element)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(hangul, hanja) DO UPDATE SET
              stroke_original=excluded.stroke_original, initial_element=excluded.initial_element`,
      args: [s.hangul, s.hanja, s.strokeOriginal, element],
    };
  });

  await client.batch(statements, "write");
  console.log(`surname 적재 완료 (${list.length}건).`);
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
