"use client";

import { useRouter } from "next/navigation";
import ResultsDashboard from "@/app/components/ResultsDashboard";
import type { NameApiResult, NameRequestPayload } from "@/app/lib/name-client";

// app/mypage/naming/[id]/NamingDetailClient.tsx와 동일한 얇은 래퍼. 관리자 열람 전용이라
// "마이페이지로" 대신 회원관리 목록으로 돌아간다. data.namingResultId를 일부러 채우지 않아
// ResultsDashboard의 "같은 사주로 이름 더 추천받기" CTA(그 회원 소유의 세션이라 관리자 계정으로
// 누르면 소유권 검증에서 막힐 뿐인 버튼)를 노출하지 않는다 — 읽기 전용 열람만 지원한다.
export default function AdminNamingDetailClient({
  data,
  requestPayload,
}: {
  data: NameApiResult;
  requestPayload: NameRequestPayload;
}) {
  const router = useRouter();
  return (
    <ResultsDashboard
      data={data}
      onRestart={() => router.push("/admin/users")}
      restartLabel="회원관리로"
      searchPayload={requestPayload}
    />
  );
}
