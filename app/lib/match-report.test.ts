import { describe, it, expect } from "vitest";
import { matchReportEntry, orderCandidatesByReport } from "./match-report";
import type { Candidate, Hanja } from "@/lib/naming/types";
import type { NamingReport } from "@/lib/llm/explain";

function makeHanja(char: string, reading: string): Hanja {
  return {
    char,
    readings: [reading],
    strokeOriginal: 0,
    strokeActual: 0,
    radical: null,
    element: null,
    meaning: null,
    isNameAllowed: true,
    isForbidden: false,
    forbiddenReason: null,
    verificationStatus: "confirmed",
    isCommon: false,
  };
}

function makeCandidate(hangul: string, chars: [string, string], readings: [string, string]): Candidate {
  return {
    hangul,
    hanja: [makeHanja(chars[0], readings[0]), makeHanja(chars[1], readings[1])],
    numerologyNumbers: [1, 2, 3, 4],
    phoneticElements: [],
    frequency: 0,
  };
}

// 실사용 버그(3순위 타일을 클릭했는데 2순위 해설이 나옴)의 근본 원인은 candidates.ts가 서로 다른
// 한자인데 같은 hangul을 가진 후보를 동시에 반환하던 것이었다(candidates.test.ts에서 수정·고정).
// 이 파일은 그 전제(hangul이 후보마다 고유함)가 지켜질 때 매칭/정렬이 실제로 올바른지 검증한다.
describe("matchReportEntry", () => {
  it("hangul이 서로 다른 후보끼리는 절대 서로의 해설과 섞이지 않는다", () => {
    const report: NamingReport = {
      summary: "",
      sajuStory: { title: "", body: "" },
      candidates: [
        { hangul: "탑인", rank: 2, explanation: "탑인 해설", hanjaGlosses: [] },
        { hangul: "도인", rank: 1, explanation: "도인 해설", hanjaGlosses: [] },
        { hangul: "타인", rank: 3, explanation: "타인 해설", hanjaGlosses: [] },
      ],
    };

    expect(matchReportEntry(report, "탑인")).toEqual({ rank: 2, explanation: "탑인 해설", hanjaGlosses: [] });
    expect(matchReportEntry(report, "도인")).toEqual({ rank: 1, explanation: "도인 해설", hanjaGlosses: [] });
    expect(matchReportEntry(report, "타인")).toEqual({ rank: 3, explanation: "타인 해설", hanjaGlosses: [] });
  });

  it("LLM이 성씨를 붙여 3글자로 반환해도(예: 金塔刃) 끝 2글자로 매칭한다", () => {
    const report: NamingReport = {
      summary: "",
      sajuStory: { title: "", body: "" },
      candidates: [{ hangul: "김탑인", rank: 1, explanation: "탑인 해설", hanjaGlosses: [] }],
    };
    expect(matchReportEntry(report, "탑인")).toEqual({ rank: 1, explanation: "탑인 해설", hanjaGlosses: [] });
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
          rank: 1,
          explanation: "",
          hanjaGlosses: [
            { char: "規", hun: "법", meaningKo: "규칙과 법도를 뜻하는 글자" },
            { char: "李", hun: "오얏", meaningKo: "자두나무를 뜻하며 흔히 성씨로도 쓰이는 글자" },
          ],
        },
      ],
    };
    expect(matchReportEntry(report, "규리")?.hanjaGlosses).toEqual([
      { char: "規", hun: "법", meaningKo: "규칙과 법도를 뜻하는 글자" },
      { char: "李", hun: "오얏", meaningKo: "자두나무를 뜻하며 흔히 성씨로도 쓰이는 글자" },
    ]);
  });
});

describe("orderCandidatesByReport", () => {
  it("서로 다른 한자·같은 hangul이 없는 정상 상태에서는 report의 rank 순서로 재배열된다", () => {
    const candidates = [
      makeCandidate("탑인", ["塌", "刃"], ["탑", "인"]),
      makeCandidate("도인", ["塗", "刃"], ["도", "인"]),
      makeCandidate("타인", ["陀", "刃"], ["타", "인"]),
    ];
    const report: NamingReport = {
      summary: "",
      sajuStory: { title: "", body: "" },
      candidates: [
        { hangul: "탑인", rank: 3, explanation: "", hanjaGlosses: [] },
        { hangul: "도인", rank: 1, explanation: "", hanjaGlosses: [] },
        { hangul: "타인", rank: 2, explanation: "", hanjaGlosses: [] },
      ],
    };

    const ordered = orderCandidatesByReport(candidates, report);
    expect(ordered.map((c) => c.hangul)).toEqual(["도인", "타인", "탑인"]);
  });

  it("재배열 후에도 각 자리(rank)에 표시되는 해설이 그 자리의 실제 후보와 일치한다", () => {
    // 클릭한 타일(재배열된 배열의 index)과 matchReportEntry로 찾은 해설이 항상 같은 후보를 가리켜야 한다.
    const candidates = [
      makeCandidate("탑인", ["塌", "刃"], ["탑", "인"]),
      makeCandidate("도인", ["塗", "刃"], ["도", "인"]),
    ];
    const report: NamingReport = {
      summary: "",
      sajuStory: { title: "", body: "" },
      candidates: [
        { hangul: "탑인", rank: 2, explanation: "탑인 전용 해설", hanjaGlosses: [] },
        { hangul: "도인", rank: 1, explanation: "도인 전용 해설", hanjaGlosses: [] },
      ],
    };

    const ordered = orderCandidatesByReport(candidates, report);
    // ordered[0] = 1순위(도인), ordered[1] = 2순위(탑인)로 표시된다.
    expect(ordered[0].hangul).toBe("도인");
    expect(matchReportEntry(report, ordered[0].hangul)?.explanation).toBe("도인 전용 해설");
    expect(ordered[1].hangul).toBe("탑인");
    expect(matchReportEntry(report, ordered[1].hangul)?.explanation).toBe("탑인 전용 해설");
  });
});
