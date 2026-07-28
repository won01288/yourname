import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getScoreResultById } from "@/lib/db-auth";
import type { ScoreApiResult } from "@/app/lib/score-client";
import ScoreDetailClient from "./ScoreDetailClient";

export default async function MyPageScoreDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/mypage/score/${id}`)}`);
  }

  const numericId = Number(id);
  if (!Number.isInteger(numericId)) {
    notFound();
  }

  // getScoreResultById가 SQL의 WHERE user_id = ?로 소유권을 강제하므로, 다른 사용자의 id로
  // 접근하면 여기서 null이 되어 그대로 404가 된다.
  const row = await getScoreResultById(numericId, user.id);
  if (!row) {
    notFound();
  }

  const data = JSON.parse(row.result) as ScoreApiResult;
  return <ScoreDetailClient data={data} />;
}
