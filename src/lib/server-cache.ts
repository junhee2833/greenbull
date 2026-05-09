interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  updatedAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = new Map<string, CacheEntry<any>>();

export interface CacheResult<T> {
  data: T;
  updatedAt: string;
  isStale: boolean;
}

export function getCache<T>(key: string): CacheResult<T> | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  return {
    data: entry.data,
    updatedAt: entry.updatedAt,
    isStale: Date.now() >= entry.expiresAt,
  };
}

export function setCache<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
    updatedAt: new Date().toISOString(),
  });
}

export function isFresh(key: string): boolean {
  const entry = store.get(key);
  return entry !== undefined && Date.now() < entry.expiresAt;
}
