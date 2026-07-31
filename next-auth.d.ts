// next-auth(Auth.js v5) 타입 보강 — DB 어댑터 없이 JWT 세션만 쓰므로, 우리가 jwt/session
// 콜백(lib/oauth.ts)에서 직접 실어 나르는 내부 회원 id·닉네임 필드를 타입에 반영해 둔다.
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      displayName?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    internalUserId?: number;
    internalEmail?: string;
    internalDisplayName?: string | null;
  }
}
