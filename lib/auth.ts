// 로그인(이메일/비밀번호) 베타 — 비밀번호 해시·세션 발급/조회. lib/naming/ 밖(lib/db.ts,
// lib/llm/explain.ts와 동급 위치)에 둔다. Node 내장 crypto만 쓰고 새 의존성을 추가하지 않는다.

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { createSessionRow, deleteSessionRow, getSessionWithUser, type AuthUser } from "./db-auth";
import { auth as getOAuthSession } from "./oauth";

export type { AuthUser } from "./db-auth";

// 비밀번호 해시 --------------------------------------------------------------
// scrypt(비밀번호, 사용자별 랜덤 salt) -> "scrypt:v1:<saltHex>:<hashHex>".
// 버전 접두어를 둬 향후 파라미터(키 길이 등)를 바꾸더라도 기존 해시를 구분해 처리할 수 있게 한다.

const SCRYPT_KEYLEN = 64;
const SCRYPT_VERSION = "v1";

function scryptAsync(password: string, salt: Buffer, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey as Buffer);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const derivedKey = await scryptAsync(password, salt, SCRYPT_KEYLEN);
  return `scrypt:${SCRYPT_VERSION}:${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

// 저장된 해시가 손상되었거나 형식이 다르면(예: 향후 다른 방식으로 이관) throw 없이 false를
// 반환한다 — 로그인 실패 처리로 자연스럽게 이어지게 하기 위함.
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;
  const [, , saltHex, hashHex] = parts;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltHex, "hex");
    expected = Buffer.from(hashHex, "hex");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  const actual = await scryptAsync(password, salt, expected.length);
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

// 세션 ------------------------------------------------------------------
// DB-backed opaque 세션(JWT 아님) — 쿠키엔 랜덤 원본 토큰, DB(session.id)엔 그 SHA-256 해시만
// 저장한다. DB가 유출돼도 저장된 값만으로는 세션을 재사용할 수 없다.

export const SESSION_COOKIE_NAME = "yourname_session";
export const SESSION_TTL_DAYS = 30;
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
};

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number): Promise<{ token: string }> {
  const token = generateSessionToken();
  await createSessionRow(hashToken(token), userId);
  return { token };
}

export async function getSessionUser(token: string): Promise<AuthUser | null> {
  return getSessionWithUser(hashToken(token));
}

export async function deleteSession(token: string): Promise<void> {
  await deleteSessionRow(hashToken(token));
}

// Server Component/Route Handler 공용 헬퍼. 이메일/비밀번호(커스텀 쿠키)를 먼저 확인하고, 없으면
// SNS 로그인(next-auth JWT 세션, lib/oauth.ts)을 확인한다 — 두 로그인 방식을 이 함수 하나로 합쳐
// 반환하므로, 호출부(naming/score 게이트, 마이페이지, 관리자 판별 등)는 로그인 방식을 구분할 필요가 없다.
export async function getCurrentUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const user = await getSessionUser(token);
    if (user) return user;
  }

  const oauthSession = await getOAuthSession();
  if (oauthSession?.user?.id) {
    return {
      id: Number(oauthSession.user.id),
      email: oauthSession.user.email ?? "",
      displayName: oauthSession.user.displayName,
    };
  }

  return null;
}

// 관리자 판별 — 정식 출시 전 프리미엄 작명 접근 제한(임시 게이트)용. user 테이블에 별도 컬럼을
// 추가하는 DB 마이그레이션 대신, Vercel 환경변수 ADMIN_EMAILS(쉼표 구분)에 등록된 이메일로 로그인한
// 계정만 관리자로 취급한다 — 되돌리기 쉽고(환경변수만 바꾸면 됨) 출시 전 임시 조치에 적합하다.
function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0)
  );
}

export function isAdminUser(user: Pick<AuthUser, "email"> | null): boolean {
  if (!user) return false;
  return getAdminEmails().has(user.email.toLowerCase());
}
