import type { Metadata } from "next";
import "./globals.css";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import InProgressBanner from "./components/InProgressBanner";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "유어네임 — 사주 기반 정통 작명",
  description:
    "무료로 이름 점수를 확인하거나, 사주를 분석해 용신에 맞는 이름 후보와 근거 리포트를 받아보세요.",
};

// 다크모드 FOUC 방지: React 하이드레이션 전에 저장된 테마를 <html>에 반영한다.
// 기본 테마는 라이트 — 사용자가 토글로 다크를 명시적으로 선택한 적이 없으면 항상 라이트.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = window.localStorage.getItem('theme');
    var theme = stored === 'light' || stored === 'dark' ? stored : 'light';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Nav도 각자 getCurrentUser()를 호출한다(Nav 자체의 로그인 상태 표시용) — 여기선 배너가 로그인
  // 사용자에게만 폴링을 시작하도록 그 여부만 별도로 확인한다. 이미 cookies()를 읽어 동적 렌더링인
  // 라우트(Nav 때문)이므로 이 추가 호출이 새로운 트레이드오프를 만들지는 않는다.
  const user = await getCurrentUser();

  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-page text-text-primary">
        <Nav />
        <InProgressBanner isLoggedIn={Boolean(user)} />
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
