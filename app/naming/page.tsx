import NamingWizardClient from "./NamingWizardClient";
import ServiceComingSoon from "@/app/components/ServiceComingSoon";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { getInProgressNamingOrder } from "@/lib/db-payment";

// 로그인 베타 — 위저드 화면 자체는 비로그인도 볼 수 있지만, 최종 제출은 로그인이 필요하다
// (app/api/name/route.ts가 401로 실제 강제). 여기서는 서버에서 로그인 여부만 확인해 클라이언트
// 위저드에 prop으로 내려준다.
//
// 정식 출시 전 임시 게이트 — 관리자 계정(ADMIN_EMAILS)이 아니면 위저드 대신 "서비스 준비 중" 안내만
// 보여준다. 랜딩 카드·Nav 링크 어디서 들어와도 결국 이 페이지로 오므로 여기 하나만 막으면 되고,
// URL 직접 입력으로 우회할 수 없다. 실제 API(app/api/name/route.ts)도 같은 기준으로 별도 차단한다.
export default async function NamingPage() {
  const user = await getCurrentUser();
  if (!isAdminUser(user)) {
    return <ServiceComingSoon />;
  }
  // 2026.8.5 — 결제까지 마치고 백그라운드에서 생성 중인 요청이 있으면(카카오페이 앱 전환 등으로
  // 클라이언트 상태가 유실돼도 서버 쪽 진행 상태는 남아있다), 위저드가 렌더되기 전에 이미 알아내
  // 첫 페인트부터 로딩 화면만 보이게 한다 — 잠깐이라도 위저드 첫 화면이 보이지 않도록.
  const inProgressOrder = user ? await getInProgressNamingOrder(user.id) : null;
  return <NamingWizardClient isLoggedIn={Boolean(user)} inProgressOrder={inProgressOrder} />;
}
