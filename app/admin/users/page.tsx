import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import {
  listAllUsersForAdmin,
  listAllScoreResultsForAdmin,
  listAllNamingResultsForAdmin,
  type AdminUserRow,
} from "@/lib/db-auth";
import { listAllPaymentOrdersForAdmin } from "@/lib/db-payment";
import type { PaymentOrder, PaymentStatus } from "@/lib/payment/types";
import type { ScoreApiResult, ScoreRequestPayload } from "@/app/lib/score-client";
import type { NameApiResult, NameRequestPayload } from "@/app/lib/name-client";
import PageHero from "@/app/components/PageHero";

const PROVIDER_LABEL: Record<"kakao" | "naver", string> = {
  kakao: "카카오",
  naver: "네이버",
};

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "결제 대기",
  paid: "결제완료",
  consumed: "결제완료 · 생성 사용됨",
  canceled: "취소됨",
  failed: "실패",
};

// 웹훅 pay_type 정규화 값(lib/payment/payapp.ts normalizePayType) → 표시용 한글 라벨.
// 목록에 없는 값은 원본 문자열을 그대로 보여준다(2026.8.7).
const PAYMENT_TYPE_LABEL: Record<string, string> = {
  card: "카드",
  applepay: "애플페이",
  payco: "페이코",
  vbank: "가상계좌",
  phone: "휴대폰결제",
  kakaopay: "카카오페이",
  naverpay: "네이버페이",
  rbank: "계좌이체",
  smilepay: "스마일페이",
  wechat: "위챗페이",
  myaccount: "내통장결제",
  tosspay: "토스페이",
  dvpay: "나나결제",
};

// 결제 자체가 확정된(웹훅으로 돈이 실제로 들어온) 상태만 "결제한 금액" 합계에 포함한다.
// consumed는 그 결제로 생성까지 마쳤다는 뜻일 뿐 여전히 결제완료 상태다.
const PAID_STATUSES: PaymentStatus[] = ["paid", "consumed"];

function formatDateTime(iso: string): string {
  const date = new Date(iso.includes("T") ? iso : `${iso.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function isExpired(expiresAtSql: string): boolean {
  const date = new Date(`${expiresAtSql.replace(" ", "T")}Z`);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

// 검색 당시 입력한 생년월일시를 "1993.8.23(음) 16:30" 형태로 표시한다(app/mypage/page.tsx의
// formatBirthLabel과 동일한 목적, 관리자 화면은 축약 없이 연도 4자리를 그대로 쓴다).
function formatBirthLabel(payload: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  isLunar: boolean;
  isLeapMonth?: boolean;
}): string {
  const calendarSuffix = payload.isLunar ? (payload.isLeapMonth ? "(음·윤)" : "(음)") : "";
  const hh = String(payload.hour).padStart(2, "0");
  const mm = String(payload.minute).padStart(2, "0");
  return `${payload.year}.${payload.month}.${payload.day}${calendarSuffix} ${hh}:${mm}`;
}

function formatAmount(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
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

function groupByUserId<T extends { userId: number }>(rows: T[]): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const row of rows) {
    const list = map.get(row.userId);
    if (list) list.push(row);
    else map.set(row.userId, [row]);
  }
  return map;
}

// 정식 출시 전 임시 관리자 전용 화면 — ADMIN_EMAILS(lib/auth.ts)에 등록된 계정만 접근 가능.
// 회원가입/로그인 시 실제로 수집된 원본 값(user/oauth_account 테이블)에 더해, 결제 내역(금액)과
// 검색 조건별 결과 리포트(이름 점수 확인·프리미엄 작명)를 회원별로 그룹핑해 함께 보여준다 — 새
// 집계 로직 없이 이미 있는 테이블(payment_order/score_result/naming_result)을 그대로 나열한다.
export default async function AdminUsersPage() {
  const currentUser = await getCurrentUser();
  if (!isAdminUser(currentUser)) {
    notFound();
  }

  const [users, paymentOrders, scoreRows, namingRows] = await Promise.all([
    listAllUsersForAdmin(),
    listAllPaymentOrdersForAdmin(),
    listAllScoreResultsForAdmin(),
    listAllNamingResultsForAdmin(),
  ]);

  const paymentsByUser = groupByUserId(paymentOrders);
  const scoresByUser = groupByUserId(scoreRows);
  const namingsByUser = groupByUserId(namingRows);

  return (
    <main className="flex flex-1 flex-col">
      <PageHero
        eyebrow="관리자"
        title="회원관리"
        description={`가입 정보·결제 내역·검색 결과 리포트를 회원별로 나열합니다. 총 ${users.length}명.`}
      />

      <section className="mx-auto w-full max-w-4xl px-6 pb-16">
        <div className="flex flex-col gap-3">
          {users.map((user) => {
            const orders: PaymentOrder[] = paymentsByUser.get(user.id) ?? [];
            const totalPaid = orders
              .filter((order) => PAID_STATUSES.includes(order.status))
              .reduce((sum, order) => sum + order.amount, 0);
            const scores = scoresByUser.get(user.id) ?? [];
            const namings = namingsByUser.get(user.id) ?? [];

            return (
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
                  <div className="flex gap-2 sm:col-span-2">
                    <dt className="shrink-0 text-text-secondary">누적 결제금액</dt>
                    <dd className="font-semibold text-text-primary">
                      {formatAmount(totalPaid)}
                      {orders.length > 0 && (
                        <span className="ml-1 font-normal text-text-secondary">(주문 {orders.length}건)</span>
                      )}
                    </dd>
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

                {orders.length > 0 && (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="mb-1.5 text-[12px] font-medium text-text-secondary">결제 내역</p>
                    <ul className="flex flex-col gap-1">
                      {orders.map((order) => (
                        <li
                          key={order.id}
                          className="flex flex-wrap items-baseline gap-x-2 rounded-control bg-surface-muted px-3 py-1.5 text-[12px]"
                        >
                          <span className="font-medium text-text-primary">
                            {order.candidateCount}개 추천 · {formatAmount(order.amount)}
                          </span>
                          <span className="text-text-secondary">{PAYMENT_STATUS_LABEL[order.status]}</span>
                          {order.payType && (
                            <span className="text-text-secondary">{PAYMENT_TYPE_LABEL[order.payType] ?? order.payType}</span>
                          )}
                          <span className="text-text-secondary">{order.provider}</span>
                          <span className="text-text-secondary">{formatDateTime(order.createdAt)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {scores.length > 0 && (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="mb-1.5 text-[12px] font-medium text-text-secondary">
                      이름 점수 확인 결과 ({scores.length}건)
                    </p>
                    <ul className="flex flex-col gap-1">
                      {scores.map((row) => {
                        const result = JSON.parse(row.result) as ScoreApiResult;
                        const payload = JSON.parse(row.requestPayload) as ScoreRequestPayload;
                        const nameLabel = `${result.surname.hangul}${result.givenName
                          .map((h) => h.readings[0] ?? h.char)
                          .join("")}`;
                        return (
                          <li
                            key={row.id}
                            className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 rounded-control bg-surface-muted px-3 py-1.5 text-[12px]"
                          >
                            <span className="flex flex-wrap items-baseline gap-x-2">
                              <span className="font-medium text-text-primary">{nameLabel}</span>
                              <span className="text-text-secondary">
                                {result.score.grade}등급 · {result.score.totalScore}점
                              </span>
                              <span className="text-text-secondary">생년월일시 {formatBirthLabel(payload)}</span>
                              <span className="text-text-secondary">{formatDateTime(row.createdAt)}</span>
                            </span>
                            <Link
                              href={`/admin/users/score/${row.id}`}
                              className="shrink-0 font-semibold text-brand-600 hover:underline"
                            >
                              리포트 보기 →
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {namings.length > 0 && (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="mb-1.5 text-[12px] font-medium text-text-secondary">
                      프리미엄 작명 결과 ({namings.length}건)
                    </p>
                    <ul className="flex flex-col gap-1">
                      {namings.map((row) => {
                        const result = JSON.parse(row.result) as NameApiResult;
                        const payload = JSON.parse(row.requestPayload) as NameRequestPayload;
                        return (
                          <li
                            key={row.id}
                            className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 rounded-control bg-surface-muted px-3 py-1.5 text-[12px]"
                          >
                            <span className="flex flex-wrap items-baseline gap-x-2">
                              <span className="font-medium text-text-primary">
                                {result.surname.hangul}({result.surname.hanja})
                              </span>
                              <span className="text-text-secondary">후보 {result.candidates.length}개</span>
                              {row.parentNamingResultId != null && (
                                <span className="text-text-secondary">추가 라운드</span>
                              )}
                              {isExpired(row.expiresAt) && (
                                <span className="text-text-secondary">(만료됨)</span>
                              )}
                              <span className="text-text-secondary">생년월일시 {formatBirthLabel(payload)}</span>
                              <span className="text-text-secondary">{formatDateTime(row.createdAt)}</span>
                            </span>
                            <Link
                              href={`/admin/users/naming/${row.id}`}
                              className="shrink-0 font-semibold text-brand-600 hover:underline"
                            >
                              리포트 보기 →
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}

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
