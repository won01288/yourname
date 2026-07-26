// CLAUDE.md 8.2 — Phase 5: LLM 설명 계층. saju → db → naming 파이프라인 바깥, 후보가 확정된 뒤에만 호출한다 (2.3, 8.2).
// lib/naming/의 반대 방향으로만 import한다: 여기서 naming의 타입을 가져다 쓰되, naming은 이 파일을 절대 import하지 않는다.
// 여기서는 이미 코드가 계산·검증한 사실(용신, 오행 분포, 후보 획수·발음오행)만 Claude에 전달해 해설·순위 제안을 받는다.
// 사주를 세우거나 오행/수리/용신을 판정하지 않는다 — 새 수치나 판정을 만들어내지 않도록 프롬프트로 명시한다 (2.3 역할 경계).

import Anthropic from "@anthropic-ai/sdk";
import type { Candidate, ElementDistribution, Manseryeok, Saju, Surname, YongsinResult } from "@/lib/naming/types";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export interface NamingReport {
  summary: string;
  sajuStory: {
    title: string;
    body: string;
  };
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
  manseryeok: Manseryeok;
  surname: Surname;
  candidates: Candidate[];
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "사주와 용신에 대한 2~3문장 요약 설명" },
    sajuStory: {
      type: "object",
      description:
        "아기의 사주를 감성적·은유적으로 풀어내는 해설. 점술적 단정(운명 예언)이 아니라, 이미 주어진 사실을 " +
        "비유로 표현하는 정서적 글쓰기다.",
      properties: {
        title: {
          type: "string",
          description: "이 사주의 인상을 압축한 은유적 소제목 한 줄 (예: '화려한 네온사인 뒤에 숨겨진 차가운 겨울바다')",
        },
        body: {
          type: "string",
          description:
            "3~5개 문단(빈 줄로 구분)의 감성적 해설. 일간 오행·신강신약·용신·십신·오행 분포를 비유로 풀어 쓰고, " +
            "마지막 문단은 부모에게 건네는 따뜻한 조언으로 맺는다.",
        },
      },
      required: ["title", "body"],
      additionalProperties: false,
    },
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
  required: ["summary", "sajuStory", "candidates"],
  additionalProperties: false,
} as const;

function buildUserPrompt(input: ExplainCandidatesInput): string {
  const { saju, elementDistribution, yongsin, manseryeok, surname, candidates } = input;

  const pillarLine = (label: string, pillar: Manseryeok["year"]) =>
    `${label} ${pillar.stem.hanja}(${pillar.stem.tenGod})${pillar.branch.hanja}(${pillar.branch.tenGod})` +
    `${pillar.branch.isVoid ? " [공망]" : ""}`;

  const manseryeokLines = [
    pillarLine("연주", manseryeok.year),
    pillarLine("월주", manseryeok.month),
    pillarLine("일주", manseryeok.day),
    pillarLine("시주", manseryeok.hour),
  ].join(" / ");

  const candidateLines = candidates
    .map((c, i) => {
      const hanjaDetail = c.hanja
        .map((h) => `${h.char}(${h.meaning ?? "뜻풀이 없음"}, 원획 ${h.strokeOriginal}, 자원오행 ${h.element ?? "미배속"})`)
        .join(" ");
      return `${i + 1}. ${surname.hanja}${c.hangul} — ${hanjaDetail} / 수리(원형이정) ${c.numerologyNumbers.join("-")} / 발음오행 흐름 ${c.phoneticElements.join("→")} / 실사용 빈도 ${c.frequency}(클수록 실제로 많이 쓰이는 이름)`;
    })
    .join("\n");

  return `다음은 이미 코드로 계산·검증이 끝난 사실이다. 이 사실만 근거로 삼아 해설을 작성하라. 새로운 획수·오행·용신을 스스로 판단하지 마라.

[사주]
연주 ${saju.year.stem}${saju.year.branch} / 월주 ${saju.month.stem}${saju.month.branch} / 일주 ${saju.day.stem}${saju.day.branch} / 시주 ${saju.hour.stem}${saju.hour.branch}

[만세력 상세 — 십신(十神)·공망(空亡)]
${manseryeokLines}
(괄호는 일간 ${saju.day.stem} 기준 십신. [공망]이 붙은 지지는 이 사주의 공망에 해당한다.)

[오행 분포 (총합 8)]
木 ${elementDistribution.木.toFixed(2)} 火 ${elementDistribution.火.toFixed(2)} 土 ${elementDistribution.土.toFixed(2)} 金 ${elementDistribution.金.toFixed(2)} 水 ${elementDistribution.水.toFixed(2)}

[신강/신약 및 용신]
${yongsin.strength} — 용신: ${yongsin.yongsin.join("·")}
판정 근거: ${yongsin.reason}

[성씨]
${surname.hangul}(${surname.hanja}), 원획 ${surname.strokeOriginal}, 초성 발음오행 ${surname.initialElement}

[이름 후보 ${candidates.length}개]
${candidateLines}

sajuStory 작성 지침: 위 [사주]·[만세력 상세]·[오행 분포]·[신강/신약 및 용신]에 있는 사실만 재료로 삼아, 일간의
오행과 성질, 두드러진 오행의 쏠림, 신강/신약과 용신이 뜻하는 균형의 방향, 눈에 띄는 십신 1~2개를 은유로 엮어
써라. "이렇게 될 것이다" 같은 단정적 예언이나 새로운 판단(제공되지 않은 성격 특성, 길흉 단정)을 만들어내지
마라. 신생아의 사주이므로 직설적이거나 무겁지 않게, 따뜻하고 희망적인 정서로 쓰고 마지막 문단은 부모에게
건네는 부드러운 조언으로 맺어라.

각 후보에 대해 왜 이 이름이 좋은지 부모가 읽기 쉬운 자연어로 설명하라(용신 보완, 발음오행 상생, 수리 길흉, 자원오행 일치, 실사용 빈도 등 위에 주어진 근거만 언급). 후보들을 이 설명을 바탕으로 다시 순위 매겨 rank(1이 최고)를 부여하라.`;
}

// 확정된 후보와 근거만 받아 해설·순위 제안을 생성한다. 사주·오행·용신·수리는 이미 lib/naming/이 계산했고
// 여기서는 서술만 한다 (CLAUDE.md 2.3). 파이프라인(saju → db → naming) 바깥, 후보 확정 뒤에만 호출한다 (8.2).
export async function explainCandidates(input: ExplainCandidatesInput): Promise<NamingReport> {
  const anthropic = getClient();

  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    system:
      "너는 한국 전통 작명 서비스의 해설 작성자다. 사주 계산, 오행 판정, 용신 도출, 십신·공망 산출, 획수 계산은 " +
      "이미 코드가 끝냈다. 너는 그 결과만 받아 부모가 이해하기 쉬운 자연어로 설명하고, 후보 간 순위를 제안하고, " +
      "신생아의 사주를 은유적이고 감성적인 톤으로 풀어 쓴 sajuStory를 작성한다. " +
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
