import type { ReactNode } from "react";

// 실제 결과 화면 컴포넌트를 그대로 재사용하되, "이건 실제 페이지가 아니라 그 페이지의 한 조각을
// 보여주는 미리보기"라는 걸 시각적으로 분명히 하기 위한 액자. 브라우저 창 톱바 느낌의 얇은
// 헤더(점 3개 + "샘플 리포트 화면" 라벨)를 둬서, 마케팅 카피와 실제 제품 화면을 한눈에 구분한다.
export default function ScreenFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface-muted shadow-[var(--shadow-elevated)]">
      <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
        <span className="h-2 w-2 rounded-full bg-border" aria-hidden="true" />
        <span className="h-2 w-2 rounded-full bg-border" aria-hidden="true" />
        <span className="h-2 w-2 rounded-full bg-border" aria-hidden="true" />
        <span className="ml-2 text-[11px] font-medium text-text-secondary">샘플 리포트 화면</span>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}
