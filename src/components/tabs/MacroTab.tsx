'use client';

import { useState } from 'react';
import { useMarketStore, selectMacroData } from '@/src/store/useMarketStore';
import Modal from '@/src/components/ui/Modal';
import MacroLineChart from '@/src/components/charts/MacroLineChart';
import InfoTooltip from '@/src/components/ui/InfoTooltip';
import type { MacroIndicator, MarketIndicator } from '@/src/types/market';

// ─── 지표 설명 ────────────────────────────────────────────────────────────────

const MACRO_DESCRIPTIONS: Record<string, string> = {
  sp500:   'S&P 500 미국 대형주 500개 지수로, 전반적인 미국 주식시장의 흐름을 대표합니다.',
  nasdaq:  '기술주 중심의 미국 나스닥 시장 지수입니다.',
  usd_krw: '원화와 달러의 교환 비율로, 원화 가치 변동을 나타내는 지표입니다.',
  usd_jpy: '엔화와 달러의 교환 비율로, 글로벌 안전자산 선호도를 반영합니다.',
  dxy:     '주요 6개국 통화 대비 달러의 강세를 측정하는 지수입니다.',
  wti:     '서부텍사스산 원유 가격으로, 글로벌 에너지 비용과 인플레이션 압력을 반영합니다.',
  us10y:   '미국 10년 만기 국채 수익률로, 시장의 기대 금리와 장기 성장 전망을 반영합니다.',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatValue(indicator: MacroIndicator): string {
  const v = indicator.currentValue;
  if (v === null) return 'N/A';

  const formatted = indicator.id === 'us10y'
    ? v.toFixed(2)
    : v >= 1000
    ? v.toLocaleString('en-US', { maximumFractionDigits: 1 })
    : v.toFixed(2);

  if (indicator.unit === '$' || indicator.unit === '₩' || indicator.unit === '¥') {
    return `${indicator.unit}${formatted}`;
  }
  if (indicator.unit === '%') return `${formatted}%`;
  return formatted;
}

function formatChange(change: number | null, changeRate: number | null) {
  if (change === null || changeRate === null) return { text: 'N/A', isUp: null };
  const sign = change >= 0 ? '+' : '';
  const rateStr = `${sign}${changeRate.toFixed(2)}%`;
  const changeStr = `${sign}${Math.abs(change) >= 1 ? change.toFixed(2) : change.toFixed(4)}`;
  return { text: `${changeStr} (${rateStr})`, isUp: change >= 0 };
}

// ─── Indicator Card ───────────────────────────────────────────────────────────

function IndicatorCard({
  indicator,
  onClick,
}: {
  indicator: MacroIndicator;
  onClick: () => void;
}) {
  const { text, isUp } = formatChange(indicator.change, indicator.changeRate);

  // Option 1: 절대 수치 방향 — 상승(+)=brand-up, 하락(-)=brand-down
  const changeColor =
    isUp === null
      ? 'text-brand-neutral'
      : isUp
      ? 'text-brand-up'
      : 'text-brand-down';

  return (
    <article
      onClick={onClick}
      className="cursor-pointer rounded-xl border border-border bg-card p-4 transition-colors hover:bg-card-hover last:col-span-2 sm:last:col-span-1"
    >
      <div className="flex min-w-0 items-center gap-1">
        <p className="truncate text-xs font-medium text-market-neutral">{indicator.name}</p>
        <InfoTooltip text={MACRO_DESCRIPTIONS[indicator.id] ?? ''} />
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
        {formatValue(indicator)}
      </p>
      <p className={`mt-1 text-xs font-medium ${changeColor}`}>{text}</p>
    </article>
  );
}

// ─── MacroTab ─────────────────────────────────────────────────────────────────

export default function MacroTab() {
  const macro = useMarketStore(selectMacroData);
  const [selected, setSelected] = useState<MarketIndicator | null>(null);

  return (
    <section aria-label="매크로 지표">
      <h2 className="mb-4 text-lg font-medium text-gray-600">주요 경제 지표</h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {macro.map((indicator) => (
          <IndicatorCard
            key={indicator.id}
            indicator={indicator}
            onClick={() => setSelected(indicator)}
          />
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
