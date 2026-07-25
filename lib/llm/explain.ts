// CLAUDE.md 8.2 — Phase 5: LLM 설명 계층. saju → db → naming 파이프라인 바깥, 후보가 확정된 뒤에만 호출한다 (2.3, 8.2).
// lib/naming/의 반대 방향으로만 import한다: 여기서 naming의 타입을 가져다 쓰되, naming은 이 파일을 절대 import하지 않는다.
// 여기서는 이미 코드가 계산·검증한 사실(용신, 오행 분포, 후보 획수·발음오행)만 Claude에 전달해 해설·순위 제안을 받는다.
// 사주를 세우거나 오행/수리/용신을 판정하지 않는다 — 새 수치나 판정을 만들어내지 않도록 프롬프트로 명시한다 (2.3 역할 경계).

import Anthropic from "@anthropic-ai/sdk";
import type { Candidate, ElementDistribution, Saju, Surname, YongsinResult } from "@/lib/naming/types";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export interface NamingReport {
  summary: string;
  candidates: Array<{
    hangul: string;
    rank: number;
    explanation: string;
  }>;
}

export interface ExplainCandidatesInput {
  saju: Saju;
  elementDistribution: ElementDistribution;
  yongsin: YongsinResult;
  surname: Surname;
  candidates: Candidate[];
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "사주와 용신에 대한 2~3문장 요약 설명" },
    candidates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          hangul: { type: "string" },
          rank: { type: "integer" },
          explanation: {
            type: "string",
            description: "이 후보를 추천하는 이유 (용신·발음오행·수리·자원오행 근거 기반, 3~5문장)",
          },
        },
        required: ["hangul", "rank", "explanation"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "candidates"],
  additionalProperties: false,
} as const;

function buildUserPrompt(input: ExplainCandidatesInput): string {
  const { saju, elementDistribution, yongsin, surname, candidates } = input;

  const candidateLines = candidates
    .map((c, i) => {
      const hanjaDetail = c.hanja
        .map((h) => `${h.char}(${h.meaning ?? "뜻풀이 없음"}, 원획 ${h.strokeOriginal}, 자원오행 ${h.element ?? "미배속"})`)
        .join(" ");
      return `${i + 1}. ${surname.hanja}${c.hangul} — ${hanjaDetail} / 수리(원형이정) ${c.numerologyNumbers.join("-")} / 발음오행 흐름 ${c.phoneticElements.join("→")}`;
    })
    .join("\n");

  return `다음은 이미 코드로 계산·검증이 끝난 사실이다. 이 사실만 근거로 삼아 해설을 작성하라. 새로운 획수·오행·용신을 스스로 판단하지 마라.

[사주]
연주 ${saju.year.stem}${saju.year.branch} / 월주 ${saju.month.stem}${saju.month.branch} / 일주 ${saju.day.stem}${saju.day.branch} / 시주 ${saju.hour.stem}${saju.hour.branch}

[오행 분포 (총합 8)]
木 ${elementDistribution.木.toFixed(2)} 火 ${elementDistribution.火.toFixed(2)} 土 ${elementDistribution.土.toFixed(2)} 金 ${elementDistribution.金.toFixed(2)} 水 ${elementDistribution.水.toFixed(2)}

[신강/신약 및 용신]
${yongsin.strength} — 용신: ${yongsin.yongsin.join("·")}
판정 근거: ${yongsin.reason}

[성씨]
${surname.hangul}(${surname.hanja}), 원획 ${surname.strokeOriginal}, 초성 발음오행 ${surname.initialElement}

[이름 후보 ${candidates.length}개]
${candidateLines}

각 후보에 대해 왜 이 이름이 좋은지 부모가 읽기 쉬운 자연어로 설명하라(용신 보완, 발음오행 상생, 수리 길흉, 자원오행 일치 등 위에 주어진 근거만 언급). 후보들을 이 설명을 바탕으로 다시 순위 매겨 rank(1이 최고)를 부여하라.`;
}

// 확정된 후보와 근거만 받아 해설·순위 제안을 생성한다. 사주·오행·용신·수리는 이미 lib/naming/이 계산했고
// 여기서는 서술만 한다 (CLAUDE.md 2.3). 파이프라인(saju → db → naming) 바깥, 후보 확정 뒤에만 호출한다 (8.2).
export async function explainCandidates(input: ExplainCandidatesInput): Promise<NamingReport> {
  const anthropic = getClient();

  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    system:
      "너는 한국 전통 작명 서비스의 해설 작성자다. 사주 계산, 오행 판정, 용신 도출, 획수 계산은 이미 코드가 끝냈다. " +
      "너는 그 결과만 받아 부모가 이해하기 쉬운 자연어로 설명하고, 후보 간 순위를 제안한다. " +
      "제공되지 않은 수치나 판정을 새로 만들어내지 마라.",
    messages: [{ role: "user", content: buildUserPrompt(input) }],
    output_config: {
      format: {
        type: "json_schema",
        schema: RESPONSE_SCHEMA,
      },
    },
  });

  const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === "text");
  if (!textBlock) {
    throw new Error("Claude 응답에 텍스트 블록이 없습니다.");
  }

  return JSON.parse(textBlock.text) as NamingReport;
}
