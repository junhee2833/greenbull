import type { TimeSeriesPoint } from './market';

// ─── Valuation comparison ─────────────────────────────────────────────────────

export interface StockValuation {
  pe:             number | null;
  forwardPe:      number | null;
  pb:             number | null;
  evEbitda:       number | null;
  pegRatio:       number | null;
  sectorPe:       number | null;
  sectorPb:       number | null;
  sectorEvEbitda: number | null;
}

// ─── Core financials ──────────────────────────────────────────────────────────

export interface StockFinancials {
  marketCap:      number | null; // USD billions
  eps:            number | null; // USD (TTM)
  roe:            number | null; // %
  debtRatio:      number | null; // %
  dividendYield:  number | null; // %  (null = no dividend)
  dividendGrowth: number | null; // % 5Y CAGR (null = no dividend history)
}

// ─── Analyst target price ─────────────────────────────────────────────────────

export interface AnalystTarget {
  low:    number;
  mean:   number;
  high:   number;
  count:  number;
  upside: number; // % from current price to mean target
}

// ─── Intraday (1D chart) ──────────────────────────────────────────────────────

export interface IntradayPoint {
  time:  string; // ISO datetime string
  value: number;
}

// ─── Search result (lightweight) ─────────────────────────────────────────────

export interface StockSearchResult {
  symbol: string;
  name:   string;
  sector: string;
}

// ─── Full stock detail ────────────────────────────────────────────────────────

export interface StockDetail extends StockSearchResult {
  subIndustry:   string;
  currentPrice:  number;
  previousClose: number;
  change:        number;
  changeRate:    number;
  week52High:    number;
  week52Low:     number;
  valuation:     StockValuation;
  financials:    StockFinancials;
  analystTarget: AnalystTarget | null;
  timeSeries:    TimeSeriesPoint[];
  updatedAt:     string;
}
