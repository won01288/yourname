"use client";

import { useCallback, useRef, useState } from "react";
import Hero from "@/app/components/Hero";
import InputForm from "@/app/components/InputForm";
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
  const [lastPayload, setLastPayload] = useState<NameRequestPayload | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    if (params.get("resume") !== "1") return null;
    const raw = sessionStorage.getItem(PENDING_NAMING_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_NAMING_KEY);
    try {
      return JSON.parse(raw) as NameRequestPayload;
    } catch {
      return null;
    }
  });
  const [surnameOptions, setSurnameOptions] = useState<string[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<NameApiResult | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const pendingResult = useRef<NameApiResult | null>(null);

  const doSubmit = useCallback(async (payload: NameRequestPayload) => {
    setLastPayload(payload);
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
          />
        </>
      )}

      {stage === "loading" && <LoadingStages isDone={requestDone} onComplete={handleLoadingComplete} />}

      {stage === "result" && result && <ResultsDashboard data={result} onRestart={handleRestart} />}

      {showAuthModal && (
        <AuthRequiredModal
          onClose={() => setShowAuthModal(false)}
          loginHref={`/login?next=${encodeURIComponent("/naming?resume=1")}`}
        />
      )}
    </main>
  );
}
