import type { RationalEmotionalData } from '@/src/types/market';

// ─── Keyword sets ─────────────────────────────────────────────────────────────

// Single-token rational keywords (lowercased)
const RATIONAL_SINGLE = new Set([
  'valuation', 'fundamentals', 'earnings', 'revenue', 'guidance',
  'forecast', 'estimate', 'model', 'analysis', 'probability', 'risk',
  'hedge', 'diversification', 'portfolio', 'strategy', 'thesis',
  'undervalued', 'overvalued', 'data', 'evidence', 'historical',
  'trend', 'correlation', 'regression', 'eps', 'roe', 'dcf', 'debt',
  'liquidity', 'inflation', 'macro', 'cpi', 'fomc',
]);

// Multi-token rational phrases (lowercased, space-joined)
const RATIONAL_PHRASES = [
  'intrinsic value', 'cash flow', 'long term', 'margin of safety',
  'fair value', 'based on', 'according to', 'p/e', 'pe ratio',
  'balance sheet', 'income statement', 'free cash flow',
  'interest rate',
];

// Single-token emotional keywords (lowercased)
const EMOTIONAL_SINGLE = new Set([
  'moon', 'rocket', '🚀', 'yolo', 'panic', 'crash', 'dump',
  'bagholder', 'fomo', 'guaranteed', 'insane', 'crazy', 'unbelievable',
  'pump', 'rug', 'hype', 'ape', 'apes', 'tendies', 'degenerate',
  'lambo', 'squeeze', 'rip', 'rekt', 'fear', 'greed', '100%',
]);

// Multi-token emotional phrases (lowercased)
const EMOTIONAL_PHRASES = [
  'to the moon', 'all in', 'diamond hands', 'paper hands', 'no doubt',
  'buy now', 'sell everything', 'trust me', 'we are doomed',
  "it's over", 'short squeeze',
];

// Booster keywords (used within 5 tokens of emotional keyword)
const BOOSTER_SINGLE = new Set([
  'very', 'extremely', 'literally', 'absolutely', 'massive',
  'huge', 'super', 'insanely', 'definitely',
]);

// Negation keywords (1–2 tokens before a matched keyword)
const NEGATION_SINGLE = new Set(['not', 'never', "don't", "doesn't", 'no', 'without']);
const NEGATION_PHRASES = ['no way'];

// Numeric/financial signals (applied to rawText)
const NUMERIC_RE =
  /\$\d|[\d.,]+%|\d+\s*(million|billion)|revenue|eps|p\/e|pe\s+ratio|margin/i;

// Ticker-like ALL_CAPS words to exclude from all-caps count
const TICKER_RE = /^[A-Z]{1,5}$/;

// ─── Text helpers ─────────────────────────────────────────────────────────────

function buildMatchText(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, ' ').trim();
}

function tokenize(matchText: string): string[] {
  return matchText
    .split(/\s+/)
    .map((t) => t.replace(/^[^\w🚀]+|[^\w🚀]+$/g, ''));
}

// ─── Negation / booster proximity helpers ────────────────────────────────────

function isNegatedAt(tokens: string[], idx: number): boolean {
  for (let back = 1; back <= 2; back++) {
    const t = tokens[idx - back];
    if (!t) break;
    if (NEGATION_SINGLE.has(t)) return true;
    // Check 2-token negation phrase
    const twoBack = tokens[idx - back - 1];
    if (twoBack && NEGATION_PHRASES.includes(`${twoBack} ${t}`)) return true;
  }
  return false;
}

function hasBoosterNear(tokens: string[], idx: number): boolean {
  const start = Math.max(0, idx - 5);
  const end   = Math.min(tokens.length - 1, idx + 5);
  for (let i = start; i <= end; i++) {
    if (BOOSTER_SINGLE.has(tokens[i])) return true;
  }
  return false;
}

// ─── Phrase matching helper ───────────────────────────────────────────────────
// Returns approximate token index of phrase start in tokens array

function phraseTokenIndex(matchText: string, phrase: string, tokens: string[]): number {
  const charIdx = matchText.indexOf(phrase);
  if (charIdx < 0) return -1;
  // Count spaces before the char index to approximate token index
  return matchText.slice(0, charIdx).split(/\s+/).length - 1;
}

// ─── Core scoring ─────────────────────────────────────────────────────────────

interface PostScores {
  rationalScore: number;
  emotionalScore: number;
  finalScore: number; // NaN = exclude from aggregate
}

export function scorePost(rawText: string): PostScores {
  const matchText = buildMatchText(rawText);
  const tokens    = tokenize(matchText);

  let rationalScore  = 0;
  let emotionalScore = 0;

  // ── Single-token keyword matching ─────────────────────────────────────────
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];

    if (RATIONAL_SINGLE.has(t) && !isNegatedAt(tokens, i)) {
      rationalScore += 1;
    }

    if (EMOTIONAL_SINGLE.has(t) && !isNegatedAt(tokens, i)) {
      emotionalScore += 1;
      if (hasBoosterNear(tokens, i)) emotionalScore += 0.5;
    }
  }

  // ── Multi-token phrase matching ────────────────────────────────────────────
  for (const phrase of RATIONAL_PHRASES) {
    if (!matchText.includes(phrase)) continue;
    const idx = phraseTokenIndex(matchText, phrase, tokens);
    if (idx >= 0 && !isNegatedAt(tokens, idx)) rationalScore += 1;
  }

  for (const phrase of EMOTIONAL_PHRASES) {
    if (!matchText.includes(phrase)) continue;
    const idx = phraseTokenIndex(matchText, phrase, tokens);
    if (idx >= 0 && !isNegatedAt(tokens, idx)) {
      emotionalScore += 1;
      if (hasBoosterNear(tokens, idx)) emotionalScore += 0.5;
    }
  }

  // ── rawText-based booster corrections ─────────────────────────────────────
  // (감정 강도 보정 — rawText 기준)

  // 느낌표 2개 이상
  if ((rawText.match(/!/g) ?? []).length >= 2) emotionalScore += 0.5;

  // 물음표 2개 이상
  if ((rawText.match(/\?/g) ?? []).length >= 2) emotionalScore += 0.3;

  // 전체 대문자 단어 2개 이상 (tickers 제외)
  const capsWords = (rawText.match(/\b[A-Z]{2,}\b/g) ?? []).filter(
    (w) => !TICKER_RE.test(w),
  );
  if (capsWords.length >= 2) emotionalScore += 0.5;

  // 동일 이모지 반복 (연속 2회 이상)
  if (/(.)\1/u.test(rawText.replace(/[^\p{Emoji}]/gu, ''))) emotionalScore += 0.5;

  // 숫자/통화 보정: emotionalScore < 3인 경우에만 rationalScore += 0.7
  if (emotionalScore < 3 && NUMERIC_RE.test(rawText)) rationalScore += 0.7;

  // ── FinalScore ─────────────────────────────────────────────────────────────
  const totalRawScore = rationalScore + emotionalScore;

  if (totalRawScore === 0) {
    return { rationalScore: 0, emotionalScore: 0, finalScore: 50 };
  }

  const finalScore = (emotionalScore / totalRawScore) * 100;

  if (!Number.isFinite(finalScore)) {
    return { rationalScore, emotionalScore, finalScore: NaN };
  }

  return { rationalScore, emotionalScore, finalScore };
}

// ─── Aggregate ────────────────────────────────────────────────────────────────

export function aggregatePosts(
  texts: string[],
  updatedAt = new Date().toISOString(),
): RationalEmotionalData | null {
  const valid: PostScores[] = texts
    .map(scorePost)
    .filter((s) => Number.isFinite(s.finalScore));

  if (valid.length === 0) return null;

  const n = valid.length;
  const finalIndex          = valid.reduce((s, p) => s + p.finalScore,  0) / n;
  const averageRationalScore = valid.reduce((s, p) => s + p.rationalScore, 0) / n;
  const averageEmotionalScore= valid.reduce((s, p) => s + p.emotionalScore, 0) / n;

  return {
    finalIndex:            Math.round(finalIndex           * 10) / 10,
    averageRationalScore:  Math.round(averageRationalScore  * 10) / 10,
    averageEmotionalScore: Math.round(averageEmotionalScore * 10) / 10,
    validPostCount: n,
    updatedAt,
  };
}
