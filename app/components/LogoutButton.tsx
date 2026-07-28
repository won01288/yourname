"use client";

// 로그인 베타 — 기존 name-client.ts/score-client.ts와 동일한 "클라이언트 fetch 래퍼" 패턴.
// 이 프로젝트에 Server Action 사용례가 없어 그대로 따른다. 로그아웃 후 하드 리다이렉트로
// 이동해 Nav(Server Component, cookies() 기반)가 확실히 재실행되게 한다.
export default function LogoutButton() {
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex min-h-11 items-center rounded-control px-2.5 text-[13px] font-medium text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]"
    >
      로그아웃
    </button>
  );
}
