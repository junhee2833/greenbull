'use client';

import { useState, useMemo } from 'react';
import { useMarketStore, selectSentimentData } from '@/src/store/useMarketStore';
import { useSentimentEngine } from '@/src/hooks/useSentimentEngine';
import { useSummary } from '@/src/hooks/useSummary';
import SummaryCard from '@/src/components/common/SummaryCard';
import GaugeChart, { SENTIMENT_SEGMENTS, RATIONAL_EMOTIONAL_SEGMENTS } from '@/src/components/charts/GaugeChart';
import Modal from '@/src/components/ui/Modal';
import MacroLineChart from '@/src/components/charts/MacroLineChart';
import InfoTooltip from '@/src/components/ui/InfoTooltip';
import PolymarketSection from '@/src/components/common/PolymarketSection';
import type { SentimentIndicator, SentimentStateLabel } from '@/src/types/market';

// ─── 지표 설명 ────────────────────────────────────────────────────────────────

const SENTIMENT_DESCRIPTIONS: Record<string, string> = {
  fear_greed:        'CNN이 산출하는 시장 심리 지수입니다. 0은 극단적 공포, 100은 극단적 탐욕을 의미하며, 역발상 매수 신호로 활용됩니다.',
  vix:               '시카고 옵션거래소가 산출하는 S&P 500 기대 변동성 지수로, "공포 지수"라 불립니다.',
  rational_emotional: 'SNS·커뮤니티 데이터를 분석해 시장 참여자들의 판단이 이성적인지 감성적인지를 나타내는 독자 지표입니다.',
  high_yield_spread: '고위험 회사채와 국채의 금리 차이입니다. 5% 이상 시 신용 리스크 경고 신호로 해석됩니다.',
};

// ─── 상태별 설정 ──────────────────────────────────────────────────────────────

const STATE_CONFIG: Record<SentimentStateLabel, { label: string; color: string; bg: string; border: string }> = {
  'Aggressive Buy':  { label: '적극 매수 국면',         color: 'text-bull',  bg: 'bg-bull/10',  border: 'border-bull/30'  },
  'Buy Recommended': { label: '매수 추천 국면',          color: 'text-bull',  bg: 'bg-bull/5',   border: 'border-bull/20'  },
  'DCA Maintain':    { label: '기계적 적립식 국면',      color: 'text-risk',  bg: 'bg-risk/10',  border: 'border-risk/30'  },
  'Cash Reserve':    { label: '현금 확보 권장 국면',     color: 'text-bear',  bg: 'bg-bear/5',   border: 'border-bear/20'  },
  'Wait':            { label: '현금 확보 및 관망 국면',  color: 'text-bear',  bg: 'bg-bear/10',  border: 'border-bear/30'  },
  'Risk Override':   { label: '매수 보류 (리스크 필터)', color: 'text-bear',  bg: 'bg-bear/20',  border: 'border-bear/50'  },
};


// ─── Kill Switch 경고 배너 ────────────────────────────────────────────────────

function KillSwitchBanner({ reason }: { reason: string }) {
  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-bear/40 bg-bear/10 px-4 py-3">
      <span className="mt-0.5 text-lg leading-none text-bear">⚠</span>
      <div>
        <p className="text-sm font-semibold text-bear">포트폴리오 리스크 점검 경고</p>
        <p className="mt-0.5 text-xs text-bear/80">{reason}</p>
      </div>
    </div>
  );
}

// ─── 계산 결과 패널 ───────────────────────────────────────────────────────────

function CalculationPanel() {
  const eng = useSentimentEngine();
  const { color, bg, border, label } = STATE_CONFIG[eng.state];

  // Kill Switch 활성 시 센티멘트 점수로 게이지 위치 표시하되 흐리게
  const normalized = (eng.totalScore + 3) / 6;

  return (
    <div className={`rounded-xl border ${border} bg-card p-5`}>
      {/* Kill Switch 경고 */}
      {eng.killSwitchActive && eng.killSwitchReason && (
        <KillSwitchBanner reason={eng.killSwitchReason} />
      )}

      {/* 헤더 */}
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-market-neutral">
          종합 시장 센티멘트 지표
        </p>
        <span className="text-xs font-mono text-market-neutral">
          업데이트: {new Date(eng.updatedAt).toLocaleString('ko-KR')}
        </span>
      </div>

      {/* 게이지 + 국면 배지 */}
      <div className="mb-6 flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-6">
        <div className={eng.killSwitchActive ? 'opacity-40' : ''}>
          <GaugeChart
            segments={SENTIMENT_SEGMENTS}
            normalized={normalized}
            score={eng.formatted.totalScore}
            status={label}
            size={200}
          />
        </div>
        <div className="flex flex-1 flex-col justify-center gap-2 pt-1 text-center sm:text-left">
          <span className={`inline-block rounded-full border px-3 py-1 text-sm font-semibold ${bg} ${color} ${border}`}>
            {label}
          </span>
          {eng.killSwitchActive && (
            <span className="text-xs text-bear">Kill Switch 활성으로 강제 매수 보류</span>
          )}
        </div>
      </div>

      {/* 입력값 + RE 미니 게이지 */}
      <div className="border-t border-border pt-4">
        <p className="mb-3 text-[10px] uppercase tracking-wider text-market-neutral">
          입력값 요약
        </p>

        {/* 일반 입력값 그리드 */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: 'VIX',            value: eng.formatted.vix,             warn: eng.vixValue >= 25 },
            { label: '공포/탐욕 지수', value: eng.formatted.fearGreed,       warn: eng.fearGreedValue <= 25 },
            { label: '하이일드 스프레드', value: eng.formatted.highYieldSpread, warn: eng.highYieldSpreadValue >= 5 },
          ].map(({ label, value, warn }) => (
            <div key={label} className={`rounded-lg p-3 ${warn ? 'bg-risk/10' : 'bg-surface'}`}>
              <p className="text-[10px] text-market-neutral">{label}</p>
              <p className={`mt-1 text-sm font-bold ${warn ? 'text-risk' : 'text-foreground'}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* 이성/감성 지수 미니 게이지 */}
        <div className="mb-4 rounded-lg bg-surface p-3">
          <p className="mb-2 text-[10px] text-market-neutral">
            이성/감성 여론 지수 &nbsp;
            <span className="text-foreground font-semibold">{eng.formatted.rationalEmotional}</span>
            &nbsp;— {eng.descriptions.rationalEmotionalState}
          </p>
          <GaugeChart
            segments={RATIONAL_EMOTIONAL_SEGMENTS}
            normalized={eng.rationalEmotionalIndex / 100}
            score={eng.formatted.rationalEmotional}
            status={eng.descriptions.rationalEmotionalState}
            size={160}
          />
        </div>


        {/* Kill Switch 상태 */}
        <div className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 ${eng.killSwitchActive ? 'bg-bear/10' : 'bg-surface'}`}>
          <span className={`text-xs font-bold ${eng.killSwitchActive ? 'text-bear' : 'text-market-neutral'}`}>
            Kill Switch
          </span>
          <span className={`text-xs ${eng.killSwitchActive ? 'text-bear' : 'text-market-neutral'}`}>
            {eng.killSwitchActive
              ? `활성 — 하이일드 스프레드 ${eng.highYieldSpreadValue.toFixed(2)}% ≥ 5%`
              : `비활성 — 하이일드 스프레드 ${eng.highYieldSpreadValue.toFixed(2)}% < 5%`}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── 세부 지표 카드 ───────────────────────────────────────────────────────────

function SentimentCard({ indicator, onClick }: { indicator: SentimentIndicator; onClick: () => void }) {
  const { change, changeRate, currentValue, unit } = indicator;
  const isUp = change !== null ? change >= 0 : null;
  // Option 1: 절대 수치 방향 — 경제적 맥락 무관, 상승(+)=brand-up, 하락(-)=brand-down
  const changeColor = isUp === null ? 'text-brand-neutral' : isUp ? 'text-brand-up' : 'text-brand-down';

  const valStr =
    currentValue === null ? 'N/A' :
    unit === '%' ? `${currentValue.toFixed(2)}%` :
    currentValue.toFixed(1);

  const chStr =
    changeRate === null ? 'N/A' : `${changeRate >= 0 ? '+' : ''}${changeRate.toFixed(2)}%`;

  const isKillSwitch =
    indicator.id === 'high_yield_spread' && currentValue !== null && currentValue >= 5;

  return (
    <article onClick={onClick} className={`cursor-pointer rounded-xl border bg-card p-4 transition-colors hover:bg-card-hover ${isKillSwitch ? 'border-bear/40' : 'border-border'}`}>
      {isKillSwitch && (
        <span className="mb-1 inline-block rounded bg-bear/10 px-1.5 py-0.5 text-[10px] font-semibold text-bear">
          Kill Switch 임박
        </span>
      )}
      <div className="flex min-w-0 items-center gap-1">
        <p className="truncate text-xs font-medium text-market-neutral">{indicator.name}</p>
        <InfoTooltip text={SENTIMENT_DESCRIPTIONS[indicator.id] ?? ''} />
      </div>
      <p className="mt-2 text-xl font-bold text-foreground">{valStr}</p>
      <p className={`mt-1 text-xs font-medium ${changeColor}`}>{chStr}</p>
    </article>
  );
}

// ─── GPT 요약 섹션 ────────────────────────────────────────────────────────────

function SentimentSummarySection() {
  const eng = useSentimentEngine();
  const data = useMemo(() => ({
    totalScore:              eng.totalScore,
    state:                   eng.state,
    vixScore:                eng.vixScore,
    fearGreedScore:          eng.fearGreedScore,
    rationalityScore:        eng.rationalityScore,
    vixValue:                eng.vixValue,
    fearGreedValue:          eng.fearGreedValue,
    rationalEmotionalIndex:  eng.rationalEmotionalIndex,
    highYieldSpreadValue:    eng.highYieldSpreadValue,
    highYieldSpreadPrevious: eng.highYieldSpreadPrevious,
    killSwitchActive:        eng.killSwitchActive,
    killSwitchReason:        eng.killSwitchReason,
    descriptions:            eng.descriptions,
  }), [
    eng.totalScore, eng.state,
    eng.vixScore, eng.fearGreedScore, eng.rationalityScore,
    eng.killSwitchActive,
  ]);

  const { summary, status } = useSummary({ type: 'sentiment', data });
  return <SummaryCard type="sentiment" summary={summary} status={status} hasWarning={eng.killSwitchActive} />;
}

// ─── SentimentTab ─────────────────────────────────────────────────────────────

export default function SentimentTab() {
  const { indicators } = useMarketStore(selectSentimentData);
  const [selected, setSelected] = useState<SentimentIndicator | null>(null);

  return (
    <section aria-label="시장 센티멘트">
      <CalculationPanel />
      <SentimentSummarySection />

      <h3 className="mb-4 mt-6 text-xs font-semibold uppercase tracking-wider text-market-neutral">
        세부 센티멘트 지표
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {indicators.map((ind) => (
          <SentimentCard key={ind.id} indicator={ind} onClick={() => setSelected(ind)} />
        ))}
      </div>

      <Modal
        isOpen={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? selected.name : ''}
        maxWidth="max-w-2xl"
      >
        {selected && <MacroLineChart indicator={selected} />}
      </Modal>

      {/* ── 실시간 예측 시장 (Polymarket) ── */}
      <div className="mt-16 border-t border-border pt-12">
        <div className="mb-6 flex items-center gap-3">
          <span className="size-2 flex-none rounded-full bg-market-neutral" />
          <h3 className="text-base font-semibold text-foreground">실시간 예측 시장 (Polymarket)</h3>
          <div className="h-px flex-1 bg-border" />
        </div>
        <PolymarketSection />
      </div>
    </section>
  );
}
