// 재시도 간격: 500ms → 1s → 2s
const RETRY_DELAYS_MS = [500, 1_000, 2_000] as const;

export class FetchRetryError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'FetchRetryError';
  }
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  maxRetries = 3,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: init.signal ?? AbortSignal.timeout(10_000),
      });

      if (res.ok) return res;

      lastError = new FetchRetryError(`HTTP ${res.status} from ${url}`, res.status);

      // 4xx는 재시도해도 결과가 같으므로 즉시 중단
      if (res.status >= 400 && res.status < 500) break;
    } catch (err) {
      lastError = new FetchRetryError(
        `Network error fetching ${url}: ${String(err)}`,
        undefined,
        err,
      );
    }

    if (attempt < maxRetries - 1) {
      await delay(RETRY_DELAYS_MS[attempt] ?? 2_000);
    }
  }

  throw lastError;
}

export async function fetchJson<T>(
  url: string,
  init: RequestInit = {},
  maxRetries = 3,
): Promise<T> {
  const res = await fetchWithRetry(
    url,
    {
      ...init,
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        ...init.headers,
      },
    },
    maxRetries,
  );
  return res.json() as Promise<T>;
}
