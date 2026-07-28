"use client";

import { useRouter } from "next/navigation";
import ScoreDashboard from "@/app/components/ScoreDashboard";
import type { ScoreApiResult } from "@/app/lib/score-client";

// ScoreDashboard의 onRestart는 함수 prop이라 Server Component(부모 page.tsx)에서 직접 넘길 수
// 없어, 라우팅만 담당하는 얇은 클라이언트 래퍼로 감싼다.
export default function ScoreDetailClient({ data }: { data: ScoreApiResult }) {
  const router = useRouter();
  return <ScoreDashboard data={data} onRestart={() => router.push("/mypage")} restartLabel="마이페이지로" />;
}
