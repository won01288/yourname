import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getUserById, listNamingResultsByUser, listScoreResultsByUser } from "@/lib/db-auth";
import type { ScoreApiResult, ScoreRequestPayload } from "@/app/lib/score-client";
import type { NameApiResult, NameRequestPayload } from "@/app/lib/name-client";
import SavedScoreList, { type SavedScoreItem } from "@/app/components/SavedScoreList";
import SavedNamingList, { type SavedNamingItem } from "@/app/components/SavedNamingList";
import PageHero from "@/app/components/PageHero";
import AccountDeleteSection from "@/app/components/AccountDeleteSection";
import Link from "next/link";

// 검색 당시 입력한 생년월일시를 "1993년 8월 23일 양력 08시 40분" 형태로 표시한다.
function formatBirthLabel(payload: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  isLunar: boolean;
  isLeapMonth?: boolean;
}): string {
  const calendarLabel = payload.isLunar ? `음력${payload.isLeapMonth ? "(윤달)" : ""}` : "양력";
  const hh = String(payload.hour).padStart(2, "0");
  const mm = String(payload.minute).padStart(2, "0");
  return `${payload.year}년 ${payload.month}월 ${payload.day}일 ${calendarLabel} ${hh}시 ${mm}분`;
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

  const namingItems: SavedNamingItem[] = namingRows.map((row) => {
    const result = JSON.parse(row.result) as NameApiResult;
    const payload = JSON.parse(row.requestPayload) as NameRequestPayload;
    return {
      id: row.id,
      createdAt: row.createdAt,
      surnameLabel: `${result.surname.hangul}(${result.surname.hanja})`,
      candidateCount: result.candidates.length,
      birthLabel: formatBirthLabel(payload),
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
