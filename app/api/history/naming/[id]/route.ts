// 저장된 "프리미엄 작명" 결과 삭제 (마이페이지). score_result와 동일 패턴 —
// 목록/상세 조회는 app/mypage/*가 lib/db-auth를 직접 호출하므로, 클라이언트 인터랙션이
// 실제로 필요한 삭제만 API로 둔다. 30일 자동 만료와 별개로 사용자가 직접 지울 수 있다.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteNamingResult } from "@/lib/db-auth";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await context.params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) {
    return NextResponse.json({ error: "올바르지 않은 id입니다." }, { status: 400 });
  }

  const deleted = await deleteNamingResult(numericId, user.id);
  if (!deleted) {
    return NextResponse.json({ error: "결과를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
