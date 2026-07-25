// .env.local을 간단히 파싱해 process.env에 채운다 (프로젝트에 dotenv 의존성이 없어서 직접 구현).
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPath = path.join(__dirname, "..", "..", ".env.local");
  const text = fs.readFileSync(envPath, "utf-8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (value && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

module.exports = { loadEnv };
