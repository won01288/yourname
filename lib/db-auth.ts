// 인증(user/session) + 저장된 결과(score_result/naming_result) 전용 DB 접근.
// lib/db.ts는 읽기 전용 참조 데이터(hanja/surname/numerology/given_name, 1회 시드)만 다루므로,
// 쓰기가 잦은 사용자 생성 데이터는 이 파일로 분리한다. getDbClient()는 lib/db.ts에서 그대로
// 재사용해 커넥션은 하나로 유지한다. lib/naming/ 은 이 파일을 import하지 않는다(반대 방향만 허용).

import { getDbClient } from "./db";

export interface AuthUser {
  id: number;
  email: string;
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
    sql: `SELECT id, email, password_hash FROM user WHERE email = ?`,
    args: [email],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return { id: row.id as number, email: row.email as string, passwordHash: row.password_hash as string };
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
    sql: `SELECT u.id, u.email FROM session s
          JOIN user u ON u.id = s.user_id
          WHERE s.id = ? AND s.expires_at > CURRENT_TIMESTAMP`,
    args: [hashedToken],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return { id: row.id as number, email: row.email as string };
}

export async function deleteSessionRow(hashedToken: string): Promise<void> {
  const client = getDbClient();
  await client.execute({
    sql: `DELETE FROM session WHERE id = ?`,
    args: [hashedToken],
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
