"use client";

import { useCallback, useRef, useState } from "react";
import PageHero from "@/app/components/PageHero";
import NameScoreForm from "@/app/components/NameScoreForm";
import LoadingStages from "@/app/components/LoadingStages";
import ScoreDashboard from "@/app/components/ScoreDashboard";
import { submitScore, type ScoreApiResult, type ScoreRequestPayload } from "@/app/lib/score-client";

type Stage = "form" | "loading" | "result";

// 무료 서비스 파이프라인은 LLM·후보탐색 단계가 없어 실제로 더 짧다 — LoadingStages에 그 실제
// 단계만 넘긴다(design.md 3.3, 과장 연출 금지).
const SCORE_LOADING_STAGES = ["사주팔자를 세우는 중", "오행 분포·용신을 계산하는 중", "이름 점수를 채점하는 중"];

export default function ScorePage() {
  const [stage, setStage] = useState<Stage>("form");
  const [submitting, setSubmitting] = useState(false);
  const [requestDone, setRequestDone] = useState(false);
  const [lastPayload, setLastPayload] = useState<ScoreRequestPayload | null>(null);
  const [surnameOptions, setSurnameOptions] = useState<string[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ScoreApiResult | null>(null);
  const pendingResult = useRef<ScoreApiResult | null>(null);

  const handleSubmit = useCallback(async (payload: ScoreRequestPayload) => {
    setLastPayload(payload);
    setErrorMessage(null);
    setSubmitting(true);
    setRequestDone(false);
    setStage("loading");

    const outcome = await submitScore(payload);
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
          <PageHero
            eyebrow="무료 서비스"
            title={<>내 이름,&nbsp;몇 점일까요?</>}
            description={
              <>
                생년월일시와 이미 지어진 이름의 한자를 입력하면, 발음오행·수리사격·자원오행·음양 배열을
                <br className="hidden sm:inline" />
                {" "}결정적으로 계산해 점수와 근거를 바로 보여드립니다.
              </>
            }
          />
          <NameScoreForm
            onSubmit={handleSubmit}
            submitting={submitting}
            surnameOptions={surnameOptions}
            errorMessage={errorMessage}
            initialValues={lastPayload}
          />
        </>
      )}

      {stage === "loading" && (
        <LoadingStages stages={SCORE_LOADING_STAGES} isDone={requestDone} onComplete={handleLoadingComplete} />
      )}

      {stage === "result" && result && (
        <ScoreDashboard data={result} onRestart={handleRestart} searchPayload={lastPayload} />
      )}
    </main>
  );
}
