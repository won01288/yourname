"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { CandidateCount } from "@/lib/naming/config";

interface InProgressOrder {
  orderId: number;
  candidateCount: CandidateCount;
}

// 결제 완료 후 백그라운드에서 계속 진행되는 작명 생성을, 사용자가 다른 화면으로 이동해도 놓치지
// 않도록 어느 페이지에서든 상단에 얇은 진행 상태 바로 보여준다(CLAUDE.md 0.4의 "결제 완료 후
// 위저드 첫 화면으로 복귀" 계열 버그들과 같은 근본 문제 — 클라이언트 상태가 화면 전환으로 유실되는
// 것 — 를, "그 상태를 아예 어디서든 보이게" 만들어 완화한다). /naming의 activeInProgressOrder
// 폴링(3초 간격, 확정된 진행 건 전용)보다 더 가벼운 주기로 "지금 뭔가 진행 중인지"만 확인한다.
// 클릭하면 /naming으로 이동하는데, 그 서버 컴포넌트가 같은 값을 다시 조회해 곧바로 본 로딩 화면
// (LoadingStages)으로 이어준다 — 이 배너는 알리고 이동시키는 역할만 하고, 진행 상태 자체의
// 신뢰 소스는 여전히 서버(payment_order.status)다.
const POLL_INTERVAL_MS = 15000;

export default function InProgressBanner({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname();
  const [order, setOrder] = useState<InProgressOrder | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;

    let cancelled = false;
    const check = () => {
      if (document.visibilityState === "hidden") return;
      fetch("/api/payment/in-progress")
        .then((res) => (res.ok ? res.json() : null))
        .then((data: InProgressOrder | null) => {
          if (!cancelled) setOrder(data);
        })
        .catch(() => {
          // 네트워크 일시 오류 — 다음 폴링/이벤트에서 재시도
        });
    };

    check();
    const timer = setInterval(check, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [isLoggedIn]);

  // /naming 화면은 이미 자체적으로 같은 값을 확인해 전체 로딩 화면(LoadingStages)으로 전환하므로,
  // 그 위에 이 배너까지 중복으로 띄우지 않는다.
  if (!order || pathname?.startsWith("/naming")) return null;

  return (
    <Link
      href="/naming"
      className="sticky top-16 z-30 flex items-center justify-center gap-2 border-b border-border bg-gradient-to-r from-brand-400 to-brand-600 px-4 py-2 text-center text-[13px] font-medium text-white shadow-[var(--shadow-brand-glow)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      <span className="inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-white" aria-hidden="true" />
      <span>이름 {order.candidateCount}개 생성이 진행 중이에요 · 눌러서 진행 상황 보기</span>
      <span aria-hidden="true">→</span>
    </Link>
  );
}
