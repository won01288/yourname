"use client";

import { useCallback, useRef, useState } from "react";
import Hero from "@/app/components/Hero";
import InputForm from "@/app/components/InputForm";
import LoadingStages from "@/app/components/LoadingStages";
import ResultsDashboard from "@/app/components/ResultsDashboard";
import { submitNaming, type NameApiResult, type NameRequestPayload } from "@/app/lib/name-client";

type Stage = "form" | "loading" | "result";

export default function Home() {
  const [stage, setStage] = useState<Stage>("form");
  const [submitting, setSubmitting] = useState(false);
  const [requestDone, setRequestDone] = useState(false);
  const [lastPayload, setLastPayload] = useState<NameRequestPayload | null>(null);
  const [surnameOptions, setSurnameOptions] = useState<string[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<NameApiResult | null>(null);
  const pendingResult = useRef<NameApiResult | null>(null);

  const handleSubmit = useCallback(async (payload: NameRequestPayload) => {
    setLastPayload(payload);
    setErrorMessage(null);
    setSubmitting(true);
    setRequestDone(false);
    setStage("loading");

    const outcome = await submitNaming(payload);
    setSubmitting(false);

    if (!outcome.ok) {
      setStage("form");
      setErrorMessage(outcome.error);
      setSurnameOptions(outcome.surnameOptions ?? null);
      return;
    }

    setSurnameOptions(null);
    pendingResult.current = outcome.data;
    setRequestDone(true);
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
            onSubmit={handleSubmit}
            submitting={submitting}
            surnameOptions={surnameOptions}
            errorMessage={errorMessage}
            initialValues={lastPayload}
          />
        </>
      )}

      {stage === "loading" && <LoadingStages isDone={requestDone} onComplete={handleLoadingComplete} />}

      {stage === "result" && result && <ResultsDashboard data={result} onRestart={handleRestart} />}
    </main>
  );
}
