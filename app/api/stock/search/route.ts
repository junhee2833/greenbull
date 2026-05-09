import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import type { StockSearchResult } from '@/src/types/stock';

const yahooFinance = new YahooFinance();

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 1) {
    return NextResponse.json({ results: [] });
  }

  try {
    const data = await yahooFinance.search(q, { newsCount: 0, quotesCount: 8 }) as any;
    const quotes = data?.quotes ?? [];

    const results: StockSearchResult[] = quotes
      .filter((r: any) => r.isYahooFinance && r.symbol && r.shortname)
      .map((r: any): StockSearchResult => ({
        symbol: r.symbol,
        name:   r.shortname ?? r.longname ?? r.symbol,
        sector: r.sector ?? r.industryName ?? '',
      }));

    return NextResponse.json({ results }, { headers: { 'Cache-Control': 'public, max-age=30' } });
  } catch (err) {
    console.error('[/api/stock/search]', err);
    return NextResponse.json({ results: [] }, { status: 200 });
  }
}
