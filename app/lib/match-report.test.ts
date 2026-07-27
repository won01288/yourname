import { describe, it, expect } from "vitest";
import { matchReportEntry } from "./match-report";
import type { NamingReport } from "@/lib/llm/explain";

// 실사용 버그(3번째 타일을 클릭했는데 다른 후보의 해설이 나옴)의 근본 원인은 candidates.ts가 서로 다른
// 한자인데 같은 hangul을 가진 후보를 동시에 반환하던 것이었다(candidates.test.ts에서 수정·고정).
// 이 파일은 그 전제(hangul이 후보마다 고유함)가 지켜질 때 매칭이 실제로 올바른지 검증한다.
// Phase 8(2026.7.27) — rank·orderCandidatesByReport는 순위 폐지 결정으로 제거됐다(CLAUDE.md 3.6).
// 표시 순서는 route.ts가 무작위화해 반환하므로, 프론트는 report로 후보를 재정렬하지 않는다.
describe("matchReportEntry", () => {
  it("hangul이 서로 다른 후보끼리는 절대 서로의 해설과 섞이지 않는다", () => {
    const report: NamingReport = {
      summary: "",
      sajuStory: { title: "", body: "" },
      candidates: [
        { hangul: "탑인", explanation: "탑인 해설", hanjaGlosses: [], strengths: [] },
        { hangul: "도인", explanation: "도인 해설", hanjaGlosses: [], strengths: [] },
        { hangul: "타인", explanation: "타인 해설", hanjaGlosses: [], strengths: [] },
      ],
    };

    expect(matchReportEntry(report, "탑인")).toEqual({ explanation: "탑인 해설", hanjaGlosses: [], strengths: [] });
    expect(matchReportEntry(report, "도인")).toEqual({ explanation: "도인 해설", hanjaGlosses: [], strengths: [] });
    expect(matchReportEntry(report, "타인")).toEqual({ explanation: "타인 해설", hanjaGlosses: [], strengths: [] });
  });

  it("LLM이 성씨를 붙여 3글자로 반환해도(예: 金塔刃) 끝 2글자로 매칭한다", () => {
    const report: NamingReport = {
      summary: "",
      sajuStory: { title: "", body: "" },
      candidates: [{ hangul: "김탑인", explanation: "탑인 해설", hanjaGlosses: [], strengths: [] }],
    };
    expect(matchReportEntry(report, "탑인")).toEqual({ explanation: "탑인 해설", hanjaGlosses: [], strengths: [] });
  });

  it("report가 없으면 null을 반환한다", () => {
    expect(matchReportEntry(null, "탑인")).toBeNull();
  });

  it("hanjaGlosses를 그대로 전달한다", () => {
    const report: NamingReport = {
      summary: "",
      sajuStory: { title: "", body: "" },
      candidates: [
        {
          hangul: "규리",
          explanation: "",
          hanjaGlosses: [
            { char: "規", hun: "법", meaningKo: "규칙과 법도를 뜻하는 글자" },
            { char: "李", hun: "오얏", meaningKo: "자두나무를 뜻하며 흔히 성씨로도 쓰이는 글자" },
          ],
          strengths: [],
        },
      ],
    };
    expect(matchReportEntry(report, "규리")?.hanjaGlosses).toEqual([
      { char: "規", hun: "법", meaningKo: "규칙과 법도를 뜻하는 글자" },
      { char: "李", hun: "오얏", meaningKo: "자두나무를 뜻하며 흔히 성씨로도 쓰이는 글자" },
    ]);
  });
});
