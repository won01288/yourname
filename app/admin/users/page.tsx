import { notFound } from "next/navigation";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { listAllUsersForAdmin, type AdminUserRow } from "@/lib/db-auth";
import PageHero from "@/app/components/PageHero";

const PROVIDER_LABEL: Record<"kakao" | "naver", string> = {
  kakao: "카카오",
  naver: "네이버",
};

function formatDateTime(iso: string): string {
  const date = new Date(iso.includes("T") ? iso : `${iso.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// password_hash 원문에서 가입 경로를 역산한다 — 새 컬럼 없이 이미 저장된 값 그대로 읽는 것뿐이다
// (0.2/0.3 참고: "scrypt:..."=이메일/비밀번호, "oauth:v1:<provider>"=SNS 전용 가입).
function signupMethodLabel(user: AdminUserRow): string {
  if (user.passwordHash.startsWith("scrypt:")) return "이메일/비밀번호";
  if (user.passwordHash.startsWith("oauth:v1:")) {
    const provider = user.passwordHash.split(":")[2];
    return `SNS(${PROVIDER_LABEL[provider as "kakao" | "naver"] ?? provider}) 전용가입`;
  }
  return user.passwordHash;
}

// 카카오 이메일 미동의 시 저장되는 합성 placeholder 형식(0.3 참고) — 실제 이메일이 아님을 배지로 표시.
function isPlaceholderEmail(email: string): boolean {
  return /@no-email\.yourname\.internal$/.test(email);
}

// 정식 출시 전 임시 관리자 전용 화면 — ADMIN_EMAILS(lib/auth.ts)에 등록된 계정만 접근 가능.
// 회원가입/로그인 시 실제로 수집된 원본 값(user/oauth_account 테이블)을 그대로 나열한다 — 별도
// 집계나 가공 없이 "무엇이 입력되었는가"만 보여주는 러프한 조회 화면.
export default async function AdminUsersPage() {
  const currentUser = await getCurrentUser();
  if (!isAdminUser(currentUser)) {
    notFound();
  }

  const users = await listAllUsersForAdmin();

  return (
    <main className="flex flex-1 flex-col">
      <PageHero
        eyebrow="관리자"
        title="회원관리"
        description={`가입 시 입력·수집된 정보를 그대로 나열합니다. 총 ${users.length}명.`}
      />

      <section className="mx-auto w-full max-w-4xl px-6 pb-16">
        <div className="flex flex-col gap-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="rounded-card border border-border bg-surface p-5 shadow-[var(--shadow-elevated)]"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-[14px] font-semibold text-text-primary">
                  #{user.id} · {user.email}
                  {isPlaceholderEmail(user.email) && (
                    <span className="ml-2 rounded-control bg-surface-muted px-2 py-0.5 text-[11px] font-normal text-text-secondary">
                      합성 placeholder (실제 이메일 아님)
                    </span>
                  )}
                </p>
                <p className="text-[12px] text-text-secondary">가입일 {formatDateTime(user.createdAt)}</p>
              </div>

              <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2">
                <div className="flex gap-2">
                  <dt className="shrink-0 text-text-secondary">가입 방식</dt>
                  <dd className="text-text-primary">{signupMethodLabel(user)}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0 text-text-secondary">닉네임(display_name)</dt>
                  <dd className="text-text-primary">{user.displayName ?? "(없음, 선택 미동의)"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0 text-text-secondary">회원이름(실명)</dt>
                  <dd className="text-text-primary">{user.realName ?? "(없음, 카카오는 항상 미제공)"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0 text-text-secondary">휴대전화번호</dt>
                  <dd className="text-text-primary">{user.phone ?? "(없음, 미동의 또는 이메일/비밀번호 가입)"}</dd>
                </div>
              </dl>

              {user.oauthAccounts.length > 0 && (
                <div className="mt-3 border-t border-border pt-3">
                  <p className="mb-1.5 text-[12px] font-medium text-text-secondary">연결된 소셜 계정</p>
                  <ul className="flex flex-col gap-1">
                    {user.oauthAccounts.map((account) => (
                      <li
                        key={`${account.provider}:${account.providerAccountId}`}
                        className="flex flex-wrap items-baseline gap-x-2 rounded-control bg-surface-muted px-3 py-1.5 text-[12px]"
                      >
                        <span className="font-medium text-text-primary">{PROVIDER_LABEL[account.provider]}</span>
                        <span className="text-text-secondary">provider_account_id: {account.providerAccountId}</span>
                        <span className="text-text-secondary">연결일 {formatDateTime(account.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}

          {users.length === 0 && (
            <p className="rounded-control border border-border bg-surface-muted p-4 text-[13px] text-text-secondary">
              가입한 회원이 없습니다.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
