// CLAUDE.md 8.2 — saju → db → naming 순서로 호출하는 파이프라인 조립 지점. 계산 로직 없음.
// LLM 호출(해설·큐레이션)은 후보가 확정된 뒤, 이 파이프라인 바깥에서만 붙인다 (CLAUDE.md 2.3, 5장 Phase 5).

import { NextResponse } from "next/server";
import { getSaju, type BirthInput } from "@/lib/saju";
import { getSurnameByHangul, getEligibleHanjaPool, getAllNumerology81 } from "@/lib/db";
import { aggregateElements } from "@/lib/naming/elements";
import { deriveYongsin } from "@/lib/naming/yongsin";
import { buildCandidates } from "@/lib/naming/candidates";
import { explainCandidates } from "@/lib/llm/explain";

interface NameRequestBody extends BirthInput {
  surnameHangul: string;
  /** 같은 한글 성에 한자가 여럿일 때 특정 (예: "정" → 鄭/丁). 생략 시 여럿이면 400. */
  surnameHanja?: string;
}

function isValidBirthInput(body: Partial<NameRequestBody>): body is NameRequestBody {
  return (
    typeof body.year === "number" &&
    typeof body.month === "number" &&
    typeof body.day === "number" &&
    typeof body.hour === "number" &&
    typeof body.minute === "number" &&
    typeof body.isLunar === "boolean" &&
    typeof body.surnameHangul === "string" &&
    body.surnameHangul.length > 0
  );
}

export async function POST(request: Request) {
  let body: Partial<NameRequestBody>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바른 JSON이 아닙니다." }, { status: 400 });
  }

  if (!isValidBirthInput(body)) {
    return NextResponse.json(
      { error: "필수 필드가 누락되었습니다. year/month/day/hour/minute/isLunar/surnameHangul을 확인하세요." },
      { status: 400 }
    );
  }

  const surnameOptions = await getSurnameByHangul(body.surnameHangul);
  if (surnameOptions.length === 0) {
    return NextResponse.json({ error: `등록되지 않은 성씨입니다: ${body.surnameHangul}` }, { status: 400 });
  }

  const surname = body.surnameHanja
    ? surnameOptions.find((s) => s.hanja === body.surnameHanja)
    : surnameOptions.length === 1
      ? surnameOptions[0]
      : undefined;

  if (!surname) {
    return NextResponse.json(
      {
        error: `성씨 "${body.surnameHangul}"에 해당하는 한자가 여럿입니다. surnameHanja로 특정해 주세요.`,
        options: surnameOptions.map((s) => s.hanja),
      },
      { status: 400 }
    );
  }

  const saju = await getSaju(body);
  const elementDistribution = aggregateElements(saju);
  const yongsinResult = deriveYongsin(saju, elementDistribution);

  const [hanjaPool, numerologyTable] = await Promise.all([getEligibleHanjaPool(), getAllNumerology81()]);

  const candidates = buildCandidates({
    surnameStroke: surname.strokeOriginal,
    surnameElement: surname.initialElement,
    yongsin: yongsinResult.yongsin,
    hanjaPool,
    numerologyTable,
  });

  const report =
    candidates.length > 0
      ? await explainCandidates({
          saju,
          elementDistribution,
          yongsin: yongsinResult,
          surname,
          candidates,
        })
      : null;

  return NextResponse.json({
    saju,
    elementDistribution,
    yongsin: yongsinResult,
    surname,
    candidates,
    report,
  });
}
