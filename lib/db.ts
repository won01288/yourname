// CLAUDE.md 8.2 — Turso(libSQL) 접속 + 조회 함수 (한자·성씨·수리).
// lib/naming/ 은 이 파일을 import하지 않는다 (반대 방향: 여기서 naming의 타입을 가져다 쓴다).

import { createClient, type Client } from "@libsql/client";
import type { Element, Gender, GivenNameEntry, Hanja, Numerology81, Surname } from "./naming/types";

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

const HANJA_COLUMNS = `char, readings, stroke_original, stroke_actual, radical, element,
                 meaning, is_name_allowed, is_forbidden, forbidden_reason, verification_status, is_common, hun`;

// hanja 테이블 SELECT 결과 한 행을 Hanja 타입으로 매핑한다. getHanjaByChar/getEligibleHanjaPool 공용.
function rowToHanja(row: Record<string, unknown>): Hanja {
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
    isCommon: Boolean(row.is_common),
    hun: (row.hun as string | null) ?? null,
  };
}

// hanja 테이블(CLAUDE.md 4.1) 조회. 인명용/불용문자 플래그 포함.
export async function getHanjaByChar(char: string): Promise<Hanja | null> {
  const client = getDbClient();
  const result = await client.execute({
    sql: `SELECT ${HANJA_COLUMNS} FROM hanja WHERE char = ?`,
    args: [char],
  });
  if (result.rows.length === 0) return null;
  return rowToHanja(result.rows[0] as unknown as Record<string, unknown>);
}

// CLAUDE.md 3.10 — 한글 음으로 한자를 검색한다("한자 찾기" UI, Phase 7). readings는 JSON 배열
// 컬럼이라 json_each로 펼쳐 대조한다. is_name_allowed/is_forbidden로 걸러내지 않는다 — 실제
// 이름은 등록 목록 밖 한자를 쓸 수도 있으므로, 검색 결과는 전부 보여주고 정렬만 유효한 것을
// 위로 올린다(프론트에서 인명용 아님/불용 배지로 구분 표시). 9,063행 규모라 인덱스 없이도 충분하다.
// hun(한글 훈)이 없는 한자는 결과에서 제외한다 — 훈 없이는 사용자가 뜻을 알 수 없어 이름
// 후보로 고르기 어렵기 때문(2026.7.27, 훈 없는 한자만 배제하는 조건이라 인명용 여부와는 무관).
export async function getHanjaByReading(reading: string): Promise<Hanja[]> {
  const client = getDbClient();
  const result = await client.execute({
    sql: `SELECT h.char, h.readings, h.stroke_original, h.stroke_actual, h.radical, h.element,
                 h.meaning, h.is_name_allowed, h.is_forbidden, h.forbidden_reason, h.verification_status,
                 h.is_common, h.hun
          FROM hanja h, json_each(h.readings) je
          WHERE je.value = ? AND h.hun IS NOT NULL
          ORDER BY h.is_name_allowed DESC, h.is_forbidden ASC, h.is_common DESC, h.stroke_original ASC`,
    args: [reading],
  });
  return result.rows.map((row) => rowToHanja(row as unknown as Record<string, unknown>));
}

// 작명 후보 생성용 한자 풀(CLAUDE.md Phase 4). 인명용 한자이면서 불용문자가 아닌 전체를 반환한다.
// 자원오행(element) 매치 여부는 필터가 아니라 candidates.ts에서 가산점으로만 쓴다 (3.5).
export async function getEligibleHanjaPool(): Promise<Hanja[]> {
  const client = getDbClient();
  const result = await client.execute({
    sql: `SELECT ${HANJA_COLUMNS} FROM hanja WHERE is_name_allowed = 1 AND is_forbidden = 0`,
    args: [],
  });
  return result.rows.map((row) => rowToHanja(row as unknown as Record<string, unknown>));
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

// given_name 테이블(CLAUDE.md 3.6 확장) 조회 — 성별에 맞는 실사용 이름(한글) 후보 풀 전체.
// 작명 엔진은 이 목록에 있는 이름만 후보로 삼는다(자유 조합 금지).
export async function getGivenNamesByGender(gender: Gender): Promise<GivenNameEntry[]> {
  const client = getDbClient();
  const result = await client.execute({
    sql: `SELECT hangul, frequency, is_featured FROM given_name WHERE gender = ?`,
    args: [gender],
  });
  return result.rows.map((row) => ({
    hangul: row.hangul as string,
    frequency: row.frequency as number,
    isFeatured: Boolean(row.is_featured),
  }));
}

// numerology_81 테이블(CLAUDE.md 4.3) 1~81 전체 조회. candidates.ts buildCandidates가
// 4격마다 매번 DB를 조회하지 않도록, 한 번 조회해 number → 행 Map으로 전달한다.
export async function getAllNumerology81(): Promise<Map<number, Numerology81>> {
  const client = getDbClient();
  const result = await client.execute({
    sql: `SELECT number, fortune, title, description FROM numerology_81`,
    args: [],
  });
  const map = new Map<number, Numerology81>();
  for (const row of result.rows) {
    map.set(row.number as number, {
      number: row.number as number,
      fortune: row.fortune as string,
      title: row.title as string | null,
      description: row.description as string | null,
    });
  }
  return map;
}
