"use client";

import { useState, type FormEvent } from "react";

interface AccountDeleteSectionProps {
  /** 이메일/비밀번호 계정이면 true — 탈퇴 전 비밀번호 재확인을 받는다. 소셜 로그인 전용 계정은
   * 비밀번호가 없어(lib/auth.ts의 "oauth:v1:<provider>" sentinel) 확인 절차를 건너뛴다. */
  isPasswordAccount: boolean;
}

// 마이페이지 — 회원 탈퇴. 되돌릴 수 없는 작업이라 확인 모달을 거치고, 비밀번호 계정은 비밀번호
// 재입력까지 받는다(app/api/account/route.ts DELETE). 성공 시 저장된 결과(score_result·naming_result)와
// 세션까지 함께 삭제되므로 하드 리다이렉트로 랜딩으로 보낸다.
export default function AccountDeleteSection({ isPasswordAccount }: AccountDeleteSectionProps) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function openModal() {
    setPassword("");
    setErrorMessage(null);
    setOpen(true);
  }

  async function handleConfirm(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    let response: Response;
    try {
      response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isPasswordAccount ? { password } : {}),
      });
    } catch {
      setErrorMessage("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      setSubmitting(false);
      return;
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setErrorMessage(body.error ?? "탈퇴에 실패했습니다.");
      setSubmitting(false);
      return;
    }

    window.location.href = "/";
  }

  return (
    <div className="relative mt-8 rounded-card border border-border bg-surface p-6 shadow-[var(--shadow-elevated)] sm:p-8">
      <div className="-mx-6 -mt-6 mb-5 h-[3px] rounded-t-card bg-[var(--status-alert)] sm:-mx-8 sm:-mt-8" />
      <h2 className="mb-1 text-[16px] font-semibold text-text-primary">회원 탈퇴</h2>
      <p className="mb-4 text-[13px] leading-6 text-text-secondary">
        탈퇴하면 저장된 이름 점수 확인·작명 결과가 모두 삭제되며 되돌릴 수 없습니다.
      </p>
      <button
        type="button"
        onClick={openModal}
        className="rounded-control border border-[var(--status-alert)] px-4 py-2.5 text-[13px] font-medium text-[var(--status-alert)] transition-colors hover:bg-[color-mix(in_srgb,var(--status-alert)_12%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
      >
        회원 탈퇴
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <form
            onSubmit={handleConfirm}
            className="w-full max-w-sm rounded-card border border-border bg-[var(--glass-bg)] p-6 shadow-[var(--shadow-elevated)] backdrop-blur-[var(--glass-blur)] sm:p-8"
          >
            <h2 className="mb-2 text-[16px] font-semibold text-text-primary">정말 탈퇴하시겠어요?</h2>
            <p className="mb-5 text-[13px] leading-6 text-text-secondary">
              이 작업은 되돌릴 수 없습니다. 저장된 결과가 모두 영구히 삭제됩니다.
            </p>

            {isPasswordAccount && (
              <div className="mb-5">
                <label htmlFor="delete-account-password" className="mb-1.5 block text-[13px] font-medium text-text-primary">
                  비밀번호 확인
                </label>
                <input
                  id="delete-account-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호"
                  className="w-full rounded-control border border-border bg-surface px-3.5 py-2.5 text-[15px] text-text-primary outline-none transition-colors focus:border-brand-400"
                />
              </div>
            )}

            {errorMessage && (
              <p
                role="alert"
                className="mb-5 rounded-control bg-[color-mix(in_srgb,var(--status-alert)_12%,transparent)] px-3.5 py-2.5 text-[13px] leading-5 text-[var(--status-alert)]"
              >
                {errorMessage}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="flex-1 rounded-control border border-border bg-surface px-4 py-3 text-[14px] font-medium text-text-primary transition-colors hover:bg-surface-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-control bg-[var(--status-alert)] px-4 py-3 text-[14px] font-medium text-white transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
              >
                {submitting ? "탈퇴 처리 중…" : "탈퇴하기"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
