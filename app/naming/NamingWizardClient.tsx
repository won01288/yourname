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

interface NamingWizardClientProps {
  isLoggedIn: boolean;
}

export default function NamingWizardClient({ isLoggedIn }: NamingWizardClientProps) {
  const [stage, setStage] = useState<Stage>("form");
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
  // 결제 완료(paid) 여부를 한 번 조회해, 완료됐으면 곧바로 이어서 제출하고, 아직이면(취소 등)
  // 마지막 단계로만 복원해 사용자가 다시 시도하게 둔다.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("paymentReturn") !== "1") return;
    const orderId = Number(params.get("orderId"));
    const raw = sessionStorage.getItem(PENDING_PAYMENT_KEY);
    sessionStorage.removeItem(PENDING_PAYMENT_KEY);
    if (!raw || !Number.isInteger(orderId)) return;
    let payload: NameRequestPayload;
    try {
      payload = JSON.parse(raw) as NameRequestPayload;
    } catch {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastPayload(payload);
    setResumeToLastStep(true);

    fetch(`/api/payment/orders/${orderId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { status?: string } | null) => {
        if (data?.status === "paid") {
          setPaidOrder({ id: orderId, candidateCount: payload.candidateCount });
          void doSubmit({ ...payload, orderId });
        }
        // paid가 아니면(취소·아직 웹훅 미도착 등) 위저드 마지막 단계로만 복원해 두고, 사용자가
        // 다시 제출을 누르면 InputForm이 paidOrder 없음을 감지해 결제 모달을 다시 띄운다.
      })
      .catch(() => {
        // 조회 실패 시에도 동일하게 마지막 단계 복원만 유지한다.
      });
  }, [doSubmit]);

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
            onLoginRequired={handleLoginRequired}
            onPaymentRequired={handlePaymentRequired}
            paidOrder={paidOrder}
            initialStep={resumeToLastStep ? NAMING_WIZARD_LAST_STEP : undefined}
            priceByCount={priceByCount}
          />
        </>
      )}

      {stage === "loading" && (
        <LoadingStages
          isDone={requestDone}
          onComplete={handleLoadingComplete}
          longFinalStage
          candidateCount={lastPayload?.candidateCount}
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
          onClose={() => setShowPaymentModal(false)}
          onPaid={handlePaymentPaid}
        />
      )}
    </main>
  );
}
