"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

interface SignupFormProps {
  next: string;
}

const MIN_PASSWORD_LENGTH = 8;

export default function SignupForm({ next }: SignupFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(`비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
      return;
    }
    if (password !== passwordConfirm) {
      setErrorMessage("비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);
    let response: Response;
    try {
      response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      setErrorMessage("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      setSubmitting(false);
      return;
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setErrorMessage(body.error ?? "회원가입에 실패했습니다.");
      setSubmitting(false);
      return;
    }

    // 회원가입 == 즉시 로그인 상태(가입 라우트가 세션을 함께 발급) — Nav 재실행을 위해 하드 리다이렉트.
    window.location.href = next;
  }

  const loginHref = next !== "/" ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <section className="mx-auto w-full max-w-md px-6 pb-16 pt-10">
      <form
        onSubmit={handleSubmit}
        className="relative rounded-card border border-border bg-surface p-6 shadow-[var(--shadow-elevated)] sm:p-8"
      >
        <div className="-mx-6 -mt-6 mb-7 h-[3px] rounded-t-card bg-gradient-to-r from-brand-400 to-brand-600 sm:-mx-8 sm:-mt-8" />
        <h1 className="mb-6 text-[18px] font-semibold text-text-primary">회원가입</h1>

        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="signup-email" className="mb-1.5 block text-[13px] font-medium text-text-primary">
              이메일
            </label>
            <input
              id="signup-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-control border border-border bg-surface px-3.5 py-2.5 text-[15px] text-text-primary outline-none transition-colors focus:border-brand-400"
            />
          </div>
          <div>
            <label htmlFor="signup-password" className="mb-1.5 block text-[13px] font-medium text-text-primary">
              비밀번호
            </label>
            <input
              id="signup-password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`${MIN_PASSWORD_LENGTH}자 이상`}
              className="w-full rounded-control border border-border bg-surface px-3.5 py-2.5 text-[15px] text-text-primary outline-none transition-colors focus:border-brand-400"
            />
          </div>
          <div>
            <label htmlFor="signup-password-confirm" className="mb-1.5 block text-[13px] font-medium text-text-primary">
              비밀번호 확인
            </label>
            <input
              id="signup-password-confirm"
              type="password"
              required
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="비밀번호 다시 입력"
              className="w-full rounded-control border border-border bg-surface px-3.5 py-2.5 text-[15px] text-text-primary outline-none transition-colors focus:border-brand-400"
            />
          </div>
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="mt-4 rounded-control bg-[color-mix(in_srgb,var(--status-alert)_12%,transparent)] px-3.5 py-2.5 text-[13px] leading-5 text-[var(--status-alert)]"
          >
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-control bg-gradient-to-r from-brand-400 to-brand-600 px-4 py-3 text-[14px] font-medium text-white shadow-[var(--shadow-brand-glow)] transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
        >
          {submitting ? "가입 중…" : "회원가입"}
        </button>

        <p className="mt-4 text-center text-[13px] text-text-secondary">
          이미 계정이 있으신가요?{" "}
          <Link href={loginHref} className="font-medium text-brand-600 hover:text-brand-800">
            로그인
          </Link>
        </p>
      </form>
    </section>
  );
}
