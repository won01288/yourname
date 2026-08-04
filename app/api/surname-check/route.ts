// CLAUDE.md 8.2 — /naming 입력 폼(1단계)에서 성씨를 등록된 100개(4.4) 안에서 미리 확인하는
// 전용 라우트. 계산 로직 없음, DB 조회만. 이게 없으면 등록 안 된 성씨로 위저드를 끝까지 채운
// 뒤(로그인·결제까지 거친 뒤) 마지막 제출에서야 app/api/name/route.ts의 400으로 실패를 알게 된다.

import { NextResponse } from "next/server";
import { getSurnameByHangul } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hangul = searchParams.get("hangul")?.trim();

  if (!hangul) {
    return NextResponse.json({ error: "한글 성씨를 입력하세요." }, { status: 400 });
  }

  const surnames = await getSurnameByHangul(hangul);
  return NextResponse.json({ hanjaOptions: surnames.map((s) => s.hanja) });
}
