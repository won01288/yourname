// 결제(CLAUDE.md 0.4) — 로그인한 사용자에게 백그라운드에서 생성 중인 주문이 있는지 클라이언트가
// 직접 확인하는 전용 라우트. app/naming/page.tsx의 서버 사이드 확인(getInProgressNamingOrder)과
// 같은 조회를 쓰지만, 카카오페이 등 결제 앱에서 돌아와 탭이 다시 보이는 시점(visibilitychange 등)에
// 페이지 전체 새로고침 없이도 클라이언트가 즉시 재확인할 수 있게 한다(2026.8.5) — 브라우저가
// 백그라운드 탭을 bfcache로 그대로 복원하면 서버 컴포넌트가 다시 실행되지 않아 수동 새로고침 전까지
// 로딩 화면으로 넘어가지 못하는 문제의 대응.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getInProgressNamingOrder } from "@/lib/db-payment";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const order = await getInProgressNamingOrder(user.id);
  return NextResponse.json(order);
}
