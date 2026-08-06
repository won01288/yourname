import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { getNamingResultByIdForAdmin } from "@/lib/db-auth";
import type { NameApiResult, NameRequestPayload } from "@/app/lib/name-client";
import AdminNamingDetailClient from "./AdminNamingDetailClient";

// Date.now()를 컴포넌트 함수 본문에서 직접 부르면 eslint react-hooks/purity가 "렌더 중 impure
// 호출"로 걸린다(app/admin/users/page.tsx의 동명 헬퍼와 동일한 이유로 별도 함수로 분리).
function isExpired(expiresAtSql: string): boolean {
  const date = new Date(`${expiresAtSql.replace(" ", "T")}Z`);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

// 관리자 회원관리(app/admin/users)에서 "리포트 보기"로 들어오는 읽기 전용 상세 화면. 소유권
// (user_id)·만료(expires_at) 조건 없이 id만으로 조회한다 — 30일이 지나 회원 화면에서는 더 이상
// 보이지 않는 결과도 관리자는 문의 대응 등을 위해 열람할 수 있어야 한다.
export default async function AdminNamingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const currentUser = await getCurrentUser();
  if (!isAdminUser(currentUser)) {
    notFound();
  }

  const numericId = Number(id);
  if (!Number.isInteger(numericId)) {
    notFound();
  }

  const row = await getNamingResultByIdForAdmin(numericId);
  if (!row) {
    notFound();
  }

  const data = JSON.parse(row.result) as NameApiResult;
  const requestPayload = JSON.parse(row.requestPayload) as NameRequestPayload;

  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-3xl px-6 pt-6">
        <Link href="/admin/users" className="text-[13px] font-medium text-brand-600 hover:underline">
          ← 회원관리로
        </Link>
        <p className="mt-2 text-[12px] text-text-secondary">
          관리자 열람 · 회원 #{row.userId}의 결과입니다.
          {isExpired(row.expiresAt) && (
            <span className="ml-2 rounded-control bg-surface-muted px-2 py-0.5 text-[11px] text-text-secondary">
              회원 화면에서는 30일 만료로 더 이상 보이지 않음
            </span>
          )}
        </p>
      </div>
      <AdminNamingDetailClient data={data} requestPayload={requestPayload} />
    </main>
  );
}
