// CLAUDE.md 8.2 — Turso(libSQL) 접속 + 조회 함수 (한자·성씨·수리).
// lib/naming/ 은 이 파일을 import하지 않는다 (반대 방향: 여기서 naming의 타입을 가져다 쓴다).

import { createClient, type Client } from "@libsql/client";
import type { Hanja } from "./naming/types";

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

// TODO(Phase 3): hanja 테이블(CLAUDE.md 4.1) 조회. 인명용/불용문자 플래그 포함.
export async function getHanjaByChar(char: string): Promise<Hanja | null> {
  throw new Error("not implemented");
}

// TODO(Phase 3): surname 테이블(CLAUDE.md 4.2) 조회.
export async function getSurnameByHangul(hangul: string): Promise<unknown> {
  throw new Error("not implemented");
}

// TODO(Phase 3): numerology_81 테이블(CLAUDE.md 4.3) 조회.
export async function getNumerology81(number: number): Promise<unknown> {
  throw new Error("not implemented");
}
