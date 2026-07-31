import NamingWizardClient from "./NamingWizardClient";
import ServiceComingSoon from "@/app/components/ServiceComingSoon";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

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
  return <NamingWizardClient isLoggedIn={Boolean(user)} />;
}
