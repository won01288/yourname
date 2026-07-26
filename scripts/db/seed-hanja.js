// scripts/db/data/final_hanja.json (OCR 교차검증 confirmed 한자, 1,789자)을 Turso hanja 테이블에 적재한다.
const fs = require("fs");
const path = require("path");
const { createClient } = require("@libsql/client");
const { loadEnv } = require("./env");

loadEnv();

// lib/naming/config.ts의 RADICAL_ELEMENT와 동일하게 유지할 것 (부수번호 -> 오행).
// 112(石)는 출처마다 배속이 갈려(金 vs 土) 의도적으로 뺐다 — config.ts 주석 참고.
const RADICAL_ELEMENT = {
  75: "木", 140: "木", 118: "木", 115: "木", 119: "木",
  86: "火", 72: "火", 155: "火",
  32: "土", 46: "土", 170: "土",
  167: "金", 18: "金", 69: "金",
  85: "水", 173: "水", 15: "水", 47: "水",
};

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const hanjaList = JSON.parse(
    fs.readFileSync(path.join(__dirname, "data", "final_hanja.json"), "utf-8")
  );
  const radicalTable = JSON.parse(
    fs.readFileSync(path.join(__dirname, "data", "radical_table.json"), "utf-8")
  );

  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < hanjaList.length; i += BATCH) {
    const batch = hanjaList.slice(i, i + BATCH);
    const statements = batch.map((h) => {
      const radicalChar = h.radicalIndex ? radicalTable[String(h.radicalIndex)]?.char ?? null : null;
      const element = h.radicalIndex ? RADICAL_ELEMENT[h.radicalIndex] ?? null : null;
      return {
        sql: `INSERT INTO hanja
          (char, readings, stroke_original, stroke_actual, radical, element, meaning,
           is_name_allowed, is_forbidden, forbidden_reason, verification_status, is_common)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(char) DO UPDATE SET
            readings=excluded.readings,
            stroke_original=excluded.stroke_original,
            stroke_actual=excluded.stroke_actual,
            radical=excluded.radical,
            element=excluded.element,
            meaning=excluded.meaning,
            is_name_allowed=excluded.is_name_allowed,
            is_forbidden=excluded.is_forbidden,
            forbidden_reason=excluded.forbidden_reason,
            verification_status=excluded.verification_status,
            is_common=excluded.is_common`,
        args: [
          h.char,
          JSON.stringify(h.readings),
          h.strokeOriginal,
          h.strokeActual,
          radicalChar,
          element,
          h.meaning,
          h.isNameAllowed ? 1 : 0,
          h.isForbidden ? 1 : 0,
          h.forbiddenReason,
          h.verificationStatus,
          h.isCommon ? 1 : 0,
        ],
      };
    });
    await client.batch(statements, "write");
    inserted += batch.length;
    console.log(`${inserted} / ${hanjaList.length}`);
  }

  console.log("hanja 적재 완료.");
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
