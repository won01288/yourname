"use client";

import { useEffect, useState } from "react";
import {
  buildKakaoExternalBrowserUrl,
  isAndroidUserAgent,
  isIOSUserAgent,
  isKakaoTalkInApp,
} from "@/app/lib/inAppBrowser";

// 결제(CLAUDE.md 0.4)로 이어지는 /naming 전용 — 카카오톡 인앱 브라우저는 결제 SDK의 앱 전환·
// 리다이렉트를 안정적으로 지원하지 않는다(iOS에서 카드사 앱 호출 후 복귀 실패가 대표 사례). 결제
// 시작 시점이 아니라 위저드 진입 시점에 최대한 이르게 기본 브라우저로 옮겨, 이후 흐름(로그인·
// 작성·결제) 전체가 하나의 일관된 브라우저 컨텍스트 안에서만 일어나게 한다 — 컨텍스트가 중간에
// 바뀌면서 상태가 끊기는 문제를 애초에 만들지 않는 접근이다. /score(무료, 결제 없음)는 이 문제와
// 무관해 적용하지 않는다.
export default function InAppBrowserGuard() {
  const [showIOSBanner, setShowIOSBanner] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (!isKakaoTalkInApp(ua)) return;

    if (isAndroidUserAgent(ua)) {
      // 카카오가 공식 제공하는 스킴으로 사용자 동작 없이 즉시 이동한다. 이동 후 열리는 기본
      // 브라우저의 userAgent에는 KAKAOTALK이 없으므로 다시 트리거되지 않는다(무한 루프 없음).
      window.location.href = buildKakaoExternalBrowserUrl(window.location.href);
      return;
    }

    if (isIOSUserAgent(ua)) {
      // iOS는 앱이 사파리를 강제로 열 수 없다(애플 정책) — 안내 배너로 사용자가 직접 나가게 한다.
      // navigator.userAgent(외부 시스템)를 마운트 시 1회 동기화하는 것이라 setState가 effect
      // 본문에 있을 수밖에 없다(NamingWizardClient.tsx의 sessionStorage 복원과 동일한 패턴).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowIOSBanner(true);
    }
  }, []);

  if (!showIOSBanner) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-4">
      <div className="flex items-start justify-between gap-3 rounded-card border border-border bg-surface-muted px-4 py-3.5 text-[13px] leading-6 text-text-primary shadow-[var(--shadow-elevated)]">
        <p className="flex-1">
          카카오톡 브라우저에서는 결제가 불안정할 수 있어요. 우측 상단 <strong>⋯</strong> 메뉴에서{" "}
          <strong>&quot;다른 브라우저로 열기&quot;</strong>(또는 Safari로 열기)를 선택해 주세요.
        </p>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={handleCopyLink}
            className="rounded-control border border-border bg-surface px-3 py-1.5 text-[12px] font-medium text-text-primary transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
          >
            {copied ? "복사됨" : "링크 복사"}
          </button>
          <button
            type="button"
            onClick={() => setShowIOSBanner(false)}
            className="text-[12px] text-text-secondary underline underline-offset-2"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
