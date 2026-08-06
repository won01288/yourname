import NamingWizardClient from "./NamingWizardClient";
import ServiceComingSoon from "@/app/components/ServiceComingSoon";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { getInProgressNamingOrder } from "@/lib/db-payment";
import { resolveNamingSessionRootId, getNamingSessionResults } from "@/lib/db-auth";
import type { NameApiResult, NameRequestPayload } from "@/app/lib/name-client";

// 로그인 베타 — 위저드 화면 자체는 비로그인도 볼 수 있지만, 최종 제출은 로그인이 필요하다
// (app/api/name/route.ts가 401로 실제 강제). 여기서는 서버에서 로그인 여부만 확인해 클라이언트
// 위저드에 prop으로 내려준다.
//
// 정식 출시 전 임시 게이트 — 관리자 계정(ADMIN_EMAILS)이 아니면 위저드 대신 "서비스 준비 중" 안내만
// 보여준다. 랜딩 카드·Nav 링크 어디서 들어와도 결국 이 페이지로 오므로 여기 하나만 막으면 되고,
// URL 직접 입력으로 우회할 수 없다. 실제 API(app/api/name/route.ts)도 같은 기준으로 별도 차단한다.
export default async function NamingPage({
  searchParams,
}: {
  searchParams: Promise<{ more?: string; parentId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!isAdminUser(user)) {
    return <ServiceComingSoon />;
  }
  // 2026.8.5 — 결제까지 마치고 백그라운드에서 생성 중인 요청이 있으면(카카오페이 앱 전환 등으로
  // 클라이언트 상태가 유실돼도 서버 쪽 진행 상태는 남아있다), 위저드가 렌더되기 전에 이미 알아내
  // 첫 페인트부터 로딩 화면만 보이게 한다 — 잠깐이라도 위저드 첫 화면이 보이지 않도록.
  const inProgressOrder = user ? await getInProgressNamingOrder(user.id) : null;

  // "같은 사주로 더 추천받기"(CLAUDE.md 0.6) — 진행 중인 생성이 없을 때만 확인한다(더 급한 상태가
  // 우선). /naming?more=1&parentId=N 형태로 리포트 하단·마이페이지에서 진입한다. 대상을 못 찾거나
  // 이미 잔여 개수가 0이면 조용히 폴백해 평범한 새 위저드처럼 동작한다.
  let moreMode: { parentNamingResultId: number; moreAvailableCount: number; prefillPayload: NameRequestPayload } | null =
    null;
  if (!inProgressOrder && user) {
    const params = await searchParams;
    const parentIdRaw = Number(params.parentId);
    if (params.more === "1" && Number.isInteger(parentIdRaw)) {
      const rootId = await resolveNamingSessionRootId(parentIdRaw, user.id);
      if (rootId !== null) {
        const sessionRows = await getNamingSessionResults(rootId, user.id);
        const rootRow = sessionRows.find((row) => row.id === rootId);
        const latestRow = sessionRows[sessionRows.length - 1]; // ORDER BY created_at ASC
        if (rootRow && latestRow) {
          const latestResult = JSON.parse(latestRow.result) as NameApiResult;
          const moreAvailableCount = latestResult.moreAvailableCount ?? 0;
          if (moreAvailableCount > 0) {
            moreMode = {
              parentNamingResultId: rootId,
              moreAvailableCount,
              prefillPayload: JSON.parse(rootRow.requestPayload) as NameRequestPayload,
            };
          }
        }
      }
    }
  }

  return (
    <NamingWizardClient isLoggedIn={Boolean(user)} inProgressOrder={inProgressOrder} moreMode={moreMode} />
  );
}
