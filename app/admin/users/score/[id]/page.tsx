import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { getScoreResultByIdForAdmin } from "@/lib/db-auth";
import type { ScoreApiResult, ScoreRequestPayload } from "@/app/lib/score-client";
import AdminScoreDetailClient from "./AdminScoreDetailClient";

// 관리자 회원관리(app/admin/users)에서 "리포트 보기"로 들어오는 읽기 전용 상세 화면. 소유권
// (user_id) 조건 없이 id만으로 조회하므로, 어떤 회원의 결과든 관리자 계정이면 열람할 수 있다.
export default async function AdminScoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const currentUser = await getCurrentUser();
  if (!isAdminUser(currentUser)) {
    notFound();
  }

  const numericId = Number(id);
  if (!Number.isInteger(numericId)) {
    notFound();
  }

  const row = await getScoreResultByIdForAdmin(numericId);
  if (!row) {
    notFound();
  }

  const data = JSON.parse(row.result) as ScoreApiResult;
  const requestPayload = JSON.parse(row.requestPayload) as ScoreRequestPayload;

  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-3xl px-6 pt-6">
        <Link href="/admin/users" className="text-[13px] font-medium text-brand-600 hover:underline">
          ← 회원관리로
        </Link>
        <p className="mt-2 text-[12px] text-text-secondary">관리자 열람 · 회원 #{row.userId}의 결과입니다.</p>
      </div>
      <AdminScoreDetailClient data={data} requestPayload={requestPayload} />
    </main>
  );
}
