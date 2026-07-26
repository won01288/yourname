import type { Candidate, Element, Surname } from "@/lib/naming/types";
import type { HanjaGloss } from "@/lib/llm/explain";
import ElementBadge from "./ElementBadge";

interface CandidateDetailProps {
  candidate: Candidate;
  surname: Surname;
  yongsin: Element[];
  explanation: string | null;
  hanjaGlosses: HanjaGloss[];
  onClose: () => void;
}

const SAGYEOK_LABELS = ["원격 (초년)", "형격 (중년)", "이격 (보조)", "정격 (말년)"];

// design.md 3.2 2단계 — 타일 확장 시 발음오행·자원오행·수리사격·해설을 순서대로 드러낸다.
export default function CandidateDetail({
  candidate,
  surname,
  yongsin,
  explanation,
  hanjaGlosses,
  onClose,
}: CandidateDetailProps) {
  const hanjaText = candidate.hanja.map((h) => h.char).join("");

  return (
    <div className="animate-accordion-in mb-8 rounded-card border border-brand-600 bg-surface p-6 shadow-[var(--shadow-elevated)] sm:p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-[24px] font-semibold text-text-primary">
            {surname.hanja}
            {hanjaText}
          </p>
          <p className="mt-0.5 text-[14px] text-text-secondary">
            {surname.hangul}
            {candidate.hangul}
          </p>
          <p className="mt-1 text-[12px] text-text-secondary">실제 출생 등록 통계에 있는 이름입니다</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-6">
        <section>
          <h3 className="mb-2.5 text-[13px] font-semibold text-text-secondary">발음오행 흐름</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            {candidate.phoneticElements.map((el, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <ElementBadge element={el} />
                {i < candidate.phoneticElements.length - 1 && <span className="text-text-secondary">→</span>}
              </span>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2.5 text-[13px] font-semibold text-text-secondary">자원오행 (한자 뜻)</h3>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {candidate.hanja.map((h) => {
              const gloss = hanjaGlosses.find((g) => g.char === h.char);
              return (
                <div key={h.char} className="rounded-control border border-border bg-surface-muted px-3.5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[18px] font-semibold text-text-primary">{h.char}</span>
                    <span className="text-[13px] text-text-secondary">{h.readings[0]}</span>
                    {h.element ? (
                      <ElementBadge element={h.element} compact />
                    ) : (
                      <span className="rounded-pill bg-surface px-2 py-0.5 text-[11px] text-text-secondary">
                        부수 오행 미배속
                      </span>
                    )}
                    {h.element && yongsin.includes(h.element) && (
                      <span className="text-[11px] font-medium text-brand-600">용신 일치</span>
                    )}
                  </div>
                  {gloss ? (
                    <p className="mt-1.5 text-[13px] leading-5 text-text-primary">
                      <span className="font-medium">{gloss.hun}</span> — {gloss.meaningKo}
                    </p>
                  ) : (
                    h.meaning && <p className="mt-1.5 text-[13px] leading-5 text-text-secondary">{h.meaning}</p>
                  )}
                  <p className="mt-1.5 text-[12px] text-text-secondary">원획 {h.strokeOriginal}획</p>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="mb-2.5 text-[13px] font-semibold text-text-secondary">수리사격 (원형이정)</h3>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {candidate.numerologyNumbers.map((n, i) => (
              <div key={i} className="rounded-control border border-border bg-surface-muted px-3 py-2.5 text-center">
                <p className="text-[11px] text-text-secondary">{SAGYEOK_LABELS[i]}</p>
                <p className="mt-0.5 text-[18px] font-semibold text-text-primary">{n}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-text-secondary">
            4격 모두 81수리 기준 길(吉)한 수리만 후보로 통과시켰습니다.
          </p>
        </section>

        <section>
          <h3 className="mb-2.5 text-[13px] font-semibold text-text-secondary">종합 해설</h3>
          {explanation ? (
            <p className="text-[14px] leading-7 text-text-primary">{explanation}</p>
          ) : (
            <p className="text-[13px] leading-6 text-text-secondary">
              이 후보는 위 발음오행·자원오행·수리 기준을 모두 통과했습니다. 해설문은 준비되지 않았습니다.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
