// 관리자 회원문의관리(CLAUDE.md 0.5) — 답변 등록/삭제 전용. 목록 조회는
// app/admin/inquiries/page.tsx가 lib/db-auth를 직접 호출한다(CLAUDE.md 8.3). 두 액션 모두
// AdminInquiryPanel.tsx(클라이언트, 낙관적 목록 갱신)에서 호출하므로 API 라우트로 둔다.

import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { answerInquiry, deleteInquiryAdmin } from "@/lib/db-auth";

const MAX_ANSWER_LENGTH = 4000;

function parseId(id: string): number | null {
  const numericId = Number(id);
  return Number.isInteger(numericId) ? numericId : null;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await context.params;
  const numericId = parseId(id);
  if (numericId === null) {
    return NextResponse.json({ error: "올바르지 않은 id입니다." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const answer = typeof body?.answer === "string" ? body.answer.trim() : "";
  if (!answer) {
    return NextResponse.json({ error: "답변 내용을 입력해 주세요." }, { status: 400 });
  }
  if (answer.length > MAX_ANSWER_LENGTH) {
    return NextResponse.json({ error: `답변은 ${MAX_ANSWER_LENGTH}자 이내로 입력해 주세요.` }, { status: 400 });
  }

  const updated = await answerInquiry(numericId, answer);
  if (!updated) {
    return NextResponse.json({ error: "문의를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await context.params;
  const numericId = parseId(id);
  if (numericId === null) {
    return NextResponse.json({ error: "올바르지 않은 id입니다." }, { status: 400 });
  }

  const deleted = await deleteInquiryAdmin(numericId);
  if (!deleted) {
    return NextResponse.json({ error: "문의를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
