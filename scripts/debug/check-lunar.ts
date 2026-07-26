import { getSaju } from "../../lib/saju";

async function main() {
  const solar = await getSaju({ year: 2000, month: 8, day: 1, hour: 10, minute: 0, isLunar: false });
  console.log("solar:", JSON.stringify(solar));
  const lunar = await getSaju({ year: 2000, month: 8, day: 1, hour: 10, minute: 0, isLunar: true });
  console.log("lunar:", JSON.stringify(lunar));
  const leap = await getSaju({ year: 2001, month: 4, day: 15, hour: 10, minute: 0, isLunar: true, isLeapMonth: true });
  console.log("leap month:", JSON.stringify(leap));
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
