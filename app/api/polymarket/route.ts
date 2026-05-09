import { NextResponse } from 'next/server';

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export interface PolymarketItem {
  id: string;
  question: string;
  yesProb: number;     // 0–1
  noProb: number;      // 0–1
  volume24hr: number;  // USD
  slug: string;
}

// ─── 인메모리 캐시 (10분 TTL) ─────────────────────────────────────────────────

const CACHE_TTL = 10 * 60 * 1000;
let cache: { items: PolymarketItem[]; expiresAt: number } | null = null;

// ─── Mock 데이터 (API 실패 최후 폴백) ─────────────────────────────────────────

const MOCK_ITEMS: PolymarketItem[] = [
  { id: 'mock-1', question: '2026년 6월 FOMC에서 연준이 금리를 인하할까요?',        yesProb: 0.68, noProb: 0.32, volume24hr: 425_000, slug: '' },
  { id: 'mock-2', question: '2026년 미국 GDP 성장률이 2% 이상을 기록할까요?',       yesProb: 0.59, noProb: 0.41, volume24hr: 318_000, slug: '' },
  { id: 'mock-3', question: '트럼프 행정부 관세 정책, 2026년 연말까지 유지될까요?', yesProb: 0.74, noProb: 0.26, volume24hr: 267_000, slug: '' },
  { id: 'mock-4', question: 'S&P 500 지수, 2026년 내 6,000pt를 돌파할까요?',        yesProb: 0.52, noProb: 0.48, volume24hr: 198_000, slug: '' },
  { id: 'mock-5', question: '중국, 2026년 내 대규모 경기부양책을 발표할까요?',       yesProb: 0.45, noProb: 0.55, volume24hr: 143_000, slug: '' },
];

// ─── 정규화 ───────────────────────────────────────────────────────────────────

function normalizeMarkets(markets: any[]): PolymarketItem[] {
  return markets
    .filter((m) => m.question && Array.isArray(m.outcomePrices) && m.outcomePrices.length >= 2)
    .map((m) => {
      const yes = Math.min(1, Math.max(0, parseFloat(m.outcomePrices[0]) || 0.5));
      const no  = Math.min(1, Math.max(0, parseFloat(m.outcomePrices[1]) || 1 - yes));
      return {
        id:        String(m.id ?? m.conditionId ?? Math.random()),
        question:  String(m.question),
        yesProb:   yes,
        noProb:    no,
        volume24hr: parseFloat(String(m.volume24hr ?? 0)) || 0,
        slug:      String(m.slug ?? ''),
      };
    })
    .filter((m) => m.volume24hr > 0)
    .sort((a, b) => b.volume24hr - a.volume24hr)
    .slice(0, 5);
}

// ─── Gamma API 호출 ───────────────────────────────────────────────────────────

const GAMMA = 'https://gamma-api.polymarket.com';

async function fetchFromGamma(): Promise<PolymarketItem[]> {
  // Economy 태그 슬러그 후보 (Polymarket API 버전마다 다를 수 있음)
  const tagCandidates = ['economics', 'economy', 'business'];

  for (const tag of tagCandidates) {
    try {
      const url = new URL(`${GAMMA}/markets`);
      url.searchParams.set('active',    'true');
      url.searchParams.set('closed',    'false');
      url.searchParams.set('tag_slug',  tag);
      url.searchParams.set('limit',     '30');
      url.searchParams.set('order',     'volume24hr');
      url.searchParams.set('ascending', 'false');

      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8_000),
      });

      if (!res.ok) continue;

      const markets: any[] = await res.json();
      if (!Array.isArray(markets) || markets.length === 0) continue;

      const normalized = normalizeMarkets(markets);
      if (normalized.length >= 3) return normalized;   // 충분한 데이터 확보 시 반환
    } catch {
      // 태그 실패 → 다음 후보 시도
    }
  }

  // 태그 필터 없이 전체 최고 거래량 마켓 폴백
  const url = new URL(`${GAMMA}/markets`);
  url.searchParams.set('active',    'true');
  url.searchParams.set('closed',    'false');
  url.searchParams.set('limit',     '20');
  url.searchParams.set('order',     'volume24hr');
  url.searchParams.set('ascending', 'false');

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) throw new Error(`Gamma API responded with ${res.status}`);

  const markets: any[] = await res.json();
  if (!Array.isArray(markets)) throw new Error('Unexpected Gamma API response shape');

  return normalizeMarkets(markets);
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET() {
  // 캐시 유효 시 즉시 반환
  if (cache && Date.now() < cache.expiresAt) {
    return NextResponse.json(cache.items);
  }

  try {
    const items = await fetchFromGamma();

    if (items.length > 0) {
      cache = { items, expiresAt: Date.now() + CACHE_TTL };
      return NextResponse.json(items);
    }

    // Gamma에서 데이터를 받았으나 빈 배열인 경우
    throw new Error('Empty response from Gamma API');
  } catch (err) {
    console.error('[/api/polymarket]', err);

    // 마지막 캐시가 있으면 만료 데이터라도 반환 (Fallback)
    if (cache) {
      return NextResponse.json(cache.items, {
        headers: { 'X-Cache': 'stale' },
      });
    }

    // 캐시도 없으면 Mock 데이터 반환
    return NextResponse.json(MOCK_ITEMS, {
      headers: { 'X-Cache': 'mock' },
    });
  }
}
