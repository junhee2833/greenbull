/**
 * 2026년 5월 기준 개별 종목 시뮬레이션 Mock 데이터
 * AAPL, MSFT, NVDA, JPM, AMZN
 */

import type { StockDetail, StockSearchResult } from '@/src/types/stock';
import type { TimeSeriesPoint } from '@/src/types/market';

// ─── LCG 시계열 생성 (marketData.ts 와 동일 로직) ────────────────────────────

function buildSeries(endValue: number, days: number, volatility = 0.01, seed = 42): TimeSeriesPoint[] {
  const series: TimeSeriesPoint[] = [];
  let rng = seed;
  const rand = () => {
    rng = (rng * 1664525 + 1013904223) & 0xffffffff;
    return (rng >>> 0) / 0xffffffff;
  };
  let value = endValue / Math.pow(1 + volatility * 0.04, days);
  const now = new Date('2026-05-07');
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const dateStr = d.toISOString().split('T')[0];
    value = value * (1 + (rand() - 0.48) * volatility);
    series.push({ date: dateStr, value: Math.round(value * 100) / 100 });
  }
  return series;
}

const AT = '2026-05-07T14:32:00Z';

// ─── Mock 주식 데이터 ─────────────────────────────────────────────────────────

export const MOCK_STOCKS: StockDetail[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Technology',
    subIndustry: 'Consumer Electronics',
    currentPrice: 195.42,
    previousClose: 193.18,
    change: 2.24,
    changeRate: 1.16,
    week52High: 237.49,
    week52Low: 164.08,
    valuation: {
      pe: 31.2, forwardPe: 26.8, pb: 8.3, evEbitda: 21.4, pegRatio: 2.4,
      sectorPe: 28.4, sectorPb: 5.8, sectorEvEbitda: 18.2,
    },
    financials: {
      marketCap: 2_980, eps: 6.26, roe: 147.3, debtRatio: 82.1,
      dividendYield: 0.54, dividendGrowth: 6.8,
    },
    timeSeries: buildSeries(195.42, 365, 0.012, 201),
    analystTarget: null,
    updatedAt: AT,
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    sector: 'Technology',
    subIndustry: 'Software — Infrastructure',
    currentPrice: 407.82,
    previousClose: 403.29,
    change: 4.53,
    changeRate: 1.12,
    week52High: 468.35,
    week52Low: 344.51,
    valuation: {
      pe: 35.8, forwardPe: 30.2, pb: 12.4, evEbitda: 26.1, pegRatio: 2.1,
      sectorPe: 28.4, sectorPb: 5.8, sectorEvEbitda: 18.2,
    },
    financials: {
      marketCap: 3_030, eps: 11.38, roe: 38.2, debtRatio: 55.4,
      dividendYield: 0.72, dividendGrowth: 10.1,
    },
    timeSeries: buildSeries(407.82, 365, 0.011, 302),
    analystTarget: null,
    updatedAt: AT,
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    sector: 'Technology',
    subIndustry: 'Semiconductors',
    currentPrice: 892.45,
    previousClose: 870.23,
    change: 22.22,
    changeRate: 2.55,
    week52High: 974.0,
    week52Low: 420.18,
    valuation: {
      pe: 38.5, forwardPe: 28.9, pb: 21.6, evEbitda: 31.2, pegRatio: 0.8,
      sectorPe: 28.4, sectorPb: 5.8, sectorEvEbitda: 18.2,
    },
    financials: {
      marketCap: 2_190, eps: 23.17, roe: 123.4, debtRatio: 38.9,
      dividendYield: 0.03, dividendGrowth: null,
    },
    timeSeries: buildSeries(892.45, 365, 0.022, 403),
    analystTarget: null,
    updatedAt: AT,
  },
  {
    symbol: 'JPM',
    name: 'JPMorgan Chase & Co.',
    sector: 'Financial Services',
    subIndustry: 'Banks — Diversified',
    currentPrice: 244.18,
    previousClose: 241.82,
    change: 2.36,
    changeRate: 0.98,
    week52High: 280.14,
    week52Low: 188.52,
    valuation: {
      pe: 12.8, forwardPe: 11.4, pb: 2.1, evEbitda: null, pegRatio: 1.2,
      sectorPe: 13.2, sectorPb: 1.8, sectorEvEbitda: null,
    },
    financials: {
      marketCap: 702, eps: 19.08, roe: 17.2, debtRatio: 67.4,
      dividendYield: 2.18, dividendGrowth: 11.3,
    },
    timeSeries: buildSeries(244.18, 365, 0.008, 504),
    analystTarget: null,
    updatedAt: AT,
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    sector: 'Consumer Discretionary',
    subIndustry: 'Internet Retail',
    currentPrice: 197.34,
    previousClose: 194.82,
    change: 2.52,
    changeRate: 1.29,
    week52High: 242.52,
    week52Low: 151.61,
    valuation: {
      pe: 41.2, forwardPe: 31.6, pb: 7.8, evEbitda: 19.4, pegRatio: 1.4,
      sectorPe: 22.6, sectorPb: 4.2, sectorEvEbitda: 16.8,
    },
    financials: {
      marketCap: 2_060, eps: 4.79, roe: 22.4, debtRatio: 48.2,
      dividendYield: null, dividendGrowth: null,
    },
    timeSeries: buildSeries(197.34, 365, 0.014, 605),
    analystTarget: null,
    updatedAt: AT,
  },
];

export const STOCK_SEARCH_LIST: StockSearchResult[] = MOCK_STOCKS.map(
  ({ symbol, name, sector }) => ({ symbol, name, sector }),
);
