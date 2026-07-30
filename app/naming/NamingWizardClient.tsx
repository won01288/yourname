"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Hero from "@/app/components/Hero";
import InputForm, { NAMING_WIZARD_LAST_STEP } from "@/app/components/InputForm";
import LoadingStages from "@/app/components/LoadingStages";
import ResultsDashboard from "@/app/components/ResultsDashboard";
import AuthRequiredModal from "@/app/components/AuthRequiredModal";
import { submitNaming, type NameApiResult, type NameRequestPayload } from "@/app/lib/name-client";

type Stage = "form" | "loading" | "result";

// 로그인 베타 — 로그인 안내 모달로 이어질 때 지금까지 입력한 값을 임시 보관하는 키.
// /naming?resume=1로 돌아왔을 때 이 값을 읽어 폼을 다시 채운다(위저드 처음부터 반복 방지).
const PENDING_NAMING_KEY = "yourname_pending_naming";

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
  const pendingResult = useRef<NameApiResult | null>(null);

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
            initialStep={resumeToLastStep ? NAMING_WIZARD_LAST_STEP : undefined}
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
    </main>
  );
}
