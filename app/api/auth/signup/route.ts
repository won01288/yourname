// 이메일+비밀번호 회원가입 (로그인 베타). 계산 로직 없음 — lib/auth·lib/db-auth 호출만 조립한다.

import { NextResponse } from "next/server";
import { createSession, hashPassword, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/auth";
import { createUser, getUserByEmail } from "@/lib/db-auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

interface SignupBody {
  email: string;
  password: string;
}

function isValidBody(body: Partial<SignupBody>): body is SignupBody {
  return typeof body.email === "string" && typeof body.password === "string";
}

export async function POST(request: Request) {
  let body: Partial<SignupBody>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바른 JSON이 아닙니다." }, { status: 400 });
  }

  if (!isValidBody(body)) {
    return NextResponse.json({ error: "email/password를 확인하세요." }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const password = body.password;

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "올바른 이메일 형식이 아닙니다." }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.` }, { status: 400 });
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser(email, passwordHash);
  const { token } = await createSession(user.id);

  const response = NextResponse.json({ user: { email: user.email } }, { status: 201 });
  response.cookies.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
  return response;
}
