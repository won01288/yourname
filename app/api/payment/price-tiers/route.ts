// 결제(CLAUDE.md 0.4) — 현재 가격을 공개 조회하는 전용 라우트. 로그인/결제 전 프론트가 가격을
// 미리 보여주는 데 쓴다. 가격 자체는 민감정보가 아니라 인증 게이트를 두지 않는다. 가격 변경은
// app/admin/pricing(관리자 Server Action)에서만 가능하다.

import { NextResponse } from "next/server";
import { getPriceTiers } from "@/lib/db-payment";

export async function GET() {
  const tiers = await getPriceTiers();
  return NextResponse.json({ tiers });
}
