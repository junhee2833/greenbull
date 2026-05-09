import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';
import { getCache, setCache, isFresh } from '@/src/lib/server-cache';
import type { StockDetail, StockValuation, StockFinancials, AnalystTarget } from '@/src/types/stock';
import type { TimeSeriesPoint } from '@/src/types/market';

const CACHE_TTL = 5 * 60 * 1_000; // 5분

// ─── Sector → ETF 매핑 ───────────────────────────────────────────────────────

const SECTOR_TO_ETF: Record<string, string> = {
  'Technology':             'XLK',
  'Financial Services':     'XLF',
  'Healthcare':             'XLV',
  'Consumer Cyclical':      'XLY',
  'Consumer Defensive':     'XLP',
  'Energy':                 'XLE',
  'Industrials':            'XLI',
  'Utilities':              'XLU',
  'Basic Materials':        'XLB',
  'Real Estate':            'XLRE',
  'Communication Services': 'XLC',
};

function n(v: number | null | undefined): number | null {
  return v != null && isFinite(v) ? v : null;
}

async function fetchSectorValuation(
  etfSymbol: string,
): Promise<{ pe: number | null; pb: number | null; evEbitda: number | null }> {
  try {
    const s = await (yahooFinance.quoteSummary(etfSymbol, {
      modules: ['summaryDetail', 'defaultKeyStatistics'],
    }) as Promise<any>);
    return {
      pe:       n(s.summaryDetail?.trailingPE),
      pb:       n(s.summaryDetail?.priceToBook),
      evEbitda: n(s.defaultKeyStatistics?.enterpriseToEbitda),
    };
  } catch {
    return { pe: null, pb: null, evEbitda: null };
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const upper = symbol.toUpperCase();
  const cacheKey = `stock:detail:${upper}`;

  if (isFresh(cacheKey)) {
    const cached = getCache<StockDetail>(cacheKey)!;
    return NextResponse.json(cached.data, { headers: { 'X-Cache': 'hit' } });
  }

  const now = new Date().toISOString();

  try {
    const summaryPromise: Promise<any> = yahooFinance.quoteSummary(upper, {
      modules: ['price', 'summaryDetail', 'defaultKeyStatistics', 'financialData', 'summaryProfile'],
    }) as Promise<any>;
    const historyPromise: Promise<any[]> = (yahooFinance.historical(upper, {
      period1: new Date(Date.now() - 366 * 86_400_000).toISOString().slice(0, 10),
      period2: new Date().toISOString().slice(0, 10),
      interval: '1d',
    }) as Promise<any[]>).catch(() => []);
    const [summary, history] = await Promise.all([summaryPromise, historyPromise]);

    const price   = summary.price as any;
    const detail  = summary.summaryDetail as any;
    const stats   = summary.defaultKeyStatistics as any;
    const finData = summary.financialData as any;
    const profile = summary.summaryProfile as any;

    const currentPrice  = n(price?.regularMarketPrice) ?? 0;
    const previousClose = n(price?.regularMarketPreviousClose) ?? currentPrice;
    const change        = currentPrice - previousClose;
    const changeRate    = previousClose !== 0 ? (change / previousClose) * 100 : 0;

    const sector      = profile?.sector ?? price?.sector ?? '';
    const subIndustry = profile?.industry ?? '';
    const name        = price?.longName ?? price?.shortName ?? upper;

    // Sector ETF valuation
    const etfSymbol = SECTOR_TO_ETF[sector];
    const sectorVal = etfSymbol
      ? await fetchSectorValuation(etfSymbol)
      : { pe: null, pb: null, evEbitda: null };

    // Financials
    const totalAssets = n(finData?.totalCash) !== null && n(finData?.totalDebt) !== null
      ? (finData.totalCash + finData.totalDebt)
      : null;
    const debtRatio = totalAssets && totalAssets > 0 && n(finData?.totalDebt) !== null
      ? (finData.totalDebt / totalAssets) * 100
      : null;

    const financials: StockFinancials = {
      marketCap:      n(price?.marketCap) !== null ? (price.marketCap / 1e9) : null,
      eps:            n(stats?.trailingEps),
      roe:            n(finData?.returnOnEquity) !== null ? finData.returnOnEquity * 100 : null,
      debtRatio:      debtRatio,
      dividendYield:  n(detail?.dividendYield) !== null ? detail.dividendYield * 100 : null,
      dividendGrowth: n(stats?.fiveYearAverageReturn) !== null ? stats.fiveYearAverageReturn * 100 : null,
    };

    const valuation: StockValuation = {
      pe:             n(detail?.trailingPE),
      forwardPe:      n(detail?.forwardPE),
      pb:             n(detail?.priceToBook),
      evEbitda:       n(stats?.enterpriseToEbitda),
      pegRatio:       n(stats?.pegRatio),
      sectorPe:       sectorVal.pe,
      sectorPb:       sectorVal.pb,
      sectorEvEbitda: sectorVal.evEbitda,
    };

    // Analyst target
    const targetMean = n(finData?.targetMeanPrice);
    const targetLow  = n(finData?.targetLowPrice);
    const targetHigh = n(finData?.targetHighPrice);
    const count      = n(finData?.numberOfAnalystOpinions);
    const analystTarget: AnalystTarget | null =
      targetMean !== null && targetLow !== null && targetHigh !== null
        ? {
            low:    targetLow,
            mean:   targetMean,
            high:   targetHigh,
            count:  count ?? 0,
            upside: currentPrice > 0 ? ((targetMean - currentPrice) / currentPrice) * 100 : 0,
          }
        : null;

    // Historical time series
    const timeSeries: TimeSeriesPoint[] = (history as any[])
      .filter((h: any) => h.close != null)
      .map((h: any) => ({
        date:  new Date(h.date).toISOString().slice(0, 10),
        value: h.close,
      }));

    const result: StockDetail = {
      symbol:        upper,
      name,
      sector,
      subIndustry,
      currentPrice,
      previousClose,
      change,
      changeRate,
      week52High:    n(detail?.fiftyTwoWeekHigh) ?? currentPrice,
      week52Low:     n(detail?.fiftyTwoWeekLow)  ?? currentPrice,
      valuation,
      financials,
      analystTarget,
      timeSeries,
      updatedAt:     now,
    };

    setCache(cacheKey, result, CACHE_TTL);
    return NextResponse.json(result, { headers: { 'X-Cache': 'miss' } });
  } catch (err) {
    console.error(`[/api/stock/detail/${upper}]`, err);
    return NextResponse.json({ error: 'Failed to fetch stock data' }, { status: 500 });
  }
}
