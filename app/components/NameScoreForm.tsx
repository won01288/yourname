"use client";

import { Fragment, useMemo, useState } from "react";
import type { ScoreRequestPayload } from "@/app/lib/score-client";
import { BirthDateFields, BirthTimeFields, daysInMonth } from "./BirthDateTimeFields";
import HanjaSearchPicker, { type HanjaSelection } from "./HanjaSearchPicker";

interface NameScoreFormProps {
  onSubmit: (payload: ScoreRequestPayload) => void;
  submitting: boolean;
  /** 성씨 한자가 여럿이라 API가 특정을 요구할 때 사용자가 채워준다. */
  surnameOptions: string[] | null;
  errorMessage: string | null;
  initialValues?: ScoreRequestPayload | null;
}

const STEP_LABELS = ["기본 정보", "생년월일", "태어난 시각", "이름 한자"];
const CURRENT_YEAR = new Date().getFullYear();

// CLAUDE.md 3.10 — 이름 점수 확인은 채점 대상 이름을 이미 알고 있어야 하므로 성별 필드가 없다
// (given_name 큐레이션 풀은 후보 생성 전용이라 채점 파이프라인엔 관여하지 않는다).
export default function NameScoreForm({
  onSubmit,
  submitting,
  surnameOptions,
  errorMessage,
  initialValues,
}: NameScoreFormProps) {
  const [step, setStep] = useState(0);

  const [surnameHangul, setSurnameHangul] = useState(initialValues?.surnameHangul ?? "");
  const [surnameHanja, setSurnameHanja] = useState("");

  const [isLunar, setIsLunar] = useState(initialValues?.isLunar ?? false);
  const [isLeapMonth, setIsLeapMonth] = useState(initialValues?.isLeapMonth ?? false);
  const [year, setYear] = useState(initialValues?.year ?? CURRENT_YEAR - 1);
  const [month, setMonth] = useState(initialValues?.month ?? 1);
  const [day, setDay] = useState(initialValues?.day ?? 1);

  const [timeUnknown, setTimeUnknown] = useState(false);
  const [hour, setHour] = useState(initialValues?.hour ?? 12);
  const [minute, setMinute] = useState(initialValues?.minute ?? 0);

  const [given1, setGiven1] = useState<HanjaSelection | null>(null);
  const [given2, setGiven2] = useState<HanjaSelection | null>(null);

  const dayOptions = useMemo(() => Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1), [year, month]);
  const effectiveDay = Math.min(day, dayOptions.length);

  const step0Valid = surnameHangul.trim().length > 0 && (!surnameOptions || surnameHanja.length > 0);
  const step1Valid = year > 0 && month >= 1 && month <= 12;
  const step2Valid = true;
  const step3Valid = given1 !== null && given2 !== null;

  function goNext() {
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleSubmit() {
    if (!given1 || !given2) return; // step3Valid가 이미 강제하므로 도달하지 않는다.
    onSubmit({
      surnameHangul: surnameHangul.trim(),
      surnameHanja: surnameHanja || undefined,
      isLunar,
      isLeapMonth: isLunar ? isLeapMonth : undefined,
      year,
      month,
      day: effectiveDay,
      hour: timeUnknown ? 12 : hour,
      minute: timeUnknown ? 0 : minute,
      givenName: [
        { hangul: given1.hangul, hanja: given1.hanja.char },
        { hangul: given2.hangul, hanja: given2.hanja.char },
      ],
    });
  }

  const stepValid = [step0Valid, step1Valid, step2Valid, step3Valid];

  return (
    <section className="mx-auto w-full max-w-md px-6 pb-28">
      <div className="relative rounded-card border border-border bg-surface p-6 shadow-[var(--shadow-elevated)] sm:p-8">
        <div className="-mx-6 -mt-6 mb-7 h-[3px] rounded-t-card bg-gradient-to-r from-brand-400 to-brand-600 sm:-mx-8 sm:-mt-8" />

        <div className="mb-5 flex items-center gap-1.5">
          {STEP_LABELS.map((label, i) => (
            <Fragment key={label}>
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-pill text-[11px] font-bold transition-colors ${
                  i <= step ? "bg-brand-600 text-white" : "bg-surface-muted text-text-secondary"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className={`h-[2px] flex-1 rounded-pill transition-colors ${
                    i < step ? "bg-brand-400" : "bg-border"
                  }`}
                />
              )}
            </Fragment>
          ))}
        </div>
        <p className="mb-6 text-[13px] font-medium text-text-secondary">{STEP_LABELS[step]}</p>

        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="surname" className="mb-1.5 block text-[13px] font-medium text-text-primary">
                한글 성씨
              </label>
              <input
                id="surname"
                type="text"
                value={surnameHangul}
                onChange={(e) => {
                  setSurnameHangul(e.target.value);
                  setSurnameHanja("");
                }}
                placeholder="예: 김"
                maxLength={2}
                className="w-full rounded-control border border-border bg-surface px-3.5 py-2.5 text-[15px] text-text-primary outline-none transition-colors focus:border-brand-400"
              />
            </div>

            {surnameOptions && surnameOptions.length > 0 && (
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                  성씨 한자를 선택해 주세요
                </label>
                <div className="flex flex-wrap gap-2">
                  {surnameOptions.map((hanja) => (
                    <button
                      key={hanja}
                      type="button"
                      onClick={() => setSurnameHanja(hanja)}
                      className={`rounded-control border px-3.5 py-3 text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)] ${
                        surnameHanja === hanja
                          ? "border-brand-600 bg-brand-50 text-brand-800"
                          : "border-border bg-surface text-text-primary hover:bg-surface-muted"
                      }`}
                    >
                      {hanja}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <BirthDateFields
            isLunar={isLunar}
            onIsLunarChange={setIsLunar}
            isLeapMonth={isLeapMonth}
            onIsLeapMonthChange={setIsLeapMonth}
            year={year}
            onYearChange={setYear}
            month={month}
            onMonthChange={setMonth}
            day={effectiveDay}
            onDayChange={setDay}
            dayOptions={dayOptions}
          />
        )}

        {step === 2 && (
          <BirthTimeFields
            timeUnknown={timeUnknown}
            onTimeUnknownChange={setTimeUnknown}
            hour={hour}
            onHourChange={setHour}
            minute={minute}
            onMinuteChange={setMinute}
          />
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <p className="text-[13px] leading-6 text-text-secondary">
              이미 지어진 이름의 한자 두 글자를 각각 찾아 선택해 주세요.
            </p>
            <HanjaSearchPicker label="이름 첫 글자" selected={given1} onSelect={setGiven1} onClear={() => setGiven1(null)} />
            <HanjaSearchPicker label="이름 둘째 글자" selected={given2} onSelect={setGiven2} onClear={() => setGiven2(null)} />
          </div>
        )}

        {errorMessage && (
          <p
            role="alert"
            className="mt-4 rounded-control bg-[color-mix(in_srgb,var(--status-alert)_12%,transparent)] px-3.5 py-2.5 text-[13px] leading-5 text-[var(--status-alert)]"
          >
            {errorMessage}
          </p>
        )}

        {/* 모바일 하단 고정 CTA — InputForm과 동일한 이유(design.md 참고, 위저드 진행 버튼은
            스크롤과 무관하게 항상 엄지 닿는 위치에). sm 이상에서는 카드 안 정적 위치. */}
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-md gap-2 border-t border-border bg-[var(--bg-surface)]/95 px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md sm:static sm:z-auto sm:mt-7 sm:w-auto sm:max-w-none sm:border-0 sm:bg-transparent sm:px-0 sm:pt-0 sm:pb-0 sm:backdrop-blur-none">
          {step > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="rounded-control border border-border bg-surface px-4 py-3 text-[14px] font-medium text-text-primary transition-colors hover:bg-surface-muted active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
            >
              이전
            </button>
          )}
          {step < STEP_LABELS.length - 1 ? (
            <button
              type="button"
              disabled={!stepValid[step]}
              onClick={goNext}
              className="flex-1 rounded-control bg-gradient-to-r from-brand-400 to-brand-600 px-4 py-3 text-[14px] font-medium text-white shadow-[var(--shadow-brand-glow)] transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
            >
              다음
            </button>
          ) : (
            <button
              type="button"
              disabled={!step3Valid || submitting}
              onClick={handleSubmit}
              className="flex-1 rounded-control bg-gradient-to-r from-brand-400 to-brand-600 px-4 py-3 text-[14px] font-medium text-white shadow-[var(--shadow-brand-glow)] transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
            >
              {submitting ? "채점 중…" : "점수 확인하기"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
