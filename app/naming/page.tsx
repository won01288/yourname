import NamingWizardClient from "./NamingWizardClient";
import { getCurrentUser } from "@/lib/auth";
import { getInProgressNamingOrder } from "@/lib/db-payment";
import { resolveNamingSessionRootId, getNamingSessionResults } from "@/lib/db-auth";
import type { NameApiResult, NameRequestPayload } from "@/app/lib/name-client";

// 로그인 베타 — 위저드 화면 자체는 비로그인도 볼 수 있지만, 최종 제출은 로그인이 필요하다
// (app/api/name/route.ts가 401로 실제 강제). 여기서는 서버에서 로그인 여부만 확인해 클라이언트
// 위저드에 prop으로 내려준다.
//
// 정식 출시 전 임시 게이트(관리자 전용)는 CLAUDE.md 5장 Phase 6~에서 도입해 2026.8.6까지 유지했다.
// 6장 미결정 "프리미엄 작명 공개 오픈 여부"가 확정돼 제거했다 — app/api/name/route.ts의 동일 게이트도
// 같은 시점에 함께 제거했다(둘이 항상 같은 기준을 공유해야 한다는 기존 원칙 유지). ADMIN_FREE_TIER_
// CANDIDATE_COUNT(lib/payment/config.ts) 무료 티어는 여전히 관리자 전용으로 남는다 — 일반 사용자는
// 이제 전부 정상 결제를 거친다.
export default async function NamingPage({
  searchParams,
}: {
  searchParams: Promise<{ more?: string; parentId?: string }>;
}) {
  const user = await getCurrentUser();
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
