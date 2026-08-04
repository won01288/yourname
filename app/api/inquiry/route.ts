// 회원 문의하기(CLAUDE.md 0.5) — 문의 등록 전용. 목록 조회는 app/mypage/inquiries/page.tsx가
// lib/db-auth를 직접 호출하므로(CLAUDE.md 8.3), 클라이언트 인터랙션이 실제로 필요한 등록만
// API로 둔다.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createInquiry } from "@/lib/db-auth";

const MAX_CONTENT_LENGTH = 2000;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "문의 내용을 입력해 주세요." }, { status: 400 });
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    return NextResponse.json({ error: `문의 내용은 ${MAX_CONTENT_LENGTH}자 이내로 입력해 주세요.` }, { status: 400 });
  }

  const inquiry = await createInquiry(user.id, content);
  return NextResponse.json({ inquiry }, { status: 201 });
}
