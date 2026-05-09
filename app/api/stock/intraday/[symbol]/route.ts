import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';
import { getCache, setCache, isFresh } from '@/src/lib/server-cache';
import type { IntradayPoint } from '@/src/types/stock';

const CACHE_TTL = 60 * 1_000; // 1분

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const upper = symbol.toUpperCase();
  const cacheKey = `stock:intraday:${upper}`;

  if (isFresh(cacheKey)) {
    const cached = getCache<IntradayPoint[]>(cacheKey)!;
    return NextResponse.json({ points: cached.data }, { headers: { 'X-Cache': 'hit' } });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const data = await yahooFinance.chart(upper, {
      period1: today,
      interval: '5m',
    });

    const quotes = (data as any)?.quotes ?? [];
    const points: IntradayPoint[] = quotes
      .filter((q: any) => q.close != null)
      .map((q: any) => ({
        time:  new Date(q.date).toISOString(),
        value: q.close,
      }));

    setCache(cacheKey, points, CACHE_TTL);
    return NextResponse.json({ points }, { headers: { 'X-Cache': 'miss' } });
  } catch (err) {
    console.error(`[/api/stock/intraday/${upper}]`, err);
    return NextResponse.json({ points: [] }, { status: 200 });
  }
}
