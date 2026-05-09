'use client';

import { useState, useMemo } from 'react';
import { useMarketStore, selectLiquidityData } from '@/src/store/useMarketStore';
import { useLiquidityEngine } from '@/src/hooks/useLiquidityEngine';
import { useSummary } from '@/src/hooks/useSummary';
import SummaryCard from '@/src/components/common/SummaryCard';
import GaugeChart, { LIQUIDITY_SEGMENTS } from '@/src/components/charts/GaugeChart';
import Modal from '@/src/components/ui/Modal';
import MacroLineChart from '@/src/components/charts/MacroLineChart';
import InfoTooltip from '@/src/components/ui/InfoTooltip';
import type { LiquidityIndicator, LiquidityStateLabel } from '@/src/types/market';

// ─── 지표 설명 ────────────────────────────────────────────────────────────────

const LIQUIDITY_DESCRIPTIONS: Record<string, string> = {
  fed_rate:    '연방준비제도가 설정하는 기준금리로, 전체 유동성 방향을 결정하는 핵심 지표입니다.',
  tga_balance: '미국 재무부의 연준 내 당좌예금 잔고입니다. TGA 감소는 시중 유동성 증가를 의미합니다.',
  fed_assets:  '연준이 보유한 자산 총액으로, QE/QT 방향과 시중 유동성 규모를 직접 반영합니다.',
  reserves:    '시중 은행들이 연준에 예치한 자금으로, 금융 시스템의 실질 여유 유동성 지표입니다.',
  rrp_balance: '금융기관들이 연준에 하루짜리로 맡긴 자금입니다. RRP 감소는 시중 유동성 개선을 의미합니다.',
};

// ─── 상태별 색상 설정 ─────────────────────────────────────────────────────────

const STATE_CONFIG: Record<LiquidityStateLabel, { label: string; color: string; bg: string; border: string }> = {
  Easing:     { label: '완화 국면 (Easing)',     color: 'text-bull',  bg: 'bg-bull/10',  border: 'border-bull/30'  },
  Neutral:    { label: '중립 국면 (Neutral)',     color: 'text-risk',  bg: 'bg-risk/10',  border: 'border-risk/30'  },
  Tightening: { label: '긴축 국면 (Tightening)', color: 'text-bear',  bg: 'bg-bear/10',  border: 'border-bear/30'  },
};

const SCORE_COLOR = (s: number) =>
  s > 0 ? 'text-bull' : s < 0 ? 'text-bear' : 'text-market-neutral';


// ─── 계산 결과 패널 ───────────────────────────────────────────────────────────

function CalculationPanel() {
  const eng = useLiquidityEngine();
  const { color, bg, border, label } = STATE_CONFIG[eng.state];
  const normalized = (eng.totalScore + 3) / 6;

  return (
    <div className={`rounded-xl border ${border} bg-card p-5`}>
      {/* 헤더 */}
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-market-neutral">
          유동성 통합 지표
        </p>
        <span className={`text-xs font-mono ${color}`}>
          업데이트: {new Date(eng.updatedAt).toLocaleString('ko-KR')}
        </span>
      </div>

      {/* 게이지 + 국면 배지 */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-6 mb-6">
        <GaugeChart
          segments={LIQUIDITY_SEGMENTS}
          normalized={normalized}
          score={eng.formatted.totalScore}
          status={label}
          size={200}
        />
        <div className="flex flex-1 flex-col justify-center gap-2 pt-1 text-center sm:text-left">
          <span className={`inline-block rounded-full border px-3 py-1 text-sm font-semibold ${bg} ${color} ${border}`}>
            {label}
          </span>
        </div>
      </div>

      {/* 중간 계산값 */}
      <div className="border-t border-border pt-4">
        <p className="mb-3 text-[10px] uppercase tracking-wider text-market-neutral">
          세부 계산값
        </p>
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: '순유동성 현재',  value: eng.formatted.netLiquidityCurrent  },
            { label: '순유동성 전월',  value: eng.formatted.netLiquidityPrevious },
            { label: '순유동성 MoM',   value: eng.formatted.netLiquidityMoM,  highlight: true },
            { label: 'TGA+RRP 변화',   value: eng.formatted.liquidityFlowMoM, highlight: true },
          ].map(({ label, value, highlight }) => (
            <div key={label} className="rounded-lg bg-surface p-3">
              <p className="text-[10px] text-market-neutral">{label}</p>
              <p className={`mt-1 text-sm font-bold ${highlight ? SCORE_COLOR(parseFloat(value)) : 'text-foreground'}`}>
                {value}
              </p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

// ─── 세부 지표 카드 ───────────────────────────────────────────────────────────

function LiquidityCard({ indicator, onClick }: { indicator: LiquidityIndicator; onClick: () => void }) {
  const { change, changeRate, currentValue, unit } = indicator;
  const isUp = change !== null ? change >= 0 : null;
  // Option 1: 절대 수치 방향 — 경제적 맥락 무관, 상승(+)=brand-up, 하락(-)=brand-down
  const changeColor = isUp === null ? 'text-brand-neutral' : isUp ? 'text-brand-up' : 'text-brand-down';

  const valDisplay =
    currentValue === null
      ? 'N/A'
      : unit === '$B'
      ? `$${currentValue >= 1000 ? (currentValue / 1000).toFixed(2) + 'T' : currentValue.toFixed(0) + 'B'}`
      : unit === '%'
      ? `${currentValue.toFixed(2)}%`
      : currentValue.toLocaleString();

  const chDisplay =
    changeRate === null ? 'N/A' : `${changeRate >= 0 ? '+' : ''}${changeRate.toFixed(2)}%`;

  return (
    <article onClick={onClick} className="cursor-pointer rounded-xl border border-border bg-card p-4 transition-colors hover:bg-card-hover">
      <div className="flex min-w-0 items-center gap-1">
        <p className="truncate text-xs font-medium text-market-neutral">{indicator.name}</p>
        <InfoTooltip text={LIQUIDITY_DESCRIPTIONS[indicator.id] ?? ''} />
      </div>
      <p className="mt-2 text-xl font-bold text-foreground">{valDisplay}</p>
      <p className={`mt-1 text-xs font-medium ${changeColor}`}>{chDisplay}</p>
    </article>
  );
}

// ─── GPT 요약 섹션 ────────────────────────────────────────────────────────────

function LiquiditySummarySection() {
  const eng = useLiquidityEngine();
  const data = useMemo(() => ({
    totalScore:          eng.totalScore,
    state:               eng.state,
    rateScore:           eng.rateScore,
    netLiquidityScore:   eng.netLiquidityScore,
    liquidityFlowScore:  eng.liquidityFlowScore,
    rateDirection:       eng.rateDirection,
    netLiquidityMoM:     eng.netLiquidityMoM,
    liquidityFlowMoM:    eng.liquidityFlowMoM,
    netLiquidityCurrent: eng.netLiquidityCurrent,
    netLiquidityPrevious:eng.netLiquidityPrevious,
    descriptions:        eng.descriptions,
  }), [
    eng.totalScore, eng.state,
    eng.rateScore, eng.netLiquidityScore, eng.liquidityFlowScore,
  ]);

  const { summary, status } = useSummary({ type: 'liquidity', data });
  return <SummaryCard type="liquidity" summary={summary} status={status} />;
}

// ─── LiquidityTab ─────────────────────────────────────────────────────────────

export default function LiquidityTab() {
  const { indicators } = useMarketStore(selectLiquidityData);
  const [selected, setSelected] = useState<LiquidityIndicator | null>(null);

  return (
    <section aria-label="유동성 지표">
      <CalculationPanel />
      <LiquiditySummarySection />

      <h3 className="mb-4 mt-6 text-xs font-semibold uppercase tracking-wider text-market-neutral">
        세부 유동성 지표
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {indicators.map((ind) => (
          <LiquidityCard key={ind.id} indicator={ind} onClick={() => setSelected(ind)} />
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
    </section>
  );
}
