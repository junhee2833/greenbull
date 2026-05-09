import { NextResponse } from 'next/server';
import { fetchJson } from '@/src/lib/fetch-retry';
import { getCache, setCache, isFresh } from '@/src/lib/server-cache';
import { normalizeIndicator } from '@/src/utils/normalize';
import { recordSource } from '@/src/lib/source-tracker';
import type { MacroIndicator } from '@/src/types/market';

const CACHE_KEY = 'market:macro';
const CACHE_TTL = 5 * 60 * 1_000; // 5분

// ─── 응답 타입 ────────────────────────────────────────────────────────────────

export interface MacroApiResponse {
  indicators: MacroIndicator[];
  updatedAt: string;
}

// ─── Symbol 메타데이터 ────────────────────────────────────────────────────────

const SYMBOL_META: Record<string, { id: string; name: string; unit: string }> = {
  '^GSPC':    { id: 'sp500',   name: 'S&P 500',                 unit: ''       },
  '^IXIC':    { id: 'nasdaq',  name: 'NASDAQ',                   unit: ''       },
  'USDKRW=X': { id: 'usd_krw', name: 'USD/KRW',                unit: '₩'      },
  'USDJPY=X': { id: 'usd_jpy', name: 'USD/JPY',                 unit: '¥'      },
  'DX-Y.NYB': { id: 'dxy',    name: '달러 인덱스 (DXY)',         unit: ''       },
  'CL=F':     { id: 'wti',    name: 'WTI 원유',                  unit: '$/bbl'  },
  '^TNX':     { id: 'us10y',  name: '미국 10년 국채 수익률',     unit: '%'      },
};

// ─── Mock 데이터 (API 실패 최후 폴백) ─────────────────────────────────────────

const MOCK_INDICATORS: MacroIndicator[] = [
  { id: 'sp500',   name: 'S&P 500',               source: 'yahoo', unit: '',      currentValue: 5_843.20,  previousValue: 5_798.60,  change:  44.60,  changeRate:  0.77,  updatedAt: new Date().toISOString() },
  { id: 'nasdaq',  name: 'NASDAQ',                 source: 'yahoo', unit: '',      currentValue: 18_423.50, previousValue: 18_210.30, change:  213.20, changeRate:  1.17,  updatedAt: new Date().toISOString() },
  { id: 'usd_krw', name: 'USD/KRW',               source: 'yahoo', unit: '₩',     currentValue: 1_382.30,  previousValue: 1_390.00,  change:   -7.70, changeRate: -0.55,  updatedAt: new Date().toISOString() },
  { id: 'usd_jpy', name: 'USD/JPY',               source: 'yahoo', unit: '¥',     currentValue:   147.85,  previousValue:   148.20,  change:   -0.35, changeRate: -0.24,  updatedAt: new Date().toISOString() },
  { id: 'dxy',     name: '달러 인덱스 (DXY)',     source: 'yahoo', unit: '',      currentValue:   103.42,  previousValue:   103.85,  change:   -0.43, changeRate: -0.41,  updatedAt: new Date().toISOString() },
  { id: 'wti',     name: 'WTI 원유',              source: 'yahoo', unit: '$/bbl', currentValue:    71.45,  previousValue:    72.30,  change:   -0.85, changeRate: -1.18,  updatedAt: new Date().toISOString() },
  { id: 'us10y',   name: '미국 10년 국채 수익률', source: 'yahoo', unit: '%',     currentValue:     4.35,  previousValue:     4.42,  change:   -0.07, changeRate: -1.58,  updatedAt: new Date().toISOString() },
];

// ─── Yahoo Finance 호출 ───────────────────────────────────────────────────────

interface YahooQuoteResult {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketPreviousClose?: number;
}

interface YahooQuoteResponse {
  quoteResponse: { result: YahooQuoteResult[]; error: unknown };
}

async function fetchYahooQuotes(now: string): Promise<MacroIndicator[]> {
  const symbols = Object.keys(SYMBOL_META).join(',');
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;

  const data = await fetchJson<YahooQuoteResponse>(url, {
    headers: {
      Origin:  'https://finance.yahoo.com',
      Referer: 'https://finance.yahoo.com/',
    },
  });

  const results = data?.quoteResponse?.result;
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error('Empty Yahoo Finance response');
  }

  return results
    .filter((r) => r.regularMarketPrice != null)
    .map((r): MacroIndicator | null => {
      const meta = SYMBOL_META[r.symbol];
      if (!meta) return null;
      return normalizeIndicator({
        id:            meta.id,
        name:          meta.name,
        source:        'yahoo',
        unit:          meta.unit,
        currentValue:  r.regularMarketPrice,
        previousValue: r.regularMarketPreviousClose,
        updatedAt:     now,
      }) as MacroIndicator;
    })
    .filter((ind): ind is MacroIndicator => ind !== null);
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET() {
  const now = new Date().toISOString();

  if (isFresh(CACHE_KEY)) {
    const cached = getCache<MacroApiResponse>(CACHE_KEY)!;
    return NextResponse.json(cached.data, { headers: { 'X-Cache': 'hit' } });
  }

  const t0 = Date.now();
  try {
    const indicators = await fetchYahooQuotes(now);
    const response: MacroApiResponse = { indicators, updatedAt: now };
    setCache(CACHE_KEY, response, CACHE_TTL);

    recordSource({
      sourceId: 'macro', success: true, responseTimeMs: Date.now() - t0,
      updatedAt: now, isStale: false, usedFallback: false,
    });

    return NextResponse.json(response);
  } catch (err) {
    console.error('[/api/market/macro]', err);

    const stale = getCache<MacroApiResponse>(CACHE_KEY);
    recordSource({
      sourceId: 'macro', success: false, responseTimeMs: Date.now() - t0,
      updatedAt: stale?.updatedAt ?? now, isStale: stale?.isStale ?? true,
      usedFallback: !!stale,
    });

    if (stale) {
      return NextResponse.json(stale.data, { headers: { 'X-Cache': 'stale' } });
    }

    return NextResponse.json(
      { indicators: MOCK_INDICATORS, updatedAt: now },
      { headers: { 'X-Cache': 'mock' } },
    );
  }
}
