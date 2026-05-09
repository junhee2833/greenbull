import { NextResponse } from 'next/server';
import { fetchJson } from '@/src/lib/fetch-retry';
import { getCache, setCache, isFresh } from '@/src/lib/server-cache';
import { roundTo2 } from '@/src/utils/normalize';
import { recordSource } from '@/src/lib/source-tracker';
import type { SectorData } from '@/src/types/market';

const CACHE_KEY = 'market:sector';
const CACHE_TTL = 5 * 60 * 1_000; // 5분

// ─── 응답 타입 ────────────────────────────────────────────────────────────────

export interface SectorApiResponse {
  sectors: SectorData[];
  updatedAt: string;
}

// ─── ETF → 섹터 메타데이터 ───────────────────────────────────────────────────

const SECTOR_ETFS: Record<string, { id: string; name: string }> = {
  XLK:  { id: 'tech',          name: '정보기술 (IT)'  },
  XLF:  { id: 'financials',    name: '금융'           },
  XLV:  { id: 'healthcare',    name: '헬스케어'        },
  XLY:  { id: 'consumer_disc', name: '경기소비재'      },
  XLP:  { id: 'consumer_stap', name: '필수소비재'      },
  XLE:  { id: 'energy',        name: '에너지'          },
  XLI:  { id: 'industrials',   name: '산업재'          },
  XLU:  { id: 'utilities',     name: '유틸리티'        },
  XLB:  { id: 'materials',     name: '소재'            },
  XLRE: { id: 'real_estate',   name: '부동산 (REIT)'  },
  XLC:  { id: 'comm_services', name: '통신서비스'      },
};

// ─── Mock 데이터 ──────────────────────────────────────────────────────────────

const MOCK_NOW = new Date().toISOString();

const MOCK_SECTORS: SectorData[] = [
  { id: 'tech',          name: '정보기술 (IT)',  returnRate:  1.82, estimatedFlow: null, volume: null, marketSize: null, updatedAt: MOCK_NOW },
  { id: 'financials',    name: '금융',           returnRate:  0.74, estimatedFlow: null, volume: null, marketSize: null, updatedAt: MOCK_NOW },
  { id: 'healthcare',    name: '헬스케어',        returnRate:  0.31, estimatedFlow: null, volume: null, marketSize: null, updatedAt: MOCK_NOW },
  { id: 'consumer_disc', name: '경기소비재',      returnRate: -0.42, estimatedFlow: null, volume: null, marketSize: null, updatedAt: MOCK_NOW },
  { id: 'consumer_stap', name: '필수소비재',      returnRate:  0.18, estimatedFlow: null, volume: null, marketSize: null, updatedAt: MOCK_NOW },
  { id: 'energy',        name: '에너지',          returnRate: -1.23, estimatedFlow: null, volume: null, marketSize: null, updatedAt: MOCK_NOW },
  { id: 'industrials',   name: '산업재',           returnRate:  0.55, estimatedFlow: null, volume: null, marketSize: null, updatedAt: MOCK_NOW },
  { id: 'utilities',     name: '유틸리티',         returnRate:  0.09, estimatedFlow: null, volume: null, marketSize: null, updatedAt: MOCK_NOW },
  { id: 'materials',     name: '소재',             returnRate: -0.61, estimatedFlow: null, volume: null, marketSize: null, updatedAt: MOCK_NOW },
  { id: 'real_estate',   name: '부동산 (REIT)',    returnRate:  0.22, estimatedFlow: null, volume: null, marketSize: null, updatedAt: MOCK_NOW },
  { id: 'comm_services', name: '통신서비스',        returnRate:  1.04, estimatedFlow: null, volume: null, marketSize: null, updatedAt: MOCK_NOW },
];

// ─── Yahoo Finance 호출 ───────────────────────────────────────────────────────

interface YahooQuoteResult {
  symbol: string;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  marketCap?: number;
}

interface YahooQuoteResponse {
  quoteResponse: { result: YahooQuoteResult[]; error: unknown };
}

async function fetchSectorEtfs(now: string): Promise<SectorData[]> {
  const symbols = Object.keys(SECTOR_ETFS).join(',');
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;

  const data = await fetchJson<YahooQuoteResponse>(url, {
    headers: {
      Origin:  'https://finance.yahoo.com',
      Referer: 'https://finance.yahoo.com/',
    },
  });

  const results = data?.quoteResponse?.result;
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error('Empty Yahoo Finance sector response');
  }

  return results
    .map((r): SectorData | null => {
      const meta = SECTOR_ETFS[r.symbol];
      if (!meta) return null;

      // marketCap은 달러 단위 → 10억 달러(B)로 변환
      const marketSizeB =
        typeof r.marketCap === 'number' ? roundTo2(r.marketCap / 1e9) : null;
      const volumeM =
        typeof r.regularMarketVolume === 'number'
          ? roundTo2(r.regularMarketVolume / 1e6)
          : null;

      return {
        id:            meta.id,
        name:          meta.name,
        returnRate:    roundTo2(r.regularMarketChangePercent ?? null),
        estimatedFlow: null, // 펀드 플로우 데이터 소스 미연동
        volume:        volumeM,
        marketSize:    marketSizeB,
        updatedAt:     now,
      };
    })
    .filter((s): s is SectorData => s !== null);
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET() {
  const now = new Date().toISOString();

  if (isFresh(CACHE_KEY)) {
    const cached = getCache<SectorApiResponse>(CACHE_KEY)!;
    return NextResponse.json(cached.data, { headers: { 'X-Cache': 'hit' } });
  }

  const t0 = Date.now();
  try {
    const sectors = await fetchSectorEtfs(now);
    const response: SectorApiResponse = { sectors, updatedAt: now };
    setCache(CACHE_KEY, response, CACHE_TTL);

    recordSource({
      sourceId: 'sector', success: true, responseTimeMs: Date.now() - t0,
      updatedAt: now, isStale: false, usedFallback: false,
    });

    return NextResponse.json(response);
  } catch (err) {
    console.error('[/api/market/sector]', err);

    const stale = getCache<SectorApiResponse>(CACHE_KEY);
    recordSource({
      sourceId: 'sector', success: false, responseTimeMs: Date.now() - t0,
      updatedAt: stale?.updatedAt ?? now, isStale: stale?.isStale ?? true,
      usedFallback: !!stale,
    });

    if (stale) {
      return NextResponse.json(stale.data, { headers: { 'X-Cache': 'stale' } });
    }

    return NextResponse.json(
      { sectors: MOCK_SECTORS, updatedAt: now },
      { headers: { 'X-Cache': 'mock' } },
    );
  }
}
