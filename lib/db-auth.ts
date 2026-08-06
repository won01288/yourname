// 인증(user/session) + 저장된 결과(score_result/naming_result) 전용 DB 접근.
// lib/db.ts는 읽기 전용 참조 데이터(hanja/surname/numerology/given_name, 1회 시드)만 다루므로,
// 쓰기가 잦은 사용자 생성 데이터는 이 파일로 분리한다. getDbClient()는 lib/db.ts에서 그대로
// 재사용해 커넥션은 하나로 유지한다. lib/naming/ 은 이 파일을 import하지 않는다(반대 방향만 허용).

import { getDbClient } from "./db";

export interface AuthUser {
  id: number;
  email: string;
  /** 소셜 로그인 닉네임(nullable). 이메일/비밀번호로만 가입한 계정은 undefined. */
  displayName?: string;
}

export interface ScoreResultRow {
  id: number;
  requestPayload: string;
  result: string;
  createdAt: string;
}

export interface NamingResultRow {
  id: number;
  requestPayload: string;
  result: string;
  createdAt: string;
  expiresAt: string;
}

export interface InquiryRow {
  id: number;
  content: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
}

export interface AdminInquiryRow extends InquiryRow {
  userId: number;
  userEmail: string;
  userDisplayName: string | null;
}

// user 테이블 -----------------------------------------------------------

export async function createUser(email: string, passwordHash: string): Promise<AuthUser> {
  const client = getDbClient();
  const result = await client.execute({
    sql: `INSERT INTO user (email, password_hash) VALUES (?, ?)`,
    args: [email, passwordHash],
  });
  return { id: Number(result.lastInsertRowid), email };
}

export async function getUserByEmail(email: string): Promise<(AuthUser & { passwordHash: string }) | null> {
  const client = getDbClient();
  const result = await client.execute({
    sql: `SELECT id, email, password_hash, display_name FROM user WHERE email = ?`,
    args: [email],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id as number,
    email: row.email as string,
    passwordHash: row.password_hash as string,
    displayName: (row.display_name as string | null) ?? undefined,
  };
}

export async function getUserById(id: number): Promise<(AuthUser & { passwordHash: string }) | null> {
  const client = getDbClient();
  const result = await client.execute({
    sql: `SELECT id, email, password_hash, display_name FROM user WHERE id = ?`,
    args: [id],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id as number,
    email: row.email as string,
    passwordHash: row.password_hash as string,
    displayName: (row.display_name as string | null) ?? undefined,
  };
}

// SNS 로그인(카카오/네이버) — next-auth(lib/oauth.ts)의 jwt 콜백이 OAuth 첫 로그인 시 호출한다.
// provider_account_id(각 제공자의 불변 고유 식별자)를 기준으로 매칭한다 — 이메일이 아니라 이 값을
// 기준으로 삼아야, 카카오처럼 이메일 동의가 별도 심사 대상이라 이메일이 없을 수 있는 경우에도
// 항상 동일 계정으로 재로그인된다. 이미 연결된 계정이 없고 이메일이 일치하는 기존 계정이 있으면
// (예: 이메일/비밀번호로 먼저 가입한 계정) 자동으로 연결한다 — 두 제공자 모두 이메일을 검증된
// 값으로만 내려주므로 안전한 가정이다.
export interface OAuthProfile {
  provider: "kakao" | "naver";
  providerAccountId: string;
  email: string | null;
  displayName: string | null;
  /** 네이버 response.mobile / 카카오 kakao_account.phone_number 원문. 미제공/미동의 시 null. */
  phone: string | null;
  /** 네이버가 제공하는 "회원이름"(실명). 카카오는 실명 제공 항목이 없어 항상 null. */
  realName: string | null;
}

// 닉네임/휴대전화/실명은 매 로그인마다 COALESCE로 동기화한다 — 제공자가 이번 요청에 값을 안
// 내려줬다고 기존에 확보한 값을 지우지 않기 위해서다(null이면 기존 값 유지, 값이 있으면 갱신).
async function syncOAuthProfileFields(
  client: ReturnType<typeof getDbClient>,
  userId: number,
  profile: Pick<OAuthProfile, "displayName" | "phone" | "realName">
): Promise<void> {
  await client.execute({
    sql: `UPDATE user SET
            display_name = COALESCE(?, display_name),
            phone = COALESCE(?, phone),
            real_name = COALESCE(?, real_name)
          WHERE id = ?`,
    args: [profile.displayName, profile.phone, profile.realName, userId],
  });
}

export async function findOrCreateOAuthUser(profile: OAuthProfile): Promise<AuthUser> {
  const client = getDbClient();

  const linked = await client.execute({
    sql: `SELECT u.id, u.email, u.display_name FROM oauth_account oa
          JOIN user u ON u.id = oa.user_id
          WHERE oa.provider = ? AND oa.provider_account_id = ?`,
    args: [profile.provider, profile.providerAccountId],
  });
  if (linked.rows.length > 0) {
    const row = linked.rows[0];
    const userId = row.id as number;
    let email = row.email as string;
    let displayName = (row.display_name as string | null) ?? undefined;

    // 이번 로그인에서 파싱된 이메일이 기존 저장값(예: 과거 파싱 버그로 만들어진 placeholder)과
    // 다르면 최신 값으로 갱신한다. 다른 계정이 이미 그 이메일을 쓰고 있어 UNIQUE 제약과
    // 충돌하는 극히 드문 경우엔 조용히 건너뛴다 — 그 정도로 로그인 자체를 막을 이유는 없다.
    if (profile.email && profile.email !== email) {
      try {
        await client.execute({ sql: `UPDATE user SET email = ? WHERE id = ?`, args: [profile.email, userId] });
        email = profile.email;
      } catch (err) {
        if (!String((err as Error).message ?? err).includes("UNIQUE")) throw err;
      }
    }

    await syncOAuthProfileFields(client, userId, profile);
    if (profile.displayName) displayName = profile.displayName;

    return { id: userId, email, displayName };
  }

  let userId: number;
  let userEmail: string;
  let userDisplayName: string | null;

  const existingByEmail = profile.email
    ? await client.execute({ sql: `SELECT id, email, display_name FROM user WHERE email = ?`, args: [profile.email] })
    : null;

  if (existingByEmail && existingByEmail.rows.length > 0) {
    const row = existingByEmail.rows[0];
    userId = row.id as number;
    userEmail = row.email as string;
    userDisplayName = row.display_name as string | null;
    await syncOAuthProfileFields(client, userId, profile);
    if (profile.displayName) userDisplayName = profile.displayName;
  } else {
    // password_hash NOT NULL 제약을 지키면서, "scrypt:"로 시작하지 않아 verifyPassword()가 항상
    // false를 반환하는 sentinel 값을 넣는다 — 이 계정은 이메일/비밀번호로는 로그인할 수 없다.
    const passwordHash = `oauth:v1:${profile.provider}`;
    const email = profile.email ?? `${profile.provider}_${profile.providerAccountId}@no-email.yourname.internal`;
    const created = await client.execute({
      sql: `INSERT INTO user (email, password_hash, display_name, phone, real_name) VALUES (?, ?, ?, ?, ?)`,
      args: [email, passwordHash, profile.displayName, profile.phone, profile.realName],
    });
    userId = Number(created.lastInsertRowid);
    userEmail = email;
    userDisplayName = profile.displayName;
  }

  await client.execute({
    sql: `INSERT INTO oauth_account (user_id, provider, provider_account_id) VALUES (?, ?, ?)`,
    args: [userId, profile.provider, profile.providerAccountId],
  });

  return { id: userId, email: userEmail, displayName: userDisplayName ?? undefined };
}

// session 테이블 ----------------------------------------------------------
// id 컬럼엔 원본 토큰이 아니라 그 SHA-256 해시(hex)만 저장한다(lib/auth.ts에서 해시해 넘김) —
// DB가 유출돼도 세션을 재사용할 수 없게 하기 위함.

export async function createSessionRow(hashedToken: string, userId: number): Promise<void> {
  const client = getDbClient();
  await client.execute({
    sql: `INSERT INTO session (id, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))`,
    args: [hashedToken, userId],
  });
}

// 소유권 대신 여기서는 "이 세션이 아직 유효한가"가 관심사라, 만료 조건을 쿼리 자체에 박아
// 만료된 세션은 존재해도 조회되지 않게 한다(애플리케이션 코드에서 별도로 비교하지 않음).
export async function getSessionWithUser(hashedToken: string): Promise<AuthUser | null> {
  const client = getDbClient();
  const result = await client.execute({
    sql: `SELECT u.id, u.email, u.display_name FROM session s
          JOIN user u ON u.id = s.user_id
          WHERE s.id = ? AND s.expires_at > CURRENT_TIMESTAMP`,
    args: [hashedToken],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id as number,
    email: row.email as string,
    displayName: (row.display_name as string | null) ?? undefined,
  };
}

export async function deleteSessionRow(hashedToken: string): Promise<void> {
  const client = getDbClient();
  await client.execute({
    sql: `DELETE FROM session WHERE id = ?`,
    args: [hashedToken],
  });
}

// 회원 탈퇴 — FK 제약이 없어(4.7) 연관 테이블을 직접 정리해야 한다. 하나의 트랜잭션(batch)으로
// 묶어 일부만 삭제되는 상태가 남지 않게 한다. user 행을 마지막에 지워야 다른 테이블 삭제 중
// user_id 참조가 무의미해지지 않는다(순서 자체가 정합성에 영향을 주진 않지만 가독성을 위해 유지).
export async function deleteUserAccount(userId: number): Promise<void> {
  const client = getDbClient();
  await client.batch(
    [
      { sql: `DELETE FROM session WHERE user_id = ?`, args: [userId] },
      { sql: `DELETE FROM oauth_account WHERE user_id = ?`, args: [userId] },
      { sql: `DELETE FROM score_result WHERE user_id = ?`, args: [userId] },
      { sql: `DELETE FROM naming_result WHERE user_id = ?`, args: [userId] },
      { sql: `DELETE FROM inquiry WHERE user_id = ?`, args: [userId] },
      { sql: `DELETE FROM user WHERE id = ?`, args: [userId] },
    ],
    "write"
  );
}

// 관리자 회원관리 화면 전용 (ADMIN_EMAILS, lib/auth.ts isAdminUser) ---------------------------
// 가입 시/소셜 로그인 시 실제로 입력·수집된 원본 값을 그대로 나열하기 위한 조회. 새 판정이나
// 집계를 만들지 않고 user/oauth_account 두 테이블을 그대로 옮겨 화면에서 매칭한다.

export interface AdminOAuthAccountRow {
  provider: "kakao" | "naver";
  providerAccountId: string;
  createdAt: string;
}

export interface AdminUserRow {
  id: number;
  email: string;
  /** password_hash 원문 그대로 — "scrypt:..."면 이메일/비밀번호 가입, "oauth:v1:<provider>"면 SNS 전용 가입. */
  passwordHash: string;
  displayName: string | null;
  /** 소셜 로그인 시 제공자가 내려준 휴대전화번호(nullable). */
  phone: string | null;
  /** 네이버 "회원이름"(실명, nullable). 카카오는 항상 null. */
  realName: string | null;
  createdAt: string;
  oauthAccounts: AdminOAuthAccountRow[];
}

export async function listAllUsersForAdmin(): Promise<AdminUserRow[]> {
  const client = getDbClient();
  const [usersResult, oauthResult] = await Promise.all([
    client.execute(
      `SELECT id, email, password_hash, display_name, phone, real_name, created_at FROM user ORDER BY created_at DESC`
    ),
    client.execute(
      `SELECT user_id, provider, provider_account_id, created_at FROM oauth_account ORDER BY created_at ASC`
    ),
  ]);

  const oauthByUserId = new Map<number, AdminOAuthAccountRow[]>();
  for (const row of oauthResult.rows) {
    const userId = row.user_id as number;
    const entry: AdminOAuthAccountRow = {
      provider: row.provider as "kakao" | "naver",
      providerAccountId: row.provider_account_id as string,
      createdAt: row.created_at as string,
    };
    const list = oauthByUserId.get(userId);
    if (list) list.push(entry);
    else oauthByUserId.set(userId, [entry]);
  }

  return usersResult.rows.map((row) => {
    const id = row.id as number;
    return {
      id,
      email: row.email as string,
      passwordHash: row.password_hash as string,
      displayName: row.display_name as string | null,
      phone: row.phone as string | null,
      realName: row.real_name as string | null,
      createdAt: row.created_at as string,
      oauthAccounts: oauthByUserId.get(id) ?? [],
    };
  });
}

// score_result 테이블 ------------------------------------------------------
// 무료 "이름 점수 확인" 결과. 영구 보관 — 삭제는 사용자 요청 시(deleteScoreResult)에만.

function rowToScoreResult(row: Record<string, unknown>): ScoreResultRow {
  return {
    id: row.id as number,
    requestPayload: row.request_payload as string,
    result: row.result as string,
    createdAt: row.created_at as string,
  };
}

export async function saveScoreResult(userId: number, requestPayload: unknown, result: unknown): Promise<number> {
  const client = getDbClient();
  const inserted = await client.execute({
    sql: `INSERT INTO score_result (user_id, request_payload, result) VALUES (?, ?, ?)`,
    args: [userId, JSON.stringify(requestPayload), JSON.stringify(result)],
  });
  return Number(inserted.lastInsertRowid);
}

export async function listScoreResultsByUser(userId: number): Promise<ScoreResultRow[]> {
  const client = getDbClient();
  const result = await client.execute({
    sql: `SELECT id, request_payload, result, created_at FROM score_result
          WHERE user_id = ? ORDER BY created_at DESC`,
    args: [userId],
  });
  return result.rows.map((row) => rowToScoreResult(row as unknown as Record<string, unknown>));
}

export async function getScoreResultById(id: number, userId: number): Promise<ScoreResultRow | null> {
  const client = getDbClient();
  const result = await client.execute({
    sql: `SELECT id, request_payload, result, created_at FROM score_result
          WHERE id = ? AND user_id = ?`,
    args: [id, userId],
  });
  if (result.rows.length === 0) return null;
  return rowToScoreResult(result.rows[0] as unknown as Record<string, unknown>);
}

// 삭제된 행이 있으면 true(정상 삭제), 0개면 false(존재하지 않거나 소유자가 아님) — 호출부가
// 404를 내리는 근거로 쓴다.
export async function deleteScoreResult(id: number, userId: number): Promise<boolean> {
  const client = getDbClient();
  const result = await client.execute({
    sql: `DELETE FROM score_result WHERE id = ? AND user_id = ?`,
    args: [id, userId],
  });
  return result.rowsAffected > 0;
}

// naming_result 테이블 ------------------------------------------------------
// 프리미엄 "작명" 결과. 생성 후 30일간만 재조회 가능 — 별도 삭제 기능은 없고, 만료 여부를
// 조회 SQL의 WHERE 조건으로만 판정한다(정리 크론 없음, CLAUDE.md 8.3).

function rowToNamingResult(row: Record<string, unknown>): NamingResultRow {
  return {
    id: row.id as number,
    requestPayload: row.request_payload as string,
    result: row.result as string,
    createdAt: row.created_at as string,
    expiresAt: row.expires_at as string,
  };
}

export async function saveNamingResult(userId: number, requestPayload: unknown, result: unknown): Promise<number> {
  const client = getDbClient();
  const inserted = await client.execute({
    sql: `INSERT INTO naming_result (user_id, request_payload, result, expires_at)
          VALUES (?, ?, ?, datetime('now', '+30 days'))`,
    args: [userId, JSON.stringify(requestPayload), JSON.stringify(result)],
  });
  return Number(inserted.lastInsertRowid);
}

export async function listNamingResultsByUser(userId: number): Promise<NamingResultRow[]> {
  const client = getDbClient();
  const result = await client.execute({
    sql: `SELECT id, request_payload, result, created_at, expires_at FROM naming_result
          WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP
          ORDER BY created_at DESC`,
    args: [userId],
  });
  return result.rows.map((row) => rowToNamingResult(row as unknown as Record<string, unknown>));
}

export async function getNamingResultById(id: number, userId: number): Promise<NamingResultRow | null> {
  const client = getDbClient();
  const result = await client.execute({
    sql: `SELECT id, request_payload, result, created_at, expires_at FROM naming_result
          WHERE id = ? AND user_id = ? AND expires_at > CURRENT_TIMESTAMP`,
    args: [id, userId],
  });
  if (result.rows.length === 0) return null;
  return rowToNamingResult(result.rows[0] as unknown as Record<string, unknown>);
}

// 삭제된 행이 있으면 true(정상 삭제), 0개면 false(존재하지 않거나 소유자가 아님) — 호출부가
// 404를 내리는 근거로 쓴다. score_result와 동일하게 사용자가 직접 지울 수 있게 한다(만료 전에도).
export async function deleteNamingResult(id: number, userId: number): Promise<boolean> {
  const client = getDbClient();
  const result = await client.execute({
    sql: `DELETE FROM naming_result WHERE id = ? AND user_id = ?`,
    args: [id, userId],
  });
  return result.rowsAffected > 0;
}

// inquiry 테이블 ------------------------------------------------------------
// 회원 문의하기(CLAUDE.md 0.5). 다른 회원에게 공개되지 않는다 — 소유권은 기존 테이블들과
// 동일하게 매 조회의 WHERE user_id = ?로 강제한다. answer/answeredAt이 둘 다 null이면
// "답변대기", 채워지면 "답변완료"다(별도 status 컬럼 없이 이 두 값으로 판별).

function rowToInquiry(row: Record<string, unknown>): InquiryRow {
  return {
    id: row.id as number,
    content: row.content as string,
    answer: (row.answer as string | null) ?? null,
    answeredAt: (row.answered_at as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function createInquiry(userId: number, content: string): Promise<InquiryRow> {
  const client = getDbClient();
  const inserted = await client.execute({
    sql: `INSERT INTO inquiry (user_id, content) VALUES (?, ?)`,
    args: [userId, content],
  });
  return {
    id: Number(inserted.lastInsertRowid),
    content,
    answer: null,
    answeredAt: null,
    createdAt: new Date().toISOString(),
  };
}

export async function listInquiriesByUser(userId: number): Promise<InquiryRow[]> {
  const client = getDbClient();
  const result = await client.execute({
    sql: `SELECT id, content, answer, answered_at, created_at FROM inquiry
          WHERE user_id = ? ORDER BY created_at DESC`,
    args: [userId],
  });
  return result.rows.map((row) => rowToInquiry(row as unknown as Record<string, unknown>));
}

// 관리자 회원문의관리 화면 전용 — 어떤 회원이 문의했는지 식별할 수 있도록 user 테이블과 조인한다.
export async function listAllInquiriesForAdmin(): Promise<AdminInquiryRow[]> {
  const client = getDbClient();
  const result = await client.execute(
    `SELECT i.id, i.user_id, u.email, u.display_name, i.content, i.answer, i.answered_at, i.created_at
     FROM inquiry i
     JOIN user u ON u.id = i.user_id
     ORDER BY (i.answer IS NULL) DESC, i.created_at DESC`
  );
  return result.rows.map((row) => {
    const r = row as unknown as Record<string, unknown>;
    return {
      ...rowToInquiry(r),
      userId: r.user_id as number,
      userEmail: r.email as string,
      userDisplayName: (r.display_name as string | null) ?? null,
    };
  });
}

// 답변 저장(관리자 전용, 게이트는 호출부에서 isAdminUser로 확인). rowsAffected가 0이면 해당 id의
// 문의가 존재하지 않는 것 — 호출부가 404 근거로 쓴다.
export async function answerInquiry(id: number, answer: string): Promise<boolean> {
  const client = getDbClient();
  const result = await client.execute({
    sql: `UPDATE inquiry SET answer = ?, answered_at = CURRENT_TIMESTAMP WHERE id = ?`,
    args: [answer, id],
  });
  return result.rowsAffected > 0;
}

// 하드 삭제(관리자 전용). user_id 조건이 없다 — 관리자는 어떤 회원의 문의든 삭제할 수 있어야 한다.
export async function deleteInquiryAdmin(id: number): Promise<boolean> {
  const client = getDbClient();
  const result = await client.execute({
    sql: `DELETE FROM inquiry WHERE id = ?`,
    args: [id],
  });
  return result.rowsAffected > 0;
}
