// 로그아웃 (로그인 베타). 세션 행 삭제 + 쿠키 만료.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/auth";

export async function POST() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await deleteSession(token);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}
