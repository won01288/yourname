import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getUserById, listNamingResultsByUser, listScoreResultsByUser, type NamingResultRow } from "@/lib/db-auth";
import type { ScoreApiResult, ScoreRequestPayload } from "@/app/lib/score-client";
import type { NameApiResult, NameRequestPayload } from "@/app/lib/name-client";
import SavedScoreList, { type SavedScoreItem } from "@/app/components/SavedScoreList";
import SavedNamingList, { type SavedNamingItem } from "@/app/components/SavedNamingList";
import PageHero from "@/app/components/PageHero";
import AccountDeleteSection from "@/app/components/AccountDeleteSection";
import { formatShortDate, formatShortTime } from "@/app/lib/date-format";
import Link from "next/link";

// 검색 당시 입력한 생년월일시를 "93.8.23(음) 16:30" 형태로 짧게 표시한다. 모바일에서 긴 문장이
// 잘리는 문제(2026.8.6)를 해결하기 위해 "1993년 8월 23일 양력 08시 40분" 형태를 대체했다.
function formatBirthLabel(payload: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  isLunar: boolean;
  isLeapMonth?: boolean;
}): string {
  const calendarSuffix = payload.isLunar ? (payload.isLeapMonth ? "(음·윤)" : "(음)") : "";
  return `${formatShortDate(payload.year, payload.month, payload.day)}${calendarSuffix} ${formatShortTime(
    payload.hour,
    payload.minute
  )}`;
}

// "같은 사주로 더 추천받기"(CLAUDE.md 0.6) — listNamingResultsByUser는 이미 세션의 모든 행(루트+
// 추가 라운드)을 함께 조회해 오므로, 추가 DB 쿼리 없이 서버 컴포넌트 안에서 그룹핑만 하면 된다.
// 화면에는 루트만 상위 항목으로 보여주고, 추가 라운드는 그 루트 항목 밑에 누적해서 쌓는다(별도
// 상위 항목으로 노출하지 않음). rows는 created_at DESC로 들어오므로:
// - 루트(parentNamingResultId가 없거나, 가리키는 루트가 만료 등으로 이미 사라진 "고아" 라운드)는
//   순서 그대로 상위 목록이 된다.
// - 각 루트의 자식은 "먼저 만든 라운드가 위, 나중 라운드가 아래로 쌓이는" 순서를 위해 뒤집는다
//   (DESC → ASC).
function computeNamingDisplayGroups(
  rows: NamingResultRow[]
): Array<{ root: NamingResultRow; additionalRounds: NamingResultRow[] }> {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const childrenByRootId = new Map<number, NamingResultRow[]>();
  const displayRoots: NamingResultRow[] = [];

  for (const row of rows) {
    const parentId = row.parentNamingResultId;
    if (parentId == null || !byId.has(parentId)) {
      // 진짜 루트이거나, 가리키는 루트가 30일 만료(또는 삭제)로 이미 사라진 고아 라운드다.
      // 고아는 세션이 끊긴 것이므로 이 행 자체를 표시용 루트로 승격한다(드문 엣지케이스).
      displayRoots.push(row);
    } else {
      const group = childrenByRootId.get(parentId);
      if (group) group.push(row);
      else childrenByRootId.set(parentId, [row]);
    }
  }

  return displayRoots.map((root) => ({
    root,
    additionalRounds: (childrenByRootId.get(root.id) ?? []).slice().reverse(),
  }));
}

// 로그인 베타 — 마이페이지. 이름 점수 확인(영구, 삭제 가능)과 프리미엄 작명(30일 이내) 결과를
// 각각 보여준다. 목록/요약은 여기서 서버 컴포넌트가 직접 만들고, 클릭 시 상세 페이지에서
// ScoreDashboard/ResultsDashboard를 그대로 재사용해 원래 화면과 동일하게 재현한다.
export default async function MyPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/mypage");
  }

  const [scoreRows, namingRows, userRow] = await Promise.all([
    listScoreResultsByUser(user.id),
    listNamingResultsByUser(user.id),
    getUserById(user.id),
  ]);
  const isPasswordAccount = userRow?.passwordHash.startsWith("scrypt:") ?? false;

  const scoreItems: SavedScoreItem[] = scoreRows.map((row) => {
    const result = JSON.parse(row.result) as ScoreApiResult;
    const payload = JSON.parse(row.requestPayload) as ScoreRequestPayload;
    const nameLabel = `${result.surname.hangul}${result.givenName.map((h) => h.readings[0] ?? h.char).join("")}`;
    return {
      id: row.id,
      createdAt: row.createdAt,
      nameLabel,
      totalScore: result.score.totalScore,
      grade: result.score.grade,
      birthLabel: formatBirthLabel(payload),
    };
  });

  const namingItems: SavedNamingItem[] = computeNamingDisplayGroups(namingRows).map(({ root, additionalRounds }) => {
    const result = JSON.parse(root.result) as NameApiResult;
    const payload = JSON.parse(root.requestPayload) as NameRequestPayload;
    // "지금 시점" 잔여 개수는 세션의 가장 최근 라운드(추가 라운드가 있으면 그중 마지막, 없으면
    // 루트 자신) 기준이다 — 그 라운드가 그 이전 라운드를 모두 exclude하고 계산한 값이기 때문.
    const latestResult =
      additionalRounds.length > 0
        ? (JSON.parse(additionalRounds[additionalRounds.length - 1].result) as NameApiResult)
        : result;
    return {
      id: root.id,
      createdAt: root.createdAt,
      surnameLabel: `${result.surname.hangul}(${result.surname.hanja})`,
      candidateCount: result.candidates.length,
      candidateNames: result.candidates.map((c) => c.hangul),
      birthLabel: formatBirthLabel(payload),
      moreAvailableCount: latestResult.moreAvailableCount ?? 0,
      additionalRounds: additionalRounds.map((row) => {
        const roundResult = JSON.parse(row.result) as NameApiResult;
        return {
          id: row.id,
          candidateCount: roundResult.candidates.length,
          candidateNames: roundResult.candidates.map((c) => c.hangul),
          createdAt: row.createdAt,
        };
      }),
    };
  });

  return (
    <main className="flex flex-1 flex-col">
      <PageHero
        eyebrow="마이페이지"
        title="저장된 결과"
        description={`${user.displayName ?? user.email} 계정으로 저장된 결과입니다.`}
      />

      <section className="mx-auto w-full max-w-2xl px-6 pb-8">
        <div className="relative mb-8 rounded-card border border-border bg-surface p-6 shadow-[var(--shadow-elevated)] sm:p-8">
          <div className="-mx-6 -mt-6 mb-5 h-[3px] rounded-t-card bg-gradient-to-r from-brand-400 to-brand-600 sm:-mx-8 sm:-mt-8" />
          <h2 className="mb-4 text-[16px] font-semibold text-text-primary">저장된 이름 점수 확인</h2>
          <SavedScoreList items={scoreItems} />
        </div>

        <div className="relative rounded-card border border-border bg-surface p-6 shadow-[var(--shadow-elevated)] sm:p-8">
          <div className="-mx-6 -mt-6 mb-5 h-[3px] rounded-t-card bg-gradient-to-r from-brand-400 to-brand-600 sm:-mx-8 sm:-mt-8" />
          <h2 className="mb-1 text-[16px] font-semibold text-text-primary">프리미엄 작명 결과</h2>
          <p className="mb-4 text-[13px] text-text-secondary">생성 후 30일간만 보관됩니다.</p>
          <SavedNamingList items={namingItems} />
        </div>

        <Link
          href="/mypage/inquiries"
          className="mt-8 flex items-center justify-between rounded-card border border-border bg-surface p-6 shadow-[var(--shadow-elevated)] transition-colors hover:bg-brand-50 sm:p-8"
        >
          <div>
            <h2 className="text-[16px] font-semibold text-text-primary">문의하기</h2>
            <p className="mt-1 text-[13px] text-text-secondary">궁금한 점을 남기고 답변을 확인하세요.</p>
          </div>
          <span aria-hidden="true" className="text-[13px] font-semibold text-brand-600">
            이동하기 →
          </span>
        </Link>

        <AccountDeleteSection isPasswordAccount={isPasswordAccount} />
      </section>
    </main>
  );
}
