// CLAUDE.md 8.2 — Turso(libSQL) 접속 + 조회 함수 (한자·성씨·수리).
// lib/naming/ 은 이 파일을 import하지 않는다 (반대 방향: 여기서 naming의 타입을 가져다 쓴다).

import { createClient, type Client } from "@libsql/client";
import type { Element, Hanja, Numerology81, Surname } from "./naming/types";

let client: Client | null = null;

// 환경변수(TURSO_DATABASE_URL, TURSO_AUTH_TOKEN)로 연결한다. .env.local.example 참고.
export function getDbClient(): Client {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error("TURSO_DATABASE_URL 환경변수가 설정되지 않았습니다.");
  }

  client = createClient({ url, authToken });
  return client;
}

// hanja 테이블(CLAUDE.md 4.1) 조회. 인명용/불용문자 플래그 포함.
export async function getHanjaByChar(char: string): Promise<Hanja | null> {
  const client = getDbClient();
  const result = await client.execute({
    sql: `SELECT char, readings, stroke_original, stroke_actual, radical, element,
                 meaning, is_name_allowed, is_forbidden, forbidden_reason, verification_status
          FROM hanja WHERE char = ?`,
    args: [char],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    char: row.char as string,
    readings: JSON.parse(row.readings as string) as string[],
    strokeOriginal: row.stroke_original as number,
    strokeActual: row.stroke_actual as number,
    radical: row.radical as string | null,
    element: row.element as Element | null,
    meaning: row.meaning as string | null,
    isNameAllowed: Boolean(row.is_name_allowed),
    isForbidden: Boolean(row.is_forbidden),
    forbiddenReason: row.forbidden_reason as string | null,
    verificationStatus: row.verification_status as "confirmed" | "unverified",
  };
}

// surname 테이블(CLAUDE.md 4.2) 조회. 같은 한글 성에 한자가 여럿일 수 있어 배열로 반환한다.
export async function getSurnameByHangul(hangul: string): Promise<Surname[]> {
  const client = getDbClient();
  const result = await client.execute({
    sql: `SELECT hangul, hanja, stroke_original, initial_element FROM surname WHERE hangul = ?`,
    args: [hangul],
  });
  return result.rows.map((row) => ({
    hangul: row.hangul as string,
    hanja: row.hanja as string,
    strokeOriginal: row.stroke_original as number,
    initialElement: row.initial_element as Element,
  }));
}

// numerology_81 테이블(CLAUDE.md 4.3) 조회.
export async function getNumerology81(number: number): Promise<Numerology81 | null> {
  const client = getDbClient();
  const result = await client.execute({
    sql: `SELECT number, fortune, title, description FROM numerology_81 WHERE number = ?`,
    args: [number],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    number: row.number as number,
    fortune: row.fortune as string,
    title: row.title as string | null,
    description: row.description as string | null,
  };
}
