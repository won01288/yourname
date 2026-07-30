import type { Metadata } from "next";
import "./globals.css";
import Nav from "./components/Nav";
import Footer from "./components/Footer";

export const metadata: Metadata = {
  title: "유어네임 — 사주 기반 정통 작명",
  description:
    "무료로 이름 점수를 확인하거나, 사주를 분석해 용신에 맞는 이름 후보와 근거 리포트를 받아보세요.",
};

// 다크모드 FOUC 방지: React 하이드레이션 전에 저장된 테마를 <html>에 반영한다.
// 기본 테마는 다크 — 사용자가 토글로 라이트를 명시적으로 선택한 적이 없으면 항상 다크.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = window.localStorage.getItem('theme');
    var theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-page text-text-primary">
        <Nav />
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
