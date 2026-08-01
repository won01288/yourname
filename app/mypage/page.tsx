import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getUserById, listNamingResultsByUser, listScoreResultsByUser } from "@/lib/db-auth";
import type { ScoreApiResult } from "@/app/lib/score-client";
import type { NameApiResult } from "@/app/lib/name-client";
import SavedScoreList, { type SavedScoreItem } from "@/app/components/SavedScoreList";
import PageHero from "@/app/components/PageHero";
import AccountDeleteSection from "@/app/components/AccountDeleteSection";

function formatDate(iso: string): string {
  const date = new Date(iso.includes("T") ? iso : `${iso.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
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
    const nameLabel = `${result.surname.hangul}${result.givenName.map((h) => h.readings[0] ?? h.char).join("")}`;
    return {
      id: row.id,
      createdAt: row.createdAt,
      nameLabel,
      totalScore: result.score.totalScore,
      grade: result.score.grade,
    };
  });

  const namingItems = namingRows.map((row) => {
    const result = JSON.parse(row.result) as NameApiResult;
    return {
      id: row.id,
      createdAt: row.createdAt,
      surnameLabel: `${result.surname.hangul}(${result.surname.hanja})`,
      candidateCount: result.candidates.length,
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
          {namingItems.length === 0 ? (
            <p className="rounded-control border border-border bg-surface-muted p-4 text-[13px] text-text-secondary">
              저장된 작명 결과가 없습니다.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {namingItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/mypage/naming/${item.id}`}
                  className="rounded-control border border-border bg-surface-muted px-4 py-3 transition-colors hover:bg-brand-50"
                >
                  <p className="text-[14px] font-medium text-text-primary">
                    {item.surnameLabel}씨 작명 리포트 · 후보 {item.candidateCount}개
                  </p>
                  <p className="text-[12px] text-text-secondary">{formatDate(item.createdAt)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <AccountDeleteSection isPasswordAccount={isPasswordAccount} />
      </section>
    </main>
  );
}
