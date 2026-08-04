// 결제(페이앱, CLAUDE.md 0.4) — 절대 URL 생성 등 provider 구현이 공통으로 쓰는 잡다한 설정.

// feedbackurl/returnurl은 페이앱이 우리 서버로 다시 호출/리다이렉트하는 절대경로라 반드시
// https://도메인 형태여야 한다. APP_BASE_URL을 명시적으로 준 경우 그걸 쓰고, 없으면 Vercel이
// 자동으로 채워주는 VERCEL_URL로 배포 도메인을 추정하며, 그마저 없으면(로컬 개발) localhost로
// 폴백한다 — 로컬에서는 페이앱이 실제로 도달할 수 없으니 ngrok 등 외부 접근 가능한 URL이
// 별도로 필요하다(README/CLAUDE.md에 안내).
export function getAppBaseUrl(): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
