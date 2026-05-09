'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, TrendingUp, TrendingDown, ChevronRight, Target, Clock } from 'lucide-react';
import { useSearchHistory } from '@/src/hooks/useSearchHistory';
import { useLiquidityEngine } from '@/src/hooks/useLiquidityEngine';
import { useSentimentEngine } from '@/src/hooks/useSentimentEngine';
import GaugeChart, { LIQUIDITY_SEGMENTS, SENTIMENT_SEGMENTS } from '@/src/components/charts/GaugeChart';
import MacroLineChart from '@/src/components/charts/MacroLineChart';
import type { StockDetail, StockSearchResult, AnalystTarget, IntradayPoint } from '@/src/types/stock';
import type { MarketIndicator } from '@/src/types/market';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmtPrice = (v: number) =>
  v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtMktCap = (b: number | null) => {
  if (b === null) return 'N/A';
  return b >= 1000 ? `$${(b / 1000).toFixed(2)}T` : `$${b.toFixed(0)}B`;
};

const fmtPct = (v: number | null, dp = 1) =>
  v === null ? 'N/A' : `${v.toFixed(dp)}%`;

const fmtNum = (v: number | null, dp = 2, prefix = '') =>
  v === null ? 'N/A' : `${prefix}${v.toFixed(dp)}`;

// ─── Search Box ───────────────────────────────────────────────────────────────

function SearchBox({
  onSelect,
  onClear,
  hasSelection,
}: {
  onSelect: (result: StockSearchResult) => void;
  onClear: () => void;
  hasSelection: boolean;
}) {
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<StockSearchResult[]>([]);
  const [open, setOpen]           = useState(false);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { history, add, remove } = useSearchHistory();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/stock/search?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [query]);

  const isQuerying = query.trim().length >= 1;
  const listItems  = isQuerying ? results : history;
  const showDropdown = open && (searching || listItems.length > 0);

  const select = (item: StockSearchResult) => {
    onSelect(item);
    add(item);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-lg">
      <div className="relative flex items-center">
        <Search size={15} className="absolute left-3.5 text-market-neutral" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Escape') setOpen(false);
            if (e.key === 'Enter' && results.length === 1) select(results[0]);
          }}
          placeholder="티커 또는 회사명 입력 (예: AAPL, Apple)"
          className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-9 text-sm text-foreground placeholder:text-market-neutral/50 focus:border-bull/50 focus:outline-none focus:ring-1 focus:ring-bull/20 transition-colors"
        />
        {(query || hasSelection) && (
          <button
            onClick={() => { setQuery(''); onClear(); setOpen(false); }}
            className="absolute right-3 text-market-neutral hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full z-30 mt-1.5 w-full rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
          {/* Section header */}
          {!isQuerying && history.length > 0 && (
            <div className="flex items-center gap-1.5 border-b border-border px-3 pt-2.5 pb-1.5">
              <Clock size={10} className="text-market-neutral" />
              <p className="text-[10px] font-medium uppercase tracking-wider text-market-neutral">
                최근 검색 ({history.length}/10)
              </p>
            </div>
          )}

          {/* Search spinner */}
          {searching && (
            <div className="flex items-center gap-2 px-4 py-3 text-xs text-market-neutral">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-bull/30 border-t-bull" />
              검색 중…
            </div>
          )}

          {/* Results / history rows */}
          {!searching && listItems.map(item => (
            <div key={item.symbol} className="flex items-center group">
              <button
                onClick={() => select(item)}
                className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface"
              >
                <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-bull/10">
                  <span className="text-[10px] font-bold text-bull">{item.symbol.slice(0, 2)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{item.symbol}</p>
                  <p className="truncate text-[11px] text-market-neutral">{item.name}</p>
                </div>
                {item.sector && (
                  <span className="shrink-0 text-[10px] text-market-neutral">{item.sector}</span>
                )}
              </button>

              {/* Per-item delete — only in history (no-query) mode */}
              {!isQuerying && (
                <button
                  onClick={e => { e.stopPropagation(); remove(item.symbol); }}
                  className="mr-3 flex h-6 w-6 flex-none items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface text-market-neutral hover:text-bear"
                  aria-label={`${item.symbol} 기록 삭제`}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton blocks ──────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface ${className ?? ''}`} />;
}

function StockDetailSkeleton() {
  return (
    <div className="mt-5 space-y-4">
      <SkeletonBlock className="h-28" />
      <SkeletonBlock className="h-52" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <SkeletonBlock className="h-72 lg:col-span-3" />
        <SkeletonBlock className="h-72 lg:col-span-2" />
      </div>
      <SkeletonBlock className="h-28" />
      <SkeletonBlock className="h-32" />
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="mt-8 flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bull/10">
        <Search size={28} className="text-bull" strokeWidth={1.5} />
      </div>
      <p className="text-base font-semibold text-foreground">종목을 검색하여 상세 분석을 시작하세요</p>
      <p className="mt-1.5 text-sm text-market-neutral">
        가격 차트, 애널리스트 목표주가, 밸류에이션 비교, 재무 지표를 통합 분석할 수 있습니다
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {['AAPL', 'MSFT', 'NVDA', 'JPM', 'AMZN'].map(sym => (
          <span key={sym} className="rounded-full bg-surface px-3 py-1 text-xs font-mono text-market-neutral border border-border">
            {sym}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Stock Header ─────────────────────────────────────────────────────────────

function StockHeader({ stock }: { stock: StockDetail }) {
  const isUp = stock.change >= 0;
  const Icon = isUp ? TrendingUp : TrendingDown;
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-bull/10">
            <span className="text-sm font-black text-bull">{stock.symbol.slice(0, 2)}</span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">{stock.name}</h2>
              <span className="rounded-md bg-surface px-2 py-0.5 font-mono text-xs font-bold text-market-neutral border border-border">
                {stock.symbol}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-market-neutral">
              {stock.sector}{stock.subIndustry ? ` · ${stock.subIndustry}` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-1 sm:items-end">
          <p className="text-3xl font-black tracking-tight text-foreground">
            ${fmtPrice(stock.currentPrice)}
          </p>
          <div className={`flex items-center gap-1.5 ${isUp ? 'text-bull' : 'text-bear'}`}>
            <Icon size={14} strokeWidth={2.5} />
            <span className="text-sm font-semibold">
              {isUp ? '+' : ''}{fmtPrice(stock.change)}
              &nbsp;({isUp ? '+' : ''}{stock.changeRate.toFixed(2)}%)
            </span>
          </div>
          <p className="text-[11px] text-market-neutral">전일 종가 ${fmtPrice(stock.previousClose)}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Analyst Target Panel ─────────────────────────────────────────────────────

function AnalystTargetPanel({ target, currentPrice }: { target: AnalystTarget; currentPrice: number }) {
  const rangeWidth = target.high - target.low;
  const currentPct = rangeWidth > 0
    ? Math.max(0, Math.min(100, ((currentPrice - target.low) / rangeWidth) * 100))
    : 50;
  const meanPct = rangeWidth > 0
    ? Math.max(0, Math.min(100, ((target.mean - target.low) / rangeWidth) * 100))
    : 50;
  const isUpside = target.upside >= 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-market-neutral">
          애널리스트 목표주가
        </p>
        <div className="flex items-center gap-1.5">
          <Target size={13} className="text-market-neutral" />
          <span className="text-[11px] text-market-neutral">{target.count}명 기준</span>
        </div>
      </div>

      {/* Upside badge */}
      <div className="mb-5 flex items-baseline gap-3">
        <p className="text-2xl font-black text-foreground">${fmtPrice(target.mean)}</p>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
          isUpside
            ? 'bg-bull/10 text-bull'
            : 'bg-bear/10 text-bear'
        }`}>
          {isUpside ? '+' : ''}{target.upside.toFixed(1)}% 괴리율
        </span>
      </div>

      {/* Range bar */}
      <div className="space-y-2.5">
        <div className="relative h-3 w-full rounded-full bg-surface overflow-hidden">
          {/* Track */}
          <div className="absolute inset-0 rounded-full bg-linear-to-r from-bear/30 via-risk/20 to-bull/30" />
          {/* Mean marker */}
          <div
            className="absolute top-0 h-full w-0.5 bg-foreground/40"
            style={{ left: `${meanPct}%` }}
          />
          {/* Current price marker */}
          <div
            className="absolute top-1/2 h-5 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-md border-2 border-white"
            style={{ left: `${currentPct}%` }}
          />
        </div>

        <div className="flex items-end justify-between text-xs">
          <div>
            <p className="text-market-neutral">최저 목표</p>
            <p className="font-bold text-bear">${fmtPrice(target.low)}</p>
          </div>
          <div className="text-center">
            <p className="text-market-neutral">컨센서스</p>
            <p className="font-bold text-foreground">${fmtPrice(target.mean)}</p>
          </div>
          <div className="text-right">
            <p className="text-market-neutral">최고 목표</p>
            <p className="font-bold text-bull">${fmtPrice(target.high)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Market Context Panel ─────────────────────────────────────────────────────

const LIQUIDITY_INVEST_HINT: Record<string, string> = {
  Easing:     '유동성 완화 국면 — 매수 환경 우호적',
  Neutral:    '유동성 중립 국면 — 선별적 접근 권장',
  Tightening: '유동성 긴축 국면 — 보수적 접근 권장',
};

const SENTIMENT_INVEST_HINT: Record<string, string> = {
  'Aggressive Buy':  '적극 매수 국면 — 역발상 매수 기회',
  'Buy Recommended': '매수 추천 국면 — 분할 매수 고려',
  'DCA Maintain':    '기계적 적립식 국면 — 정기 매수 유지',
  'Cash Reserve':    '현금 확보 국면 — 신중한 접근',
  'Wait':            '관망 국면 — 현금 비중 유지',
  'Risk Override':   '리스크 필터 활성 — 매수 보류',
};

function MarketContextPanel() {
  const liq  = useLiquidityEngine();
  const sent = useSentimentEngine();

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-market-neutral">
        현재 시장 환경 — 종목 매수 판단 기준
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col items-center rounded-lg bg-surface p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-market-neutral">유동성</p>
          <GaugeChart
            segments={LIQUIDITY_SEGMENTS}
            normalized={(liq.totalScore + 3) / 6}
            score={liq.formatted.totalScore}
            status={liq.state}
            size={160}
          />
          <p className="mt-2 text-center text-xs text-market-neutral leading-snug">
            {LIQUIDITY_INVEST_HINT[liq.state]}
          </p>
        </div>
        <div className="flex flex-col items-center rounded-lg bg-surface p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-market-neutral">센티멘트</p>
          <GaugeChart
            segments={SENTIMENT_SEGMENTS}
            normalized={(sent.totalScore + 3) / 6}
            score={sent.formatted.totalScore}
            status={sent.state}
            size={160}
          />
          <p className="mt-2 text-center text-xs text-market-neutral leading-snug">
            {SENTIMENT_INVEST_HINT[sent.state] ?? sent.state}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── 52-Week Range Bar ────────────────────────────────────────────────────────

function RangeBar52W({ low, high, current }: { low: number; high: number; current: number }) {
  const pct        = Math.max(0, Math.min(100, ((current - low) / (high - low)) * 100));
  const fromHighPct = ((current - high) / high) * 100;
  const fromLowPct  = ((current - low)  / low)  * 100;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-market-neutral">52주 가격 범위</p>
      <div className="space-y-3">
        <div className="relative h-2 w-full rounded-full bg-surface overflow-visible">
          <div className="absolute inset-0 rounded-full bg-linear-to-r from-bear/40 via-risk/30 to-bull/40" />
          <div
            className="absolute top-1/2 h-5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-md"
            style={{ left: `${pct}%` }}
          />
        </div>
        <div className="flex items-end justify-between text-xs">
          <div>
            <p className="text-market-neutral">52주 최저</p>
            <p className="font-bold text-foreground">${fmtPrice(low)}</p>
            <p className="text-[10px] text-bull">+{fromLowPct.toFixed(1)}% ↑</p>
          </div>
          <div className="text-center">
            <p className="text-market-neutral">현재가</p>
            <p className="text-base font-black text-foreground">${fmtPrice(current)}</p>
            <p className={`text-[10px] font-medium ${fromHighPct > -10 ? 'text-risk' : 'text-market-neutral'}`}>
              52주 최고 대비 {fromHighPct.toFixed(1)}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-market-neutral">52주 최고</p>
            <p className="font-bold text-foreground">${fmtPrice(high)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Valuation Comparison ─────────────────────────────────────────────────────

const VALUATION_ROWS = [
  { key: 'pe',        label: 'P/E (TTM)',   lowerBetter: true },
  { key: 'forwardPe', label: 'Forward P/E', lowerBetter: true },
  { key: 'pb',        label: 'P/B',         lowerBetter: true },
  { key: 'evEbitda',  label: 'EV/EBITDA',   lowerBetter: true },
  { key: 'pegRatio',  label: 'PEG Ratio',   lowerBetter: true },
] as const;

function ValuationPanel({ stock }: { stock: StockDetail }) {
  const v = stock.valuation;
  const sectorMap: Record<string, number | null> = {
    pe:        v.sectorPe,
    forwardPe: v.sectorPe,
    pb:        v.sectorPb,
    evEbitda:  v.sectorEvEbitda,
    pegRatio:  null,
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-market-neutral">
        밸류에이션 — 섹터 평균 비교
      </p>
      <div className="space-y-0 overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-3 bg-surface px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-market-neutral">
          <span>지표</span>
          <span className="text-center">현재 기업</span>
          <span className="text-center">섹터 ETF</span>
        </div>
        {VALUATION_ROWS.map(({ key, label, lowerBetter }) => {
          const company = v[key] as number | null;
          const sector  = sectorMap[key];
          const isPremium =
            company !== null && sector !== null
              ? (lowerBetter ? company > sector : company < sector)
              : null;
          const companyColor =
            isPremium === null ? 'text-foreground' : isPremium ? 'text-bear' : 'text-bull';

          return (
            <div
              key={key}
              className="grid grid-cols-3 border-t border-border px-4 py-2.5 text-sm transition-colors hover:bg-surface/50"
            >
              <span className="text-xs text-market-neutral">{label}</span>
              <span className={`text-center font-bold ${companyColor}`}>
                {company !== null ? company.toFixed(1) : 'N/A'}
              </span>
              <span className="text-center text-foreground">
                {sector !== null ? sector.toFixed(1) : '—'}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-market-neutral/50">
        녹색 = 섹터 대비 저평가 · 적색 = 섹터 대비 고평가 (낮을수록 유리한 지표 기준)
      </p>
    </div>
  );
}

// ─── Financial Metrics Grid ───────────────────────────────────────────────────

function FinancialMetrics({ stock }: { stock: StockDetail }) {
  const f = stock.financials;
  const metrics = [
    { label: '시가총액',   value: fmtMktCap(f.marketCap),                                            sub: 'Market Cap' },
    { label: 'EPS (TTM)', value: fmtNum(f.eps, 2, '$'),                                             sub: '주당 순이익' },
    { label: 'ROE',        value: fmtPct(f.roe),                                                    sub: '자기자본이익률', warn: f.roe !== null && f.roe > 100 },
    { label: '부채비율',   value: fmtPct(f.debtRatio),                                              sub: 'Debt Ratio',    warn: f.debtRatio !== null && f.debtRatio > 80 },
    { label: '배당수익률', value: f.dividendYield !== null ? fmtPct(f.dividendYield, 2) : '무배당', sub: 'Dividend Yield' },
    { label: '배당성장률', value: f.dividendGrowth !== null ? `+${f.dividendGrowth.toFixed(1)}%` : 'N/A', sub: '5Y CAGR' },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-market-neutral">
        핵심 재무 지표
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {metrics.map(({ label, value, sub, warn }) => (
          <div
            key={label}
            className={`rounded-lg p-3 ${warn ? 'bg-risk/10 border border-risk/20' : 'bg-surface'}`}
          >
            <p className="text-[10px] text-market-neutral">{label}</p>
            <p className={`mt-1 text-base font-bold ${warn ? 'text-risk' : 'text-foreground'}`}>{value}</p>
            <p className="mt-0.5 text-[10px] text-market-neutral/60">{sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stock detail layout ──────────────────────────────────────────────────────

function StockDetailView({ stock }: { stock: StockDetail }) {
  const [intradaySeries, setIntradaySeries]   = useState<IntradayPoint[]>([]);
  const [intradayLoading, setIntradayLoading] = useState(false);

  const handlePeriodChange = useCallback(async (p: string) => {
    if (p !== '1D') return;
    setIntradayLoading(true);
    try {
      const res  = await fetch(`/api/stock/intraday/${stock.symbol}`);
      const data = await res.json();
      setIntradaySeries(data.points ?? []);
    } catch {
      setIntradaySeries([]);
    } finally {
      setIntradayLoading(false);
    }
  }, [stock.symbol]);

  const indicator: MarketIndicator = {
    id:            stock.symbol,
    name:          stock.name,
    source:        'yahoo',
    unit:          '$',
    currentValue:  stock.currentPrice,
    previousValue: stock.previousClose,
    change:        stock.change,
    changeRate:    stock.changeRate,
    updatedAt:     stock.updatedAt,
    timeSeries:    stock.timeSeries,
  };

  return (
    <div className="mt-5 space-y-4">
      <StockHeader stock={stock} />
      <MarketContextPanel />

      {/* 1. 차트 */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-market-neutral">
          가격 차트
        </p>
        <MacroLineChart
          indicator={indicator}
          intradaySeries={intradaySeries}
          intradayLoading={intradayLoading}
          onPeriodChange={handlePeriodChange}
        />
      </div>

      {/* 2. 52주 가격 */}
      <RangeBar52W low={stock.week52Low} high={stock.week52High} current={stock.currentPrice} />

      {/* 3. 핵심 재무지표 */}
      <FinancialMetrics stock={stock} />

      {/* 4. 밸류에이션/섹터평균 비교 */}
      <ValuationPanel stock={stock} />

      {/* 5. 애널리스트 목표주가 */}
      {stock.analystTarget && (
        <AnalystTargetPanel target={stock.analystTarget} currentPrice={stock.currentPrice} />
      )}
    </div>
  );
}

// ─── StockTab ─────────────────────────────────────────────────────────────────

export default function StockTab() {
  const [selected, setSelected] = useState<StockDetail | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleSelect = useCallback(async (result: StockSearchResult) => {
    setLoading(true);
    setError(null);
    setSelected(null);
    try {
      const res = await fetch(`/api/stock/detail/${result.symbol}`);
      if (!res.ok) throw new Error('데이터를 불러오지 못했습니다');
      const data: StockDetail = await res.json();
      setSelected(data);
    } catch (e: any) {
      setError(e.message ?? '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <section aria-label="개별 종목 분석">
      {/* Search row */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-market-neutral">
              종목 검색
            </p>
            <p className="text-[11px] text-market-neutral/50">
              티커 또는 회사명으로 검색 · Yahoo Finance 실시간 데이터
            </p>
          </div>
          {selected && (
            <div className="flex items-center gap-2 rounded-lg bg-bull/10 border border-bull/20 px-3 py-1.5">
              <span className="text-xs font-bold text-bull">{selected.symbol}</span>
              <ChevronRight size={12} className="text-bull/60" />
              <span className="text-xs text-bull/80 truncate max-w-40">{selected.name}</span>
            </div>
          )}
        </div>
        <div className="mt-3">
          <SearchBox
            onSelect={handleSelect}
            onClear={() => { setSelected(null); setError(null); }}
            hasSelection={selected !== null}
          />
        </div>
      </div>

      {/* Content */}
      {loading && <StockDetailSkeleton />}
      {error && !loading && (
        <div className="mt-8 flex flex-col items-center py-12 text-center">
          <p className="text-sm font-semibold text-bear">{error}</p>
          <p className="mt-1 text-xs text-market-neutral">다시 검색해 보세요</p>
        </div>
      )}
      {selected && !loading && <StockDetailView stock={selected} />}
      {!selected && !loading && !error && <EmptyState />}
    </section>
  );
}
