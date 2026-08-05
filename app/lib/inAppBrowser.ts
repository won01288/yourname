// 카카오톡 인앱 브라우저 감지 + 외부 브라우저 이동 유틸. 결제(CLAUDE.md 0.4) SDK가 카카오톡
// 인앱브라우저의 제약(팝업 차단, 쿠키/세션스토리지 격리, 앱 전환 리다이렉트 미지원)에 걸려 결제
// 도중 원래 화면으로 되돌아가는 문제 대응용 — 카카오 개발자포럼에도 "인앱브라우저에서 PG결제 등이
// 안 되는 경우가 많다"고 공식적으로 언급된, 우리 코드로는 고칠 수 없는 브라우저 자체의 제약이다.

export function isKakaoTalkInApp(userAgent: string): boolean {
  return /kakaotalk/i.test(userAgent);
}

export function isAndroidUserAgent(userAgent: string): boolean {
  return /android/i.test(userAgent);
}

export function isIOSUserAgent(userAgent: string): boolean {
  return /iphone|ipad|ipod/i.test(userAgent);
}

// 카카오톡이 공식 제공하는 스킴 — 안드로이드에서 사용자 동작 없이 기본 브라우저를 띄운다.
// iOS는 앱이 사파리를 강제로 열 수 없다는 플랫폼 제약이 있어(애플 정책) 이 스킴을 쓰지 않는다.
export function buildKakaoExternalBrowserUrl(targetUrl: string): string {
  return `kakaotalk://web/openExternal?url=${encodeURIComponent(targetUrl)}`;
}
