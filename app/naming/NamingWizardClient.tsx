"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Hero from "@/app/components/Hero";
import InputForm, { NAMING_WIZARD_LAST_STEP } from "@/app/components/InputForm";
import LoadingStages from "@/app/components/LoadingStages";
import ResultsDashboard from "@/app/components/ResultsDashboard";
import AuthRequiredModal from "@/app/components/AuthRequiredModal";
import PaymentRequiredModal from "@/app/components/PaymentRequiredModal";
import { submitNaming, type NameApiResult, type NameRequestPayload } from "@/app/lib/name-client";
import type { CandidateCount } from "@/lib/naming/config";

type Stage = "form" | "loading" | "result";

// 로그인 베타 — 로그인 안내 모달로 이어질 때 지금까지 입력한 값을 임시 보관하는 키.
// /naming?resume=1로 돌아왔을 때 이 값을 읽어 폼을 다시 채운다(위저드 처음부터 반복 방지).
const PENDING_NAMING_KEY = "yourname_pending_naming";

// 결제(CLAUDE.md 0.4) — 결제 모달로 이어질 때 지금까지 입력한 값을 임시 보관하는 키. 모바일
// 풀리다이렉트로 결제창에 갔다가 /naming?paymentReturn=1&orderId=N으로 돌아왔을 때 이 값을
// 읽어 폼을 복원한다. PENDING_NAMING_KEY와 동일한 목적, 결제 단계 전용으로 분리했다.
const PENDING_PAYMENT_KEY = "yourname_pending_payment";

// 2026.8.5 — 백그라운드 생성 복구 폴링 주기·타임아웃. LLM 해설 생성이 최대 3분 가까이 걸릴 수
// 있어(LoadingStages의 estimateWaitLabel 참고) 결제 폴링(1.5초)보다 느슨하게, 타임아웃은 넉넉하게 둔다.
const IN_PROGRESS_POLL_INTERVAL_MS = 3000;
const IN_PROGRESS_POLL_TIMEOUT_MS = 5 * 60 * 1000;

interface InProgressOrder {
  orderId: number;
  candidateCount: CandidateCount;
}

// "같은 사주로 더 추천받기"(CLAUDE.md 0.6) — app/naming/page.tsx가 이미 세션 루트를 확인하고
// 남은 개수(0 초과)까지 검증해 내려주는 값.
export interface MoreModeInfo {
  parentNamingResultId: number;
  moreAvailableCount: number;
  prefillPayload: NameRequestPayload;
}

interface NamingWizardClientProps {
  isLoggedIn: boolean;
  /** 서버(app/naming/page.tsx)가 getCurrentUser() 직후 isAdminUser()로 판단한 값(CLAUDE.md 0.4).
   * ADMIN_FREE_TIER_CANDIDATE_COUNT 무료 티어 표시·제출 분기(InputForm)에 그대로 전달한다 — 관리자
   * 전용 게이트가 제거된 뒤에도 이 화면엔 일반 사용자가 도달하므로, "도달했으면 항상 관리자"라고
   * 가정하지 않고 실제 값을 확인한다. */
  isAdmin: boolean;
  /** 서버(app/naming/page.tsx)가 이미 판단한 "결제는 끝났지만 아직 결과가 안 나온" 진행 중 주문
   * (2026.8.5). 있으면 위저드를 그릴 필요 없이 곧바로 로딩 화면만 보여준다 — 카카오페이 승인 앱
   * 전환 등으로 클라이언트 상태(로딩 화면)가 유실된 채 /naming을 새로고침해도, 사용자가 "처음
   * 화면으로 돌아갔다"고 오인하지 않도록 한다. */
  inProgressOrder: InProgressOrder | null;
  /** "같은 사주로 더 추천받기"(CLAUDE.md 0.6) — /naming?more=1&parentId=N으로 진입했을 때만 값이
   * 있다. 있으면 위저드를 처음부터 채우지 않고 추천 개수 선택 단계(마지막 단계)부터 시작한다. */
  moreMode: MoreModeInfo | null;
}

export default function NamingWizardClient({ isLoggedIn, isAdmin, inProgressOrder, moreMode }: NamingWizardClientProps) {
  const [stage, setStage] = useState<Stage>(inProgressOrder ? "loading" : "form");
  // 2026.8.5 — 서버가 최초 페이지 로드 시점에 판단한 inProgressOrder(prop, 불변)와 별개로, 탭이
  // 다시 보이는 시점마다 클라이언트가 새로 알아낸 값을 담는 state. 아래 visibilitychange 기반
  // effect가 갱신한다 — 이 state를 진짜 소스로 쓴다(prop은 초기값일 뿐).
  const [activeInProgressOrder, setActiveInProgressOrder] = useState<InProgressOrder | null>(inProgressOrder);
  const [submitting, setSubmitting] = useState(false);
  const [requestDone, setRequestDone] = useState(false);
  // 로그인 후 /naming?resume=1로 돌아온 경우, 모달을 띄우기 직전 sessionStorage에 저장해둔
  // 입력값을 복원하고, 마지막으로 있던 단계(4단계, 제출 버튼이 있던 화면)로 바로 이동시킨다 —
  // 4단계 위저드를 처음부터 다시 채우거나 다시 넘기게 하지 않기 위함이다.
  // 2026.7.30 — 두 state 모두 SSR과 동일한 기본값(null/false)으로 시작해야 한다. lazy
  // initializer로 마운트 시점에 곧바로 window/sessionStorage를 읽어 복원했더니, 서버는 항상
  // 0단계로 그리는데 클라이언트 첫 렌더는 이미 마지막 단계로 그려 트리 구조 자체가 달라지고
  // React가 "Hydration failed"로 전체 트리를 재생성하는 문제가 있었다(콘솔에서 실제 확인).
  // 대신 아래 useEffect에서만 복원한다 — 마운트 후(hydration 완료 후) 실행되므로 하이드레이션과
  // 무관한 평범한 state 갱신이 된다. 이 effect는 데이터를 찾았을 때만 setState하므로, Strict
  // Mode가 진단 목적으로 두 번 호출해도 안전하다(두 번째 호출은 이미 지워진 값을 읽어 아무것도
  // 하지 않을 뿐, 첫 번째 호출이 예약한 state 갱신을 되돌리지 않는다).
  const [lastPayload, setLastPayload] = useState<NameRequestPayload | null>(null);
  const [resumeToLastStep, setResumeToLastStep] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("resume") !== "1") return;
    const raw = sessionStorage.getItem(PENDING_NAMING_KEY);
    sessionStorage.removeItem(PENDING_NAMING_KEY);
    if (!raw) return;
    let payload: NameRequestPayload;
    try {
      payload = JSON.parse(raw) as NameRequestPayload;
    } catch {
      return; // 파싱 실패 시 복원하지 않고 빈 폼으로 진행한다.
    }
    // sessionStorage(외부 시스템)를 마운트 시 1회 동기화하는 것이라 setState가 effect 본문에
    // 있을 수밖에 없다 — 페이지 로드 이후 이 값이 바뀌는 걸 감지할 이벤트가 없어(같은 탭 안
    // 리다이렉트로만 채워짐) 구독형 패턴으로 바꿀 수 없다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastPayload(payload);
    setResumeToLastStep(true);
  }, []);

  // "같은 사주로 더 추천받기"(CLAUDE.md 0.6) — 서버(app/naming/page.tsx)가 이미 세션을 검증해
  // 내려준 moreMode가 있으면, 원본 생년월일시·성별·성씨를 그대로 채우고 추천 개수 선택 단계로
  // 바로 이동한다. resume 이펙트와 동일한 스타일(마운트 시 1회, 데이터가 있을 때만 setState).
  useEffect(() => {
    if (!moreMode) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastPayload({ ...moreMode.prefillPayload, parentNamingResultId: moreMode.parentNamingResultId });
    setResumeToLastStep(true);
  }, [moreMode]);

  const [surnameOptions, setSurnameOptions] = useState<string[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<NameApiResult | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  // 결제(CLAUDE.md 0.4) — 이번 세션에서 결제를 마친 주문. candidateCount를 함께 들고 있어야
  // 사용자가 개수를 바꾸면(이전 결제는 무효) 다시 결제를 요구할 수 있다.
  const [paidOrder, setPaidOrder] = useState<{ id: number; candidateCount: CandidateCount } | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [priceByCount, setPriceByCount] = useState<Partial<Record<CandidateCount, number>>>({});
  const pendingResult = useRef<NameApiResult | null>(null);

  // 결제 모달에 미리 가격을 보여주기 위한 공개 가격 조회(app/api/payment/price-tiers, 인증 불필요).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/payment/price-tiers")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { tiers?: { candidateCount: CandidateCount; price: number }[] } | null) => {
        if (cancelled || !data?.tiers) return;
        const map: Partial<Record<CandidateCount, number>> = {};
        for (const tier of data.tiers) map[tier.candidateCount] = tier.price;
        setPriceByCount(map);
      })
      .catch(() => {
        // 가격 표시만 실패할 뿐 결제 자체(checkout API)는 별도로 가격을 다시 조회하므로 무시한다.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const doSubmit = useCallback(async (payload: NameRequestPayload) => {
    setLastPayload(payload);
    setResumeToLastStep(false);
    setErrorMessage(null);
    setSubmitting(true);
    setRequestDone(false);
    setStage("loading");

    const outcome = await submitNaming(payload);
    setSubmitting(false);

    if (!outcome.ok) {
      setStage("form");
      // 세션이 제출 도중 만료된 것처럼 드문 경우에도, 일반 에러 배너 대신 로그인 모달로
      // 수렴시켜 클라이언트 사전 체크와 같은 UX를 준다.
      if (outcome.authRequired) {
        sessionStorage.setItem(PENDING_NAMING_KEY, JSON.stringify(payload));
        setShowAuthModal(true);
        return;
      }
      // 결제(CLAUDE.md 0.4) — 서버가 402를 준 드문 경우(주문이 다른 이유로 무효화된 등)에도
      // 결제 모달로 되돌려 다시 결제를 시도할 수 있게 한다. 무효화된 주문을 잊는다.
      if (outcome.paymentRequired) {
        setPaidOrder(null);
        sessionStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify(payload));
        setShowPaymentModal(true);
        return;
      }
      setErrorMessage(outcome.error);
      setSurnameOptions(outcome.surnameOptions ?? null);
      return;
    }

    setSurnameOptions(null);
    pendingResult.current = outcome.data;
    setRequestDone(true);
  }, []);

  const handleLoginRequired = useCallback((payload: NameRequestPayload) => {
    sessionStorage.setItem(PENDING_NAMING_KEY, JSON.stringify(payload));
    setLastPayload(payload);
    setShowAuthModal(true);
  }, []);

  const handlePaymentRequired = useCallback((payload: NameRequestPayload) => {
    sessionStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify(payload));
    setLastPayload(payload);
    setShowPaymentModal(true);
  }, []);

  const handlePaymentPaid = useCallback(
    (orderId: number) => {
      setShowPaymentModal(false);
      sessionStorage.removeItem(PENDING_PAYMENT_KEY);
      setLastPayload((current) => {
        if (!current) return current;
        setPaidOrder({ id: orderId, candidateCount: current.candidateCount });
        void doSubmit({ ...current, orderId });
        return current;
      });
    },
    [doSubmit]
  );

  // 결제(CLAUDE.md 0.4) — 모바일 등 풀리다이렉트 결제 흐름에서 결제창을 마치고 돌아온 경우.
  // returnUrl(app/api/payment/checkout)이 /naming?paymentReturn=1&orderId=N 형태로 넘겨준다.
  //
  // 2026.8.5 — sessionStorage(PENDING_PAYMENT_KEY)를 진짜 소스로 쓰지 않는다. 카카오페이/네이버페이
  // 승인처럼 앱 전환이 끼는 결제는, 카카오톡 인앱브라우저를 벗어나 Safari 등 정상 브라우저에서
  // 진행해도 승인 앱(카카오톡 등)을 왕복하는 과정에서 실제로 다른 탭/브라우저 컨텍스트로 돌아오는
  // 경우가 있어 원래 탭의 sessionStorage가 비어 있을 수 있다 — 그 결과 입력값을 복원하지 못하고
  // 위저드 첫 화면으로 되돌아가 버렸다(실사용 확인). 진짜 소스는 이제 서버에 저장해둔
  // payment_order.pending_payload다(app/api/payment/checkout이 결제 시작 시점에 저장) — orderId만
  // URL에 있으면 어느 탭/브라우저에서 열어도 복원할 수 있다. sessionStorage는 같은 탭이 유지되는
  // 흔한 경우를 위한 보조 폴백으로만 남겨둔다.
  useEffect(() => {
    // inProgressOrder가 있으면 이미 로딩 화면 + 아래 전용 폴링 effect가 복구를 맡고 있다 — 이
    // effect가 끼어들 필요가 없다(둘 다 같은 orderId를 다른 목적으로 조회하는 중복도 피한다).
    if (inProgressOrder) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("paymentReturn") !== "1") return;
    const orderId = Number(params.get("orderId"));
    if (!Number.isInteger(orderId)) return;

    const raw = sessionStorage.getItem(PENDING_PAYMENT_KEY);
    sessionStorage.removeItem(PENDING_PAYMENT_KEY);
    const fallbackPayload = ((): NameRequestPayload | null => {
      if (!raw) return null;
      try {
        return JSON.parse(raw) as NameRequestPayload;
      } catch {
        return null;
      }
    })();

    fetch(`/api/payment/orders/${orderId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { status?: string; payload?: NameRequestPayload | null } | null) => {
        const payload = data?.payload ?? fallbackPayload;
        if (!payload) return; // 복원할 입력값이 없으면 위저드 첫 화면에 그대로 둔다.

        setLastPayload(payload);
        setResumeToLastStep(true);

        if (data?.status === "paid") {
          setPaidOrder({ id: orderId, candidateCount: payload.candidateCount });
          void doSubmit({ ...payload, orderId });
        }
        // paid가 아니면(취소·아직 웹훅 미도착 등) 위저드 마지막 단계로만 복원해 두고, 사용자가
        // 다시 제출을 누르면 InputForm이 paidOrder 없음을 감지해 결제 모달을 다시 띄운다.
      })
      .catch(() => {
        // 조회 자체가 실패해도 세션스토리지 폴백이 있으면 최소한 마지막 단계 복원은 시도한다.
        if (!fallbackPayload) return;
        setLastPayload(fallbackPayload);
        setResumeToLastStep(true);
      });
  }, [doSubmit, inProgressOrder]);

  // 2026.8.5 — 결제 앱(카카오톡 등)에서 돌아올 때 브라우저가 항상 페이지를 완전히 새로고침하는
  // 건 아니다(백그라운드로 보냈던 탭을 그대로 복원하는 bfcache 방식이 흔하다) — 이 경우 서버
  // 컴포넌트가 다시 실행되지 않아 최초 렌더의 inProgressOrder prop이 최신 상태를 반영하지 못하고,
  // 사용자가 수동으로 새로고침해야만 로딩 화면이 나타났다(실사용 확인). 탭이 다시 보이는 시점
  // (pageshow/visibilitychange/focus)마다 클라이언트가 직접 /api/payment/in-progress로 재확인해,
  // 새로고침 없이도 1~3초 내로 로딩 화면으로 전환되게 한다. URL 쿼리·sessionStorage 어느 쪽에도
  // 의존하지 않는다 — 로그인한 사용자 기준으로 서버가 직접 조회한 값이라 어느 경로로 돌아왔든 같다.
  useEffect(() => {
    if (stage !== "form" || activeInProgressOrder) return;

    const checkInProgress = () => {
      if (document.visibilityState === "hidden") return;
      fetch("/api/payment/in-progress")
        .then((res) => (res.ok ? res.json() : null))
        .then((data: InProgressOrder | null) => {
          if (!data) return;
          setActiveInProgressOrder(data);
          setStage("loading");
        })
        .catch(() => {
          // 네트워크 일시 오류 — 다음 pageshow/visibilitychange/focus에서 재시도
        });
    };

    checkInProgress(); // 마운트 시 1회 — 하이드레이션 사이 상태가 바뀐 경우 대비
    document.addEventListener("visibilitychange", checkInProgress);
    window.addEventListener("pageshow", checkInProgress);
    window.addEventListener("focus", checkInProgress);
    return () => {
      document.removeEventListener("visibilitychange", checkInProgress);
      window.removeEventListener("pageshow", checkInProgress);
      window.removeEventListener("focus", checkInProgress);
    };
  }, [stage, activeInProgressOrder]);

  // activeInProgressOrder가 확인되면(서버 prop 또는 위 visibilitychange 재확인) 완료될 때까지
  // 주기적으로 상태를 조회한다. inProgressOrder는 서버(app/naming/page.tsx)가 이미 "결제 소비됐고
  // 결과 없음"으로 판단한 값이라, 카카오페이 승인 앱 전환으로 브라우저 컨텍스트가 바뀌어
  // 새로고침됐어도 그대로 복구된다.
  useEffect(() => {
    if (!activeInProgressOrder) return;
    const { orderId, candidateCount } = activeInProgressOrder;

    let cancelled = false;
    const deadline = Date.now() + IN_PROGRESS_POLL_TIMEOUT_MS;

    const timer = setInterval(() => {
      if (cancelled) return;
      if (Date.now() > deadline) {
        clearInterval(timer);
        setStage("form");
        setErrorMessage("결과 생성이 예상보다 오래 걸리고 있어요. 마이페이지에서 완료 여부를 확인해 주세요.");
        return;
      }

      fetch(`/api/payment/orders/${orderId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then(
          (
            data: { status?: string; namingResultId?: number | null; payload?: NameRequestPayload | null } | null
          ) => {
            if (cancelled || !data) return;

            if (data.namingResultId) {
              // 생성이 이미 끝나 결과가 저장돼 있다 — 마이페이지 상세(기존 화면 재사용)로 이동한다.
              clearInterval(timer);
              window.location.href = `/mypage/naming/${data.namingResultId}`;
              return;
            }

            if (data.status !== "consumed") {
              // 더 이상 생성 중이 아닌데 결과도 없다 — LLM 실패 등으로 status가 'paid'로 되돌아간
              // 경우(0.4의 revertPaymentOrderToPaid)다. 같은 주문으로 재시도할 수 있게 위저드
              // 마지막 단계로 복원한다(결제를 다시 하지 않아도 되도록 paidOrder도 함께 채운다).
              clearInterval(timer);
              setStage("form");
              setErrorMessage("이전 생성 요청이 실패했습니다. 다시 시도해 주세요.");
              setActiveInProgressOrder(null);
              if (data.payload) {
                setLastPayload(data.payload);
                setResumeToLastStep(true);
                setPaidOrder({ id: orderId, candidateCount });
              }
            }
            // status === 'consumed' && namingResultId 없음 — 여전히 생성 중, 다음 폴링에서 재확인.
          }
        )
        .catch(() => {
          // 네트워크 일시 오류 — 다음 폴링에서 재시도
        });
    }, IN_PROGRESS_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeInProgressOrder]);

  const handleLoadingComplete = useCallback(() => {
    if (pendingResult.current) {
      setResult(pendingResult.current);
      setStage("result");
    }
  }, []);

  const handleRestart = useCallback(() => {
    setResult(null);
    setSurnameOptions(null);
    setErrorMessage(null);
    setLastPayload(null);
    setResumeToLastStep(false);
    setRequestDone(false);
    setPaidOrder(null);
    pendingResult.current = null;
    setStage("form");
  }, []);

  return (
    <main className="flex flex-1 flex-col">
      {stage === "form" && (
        <>
          <Hero />
          <InputForm
            // resume 복원이 마운트 이후(effect)에 끝나므로, 복원이 막 끝난 그 순간 key를 바꿔
            // InputForm을 한 번 새로 마운트시킨다 — useState 초기값은 최초 렌더에만 쓰이므로, 이미
            // 마운트된 인스턴스는 나중에 바뀐 initialValues/initialStep prop을 반영하지 못한다.
            // 이 리마운트는 하이드레이션이 끝난 뒤 일어나는 순수 클라이언트 갱신이라 안전하다.
            key={resumeToLastStep ? "resumed" : "fresh"}
            onSubmit={doSubmit}
            submitting={submitting}
            surnameOptions={surnameOptions}
            errorMessage={errorMessage}
            initialValues={lastPayload}
            isLoggedIn={isLoggedIn}
            isAdmin={isAdmin}
            onLoginRequired={handleLoginRequired}
            onPaymentRequired={handlePaymentRequired}
            paidOrder={paidOrder}
            initialStep={resumeToLastStep ? NAMING_WIZARD_LAST_STEP : undefined}
            priceByCount={priceByCount}
            moreAvailableCount={moreMode?.moreAvailableCount}
          />
        </>
      )}

      {stage === "loading" && (
        <LoadingStages
          isDone={requestDone}
          onComplete={handleLoadingComplete}
          longFinalStage
          candidateCount={lastPayload?.candidateCount ?? activeInProgressOrder?.candidateCount}
        />
      )}

      {stage === "result" && result && (
        <ResultsDashboard data={result} onRestart={handleRestart} searchPayload={lastPayload} />
      )}

      {showAuthModal && (
        <AuthRequiredModal
          onClose={() => setShowAuthModal(false)}
          loginHref={`/login?next=${encodeURIComponent("/naming?resume=1")}`}
        />
      )}

      {showPaymentModal && lastPayload && (
        <PaymentRequiredModal
          candidateCount={lastPayload.candidateCount}
          amount={priceByCount[lastPayload.candidateCount] ?? null}
          payload={lastPayload}
          onClose={() => setShowPaymentModal(false)}
          onPaid={handlePaymentPaid}
        />
      )}
    </main>
  );
}
