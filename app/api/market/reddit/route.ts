import { NextResponse } from 'next/server';
import { getCache, setCache, isFresh } from '@/src/lib/server-cache';
import { fetchWithRetry } from '@/src/lib/fetch-retry';
import { aggregatePosts } from '@/src/lib/reddit-analysis';
import { recordSource } from '@/src/lib/source-tracker';
import type { RationalEmotionalData } from '@/src/types/market';

const CACHE_KEY = 'market:reddit';
const CACHE_TTL = 10 * 60 * 1_000; // 10분

const SUBREDDITS = ['wallstreetbets', 'stocks', 'investing'];

// ─── 응답 타입 ────────────────────────────────────────────────────────────────

export interface RedditApiResponse {
  rationalEmotional: RationalEmotionalData;
  updatedAt: string;
}

// ─── Mock 데이터 ──────────────────────────────────────────────────────────────

const MOCK_NOW = new Date().toISOString();

const MOCK_RESPONSE: RedditApiResponse = {
  rationalEmotional: {
    finalIndex:            58.3,
    averageRationalScore:  3.1,
    averageEmotionalScore: 4.2,
    validPostCount:        142,
    updatedAt:             MOCK_NOW,
  },
  updatedAt: MOCK_NOW,
};

// ─── Reddit OAuth2 ────────────────────────────────────────────────────────────

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(
  clientId: string,
  clientSecret: string,
  userAgent: string,
): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetchWithRetry('https://www.reddit.com/api/v1/access_token', {
    method:  'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'User-Agent':  userAgent,
      'Content-Type':'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await res.json() as { access_token: string; expires_in: number };
  if (!data.access_token) throw new Error('No access_token in Reddit OAuth response');

  // Cache token with 60s safety margin
  tokenCache = {
    token:     data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1_000,
  };
  return tokenCache.token;
}

// ─── Post fetching ────────────────────────────────────────────────────────────

interface RedditPost {
  data: { title: string; selftext: string; score: number };
}

interface RedditListingResponse {
  data: { children: RedditPost[] };
}

async function fetchSubredditPosts(
  subreddit: string,
  token: string,
  userAgent: string,
): Promise<string[]> {
  const res = await fetchWithRetry(
    `https://oauth.reddit.com/r/${subreddit}/hot?limit=50`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent':  userAgent,
      },
    },
  );
  const data = await res.json() as RedditListingResponse;
  return (data?.data?.children ?? []).map((post) => {
    const { title, selftext } = post.data;
    return selftext ? `${title}\n${selftext}` : title;
  });
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET() {
  const now = new Date().toISOString();

  if (isFresh(CACHE_KEY)) {
    const cached = getCache<RedditApiResponse>(CACHE_KEY)!;
    return NextResponse.json(cached.data, { headers: { 'X-Cache': 'hit' } });
  }

  const clientId    = process.env.REDDIT_CLIENT_ID;
  const clientSecret= process.env.REDDIT_CLIENT_SECRET;
  const userAgent   = process.env.REDDIT_USER_AGENT ?? 'GreenBullDashboard/1.0';

  if (!clientId || !clientSecret) {
    recordSource({
      sourceId: 'rational_emotional', success: false, responseTimeMs: 0,
      updatedAt: now, isStale: false, usedFallback: true,
    });
    return NextResponse.json(MOCK_RESPONSE, { headers: { 'X-Cache': 'mock' } });
  }

  const t0 = Date.now();
  try {
    const token = await getAccessToken(clientId, clientSecret, userAgent);

    const allPosts = (
      await Promise.all(
        SUBREDDITS.map((sr) => fetchSubredditPosts(sr, token, userAgent)),
      )
    ).flat();

    const result = aggregatePosts(allPosts, now);

    if (!result) {
      throw new Error('No valid posts to aggregate');
    }

    const response: RedditApiResponse = { rationalEmotional: result, updatedAt: now };
    setCache(CACHE_KEY, response, CACHE_TTL);

    recordSource({
      sourceId: 'rational_emotional', success: true,
      responseTimeMs: Date.now() - t0, updatedAt: now, isStale: false, usedFallback: false,
    });

    return NextResponse.json(response);
  } catch (err) {
    console.error('[/api/market/reddit]', err);

    const stale = getCache<RedditApiResponse>(CACHE_KEY);
    recordSource({
      sourceId: 'rational_emotional', success: false,
      responseTimeMs: Date.now() - t0, updatedAt: stale?.updatedAt ?? now,
      isStale: stale?.isStale ?? true, usedFallback: !!stale,
    });

    if (stale) {
      return NextResponse.json(stale.data, { headers: { 'X-Cache': 'stale' } });
    }

    return NextResponse.json(MOCK_RESPONSE, { headers: { 'X-Cache': 'mock' } });
  }
}
