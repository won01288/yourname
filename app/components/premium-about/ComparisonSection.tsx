interface ComparisonRow {
  label: string;
  traditional: string;
  ours: string;
}

const ROWS: ComparisonRow[] = [
  {
    label: "소요 시간",
    traditional: "예약 후 1~2주 대기, 방문 상담이 필요한 경우가 많음",
    ours: "생년월일시 입력 후 몇 분 안에 리포트 완성",
  },
  {
    label: "이용 가능 시간",
    traditional: "영업시간 내 방문·전화 상담만 가능",
    ours: "24시간, 원하는 시간에 온라인으로",
  },
  {
    label: "근거 확인",
    traditional: "구두 설명 위주 — 다시 들으려면 재방문·재문의",
    ours: "발음오행·수리사격·자원오행 등 계산 과정을 항목별로 그대로 공개",
  },
  {
    label: "다시 보기",
    traditional: "받은 자리에서 메모하지 않으면 다시 확인하기 어려움",
    ours: "로그인 시 30일간 마이페이지에서 재계산 없이 다시 열람",
  },
  {
    label: "비용",
    traditional: "보통 수십만 원, 후보를 더 보려면 추가 상담 비용",
    ours: "한 번의 이용으로 후보 3~10개와 상세 해설까지 포함",
  },
];

// design.md 3장 카드 톤 재사용 — 새로운 표 스타일을 만들지 않고 기존 rounded-card/border 토큰으로
// 구성한다. 모바일에서는 항목별로 세로 스택, sm 이상에서만 3열 그리드로 정렬한다.
export default function ComparisonSection() {
  return (
    <section className="mx-auto mb-16 w-full max-w-3xl px-6">
      <h2 className="mb-1 text-center text-[20px] font-bold text-text-primary">전통 작명원과 무엇이 다른가요</h2>
      <p className="mb-6 text-center text-[13px] leading-6 text-text-secondary">
        같은 정통 성명학 이론을 쓰되, 결과를 확인하고 검증하는 방식이 다릅니다.
      </p>

      <div className="overflow-hidden rounded-card border border-border bg-surface shadow-[var(--shadow-card)]">
        <div className="hidden grid-cols-[1.1fr_1fr_1fr] border-b border-border sm:grid">
          <div />
          <div className="border-l border-border px-4 py-4 text-center text-[13px] font-semibold text-text-secondary">
            전통 작명원
          </div>
          <div className="border-l border-border px-4 py-4 text-center text-[13px] font-semibold text-brand-600">
            유어네임 프리미엄
          </div>
        </div>

        {ROWS.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-1 gap-2 border-b border-border px-4 py-4 last:border-b-0 sm:grid-cols-[1.1fr_1fr_1fr] sm:items-center sm:gap-0 sm:py-5"
          >
            <p className="text-[13px] font-semibold text-text-primary sm:px-1">{row.label}</p>
            <p className="text-[13px] leading-6 text-text-secondary sm:border-l sm:border-border sm:px-4">
              {row.traditional}
            </p>
            <p className="flex items-start gap-1.5 text-[13px] leading-6 text-text-primary sm:border-l sm:border-border sm:px-4">
              <span aria-hidden="true" className="mt-0.5 shrink-0 text-brand-600">
                ✓
              </span>
              {row.ours}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
