"use client";

// InputForm(유료 /naming)과 NameScoreForm(무료 /score) 둘 다 생년월일시 입력이 처음부터 동시에
// 필요해 즉시 중복이 생기므로 공유 컴포넌트로 추출한다(CLAUDE.md 8.3 — 나중이 아니라 지금 당장
// 두 곳에서 쓰이는 경우). 상태는 각 폼이 소유하고, 이 컴포넌트는 값+setter만 props로 받는다.

const CURRENT_YEAR = new Date().getFullYear();
export const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1950 + 1 }, (_, i) => CURRENT_YEAR - i);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);
const MINUTE_OPTIONS = [0, 10, 20, 30, 40, 50];

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

interface BirthDateFieldsProps {
  isLunar: boolean;
  onIsLunarChange: (value: boolean) => void;
  isLeapMonth: boolean;
  onIsLeapMonthChange: (value: boolean) => void;
  year: number;
  onYearChange: (value: number) => void;
  month: number;
  onMonthChange: (value: number) => void;
  day: number;
  onDayChange: (value: number) => void;
  dayOptions: number[];
}

export function BirthDateFields({
  isLunar,
  onIsLunarChange,
  isLeapMonth,
  onIsLeapMonthChange,
  year,
  onYearChange,
  month,
  onMonthChange,
  day,
  onDayChange,
  dayOptions,
}: BirthDateFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {(["solar", "lunar"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onIsLunarChange(type === "lunar")}
            className={`flex-1 rounded-control border px-3.5 py-2.5 text-[14px] font-medium transition-colors ${
              (type === "lunar") === isLunar
                ? "border-brand-600 bg-brand-50 text-brand-800"
                : "border-border bg-surface text-text-secondary hover:bg-surface-muted"
            }`}
          >
            {type === "solar" ? "양력" : "음력"}
          </button>
        ))}
      </div>

      {isLunar && (
        <label className="flex items-center gap-2 text-[14px] text-text-secondary">
          <input
            type="checkbox"
            checked={isLeapMonth}
            onChange={(e) => onIsLeapMonthChange(e.target.checked)}
            className="h-4 w-4 accent-[var(--brand-600)]"
          />
          윤달입니다
        </label>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-text-primary">년</label>
          <select
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="w-full rounded-control border border-border bg-surface px-2 py-2.5 text-[15px] text-text-primary outline-none focus:border-brand-400"
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-text-primary">월</label>
          <select
            value={month}
            onChange={(e) => onMonthChange(Number(e.target.value))}
            className="w-full rounded-control border border-border bg-surface px-2 py-2.5 text-[15px] text-text-primary outline-none focus:border-brand-400"
          >
            {MONTH_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-text-primary">일</label>
          <select
            value={day}
            onChange={(e) => onDayChange(Number(e.target.value))}
            className="w-full rounded-control border border-border bg-surface px-2 py-2.5 text-[15px] text-text-primary outline-none focus:border-brand-400"
          >
            {dayOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

interface BirthTimeFieldsProps {
  timeUnknown: boolean;
  onTimeUnknownChange: (value: boolean) => void;
  hour: number;
  onHourChange: (value: number) => void;
  minute: number;
  onMinuteChange: (value: number) => void;
}

export function BirthTimeFields({
  timeUnknown,
  onTimeUnknownChange,
  hour,
  onHourChange,
  minute,
  onMinuteChange,
}: BirthTimeFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-2 text-[14px] text-text-secondary">
        <input
          type="checkbox"
          checked={timeUnknown}
          onChange={(e) => onTimeUnknownChange(e.target.checked)}
          className="h-4 w-4 accent-[var(--brand-600)]"
        />
        정확한 시각을 모릅니다
      </label>

      {!timeUnknown && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-text-primary">시</label>
            <select
              value={hour}
              onChange={(e) => onHourChange(Number(e.target.value))}
              className="w-full rounded-control border border-border bg-surface px-2 py-2.5 text-[15px] text-text-primary outline-none focus:border-brand-400"
            >
              {HOUR_OPTIONS.map((h) => (
                <option key={h} value={h}>
                  {h}시
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-text-primary">분</label>
            <select
              value={minute}
              onChange={(e) => onMinuteChange(Number(e.target.value))}
              className="w-full rounded-control border border-border bg-surface px-2 py-2.5 text-[15px] text-text-primary outline-none focus:border-brand-400"
            >
              {MINUTE_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}분
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      {timeUnknown && (
        <p className="text-[13px] leading-6 text-text-secondary">
          시각 정보 없이 낮 12시로 계산합니다. 시주(時柱)가 부정확해질 수 있어, 정확한 시각을
          알게 되면 다시 확인하는 것을 권합니다.
        </p>
      )}
    </div>
  );
}
