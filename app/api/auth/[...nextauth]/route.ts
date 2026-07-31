// SNS 로그인(구글/카카오/네이버) — next-auth(lib/oauth.ts)가 만든 핸들러를 그대로 노출한다.
// /api/auth/signin/:provider, /api/auth/callback/:provider 등은 이 catch-all이 처리하고,
// 형제 경로인 /api/auth/{signup,login,logout}(이메일/비밀번호, 리터럴 세그먼트)과는 충돌하지
// 않는다 — Next.js가 리터럴 라우트를 catch-all보다 먼저 매칭한다.
import { handlers } from "@/lib/oauth";

export const { GET, POST } = handlers;
