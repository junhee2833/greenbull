// ─── Stop words (articles, conjunctions, prepositions) ────────────────────────

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'can', 'its', 'it',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we',
  'they', 'what', 'which', 'who', 'how', 'when', 'where', 'why',
]);

const SIX_HOURS_MS     = 6  * 60 * 60 * 1_000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1_000;

// ─── Normalisation ────────────────────────────────────────────────────────────

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')   // strip special chars
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t))
    .join(' ');
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Drop tracking query params; keep path identity
    return `${u.hostname}${u.pathname}`.toLowerCase().replace(/\/$/, '');
  } catch {
    return url.split('?')[0].split('#')[0].toLowerCase();
  }
}

// ─── Jaccard similarity ───────────────────────────────────────────────────────

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  return intersection / (a.size + b.size - intersection);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface NewsItemForDedup {
  id: string;
  title: string;
  url: string;
  publishedAt: string; // ISO 8601
}

export function deduplicateNews<T extends NewsItemForDedup>(items: T[]): T[] {
  // ── 1차: URL 중복 제거 ────────────────────────────────────────────────────
  const urlSeen = new Set<string>();
  const urlDeduped: T[] = [];

  for (const item of items) {
    const key = normalizeUrl(item.url);
    if (!urlSeen.has(key)) {
      urlSeen.add(key);
      urlDeduped.push(item);
    }
  }

  // ── 2차: 제목 유사도 중복 제거 ───────────────────────────────────────────
  type Entry = { item: T; normStr: string; tokens: Set<string> };
  const kept: Entry[] = [];

  for (const item of urlDeduped) {
    const normStr = normalizeTitle(item.title);
    const tokens  = new Set(normStr.split(' ').filter(Boolean));
    const ts      = new Date(item.publishedAt).getTime();

    let duplicate = false;

    for (const existing of kept) {
      // 완전 일치
      if (existing.normStr === normStr) { duplicate = true; break; }

      const sim     = jaccard(tokens, existing.tokens);
      const timeDiff = Math.abs(ts - new Date(existing.item.publishedAt).getTime());

      // 24시간 초과 → 항상 별개 기사
      if (timeDiff > TWENTY_FOUR_HOURS_MS) continue;

      if (sim >= 0.8) { duplicate = true; break; }

      if (sim >= 0.6 && timeDiff <= SIX_HOURS_MS) { duplicate = true; break; }
    }

    if (!duplicate) kept.push({ item, normStr, tokens });
  }

  return kept.map((e) => e.item);
}
