"use client";

import { Fragment, useMemo, useState } from "react";
import type { NameRequestPayload } from "@/app/lib/name-client";
import type { Gender } from "@/lib/naming/types";
import { CANDIDATE_COUNT_OPTIONS, DEFAULT_CANDIDATE_COUNT, type CandidateCount } from "@/lib/naming/config";
import { BirthDateFields, BirthTimeFields, daysInMonth } from "./BirthDateTimeFields";

interface InputFormProps {
  onSubmit: (payload: NameRequestPayload) => void;
  submitting: boolean;
  /** 성씨 한자가 여럿이라 API가 특정을 요구할 때 사용자가 채워준다. */
  surnameOptions: string[] | null;
  errorMessage: string | null;
  /** 성씨 한자 재선택 등으로 폼이 재마운트될 때 이전에 입력했던 값을 복원한다. */
  initialValues?: NameRequestPayload | null;
  /** 로그인 베타 — 프리미엄 작명은 로그인이 필요하다. 서버(app/api/name/route.ts)의 401이
   * 실제 보안 경계이고, 이 prop은 UX 목적(제출 자체를 막고 안내)일 뿐이다. */
  isLoggedIn: boolean;
  /** isLoggedIn이 false일 때 최종 제출 대신 호출된다. 지금까지 입력한 값을 그대로 넘겨,
   * 로그인 후 이어서 제출할 수 있게 한다(부모가 sessionStorage에 보관). */
  onLoginRequired: (payload: NameRequestPayload) => void;
  /** 로그인 후 이어서 제출하는 흐름(resume)에서만 마지막 단계로 바로 이동시키기 위해 쓴다.
   * 생략하면 항상 0단계(기본 정보)부터 시작한다 — 성씨 한자 재선택처럼 처음부터 다시 확인해야
   * 하는 경우와 구분하기 위함(2026.7.30). */
  initialStep?: number;
}

const STEP_LABELS = ["기본 정보", "생년월일", "태어난 시각", "추천 개수"];
export const NAMING_WIZARD_LAST_STEP = STEP_LABELS.length - 1;
const CURRENT_YEAR = new Date().getFullYear();

const CANDIDATE_COUNT_DESCRIPTIONS: Record<CandidateCount, string> = {
  3: "가장 빠르게 핵심만 훑어보고 싶다면",
  5: "균형 잡힌 개수로 비교하고 싶다면",
  10: "폭넓게 비교하며 직접 고르고 싶다면",
};

export default function InputForm({
  onSubmit,
  submitting,
  surnameOptions,
  errorMessage,
  initialValues,
  isLoggedIn,
  onLoginRequired,
  initialStep,
}: InputFormProps) {
  const [step, setStep] = useState(initialStep ?? 0);

  const [gender, setGender] = useState<Gender | null>(initialValues?.gender ?? null);
  const [surnameHangul, setSurnameHangul] = useState(initialValues?.surnameHangul ?? "");
  const [surnameHanja, setSurnameHanja] = useState("");
  const [candidateCount, setCandidateCount] = useState<CandidateCount>(
    initialValues?.candidateCount ?? DEFAULT_CANDIDATE_COUNT
  );

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
  const step4Valid = candidateCount !== null;

  function goNext() {
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleSubmit() {
    if (!gender) return; // step1Valid가 이전 단계에서 이미 강제하므로 도달하지 않는다.
    const payload: NameRequestPayload = {
      gender,
      surnameHangul: surnameHangul.trim(),
      surnameHanja: surnameHanja || undefined,
      candidateCount,
      isLunar,
      isLeapMonth: isLunar ? isLeapMonth : undefined,
      year,
      month,
      day: effectiveDay,
      hour: timeUnknown ? 12 : hour,
      minute: timeUnknown ? 0 : minute,
    };
    // 로그인 베타 — 비로그인 상태면 API를 호출하지 않고(비용 방지) 로그인 안내로 대신한다.
    // 서버도 독립적으로 401을 강제하므로 이 체크는 UX용 사전 차단일 뿐이다.
    if (!isLoggedIn) {
      onLoginRequired(payload);
      return;
    }
    onSubmit(payload);
  }

  return (
    <section className="mx-auto w-full max-w-md px-6 pb-28">
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
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-control border px-3.5 py-3 text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)] ${
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
          <div className="flex flex-col gap-2">
            <p className="mb-1 text-[13px] leading-6 text-text-secondary">
              순위 없이 모든 후보를 각자의 강점과 함께 보여드립니다. 원하는 개수를 선택해 주세요.
            </p>
            {CANDIDATE_COUNT_OPTIONS.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setCandidateCount(count)}
                className={`flex items-center justify-between rounded-control border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)] ${
                  candidateCount === count
                    ? "border-brand-600 bg-brand-50"
                    : "border-border bg-surface hover:bg-surface-muted"
                }`}
              >
                <span>
                  <span
                    className={`block text-[16px] font-semibold ${
                      candidateCount === count ? "text-brand-800" : "text-text-primary"
                    }`}
                  >
                    {count}개 추천받기
                  </span>
                  <span className="mt-0.5 block text-[12px] text-text-secondary">
                    {CANDIDATE_COUNT_DESCRIPTIONS[count]}
                  </span>
                </span>
                {candidateCount === count && (
                  <span aria-hidden="true" className="text-brand-600">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 flex flex-col gap-2 rounded-control bg-[color-mix(in_srgb,var(--status-alert)_12%,transparent)] px-3.5 py-2.5">
            <p role="alert" className="text-[13px] leading-5 text-[var(--status-alert)]">
              {errorMessage}
            </p>
            {/* 해설 생성(LLM) 호출은 Anthropic 서버 쪽 순간적 오류로도 실패할 수 있음이 확인돼(2026.7.30),
                입력을 처음부터 다시 채우지 않고 같은 값으로 바로 재요청할 수 있게 한다. */}
            <button
              type="button"
              onClick={handleSubmit}
              className="self-start rounded-control border border-[var(--status-alert)] px-3 py-1.5 text-[12px] font-medium text-[var(--status-alert)] transition-colors hover:bg-[color-mix(in_srgb,var(--status-alert)_18%,transparent)]"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 모바일 하단 고정 CTA — 위저드의 유일한 진행 수단이라 스크롤 위치와 무관하게 항상
            엄지 닿는 위치에 둔다. sm 이상에서는 기존처럼 카드 안 정적 위치로 되돌아간다. */}
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
              disabled={step === 0 ? !step1Valid : step === 1 ? !step2Valid : !step3Valid}
              onClick={goNext}
              className="flex-1 rounded-control bg-gradient-to-r from-brand-400 to-brand-600 px-4 py-3 text-[14px] font-medium text-white shadow-[var(--shadow-brand-glow)] transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
            >
              다음
            </button>
          ) : (
            <button
              type="button"
              disabled={!step4Valid || submitting}
              onClick={handleSubmit}
              className="flex-1 rounded-control bg-gradient-to-r from-brand-400 to-brand-600 px-4 py-3 text-[14px] font-medium text-white shadow-[var(--shadow-brand-glow)] transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
            >
              {submitting ? "분석 중…" : "이름 짓기 시작"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
