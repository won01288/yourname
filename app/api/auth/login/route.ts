// 이메일+비밀번호 로그인 (로그인 베타).

import { NextResponse } from "next/server";
import { createSession, verifyPassword, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/auth";
import { getUserByEmail } from "@/lib/db-auth";

interface LoginBody {
  email: string;
  password: string;
}

function isValidBody(body: Partial<LoginBody>): body is LoginBody {
  return typeof body.email === "string" && typeof body.password === "string";
}

// 계정이 없는 경우와 비밀번호가 틀린 경우를 같은 메시지로 응답한다 — 가입 여부를 노출하는
// 계정 열거(enumeration) 공격을 막기 위함.
function authFailResponse() {
  return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
}

export async function POST(request: Request) {
  let body: Partial<LoginBody>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바른 JSON이 아닙니다." }, { status: 400 });
  }

  if (!isValidBody(body)) {
    return NextResponse.json({ error: "email/password를 확인하세요." }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const existing = await getUserByEmail(email);
  if (!existing) {
    return authFailResponse();
  }

  const valid = await verifyPassword(body.password, existing.passwordHash);
  if (!valid) {
    return authFailResponse();
  }

  const { token } = await createSession(existing.id);
  const response = NextResponse.json({ user: { email: existing.email } });
  response.cookies.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
  return response;
}
