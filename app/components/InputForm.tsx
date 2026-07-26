"use client";

import { Fragment, useMemo, useState } from "react";
import type { NameRequestPayload } from "@/app/lib/name-client";
import type { Gender } from "@/lib/naming/types";
import { BirthDateFields, BirthTimeFields, daysInMonth } from "./BirthDateTimeFields";

interface InputFormProps {
  onSubmit: (payload: NameRequestPayload) => void;
  submitting: boolean;
  /** 성씨 한자가 여럿이라 API가 특정을 요구할 때 사용자가 채워준다. */
  surnameOptions: string[] | null;
  errorMessage: string | null;
  /** 성씨 한자 재선택 등으로 폼이 재마운트될 때 이전에 입력했던 값을 복원한다. */
  initialValues?: NameRequestPayload | null;
}

const STEP_LABELS = ["기본 정보", "생년월일", "태어난 시각"];
const CURRENT_YEAR = new Date().getFullYear();

export default function InputForm({
  onSubmit,
  submitting,
  surnameOptions,
  errorMessage,
  initialValues,
}: InputFormProps) {
  const [step, setStep] = useState(0);

  const [gender, setGender] = useState<Gender | null>(initialValues?.gender ?? null);
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

  const dayOptions = useMemo(() => Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1), [year, month]);
  // 월/년이 바뀌어 그 달의 일수가 줄어들면(예: 31일 선택 후 2월로 변경) day를 그대로 두지 않고
  // 매 렌더마다 유효 범위로 클램프한다 — effect로 별도 setState하지 않고 읽는 시점에만 보정한다.
  const effectiveDay = Math.min(day, dayOptions.length);

  const step1Valid =
    gender !== null && surnameHangul.trim().length > 0 && (!surnameOptions || surnameHanja.length > 0);
  const step2Valid = year > 0 && month >= 1 && month <= 12;
  const step3Valid = true;

  function goNext() {
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleSubmit() {
    if (!gender) return; // step1Valid가 이전 단계에서 이미 강제하므로 도달하지 않는다.
    onSubmit({
      gender,
      surnameHangul: surnameHangul.trim(),
      surnameHanja: surnameHanja || undefined,
      isLunar,
      isLeapMonth: isLunar ? isLeapMonth : undefined,
      year,
      month,
      day: effectiveDay,
      hour: timeUnknown ? 12 : hour,
      minute: timeUnknown ? 0 : minute,
    });
  }

  return (
    <section className="mx-auto w-full max-w-md px-6 pb-24">
      <div className="relative rounded-card border border-border bg-surface p-6 shadow-[var(--shadow-elevated)] sm:p-8">
        {/* design.md 4장 — 핵심 카드 상단 액센트 바 */}
        <div className="-mx-6 -mt-6 mb-7 h-[3px] rounded-t-card bg-gradient-to-r from-brand-400 to-brand-600 sm:-mx-8 sm:-mt-8" />

        {/* 진행 표시 — 번호형 단계 인디케이터 */}
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
              <label className="mb-1.5 block text-[13px] font-medium text-text-primary">성별</label>
              <div className="flex gap-2">
                {(["F", "M"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-control border px-3.5 py-2.5 text-[14px] font-medium transition-colors ${
                      gender === g
                        ? "border-brand-600 bg-brand-50 text-brand-800"
                        : "border-border bg-surface text-text-secondary hover:bg-surface-muted"
                    }`}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0">
                      {g === "F" ? (
                        <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.4" />
                      ) : (
                        <rect x="1.5" y="1.5" width="9" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
                      )}
                    </svg>
                    {g === "F" ? "여자" : "남자"}
                    {gender === g && <span aria-hidden="true">✓</span>}
                  </button>
                ))}
              </div>
            </div>

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
                      className={`rounded-control border px-3.5 py-2 text-[15px] transition-colors ${
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

        {errorMessage && (
          <p className="mt-4 rounded-control bg-[color-mix(in_srgb,var(--element-fire)_12%,transparent)] px-3.5 py-2.5 text-[13px] leading-5 text-[var(--element-fire)]">
            {errorMessage}
          </p>
        )}

        <div className="mt-7 flex gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="rounded-control border border-border bg-surface px-4 py-2.5 text-[14px] font-medium text-text-primary transition-colors hover:bg-surface-muted active:scale-[0.98]"
            >
              이전
            </button>
          )}
          {step < STEP_LABELS.length - 1 ? (
            <button
              type="button"
              disabled={step === 0 ? !step1Valid : !step2Valid}
              onClick={goNext}
              className="flex-1 rounded-control bg-gradient-to-r from-brand-400 to-brand-600 px-4 py-2.5 text-[14px] font-medium text-white shadow-[var(--shadow-brand-glow)] transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              다음
            </button>
          ) : (
            <button
              type="button"
              disabled={!step3Valid || submitting}
              onClick={handleSubmit}
              className="flex-1 rounded-control bg-gradient-to-r from-brand-400 to-brand-600 px-4 py-2.5 text-[14px] font-medium text-white shadow-[var(--shadow-brand-glow)] transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {submitting ? "분석 중…" : "이름 짓기 시작"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
