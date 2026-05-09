import { NextResponse } from 'next/server';
import { fetchJson } from '@/src/lib/fetch-retry';
import { getCache, setCache, isFresh } from '@/src/lib/server-cache';
import { normalizeIndicator } from '@/src/utils/normalize';
import { recordSource } from '@/src/lib/source-tracker';
import type { LiquidityIndicator, LiquidityRawInputs } from '@/src/types/market';

const CACHE_KEY = 'market:liquidity';
const CACHE_TTL = 60 * 60 * 1_000; // 1시간

// ─── 응답 타입 ────────────────────────────────────────────────────────────────

export interface LiquidityApiResponse {
  indicators: LiquidityIndicator[];
  rawInputs: LiquidityRawInputs;
  updatedAt: string;
}

// ─── FRED Series 메타데이터 ───────────────────────────────────────────────────
// WALCL 단위: 백만 달러 → 10억 달러 변환을 위해 divisor: 1000

const FRED_SERIES: Record<string, { id: string; name: string; unit: string; divisor?: number }> = {
  FEDFUNDS:   { id: 'fed_rate',    name: '연방기금금리 (EFFR)',      unit: '%'  },
  WALCL:      { id: 'fed_assets',  name: '연준 자산 (대차대조표)',   unit: 'B', divisor: 1_000 },
  WTREGEN:    { id: 'tga_balance', name: '재무부 일반 계정 (TGA)',   unit: 'B'  },
  WRBWFRBL:   { id: 'reserves',    name: '지급준비금 잔액',           unit: 'B'  },
  RRPONTSYD:  { id: 'rrp_balance', name: '역레포 잔액 (RRP)',         unit: 'B'  },
};

// ─── Mock 데이터 ──────────────────────────────────────────────────────────────

const MOCK_NOW = new Date().toISOString();

const MOCK_INDICATORS: LiquidityIndicator[] = [
  { id: 'fed_rate',    name: '연방기금금리 (EFFR)',      source: 'fred', unit: '%', currentValue: 4.33,   previousValue: 4.33,   change:    0.00, changeRate:   0.00, updatedAt: MOCK_NOW },
  { id: 'fed_assets',  name: '연준 자산 (대차대조표)',   source: 'fred', unit: 'B', currentValue: 6_720,  previousValue: 6_820,  change: -100.00, changeRate:  -1.47, updatedAt: MOCK_NOW },
  { id: 'tga_balance', name: '재무부 일반 계정 (TGA)',   source: 'fred', unit: 'B', currentValue:   720,  previousValue:   680,  change:   40.00, changeRate:   5.88, updatedAt: MOCK_NOW },
  { id: 'reserves',    name: '지급준비금 잔액',           source: 'fred', unit: 'B', currentValue: 3_320,  previousValue: 3_280,  change:   40.00, changeRate:   1.22, updatedAt: MOCK_NOW },
  { id: 'rrp_balance', name: '역레포 잔액 (RRP)',         source: 'fred', unit: 'B', currentValue:   310,  previousValue:   420,  change: -110.00, changeRate: -26.19, updatedAt: MOCK_NOW },
];

const MOCK_RAW_INPUTS: LiquidityRawInputs = {
  fedAssets:  { current: 6_720, previous: 6_820 },
  tgaBalance: { current:   720, previous:   680  },
  rrpBalance: { current:   310, previous:   420  },
  fedRate:    { current:  4.33, previous:  4.33  },
  updatedAt: MOCK_NOW,
};

// ─── FRED API 호출 ────────────────────────────────────────────────────────────

interface FredResponse {
  observations: Array<{ date: string; value: string }>;
}

async function fetchFredSeries(
  seriesId: string,
  apiKey: string,
): Promise<{ current: number; previous: number }> {
  const url =
    `https://api.stlouisfed.org/fred/series/observations` +
    `?series_id=${seriesId}&api_key=${apiKey}&limit=2&sort_order=desc&file_type=json`;

  const data = await fetchJson<FredResponse>(url);
  const obs = data?.observations;
  if (!Array.isArray(obs) || obs.length < 1) {
    throw new Error(`No observations for ${seriesId}`);
  }

  const current = parseFloat(obs[0].value);
  const previous = obs.length >= 2 ? parseFloat(obs[1].value) : current;

  if (!isFinite(current)) throw new Error(`Invalid value for ${seriesId}: ${obs[0].value}`);

  return { current, previous: isFinite(previous) ? previous : current };
}

type SeriesMap = Record<string, { current: number; previous: number }>;

async function fetchAllFredSeries(apiKey: string): Promise<SeriesMap> {
  const entries = Object.keys(FRED_SERIES);
  const settled = await Promise.allSettled(
    entries.map((id) => fetchFredSeries(id, apiKey).then((v) => [id, v] as const)),
  );

  return settled.reduce<SeriesMap>((acc, result) => {
    if (result.status === 'fulfilled') {
      const [id, value] = result.value;
      acc[id] = value;
    }
    return acc;
  }, {});
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET() {
  const now = new Date().toISOString();

  if (isFresh(CACHE_KEY)) {
    const cached = getCache<LiquidityApiResponse>(CACHE_KEY)!;
    return NextResponse.json(cached.data, { headers: { 'X-Cache': 'hit' } });
  }

  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    recordSource({
      sourceId: 'liquidity', success: false, responseTimeMs: 0,
      updatedAt: now, isStale: false, usedFallback: true,
    });
    return NextResponse.json(
      { indicators: MOCK_INDICATORS, rawInputs: MOCK_RAW_INPUTS, updatedAt: now },
      { headers: { 'X-Cache': 'mock' } },
    );
  }

  const t0 = Date.now();
  try {
    const seriesMap = await fetchAllFredSeries(apiKey);

    const get = (id: string, divisor = 1) => {
      const d = seriesMap[id];
      if (!d) return null;
      return { current: d.current / divisor, previous: d.previous / divisor };
    };

    const fedAssetsData = get('WALCL', 1_000);
    const tgaData = get('WTREGEN');
    const rrpData = get('RRPONTSYD');
    const fedRateData = get('FEDFUNDS');

    if (!fedAssetsData || !tgaData || !rrpData || !fedRateData) {
      throw new Error('Missing critical FRED series');
    }

    const indicators: LiquidityIndicator[] = Object.entries(FRED_SERIES)
      .filter(([id]) => seriesMap[id] != null)
      .map(([id, meta]): LiquidityIndicator => {
        const { current, previous } = seriesMap[id];
        const divisor = meta.divisor ?? 1;
        return normalizeIndicator({
          id:            meta.id,
          name:          meta.name,
          source:        'fred',
          unit:          meta.unit,
          currentValue:  current / divisor,
          previousValue: previous / divisor,
          updatedAt:     now,
        }) as LiquidityIndicator;
      });

    const rawInputs: LiquidityRawInputs = {
      fedAssets:  fedAssetsData,
      tgaBalance: tgaData,
      rrpBalance: rrpData,
      fedRate:    fedRateData,
      updatedAt:  now,
    };

    const response: LiquidityApiResponse = { indicators, rawInputs, updatedAt: now };
    setCache(CACHE_KEY, response, CACHE_TTL);

    recordSource({
      sourceId: 'liquidity', success: true, responseTimeMs: Date.now() - t0,
      updatedAt: now, isStale: false, usedFallback: false,
    });

    return NextResponse.json(response);
  } catch (err) {
    console.error('[/api/market/liquidity]', err);

    const stale = getCache<LiquidityApiResponse>(CACHE_KEY);
    recordSource({
      sourceId: 'liquidity', success: false, responseTimeMs: Date.now() - t0,
      updatedAt: stale?.updatedAt ?? now, isStale: stale?.isStale ?? true,
      usedFallback: !!stale,
    });

    if (stale) {
      return NextResponse.json(stale.data, { headers: { 'X-Cache': 'stale' } });
    }

    return NextResponse.json(
      { indicators: MOCK_INDICATORS, rawInputs: MOCK_RAW_INPUTS, updatedAt: now },
      { headers: { 'X-Cache': 'mock' } },
    );
  }
}
