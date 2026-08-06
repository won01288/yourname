"use client";

import { useRouter } from "next/navigation";
import ScoreDashboard from "@/app/components/ScoreDashboard";
import type { ScoreApiResult, ScoreRequestPayload } from "@/app/lib/score-client";

// app/mypage/score/[id]/ScoreDetailClient.tsx와 동일한 얇은 래퍼 — onRestart가 함수 prop이라
// Server Component(page.tsx)에서 직접 넘길 수 없어 클라이언트 컴포넌트로 감쌌다. 관리자 열람
// 전용이라 "마이페이지로" 대신 회원관리 목록으로 돌아간다.
export default function AdminScoreDetailClient({
  data,
  requestPayload,
}: {
  data: ScoreApiResult;
  requestPayload: ScoreRequestPayload;
}) {
  const router = useRouter();
  return (
    <ScoreDashboard
      data={data}
      onRestart={() => router.push("/admin/users")}
      restartLabel="회원관리로"
      searchPayload={requestPayload}
    />
  );
}
