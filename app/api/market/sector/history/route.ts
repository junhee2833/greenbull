import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';
import { getCache, setCache, isFresh } from '@/src/lib/server-cache';
import type { SectorData } from '@/src/types/market';

const CACHE_TTL = 10 * 60 * 1_000; // 10분

type Period = '1W' | '1M' | '3M' | '1Y';
const PERIOD_DAYS: Record<Period, number> = { '1W': 7, '1M': 30, '3M': 90, '1Y': 365 };

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

async function fetchSectorWithPeriod(
  symbol: string,
  meta: { id: string; name: string },
  daysBack: number,
  now: string,
): Promise<SectorData> {
  const period2 = new Date();
  const period1 = new Date(period2.getTime() - daysBack * 86_400_000);

  const history = await yahooFinance.historical(symbol, {
    period1: period1.toISOString().slice(0, 10),
    period2: period2.toISOString().slice(0, 10),
    interval: '1d',
  }) as any[];

  if (!Array.isArray(history) || history.length < 2) {
    return { id: meta.id, name: meta.name, returnRate: null, estimatedFlow: null, volume: null, marketSize: null, updatedAt: now };
  }

  const oldest = history[0];
  const latest = history[history.length - 1];
  const startPrice = oldest.close;
  const endPrice   = latest.close;

  if (!startPrice || !endPrice) {
    return { id: meta.id, name: meta.name, returnRate: null, estimatedFlow: null, volume: null, marketSize: null, updatedAt: now };
  }

  const returnRate = ((endPrice - startPrice) / startPrice) * 100;
  const avgVolume  = history.reduce((sum, h) => sum + (h.volume ?? 0), 0) / history.length;
  // estimatedFlow: 수익률 × 평균거래량 × 가격 → 백만 달러 → 10억 달러(B)
  const estimatedFlow = (returnRate / 100) * avgVolume * endPrice / 1e9;

  return {
    id:            meta.id,
    name:          meta.name,
    returnRate:    Math.round(returnRate * 100) / 100,
    estimatedFlow: Math.round(estimatedFlow * 100) / 100,
    volume:        Math.round(avgVolume / 1e6 * 100) / 100,
    marketSize:    null,
    updatedAt:     now,
  };
}

export async function GET(req: NextRequest) {
  const rawPeriod = req.nextUrl.searchParams.get('period') ?? '1M';
  const period = (['1W', '1M', '3M', '1Y'].includes(rawPeriod) ? rawPeriod : '1M') as Period;
  const cacheKey = `sector:history:${period}`;

  if (isFresh(cacheKey)) {
    const cached = getCache<{ sectors: SectorData[]; updatedAt: string }>(cacheKey)!;
    return NextResponse.json(cached.data, { headers: { 'X-Cache': 'hit' } });
  }

  const now = new Date().toISOString();
  const daysBack = PERIOD_DAYS[period];

  const settled = await Promise.allSettled(
    Object.entries(SECTOR_ETFS).map(([sym, meta]) =>
      fetchSectorWithPeriod(sym, meta, daysBack, now),
    ),
  );

  const sectors: SectorData[] = settled.map((result, i) => {
    const [sym, meta] = Object.entries(SECTOR_ETFS)[i];
    if (result.status === 'fulfilled') return result.value;
    console.error(`[sector/history] ${sym}:`, (result as any).reason);
    return { id: meta.id, name: meta.name, returnRate: null, estimatedFlow: null, volume: null, marketSize: null, updatedAt: now };
  });

  const response = { sectors, updatedAt: now };
  setCache(cacheKey, response, CACHE_TTL);

  return NextResponse.json(response, { headers: { 'X-Cache': 'miss' } });
}
