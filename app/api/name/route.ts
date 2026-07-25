// CLAUDE.md 8.2 — saju → db → naming 순서로 호출하는 파이프라인 조립 지점. 계산 로직 없음.
// TODO(Phase 2~4): 요청 바디(생년월일시·성별·성씨) 파싱 → getSaju → aggregateElements →
// deriveYongsin → DB 조회(한자/성씨/81수리) → 필터 → 후보 정렬 순서로 조립한다.
// LLM 호출(해설·큐레이션)은 후보가 확정된 뒤, 이 파이프라인 바깥에서만 붙인다 (CLAUDE.md 2.3, 5장 Phase 5).

import { NextResponse } from "next/server";

export async function POST(request: Request) {
  return NextResponse.json({ error: "not implemented" }, { status: 501 });
}
