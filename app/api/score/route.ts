// CLAUDE.md 8.2 — Phase 7: 이름 점수 확인 서비스(무료) 파이프라인 조립. 계산 로직 없음.
// app/api/name/route.ts와 달리 explainCandidates(LLM)를 절대 호출하지 않는다 — 이 서비스는
// 운영자 비용이 0이어야 한다는 제약이 핵심이다(CLAUDE.md 0장·3.10).

import { NextResponse } from "next/server";
import { getSaju, type BirthInput } from "@/lib/saju";
import { getSurnameByHangul, getHanjaByChar, getAllNumerology81 } from "@/lib/db";
import { aggregateElements } from "@/lib/naming/elements";
import { deriveYongsin } from "@/lib/naming/yongsin";
import { buildManseryeok } from "@/lib/naming/manseryeok";
import { scoreName } from "@/lib/naming/score";

interface GivenNameSyllable {
  hangul: string;
  hanja: string;
}

interface ScoreRequestBody extends BirthInput {
  surnameHangul: string;
  surnameHanja?: string;
  /** 이름 두 글자. 각 글자의 한글 음(발음오행 판정용)과 실제 한자(수리·자원오행·인명용 판정용)를
   * 함께 받는다 — "한자 찾기"에서 검색했던 음절을 그대로 쓴다(hanja.readings[0]과 다를 수 있음). */
  givenName: [GivenNameSyllable, GivenNameSyllable];
}

function isValidBody(body: Partial<ScoreRequestBody>): body is ScoreRequestBody {
  return (
    typeof body.year === "number" &&
    typeof body.month === "number" &&
    typeof body.day === "number" &&
    typeof body.hour === "number" &&
    typeof body.minute === "number" &&
    typeof body.isLunar === "boolean" &&
    typeof body.surnameHangul === "string" &&
    body.surnameHangul.length > 0 &&
    Array.isArray(body.givenName) &&
    body.givenName.length === 2 &&
    body.givenName.every((g) => typeof g?.hangul === "string" && g.hangul.length === 1 && typeof g?.hanja === "string" && g.hanja.length === 1)
  );
}

export async function POST(request: Request) {
  let body: Partial<ScoreRequestBody>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바른 JSON이 아닙니다." }, { status: 400 });
  }

  if (!isValidBody(body)) {
    return NextResponse.json(
      {
        error:
          "필수 필드가 누락되었습니다. year/month/day/hour/minute/isLunar/surnameHangul/givenName(2글자, 각각 hangul+hanja)을 확인하세요.",
      },
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

  const [hanja1, hanja2] = await Promise.all([
    getHanjaByChar(body.givenName[0].hanja),
    getHanjaByChar(body.givenName[1].hanja),
  ]);
  if (!hanja1 || !hanja2) {
    return NextResponse.json(
      { error: `등록되지 않은 한자입니다: ${!hanja1 ? body.givenName[0].hanja : body.givenName[1].hanja}` },
      { status: 400 }
    );
  }

  const saju = await getSaju(body);
  const elementDistribution = aggregateElements(saju);
  const yongsinResult = deriveYongsin(saju, elementDistribution);
  const manseryeok = buildManseryeok(saju);
  const numerologyTable = await getAllNumerology81();

  let score;
  try {
    score = scoreName({
      surnameElement: surname.initialElement,
      surnameStroke: surname.strokeOriginal,
      givenSyllables: [body.givenName[0].hangul, body.givenName[1].hangul],
      givenHanja: [hanja1, hanja2],
      yongsin: yongsinResult.yongsin,
      numerologyTable,
    });
  } catch {
    return NextResponse.json(
      { error: "이름의 한글 음이 올바른 한글 음절이 아닙니다." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    saju,
    elementDistribution,
    yongsin: yongsinResult,
    manseryeok,
    surname,
    givenName: [hanja1, hanja2],
    score,
  });
}
