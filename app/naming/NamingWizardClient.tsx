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
  // 입력값을 초기 상태로 복원한다 — 4단계 위저드를 처음부터 다시 채우게 하지 않기 위함.
  // effect에서 setState하는 대신 lazy initializer로 마운트 시 1회만 계산한다.
  // 2026.7.30 — 이 초기화 함수는 반드시 순수해야 한다(읽기만, 삭제는 하지 않음). 예전엔 여기서
  // sessionStorage.removeItem까지 같이 했는데, 개발 모드(Strict Mode)가 진단 목적으로 초기화
  // 함수를 두 번 호출하면 두 번째 호출이 이미 지워진 값을 읽어 null을 반환하고, React가 그 마지막
  // 결과를 실제 state로 채택해 복원이 항상 실패하는 실사용 버그가 있었다(로그인/회원가입 후
  // 위저드가 빈 채로 뜸). 삭제는 아래 useEffect로 분리했다.
  const [lastPayload, setLastPayload] = useState<NameRequestPayload | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    if (params.get("resume") !== "1") return null;
    const raw = sessionStorage.getItem(PENDING_NAMING_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as NameRequestPayload;
    } catch {
      return null;
    }
  });

  // 마운트 후 정확히 한 번만 실행되는 부수효과에서 삭제한다 — Strict Mode가 이 effect 자체를
  // 두 번 실행해도 removeItem은 멱등이라 안전하다(두 번째 호출은 이미 없는 키를 지우는 것뿐).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("resume") === "1") {
      sessionStorage.removeItem(PENDING_NAMING_KEY);
    }
  }, []);
  // 로그인 후 이어서 제출하는 흐름에서는 입력값 복원뿐 아니라 마지막으로 있던 단계(4단계, 제출
  // 버튼이 있던 화면)로 바로 돌아가야 "이름 짓기 시작"을 다시 누르기만 하면 된다(2026.7.30 요청).
  // 로그인 요청은 항상 마지막 단계에서만 발생하므로(InputForm 최종 제출 버튼) true로 고정해도
  // 안전하다. 이 값은 첫 제출 시도 후에는 더 이상 의미가 없어 doSubmit에서 false로 되돌린다 —
  // 성씨 한자 재선택처럼 0단계로 돌아가야 하는 이후의 재마운트에는 영향을 주지 않기 위함이다.
  const [resumeToLastStep, setResumeToLastStep] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("resume") === "1";
  });
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

      {stage === "loading" && <LoadingStages isDone={requestDone} onComplete={handleLoadingComplete} />}

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
