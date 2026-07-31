// 로그아웃 (로그인 베타 + SNS 로그인). 이메일/비밀번호 세션 행 삭제 + 쿠키 만료, 그리고 SNS
// 로그인이었을 수도 있으니 next-auth 세션도 함께 정리한다 — 로그인 방식이 무엇이었는지 여기서
// 굳이 구분하지 않고 둘 다 시도한다(해당 없는 쪽은 조용히 no-op).

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/auth";
import { signOut } from "@/lib/oauth";

export async function POST() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await deleteSession(token);
  }

  await signOut({ redirect: false });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}
