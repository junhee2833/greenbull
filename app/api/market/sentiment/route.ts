import { NextResponse } from 'next/server';
import { fetchJson } from '@/src/lib/fetch-retry';
import { getCache, setCache, isFresh } from '@/src/lib/server-cache';
import { normalizeIndicator } from '@/src/utils/normalize';
import { recordSource } from '@/src/lib/source-tracker';
import type { SentimentIndicator, SentimentRawInputs, RationalEmotionalData } from '@/src/types/market';

const CACHE_KEY = 'market:sentiment';
const CACHE_TTL = 10 * 60 * 1_000; // 10분

// ─── 응답 타입 ────────────────────────────────────────────────────────────────

export interface SentimentApiResponse {
  indicators: SentimentIndicator[];
  rawInputs: SentimentRawInputs;
  updatedAt: string;
}

// ─── Mock 데이터 ──────────────────────────────────────────────────────────────

const MOCK_NOW = new Date().toISOString();

// Reddit 이성/감성 지수 — 실시간 Reddit 분석 미구현, Mock 사용
const MOCK_RATIONAL_EMOTIONAL: RationalEmotionalData = {
  finalIndex:            58.3,
  averageRationalScore:  62.1,
  averageEmotionalScore: 53.8,
  validPostCount:        342,
  updatedAt:             MOCK_NOW,
};

const MOCK_RAW_INPUTS: SentimentRawInputs = {
  vix:               { current: 18.42, previous: 20.15 },
  fearGreed:         { current: 62,    previous: 55    },
  rationalEmotional: MOCK_RATIONAL_EMOTIONAL,
  highYieldSpread:   { current:  3.18, previous:  3.45 },
  updatedAt: MOCK_NOW,
};

const MOCK_INDICATORS: SentimentIndicator[] = [
  { id: 'vix',                name: 'VIX (공포 지수)',         source: 'yahoo',  unit: '',  currentValue: 18.42, previousValue: 20.15, change: -1.73, changeRate:  -8.59, updatedAt: MOCK_NOW },
  { id: 'fear_greed',         name: 'CNN 공포&탐욕 지수',      source: 'cnn',    unit: '',  currentValue: 62,    previousValue: 55,    change:  7.00, changeRate:  12.73, updatedAt: MOCK_NOW },
  { id: 'rational_emotional', name: '이성/감성 지수 (Reddit)', source: 'reddit', unit: '',  currentValue: 58.3,  previousValue: 55.0,  change:  3.30, changeRate:   6.00, updatedAt: MOCK_NOW },
  { id: 'high_yield_spread',  name: '하이일드 스프레드',        source: 'fred',   unit: '%', currentValue:  3.18, previousValue:  3.45, change: -0.27, changeRate:  -7.83, updatedAt: MOCK_NOW },
];

// ─── Yahoo Finance VIX ────────────────────────────────────────────────────────

interface YahooQuoteResponse {
  quoteResponse: {
    result: Array<{ regularMarketPrice?: number; regularMarketPreviousClose?: number }>;
  };
}

async function fetchVix(): Promise<{ current: number; previous: number }> {
  const data = await fetchJson<YahooQuoteResponse>(
    'https://query1.finance.yahoo.com/v7/finance/quote?symbols=%5EVIX',
    { headers: { Origin: 'https://finance.yahoo.com', Referer: 'https://finance.yahoo.com/' } },
  );
  const result = data?.quoteResponse?.result?.[0];
  if (!result?.regularMarketPrice) throw new Error('Invalid VIX response');
  return {
    current:  result.regularMarketPrice,
    previous: result.regularMarketPreviousClose ?? result.regularMarketPrice,
  };
}

// ─── CNN Fear & Greed ─────────────────────────────────────────────────────────

interface CnnFearGreedResponse {
  fear_and_greed: { score: number; previous_close?: number };
}

async function fetchFearGreed(): Promise<{ current: number; previous: number }> {
  const data = await fetchJson<CnnFearGreedResponse>(
    'https://production.dataviz.cnn.io/index/fearandgreed/graphdata',
  );
  const fg = data?.fear_and_greed;
  if (!fg || typeof fg.score !== 'number') throw new Error('Invalid CNN F&G response');
  return {
    current:  Math.round(fg.score),
    previous: Math.round(fg.previous_close ?? fg.score),
  };
}

// ─── FRED 하이일드 스프레드 ───────────────────────────────────────────────────

interface FredResponse {
  observations: Array<{ date: string; value: string }>;
}

async function fetchHighYieldSpread(
  apiKey: string,
): Promise<{ current: number; previous: number }> {
  const url =
    `https://api.stlouisfed.org/fred/series/observations` +
    `?series_id=BAMLH0A0HYM2&api_key=${apiKey}&limit=2&sort_order=desc&file_type=json`;

  const data = await fetchJson<FredResponse>(url);
  const obs = data?.observations;
  if (!Array.isArray(obs) || obs.length < 1) throw new Error('No HY spread observations');

  const current = parseFloat(obs[0].value);
  const previous = obs.length >= 2 ? parseFloat(obs[1].value) : current;
  if (!isFinite(current)) throw new Error(`Invalid HY spread value: ${obs[0].value}`);

  return { current, previous: isFinite(previous) ? previous : current };
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET() {
  const now = new Date().toISOString();

  if (isFresh(CACHE_KEY)) {
    const cached = getCache<SentimentApiResponse>(CACHE_KEY)!;
    return NextResponse.json(cached.data, { headers: { 'X-Cache': 'hit' } });
  }

  // 각 소스를 독립적으로 시도 — 실패 시 Mock 값으로 대체
  let vixData        = MOCK_RAW_INPUTS.vix;
  let fearGreedData  = MOCK_RAW_INPUTS.fearGreed;
  let hySpreadData   = MOCK_RAW_INPUTS.highYieldSpread;
  let realFetchCount = 0;

  const t0 = Date.now();
  const [vixResult, fgResult] = await Promise.allSettled([fetchVix(), fetchFearGreed()]);

  if (vixResult.status === 'fulfilled') {
    vixData = vixResult.value;
    realFetchCount++;
    recordSource({ sourceId: 'vix',        success: true,  responseTimeMs: Date.now() - t0, updatedAt: now, isStale: false, usedFallback: false });
  } else {
    console.error('[/api/market/sentiment] VIX:', vixResult.reason);
    recordSource({ sourceId: 'vix',        success: false, responseTimeMs: Date.now() - t0, updatedAt: now, isStale: true,  usedFallback: true  });
  }

  if (fgResult.status === 'fulfilled') {
    fearGreedData = fgResult.value;
    realFetchCount++;
    recordSource({ sourceId: 'fear_greed', success: true,  responseTimeMs: Date.now() - t0, updatedAt: now, isStale: false, usedFallback: false });
  } else {
    console.error('[/api/market/sentiment] CNN F&G:', fgResult.reason);
    recordSource({ sourceId: 'fear_greed', success: false, responseTimeMs: Date.now() - t0, updatedAt: now, isStale: true,  usedFallback: true  });
  }

  const fredKey = process.env.FRED_API_KEY;
  if (fredKey) {
    try {
      hySpreadData = await fetchHighYieldSpread(fredKey);
      realFetchCount++;
      recordSource({ sourceId: 'high_yield_spread', success: true,  responseTimeMs: Date.now() - t0, updatedAt: now, isStale: false, usedFallback: false });
    } catch (err) {
      console.error('[/api/market/sentiment] HY Spread:', err);
      recordSource({ sourceId: 'high_yield_spread', success: false, responseTimeMs: Date.now() - t0, updatedAt: now, isStale: true,  usedFallback: true  });
    }
  }

  // Reddit 이성/감성 지수 — 실시간 분석 미구현
  const rationalEmotional: RationalEmotionalData = MOCK_RATIONAL_EMOTIONAL;

  const rawInputs: SentimentRawInputs = {
    vix:               vixData,
    fearGreed:         fearGreedData,
    rationalEmotional,
    highYieldSpread:   hySpreadData,
    updatedAt:         now,
  };

  const indicators: SentimentIndicator[] = [
    normalizeIndicator({ id: 'vix',                name: 'VIX (공포 지수)',         source: 'yahoo',  unit: '',  currentValue: vixData.current,           previousValue: vixData.previous,           updatedAt: now }) as SentimentIndicator,
    normalizeIndicator({ id: 'fear_greed',         name: 'CNN 공포&탐욕 지수',      source: 'cnn',    unit: '',  currentValue: fearGreedData.current,      previousValue: fearGreedData.previous,      updatedAt: now }) as SentimentIndicator,
    normalizeIndicator({ id: 'rational_emotional', name: '이성/감성 지수 (Reddit)', source: 'reddit', unit: '',  currentValue: rationalEmotional.finalIndex, previousValue: MOCK_INDICATORS[2].previousValue, updatedAt: now }) as SentimentIndicator,
    normalizeIndicator({ id: 'high_yield_spread',  name: '하이일드 스프레드',        source: 'fred',   unit: '%', currentValue: hySpreadData.current,       previousValue: hySpreadData.previous,       updatedAt: now }) as SentimentIndicator,
  ];

  const response: SentimentApiResponse = { indicators, rawInputs, updatedAt: now };

  if (realFetchCount > 0) {
    setCache(CACHE_KEY, response, CACHE_TTL);
  }

  const cacheStatus = realFetchCount === 0 ? 'mock' : realFetchCount < 2 ? 'partial' : 'miss';
  return NextResponse.json(response, { headers: { 'X-Cache': cacheStatus } });
}
