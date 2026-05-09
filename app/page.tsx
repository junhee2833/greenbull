import NavBar from '@/src/components/layout/NavBar';
import Footer from '@/src/components/layout/Footer';
import MacroTab from '@/src/components/tabs/MacroTab';
import LiquidityTab from '@/src/components/tabs/LiquidityTab';
import NewsSection from '@/src/components/common/NewsSection';
import SentimentTab from '@/src/components/tabs/SentimentTab';
import SectorTab from '@/src/components/tabs/SectorTab';
import StockTab from '@/src/components/tabs/StockTab';
import ChartHintTooltip from '@/src/components/ui/ChartHintTooltip';

// ─── 섹션 헤더 ────────────────────────────────────────────────────────────────

function SectionHeader({
  label,
  accent = 'bull',
  showHint = false,
}: {
  label: string;
  accent?: 'bull' | 'risk' | 'neutral';
  showHint?: boolean;
}) {
  const dotColor =
    accent === 'bull'    ? 'bg-bull' :
    accent === 'risk'    ? 'bg-risk' :
                           'bg-market-neutral';
  return (
    <div className="mb-8 flex items-center gap-4">
      <span className={`size-3 flex-none rounded-full ${dotColor}`} />
      <h2 className="text-2xl font-bold text-foreground">{label}</h2>
      <div className="h-px flex-1 bg-border" />
      {showHint && <ChartHintTooltip />}
    </div>
  );
}

// ─── 섹션 구분선 ──────────────────────────────────────────────────────────────

function SectionDivider() {
  return <div className="my-16 border-t border-border" />;
}

// ─── Main Dashboard Page (서버 컴포넌트) ──────────────────────────────────────
// 분석 흐름: 매크로 → 유동성 → 뉴스 → 시장 센티멘트 → 산업 → 캘린더 → 종목
// (돈의 흐름을 파악한 뒤 헤드라인을 읽고, 그에 따른 심리를 확인하는 Top-down 구조)

export default function DashboardPage() {
  return (
    <>
      <NavBar />

      <main className="min-h-screen pt-20 pb-24">
        <div className="mx-auto max-w-360 px-6 md:px-10 lg:px-16">

          {/* ── 1. 매크로 환경 ────────────────────────────────────────── */}
          <section id="macro" aria-label="매크로 지표" className="scroll-mt-20">
            <SectionHeader label="매크로 지표" showHint />
            <MacroTab />
          </section>

          <SectionDivider />

          {/* ── 2. 유동성 ─────────────────────────────────────────────── */}
          <section id="liquidity" aria-label="유동성" className="scroll-mt-20">
            <SectionHeader label="유동성" showHint />
            <LiquidityTab />
          </section>

          <SectionDivider />

          {/* ── 3. 주요 뉴스 ─────────────────────────────────────────── */}
          <section id="news" aria-label="주요 뉴스" className="scroll-mt-20">
            <SectionHeader label="주요 뉴스" accent="neutral" />
            <NewsSection />
          </section>

          <SectionDivider />

          {/* ── 4. 시장 센티멘트 ─────────────────────────────────────── */}
          <section id="sentiment" aria-label="시장 센티멘트" className="scroll-mt-20">
            <SectionHeader label="시장 센티멘트" showHint />
            <SentimentTab />
          </section>

          <SectionDivider />

          {/* ── 5. 산업 트렌드 ───────────────────────────────────────── */}
          <section id="sector" aria-label="산업 트렌드" className="scroll-mt-20">
            <SectionHeader label="산업 트렌드" />
            <SectorTab />
          </section>

          {/* 개별 종목 구분 — 별도 분석 경험으로 시각적으로 분리 */}
          <div className="my-16 border-t-2 border-border">
            <p className="mt-4 text-xs uppercase tracking-widest text-market-neutral/40">
              개별 종목 상세 분석 — 티커 또는 회사명으로 검색
            </p>
          </div>

          {/* ── 7. 개별 종목 ─────────────────────────────────────────── */}
          <section id="stock" aria-label="종목 상세 분석" className="scroll-mt-20">
            <SectionHeader label="종목 상세 분석" accent="risk" />
            <StockTab />
          </section>

        </div>
      </main>

      <Footer />
    </>
  );
}
