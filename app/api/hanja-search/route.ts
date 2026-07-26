// CLAUDE.md 8.2 — "한자 찾기" UI가 쓰는 조회 전용 라우트(Phase 7). 계산 로직 없음, DB 조회만.
// LLM 호출 없음 — 이름 점수 확인 서비스는 운영자 비용이 0이어야 한다.

import { NextResponse } from "next/server";
import { getHanjaByReading } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reading = searchParams.get("reading")?.trim();

  if (!reading || reading.length !== 1) {
    return NextResponse.json({ error: "한글 음 한 글자를 입력하세요. 예: 서, 준" }, { status: 400 });
  }

  const hanja = await getHanjaByReading(reading);
  return NextResponse.json({ hanja });
}
