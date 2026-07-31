// SNS 로그인(카카오/네이버) — next-auth(Auth.js v5)는 OAuth 처리(토큰 교환, CSRF 방어 등)
// 전용으로만 쓴다. 이메일/비밀번호 로그인은 여전히 lib/auth.ts의 자체 DB-backed opaque 세션이
// 담당하며, 이 파일은 그 구조를 건드리지 않는다(8.2 "얇은 모듈" 원칙).
//
// jwt 콜백이 최초 로그인 시(=account가 존재할 때) findOrCreateOAuthUser로 우리 user 테이블의
// 내부 회원을 찾거나 만들고, 그 결과(내부 id·email·displayName)를 JWT에 실어 둔다. 이후 매 요청은
// DB 조회 없이 이 JWT만으로 세션을 복원한다(JWT 전략, 어댑터 없음). lib/auth.ts의 getCurrentUser()가
// 이 세션을 커스텀 쿠키 세션과 합쳐 하나의 AuthUser로 반환한다 — 나머지 코드는 로그인 방식이
// 무엇이었는지 전혀 신경 쓸 필요가 없다.
import NextAuth from "next-auth";
import Kakao from "next-auth/providers/kakao";
import Naver from "next-auth/providers/naver";
import { findOrCreateOAuthUser } from "./db-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Vercel 등 리버스 프록시 뒤에서 호스트 헤더를 신뢰해야 콜백 URL을 올바르게 계산한다.
  trustHost: true,
  providers: [
    Kakao({
      clientId: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET,
    }),
    Naver({
      clientId: process.env.NAVER_CLIENT_ID,
      clientSecret: process.env.NAVER_CLIENT_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, profile }) {
      // account/profile은 최초 로그인 콜백에서만 채워진다(이후 세션 갱신 시엔 token만 전달됨).
      if (account && (account.provider === "kakao" || account.provider === "naver")) {
        const user = await findOrCreateOAuthUser({
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          email: profile?.email ?? null,
          displayName: (profile?.name as string | undefined) ?? null,
        });
        token.internalUserId = user.id;
        token.internalEmail = user.email;
        token.internalDisplayName = user.displayName ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.internalUserId) {
        session.user.id = String(token.internalUserId);
        session.user.email = token.internalEmail as string;
        session.user.displayName = (token.internalDisplayName as string | null | undefined) ?? undefined;
      }
      return session;
    },
  },
});
