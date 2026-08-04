import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/app/components/PageHero";
import LegalNotice from "@/app/components/LegalNotice";
import ElementBadge from "@/app/components/ElementBadge";
import ManseryeokTable from "@/app/components/ManseryeokTable";
import SajuReportCard from "@/app/components/SajuReportCard";
import SajuStoryCard from "@/app/components/SajuStoryCard";
import ComparisonSection from "@/app/components/premium-about/ComparisonSection";
import FeatureSection from "@/app/components/premium-about/FeatureSection";
import ScreenFrame from "@/app/components/premium-about/ScreenFrame";
import CandidateShowcase from "@/app/components/premium-about/CandidateShowcase";
import SupportingFeatures from "@/app/components/premium-about/SupportingFeatures";
import PricingSection from "@/app/components/premium-about/PricingSection";
import { getPriceTiers } from "@/lib/db-payment";
import type { CandidateCount } from "@/lib/naming/config";
import {
  SAMPLE_BIRTH_LINE,
  SAMPLE_ELEMENT_DISTRIBUTION,
  SAMPLE_MANSERYEOK,
  SAMPLE_REPORT,
  SAMPLE_SAJU,
  SAMPLE_SURNAME,
  SAMPLE_YONGSIN,
} from "@/app/components/premium-about/sample-data";

export const metadata: Metadata = {
  title: "프리미엄 작명 상품 안내 | 유어네임",
  description: "실제 리포트 샘플로 확인하는 프리미엄 작명 — 사주 분석부터 이름 후보, 상세 해설까지.",
};

// 프리미엄 작명 소개 페이지 — 계산 로직 없이 실제 서비스가 만들어내는 리포트 한 건(김(金)씨 샘플,
// app/components/premium-about/sample-data.ts)을 5개의 독립된 제품 소개 섹션으로 나눠 보여준다.
// 처음엔 실제 결과 화면을 그대로 이어붙였는데, "실제 화면 그대로라 상품 소개처럼 안 보인다"는
// 피드백에 따라 각 부분을 FeatureSection(제목+설명)으로 분리하고, 실제 화면 조각은 ScreenFrame으로
// 감싸 "이건 미리보기다"라는 것을 시각적으로 구분했다. ServiceCards.tsx의 "상품 안내" 버튼이 이
// 페이지로 연결된다.
export default async function PremiumAboutPage() {
  const tiers = await getPriceTiers();
  const priceByCount: Partial<Record<CandidateCount, number>> = {};
  for (const tier of tiers) priceByCount[tier.candidateCount] = tier.price;

  return (
    <main className="flex flex-1 flex-col pb-20">
      <PageHero
        eyebrow="프리미엄 작명 상품 안내"
        title={
          <>
            감으로 짓지 않습니다,
            <br className="hidden sm:inline" /> 계산과 근거로 짓습니다
          </>
        }
        description={
          <>
            생년월일시만 입력하면 사주 원국부터 이름 후보, 상세 해설까지 몇 분 안에 완성됩니다.
            <br className="hidden sm:inline" /> 아래에서 실제 프리미엄 작명 리포트가 어떤 모습인지
            부분부분 확인해 보세요.
          </>
        }
      />

      <ComparisonSection />

      <section className="mx-auto w-full max-w-2xl px-6 text-center">
        <h2 className="text-[20px] font-bold text-text-primary">실제 리포트를 부분별로 살펴보세요</h2>
        <p className="mt-2 text-[13px] leading-6 text-text-secondary">
          김(金)씨, 1993년 8월 23일 양력 08시 40분생 사주로 실제 생성한 프리미엄 작명 리포트입니다.
          각 부분이 어떤 계산을 거쳐 나오는지, 왜 도움이 되는지 하나씩 설명합니다.
        </p>
      </section>

      <FeatureSection
        index="01"
        title="생년월일시 입력만으로, 사주 원국이 즉시 완성됩니다"
        description={
          <>
            전통 작명원에서 사주를 세우려면 만세력 책자를 넘겨가며 손으로 계산해야 합니다. 유어네임은
            진태양시 보정과 절기 기준 월주 계산까지 반영한 만세력 엔진으로 이 과정을 몇 초 만에
            끝냅니다. 오행 분포·신강신약·용신까지, 사람이 손으로 계산하면 실수하기 쉬운 부분을
            코드가 정확하게 계산해 드립니다.
          </>
        }
      >
        <ScreenFrame>
          <p className="text-[20px] font-bold text-text-primary">
            {SAMPLE_SURNAME.hangul}(<span className="text-brand-600">{SAMPLE_SURNAME.hanja}</span>)씨 사주 작명 리포트
          </p>
          <p className="mt-1 text-[13px] text-text-secondary">
            일간 {SAMPLE_SAJU.day.stem} 기준 분석 · {SAMPLE_BIRTH_LINE}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-pill bg-brand-50 px-2.5 py-1 text-[12px] font-medium text-brand-800">
              {SAMPLE_YONGSIN.strength}
            </span>
            <span className="text-[12px] text-text-secondary">용신</span>
            {SAMPLE_YONGSIN.yongsin.map((el) => (
              <ElementBadge key={el} element={el} compact />
            ))}
          </div>
          <p className="mt-4 text-[13px] leading-6 text-text-primary">{SAMPLE_REPORT.summary}</p>
        </ScreenFrame>
      </FeatureSection>

      <FeatureSection
        index="02"
        title="십신·지장간·공망까지, 전통 만세력 표 그대로"
        description={
          <>
            간지 네 기둥만 보여주는 데서 그치지 않습니다. 각 기둥의 십신, 지장간(그 안에 숨어 있는
            천간들), 공망 여부까지 한 화면에서 확인할 수 있습니다. 작명원에서 옆에서 짚어가며
            설명해야 이해되던 내용을, 이제는 직접 눈으로 읽을 수 있습니다.
          </>
        }
        tone="muted"
      >
        <ScreenFrame>
          <ManseryeokTable manseryeok={SAMPLE_MANSERYEOK} />
        </ScreenFrame>
      </FeatureSection>

      <FeatureSection
        index="03"
        title={'"왜 이 오행이 필요한가"까지, 근거로 보여드립니다'}
        description={
          <>
            많은 작명원은 결론(용신)만 알려주고 과정은 생략합니다. 유어네임은 오행 분포 점수와
            신강/신약 판정 기준, 그리고 이 사주에 왜 이 용신이 필요한지를 규칙 기반으로 계산해 문장
            그대로 함께 제공합니다. 결과를 그냥 믿는 게 아니라, 펼쳐서 이해하고 받아들일 수
            있습니다.
          </>
        }
      >
        <ScreenFrame>
          <SajuReportCard
            elementDistribution={SAMPLE_ELEMENT_DISTRIBUTION}
            yongsin={SAMPLE_YONGSIN}
            dayStem={SAMPLE_SAJU.day.stem}
          />
        </ScreenFrame>
      </FeatureSection>

      <FeatureSection
        index="04"
        title="숫자가 아니라, 이야기로 읽는 사주"
        description={
          <>
            이미 계산된 사실(오행 분포, 일간, 용신)을 재료로 삼아 한 편의 감정서처럼 읽히는 해설을
            함께 드립니다. 근거 없는 창작이 아니라 앞서 계산된 사실을 감성적인 언어로 풀어낸 것이라,
            정확성과 몰입감을 동시에 잡습니다.
          </>
        }
        tone="muted"
      >
        <ScreenFrame>
          <SajuStoryCard title={SAMPLE_REPORT.sajuStory.title} body={SAMPLE_REPORT.sajuStory.body} />
        </ScreenFrame>
      </FeatureSection>

      <FeatureSection
        index="05"
        title="조건을 만족하는 이름 후보를, 직접 비교하며 고릅니다"
        description={
          <>
            발음오행 상생과 수리사격 81수리 길격을 모두 통과한 후보만 추천합니다. 순위를 매기지 않고
            각 후보 고유의 강점을 있는 그대로 보여드리니, 유행이나 순위에 휘둘리지 않고 직접 마음에
            드는 이름을 고를 수 있습니다. 아래 타일을 눌러 실제 서비스와 동일한 방식으로 근거를 펼쳐
            보세요.
          </>
        }
      >
        <ScreenFrame>
          <CandidateShowcase />
        </ScreenFrame>
      </FeatureSection>

      <SupportingFeatures />

      <PricingSection priceByCount={priceByCount} />

      <section className="mx-auto mt-4 w-full max-w-2xl px-6 text-center">
        <div className="rounded-card border border-brand-600 bg-gradient-to-br from-brand-50 to-surface p-8 shadow-[var(--shadow-brand-glow)] sm:p-10">
          <h2 className="text-[20px] font-bold text-text-primary">이제 내 사주로 확인해 보세요</h2>
          <p className="mt-2 text-[14px] leading-6 text-text-secondary">
            생년월일시와 성씨만 입력하면 몇 분 안에 나만의 리포트가 완성됩니다.
          </p>
          <div className="mt-6 flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center">
            <Link
              href="/naming"
              className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-control bg-gradient-to-r from-brand-400 to-brand-600 px-6 text-[14px] font-semibold text-white shadow-[var(--shadow-brand-glow)] transition-all hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)] sm:w-auto"
            >
              작명 시작하기
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/score"
              className="flex min-h-11 w-full items-center justify-center rounded-control border border-border bg-surface px-6 text-[14px] font-medium text-text-primary transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)] sm:w-auto"
            >
              먼저 무료로 이름 점수 확인
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-12">
        <LegalNotice />
      </div>
    </main>
  );
}
