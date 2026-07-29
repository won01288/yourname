"use client";

import { useRouter } from "next/navigation";
import ResultsDashboard from "@/app/components/ResultsDashboard";
import type { NameApiResult, NameRequestPayload } from "@/app/lib/name-client";

export default function NamingDetailClient({
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
      onRestart={() => router.push("/mypage")}
      restartLabel="마이페이지로"
      searchPayload={requestPayload}
    />
  );
}
