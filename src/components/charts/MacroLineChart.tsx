'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { MarketIndicator, TimeSeriesPoint } from '@/src/types/market';
import type { IntradayPoint } from '@/src/types/stock';
import { useLocalStorage } from '@/src/hooks/useLocalStorage';

// ─── Period ───────────────────────────────────────────────────────────────────

type Period = '1D' | '1W' | '1M' | '3M' | '1Y' | 'MAX';
const PERIODS: Period[] = ['1D', '1W', '1M', '3M', '1Y', 'MAX'];
const PERIOD_DAYS: Record<Period, number> = {
  '1D': 1, '1W': 7, '1M': 30, '3M': 90, '1Y': 365, MAX: Infinity,
};

function filterSeries(data: TimeSeriesPoint[], period: Period): TimeSeriesPoint[] {
  if (period === '1D') return [];
  const days = PERIOD_DAYS[period];
  return days === Infinity ? data : data.slice(-days);
}

function fmtDate(dateStr: string, period: Period): string {
  const d = new Date(dateStr);
  if (period === '1D') {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  if (period === '1W' || period === '1M') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (period === '3M') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function fmtValue(v: number, unit: string): string {
  if (unit === '%') return `${v.toFixed(2)}%`;
  if (unit === '₩' || unit === '¥') return `${unit}${v.toLocaleString('en-US', { maximumFractionDigits: 1 })}`;
  if (unit === '$') return `$${v.toFixed(2)}`;
  if (v >= 10_000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1_000) return v.toLocaleString('en-US', { maximumFractionDigits: 1 });
  return v.toFixed(2);
}

// '1D' is intraday-only — not meaningful to restore across sessions.
const PERSIST_PERIOD = (p: Period) => p !== '1D';

// ─── Toss Light Theme palette ─────────────────────────────────────────────────

const BULL_COLOR = '#16C784';
const BEAR_COLOR = '#EA3943';
const GRID_COLOR = '#E5E8EB';
const TICK_COLOR = '#4E5968';

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, unit, period }: any) {
  if (!active || !payload?.length) return null;
  const val: number = payload[0].value;
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2 text-xs shadow-lg">
      <p className="text-market-neutral">{fmtDate(label, period)}</p>
      <p className="mt-0.5 font-bold text-foreground">{fmtValue(val, unit)}</p>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="h-50 w-full animate-pulse rounded-lg bg-surface" />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MacroLineChartProps {
  indicator:        MarketIndicator;
  intradaySeries?:  IntradayPoint[];
  intradayLoading?: boolean;
  onPeriodChange?:  (p: Period) => void;
}

export default function MacroLineChart({
  indicator,
  intradaySeries,
  intradayLoading,
  onPeriodChange,
}: MacroLineChartProps) {
  const [period, setPeriod] = useLocalStorage<Period>(
    `period:chart:${indicator.id}`,
    '1Y' as Period,
    { shouldPersist: PERSIST_PERIOD },
  );

  const handlePeriod = (p: Period) => {
    setPeriod(p);
    onPeriodChange?.(p);
  };

  const isUp = (indicator.change ?? 0) >= 0;
  const lineColor = isUp ? BULL_COLOR : BEAR_COLOR;
  const gradId = `grad-${indicator.id}`;

  const dailySeries = useMemo(
    () => filterSeries(indicator.timeSeries ?? [], period),
    [indicator.timeSeries, period],
  );

  // 1D uses intraday data; others use daily
  const chartData: { date: string; value: number }[] = useMemo(() => {
    if (period === '1D') {
      return (intradaySeries ?? []).map(p => ({ date: p.time, value: p.value }));
    }
    return dailySeries;
  }, [period, intradaySeries, dailySeries]);

  const changeSign = (indicator.change ?? 0) >= 0 ? '+' : '';
  const changeText = indicator.change !== null
    ? `${changeSign}${indicator.change.toFixed(2)} (${changeSign}${indicator.changeRate?.toFixed(2)}%)`
    : 'N/A';

  const showSkeleton = period === '1D' && intradayLoading;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xl font-bold text-foreground">
            {fmtValue(indicator.currentValue ?? 0, indicator.unit)}
          </p>
          <p className={`mt-0.5 text-sm font-medium ${isUp ? 'text-bull' : 'text-bear'}`}>
            {changeText}
          </p>
        </div>
        {/* Period selector */}
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => handlePeriod(p)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                period === p
                  ? 'bg-bull/10 text-bull'
                  : 'text-market-neutral hover:bg-surface hover:text-foreground'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {showSkeleton ? (
        <ChartSkeleton />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={lineColor} stopOpacity={0.15} />
                <stop offset="95%" stopColor={lineColor} stopOpacity={0.0}  />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke={GRID_COLOR}
              vertical={false}
            />

            <XAxis
              dataKey="date"
              tickFormatter={v => fmtDate(v, period)}
              tick={{ fill: TICK_COLOR, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={40}
            />

            <YAxis
              tickFormatter={v => fmtValue(v, indicator.unit)}
              tick={{ fill: TICK_COLOR, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={60}
              domain={['auto', 'auto']}
            />

            <Tooltip
              content={<ChartTooltip unit={indicator.unit} period={period} />}
              cursor={{ stroke: GRID_COLOR, strokeWidth: 1.5 }}
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke={lineColor}
              strokeWidth={2}
              fill={`url(#${gradId})`}
              dot={false}
              activeDot={{ r: 4, fill: lineColor, stroke: '#FFFFFF', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
