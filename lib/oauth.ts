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

// jwt 콜백이 받는 `profile`은 next-auth가 각 provider의 profile() 매핑을 거치기 전의 원본(raw)
// userinfo 응답이다 — 네이버는 {response: {id, email, name, nickname, mobile, ...}}, 카카오는
// {kakao_account: {email, phone_number, profile: {nickname}}} 형태로 실제 값이 한 단계 안에
// 중첩되어 있다. 휴대전화번호·네이버 실명(회원이름)은 provider의 profile() 매핑에도 없는 값이라
// (이메일/닉네임과 달리) 원본에서 직접 꺼내야 한다.
function extractExtraProfileFields(
  provider: "kakao" | "naver",
  profile: unknown
): { phone: string | null; realName: string | null } {
  if (!profile || typeof profile !== "object") return { phone: null, realName: null };
  const raw = profile as Record<string, unknown>;

  if (provider === "naver") {
    const response = raw.response as Record<string, unknown> | undefined;
    return {
      phone: (response?.mobile as string | undefined) ?? null,
      realName: (response?.name as string | undefined) ?? null,
    };
  }

  const kakaoAccount = raw.kakao_account as Record<string, unknown> | undefined;
  return {
    phone: (kakaoAccount?.phone_number as string | undefined) ?? null,
    realName: null, // 카카오는 실명(회원이름) 제공 항목 자체가 없다.
  };
}

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
    async jwt({ token, account, profile, user }) {
      // account/profile/user는 최초 로그인 콜백에서만 채워진다(이후 세션 갱신 시엔 token만 전달됨).
      // 이메일/닉네임은 raw profile을 직접 파싱하지 않고, provider의 profile() 매핑을 이미 거친
      // `user`(표준 {id, name, email, image} 형태)를 쓴다 — raw profile은 provider마다 이메일이
      // 중첩된 위치가 달라(네이버 response.email, 카카오 kakao_account.email) 예전엔 이 값을
      // 직접 읽다가 항상 undefined가 되어 이메일 동의를 받고도 placeholder만 저장되는 버그가 있었다.
      // 휴대전화번호·네이버 실명은 `user`에 없는 값이라 raw profile에서 별도로 꺼낸다.
      if (account && (account.provider === "kakao" || account.provider === "naver")) {
        const { phone, realName } = extractExtraProfileFields(account.provider, profile);
        const oauthUser = await findOrCreateOAuthUser({
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          email: user?.email ?? null,
          displayName: user?.name ?? null,
          phone,
          realName,
        });
        token.internalUserId = oauthUser.id;
        token.internalEmail = oauthUser.email;
        token.internalDisplayName = oauthUser.displayName ?? null;
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
