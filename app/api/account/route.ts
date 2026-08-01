// 회원 탈퇴 (마이페이지). 되돌릴 수 없는 작업이라, 비밀번호 계정은 비밀번호 재확인을 거친다
// (세션 탈취만으로는 탈퇴가 불가능하도록). 소셜 로그인 전용 계정(password_hash가
// "oauth:v1:<provider>" sentinel, lib/auth.ts 참고)은 비밀번호가 없으므로 재확인 없이 진행한다 —
// 클라이언트 쪽 확인 다이얼로그(AccountDeleteSection.tsx)가 실수 클릭을 막는다.

import { NextResponse } from "next/server";
import { getCurrentUser, verifyPassword, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/auth";
import { deleteUserAccount, getUserById } from "@/lib/db-auth";
import { signOut } from "@/lib/oauth";

interface DeleteAccountBody {
  password?: string;
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const existing = await getUserById(user.id);
  if (!existing) {
    return NextResponse.json({ error: "계정을 찾을 수 없습니다." }, { status: 404 });
  }

  const isPasswordAccount = existing.passwordHash.startsWith("scrypt:");
  if (isPasswordAccount) {
    let body: DeleteAccountBody = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "비밀번호를 입력해 주세요." }, { status: 400 });
    }
    if (typeof body.password !== "string" || body.password.length === 0) {
      return NextResponse.json({ error: "비밀번호를 입력해 주세요." }, { status: 400 });
    }
    const valid = await verifyPassword(body.password, existing.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
    }
  }

  await deleteUserAccount(user.id);
  await signOut({ redirect: false });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}
