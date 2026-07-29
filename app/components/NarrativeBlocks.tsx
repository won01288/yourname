// LLM이 생성한 서술형 텍스트(사주풀이/종합해설)를 렌더링한다. 빈 줄로 구분된 문단 중
// "**소제목**" 형태로 단독 한 줄인 것만 소제목(h3)으로, 나머지는 본문 문단(p)으로 그린다.
// 마크다운 파서를 통째로 들이는 대신 이 한 가지 패턴만 인식한다 — LLM 프롬프트가 이 표기법을
// 명시적으로 지정하므로 오탐 위험이 낮다 (lib/llm/explain.ts 참고).
const BOLD_LINE = /^\*\*(.+)\*\*$/;

interface NarrativeBlocksProps {
  text: string;
}

export default function NarrativeBlocks({ text }: NarrativeBlocksProps) {
  const blocks = text.split(/\n{2,}/).filter((block) => block.trim().length > 0);

  return (
    <>
      {blocks.map((block, i) => {
        const match = block.trim().match(BOLD_LINE);
        if (match) {
          return (
            <h3 key={i} className="flex items-center gap-1.5 text-[14px] font-semibold text-text-primary">
              <span aria-hidden className="text-brand-600">
                ✦
              </span>
              {match[1]}
            </h3>
          );
        }
        return <p key={i}>{block}</p>;
      })}
    </>
  );
}
