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

export interface HanjaGloss {
  char: string;
  /** 옥편식 훈(한 단어), 예: "법". DB의 영어 뜻풀이(Unihan)를 근거로 번역한 것 — 새 뜻을 만들지 않는다. */
  hun: string;
  /** 한글 뜻풀이 한 문장, 예: "규칙과 법도를 뜻하는 글자". */
  meaningKo: string;
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
    hanjaGlosses: HanjaGloss[];
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
    summary: {
      type: "string",
      description:
        "사주와 용신에 대한 2~3문장 요약 설명. 전문 용어(신강/신약·용신 등)는 그대로 쓰되 짧은 풀이를 곁들인다.",
    },
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
            description:
              "이 후보를 추천하는 이유. 오행 분포·신강신약/용신 → 발음오행 상생 → 인명용/불용문자 필터 통과 → " +
              "수리사격(81수리) 길흉 → 자원오행 순서로, 이 이름이 왜 선택됐는지 그 과정을 부모가 이해하기 쉽고 " +
              "따뜻하게 풀어 쓴 5~7문장. 전문 용어는 그대로 쓰되 매번 쉬운 풀이나 비유를 곁들인다. " +
              "위에 주어진 근거만 언급한다.",
          },
          hanjaGlosses: {
            type: "array",
            description: "이 후보 이름 한자 각각의 훈(한 단어)과 한글 뜻풀이. hanja 배열과 같은 순서로 채운다.",
            items: {
              type: "object",
              properties: {
                char: { type: "string" },
                hun: {
                  type: "string",
                  description: "옥편식 훈 한 단어 (예: '법', '오얏'). 아래 제공된 영어 뜻풀이를 근거로 번역한다.",
                },
                meaningKo: {
                  type: "string",
                  description: "한글 뜻풀이 한 문장 (예: '규칙과 법도를 뜻하는 글자'). 영어 뜻풀이를 자연스러운 한국어로 옮긴다.",
                },
              },
              required: ["char", "hun", "meaningKo"],
              additionalProperties: false,
            },
          },
        },
        required: ["hangul", "rank", "explanation", "hanjaGlosses"],
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

표기 규칙: summary·sajuStory·explanation 어디서든 오행(木火土金水)을 언급할 때는 한자만 단독으로 쓰지 말고
반드시 "한자(한글음)" 형태로 써라. 예: "水(수)의 기운이 강하다", "용신인 火(화)·土(토)를 보완한다".

용어 설명 원칙 (summary·sajuStory·explanation 공통): 사주 작명 용어(신강/신약, 용신, 십신, 발음오행 상생,
자원오행, 수리사격/원형이정 등)는 전문성이 느껴지도록 용어 자체는 그대로 쓴다. 다만 용어를 설명 없이 툭 던지지
말고, 그 용어가 처음 나오는 자리에 짧은 순화 표현이나 일상적인 비유를 괄호나 짧은 구절로 바로 붙여 뜻을
짐작할 수 있게 하라. 예시(그대로 베끼지 말고 문맥에 맞게 다르게 표현할 것):
- "신약(사주가 스스로를 지탱하는 힘이 살짝 부족하다는 뜻)"
- "용신(부족한 기운을 채워 균형을 잡아주는 오행, 이 아이에게는 火(화)·土(토))"
- "발음오행 상생(이름을 소리 내어 읽었을 때 오행 기운이 물 흐르듯 이어지는 것)"
- "자원오행(한자 자체에 담긴 오행 기운)"
- "수리사격/원형이정(이름 획수로 살피는 네 시기의 운 흐름)"
한 용어를 같은 글 안에서 여러 번 쓸 때는 처음 한 번만 풀어주고 이후엔 용어만 써도 된다. 풀이는 짧게(한 구절)
유지해 문장이 늘어지지 않게 하라.

sajuStory 작성 지침: 위 [사주]·[만세력 상세]·[오행 분포]·[신강/신약 및 용신]에 있는 사실만 재료로 삼아, 일간의
오행과 성질, 두드러진 오행의 쏠림, 신강/신약과 용신이 뜻하는 균형의 방향, 눈에 띄는 십신 1~2개를 은유로 엮어
써라. "이렇게 될 것이다" 같은 단정적 예언이나 새로운 판단(제공되지 않은 성격 특성, 길흉 단정)을 만들어내지
마라. 신생아의 사주이므로 직설적이거나 무겁지 않게, 따뜻하고 희망적인 정서로 쓰고 마지막 문단은 부모에게
건네는 부드러운 조언으로 맺어라.

각 후보 explanation 작성 지침: 이 이름이 선택되기까지 실제로 거친 판단 과정을 순서대로, 그러나 딱딱한 나열이
아니라 하나의 이야기처럼 감성적으로 풀어써라 — ① 오행 분포와 신강/신약을 보고 용신을 정한 맥락, ② 그 용신을
이 이름의 발음오행 흐름(성→이름1→이름2 상생)이 어떻게 보완하는지, ③ 이 이름이 인명용 한자·불용문자 기준을
통과한 실제 쓸 수 있는 한자로만 이루어졌다는 점, ④ 수리사격(원형이정) 4격이 81수리 기준으로 전부 길(吉)하게
나온다는 점, ⑤ 자원오행이 용신과 맞는지와 실사용 빈도. 위에 주어진 근거만 언급하고 새 판정을 만들지 마라.

hanjaGlosses 작성 지침: 각 후보 한자 옆에 제공된 영어 뜻풀이(Unihan 사전 뜻풀이)를 근거로, 그 글자를 옥편에서
찾았을 때 나올 법한 한 단어 훈(hun)과, 부모가 읽을 한글 뜻풀이 한 문장(meaningKo)을 써라. 번역이지 새로운
뜻을 창작하는 것이 아니다 — 주어진 영어 뜻풀이의 범위를 벗어나지 마라.

후보들을 위 explanation을 바탕으로 다시 순위 매겨 rank(1이 최고)를 부여하라.`;
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
      "신생아의 사주를 은유적이고 감성적인 톤으로 풀어 쓴 sajuStory를 작성한다. 신강/신약·용신·발음오행 상생· " +
      "자원오행·수리사격 같은 전문 용어는 그대로 쓰되, 처음 나올 때마다 짧은 쉬운 풀이나 비유를 곁들여 " +
      "전문성과 이해하기 쉬움을 함께 잡는다. 제공되지 않은 수치나 판정을 새로 만들어내지 마라.",
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
