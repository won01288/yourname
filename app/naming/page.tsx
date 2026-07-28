import NamingWizardClient from "./NamingWizardClient";
import { getCurrentUser } from "@/lib/auth";

// 로그인 베타 — 위저드 화면 자체는 비로그인도 볼 수 있지만, 최종 제출은 로그인이 필요하다
// (app/api/name/route.ts가 401로 실제 강제). 여기서는 서버에서 로그인 여부만 확인해 클라이언트
// 위저드에 prop으로 내려준다.
export default async function NamingPage() {
  const user = await getCurrentUser();
  return <NamingWizardClient isLoggedIn={Boolean(user)} />;
}
