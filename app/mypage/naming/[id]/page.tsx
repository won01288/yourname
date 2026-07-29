import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getNamingResultById } from "@/lib/db-auth";
import type { NameApiResult, NameRequestPayload } from "@/app/lib/name-client";
import NamingDetailClient from "./NamingDetailClient";

export default async function MyPageNamingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/mypage/naming/${id}`)}`);
  }

  const numericId = Number(id);
  if (!Number.isInteger(numericId)) {
    notFound();
  }

  // getNamingResultById는 소유권(user_id)뿐 아니라 만료(expires_at > CURRENT_TIMESTAMP)도
  // SQL에서 함께 걸러낸다 — 30일이 지난 결과는 여기서 자연스럽게 404가 된다.
  const row = await getNamingResultById(numericId, user.id);
  if (!row) {
    notFound();
  }

  const data = JSON.parse(row.result) as NameApiResult;
  const requestPayload = JSON.parse(row.requestPayload) as NameRequestPayload;
  return <NamingDetailClient data={data} requestPayload={requestPayload} />;
}
