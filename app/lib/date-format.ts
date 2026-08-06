// 마이페이지 등에서 날짜/시각을 "93.8.23 16:30" 형태로 짧게 표시하기 위한 공용 포맷터.
// 모바일 화면에서 "1993년 8월 23일 양력 16시 30분" 같은 긴 표기가 잘리는 문제를 해결하기 위해 도입.

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** 연도는 뒤 2자리만 사용해 "93.8.23" 형태로 축약한다. */
export function formatShortDate(year: number, month: number, day: number): string {
  return `${pad2(year % 100)}.${month}.${day}`;
}

/** 24시간제로 "16:30" 형태로 축약한다. */
export function formatShortTime(hour: number, minute: number): string {
  return `${pad2(hour)}:${pad2(minute)}`;
}

/**
 * DB의 created_at(SQLite CURRENT_TIMESTAMP, UTC "YYYY-MM-DD HH:MM:SS") 문자열을
 * 로컬 시간 기준 "93.8.23 16:30" 형태로 축약해 표시한다.
 */
export function formatShortDateTimeFromSql(sqlTimestamp: string): string {
  // Date가 UTC로 파싱하도록 "T"를 넣고 "Z"를 붙여 ISO 형태로 보정한다.
  const date = new Date(sqlTimestamp.includes("T") ? sqlTimestamp : `${sqlTimestamp.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return sqlTimestamp;
  return `${formatShortDate(date.getFullYear(), date.getMonth() + 1, date.getDate())} ${formatShortTime(
    date.getHours(),
    date.getMinutes()
  )}`;
}
