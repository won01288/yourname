"use client";

import Link from "next/link";

interface AuthRequiredModalProps {
  onClose: () => void;
  loginHref: string;
}

// 로그인 베타 — /naming 최종 제출을 비로그인 상태에서 눌렀을 때(또는 제출 도중 세션이 만료된
// 드문 경우) 뜨는 안내. design.md 3.4: 글래스모피즘은 상단 내비게이션과 모달에만 허용.
// 이 모달은 UX일 뿐이고, 실제 보안 경계는 app/api/name/route.ts의 401이다.
export default function AuthRequiredModal({ onClose, loginHref }: AuthRequiredModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-card border border-border bg-[var(--glass-bg)] p-6 shadow-[var(--shadow-elevated)] backdrop-blur-[var(--glass-blur)] sm:p-8">
        <h2 className="mb-2 text-[16px] font-semibold text-text-primary">로그인이 필요한 서비스입니다</h2>
        <p className="mb-6 text-[13px] leading-6 text-text-secondary">
          프리미엄 작명 결과를 생성하고 30일간 다시 확인하려면 먼저 로그인해 주세요. 지금까지 입력한 내용은
          로그인 후에도 그대로 유지됩니다.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-control border border-border bg-surface px-4 py-3 text-[14px] font-medium text-text-primary transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
          >
            취소
          </button>
          <Link
            href={loginHref}
            className="flex-1 rounded-control bg-gradient-to-r from-brand-400 to-brand-600 px-4 py-3 text-center text-[14px] font-medium text-white shadow-[var(--shadow-brand-glow)] transition-all hover:brightness-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
          >
            로그인하기
          </Link>
        </div>
      </div>
    </div>
  );
}
