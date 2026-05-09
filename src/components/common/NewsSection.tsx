'use client';

import { useState, useEffect, useCallback } from 'react';
import { ExternalLink } from 'lucide-react';

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface NewsItem {
  id:          string;
  title:       string;
  summary:     string;
  source:      string;
  url:         string;
  publishedAt: string;
  thumbnail:   string | null;
}

// ─── 출처 컬러 ────────────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, { bg: string; text: string; initial: string }> = {
  Reuters:        { bg: '#FF8000', text: '#FFFFFF', initial: 'R' },
  Bloomberg:      { bg: '#1F2937', text: '#FFFFFF', initial: 'B' },
  CNBC:           { bg: '#003087', text: '#FFFFFF', initial: 'C' },
  'Yahoo Finance':{ bg: '#6001D2', text: '#FFFFFF', initial: 'Y' },
  'AP News':      { bg: '#D32F2F', text: '#FFFFFF', initial: 'A' },
  'Google Finance':{ bg: '#4285F4', text: '#FFFFFF', initial: 'G' },
};

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const pub = new Date(iso);
  const diffMs = Date.now() - pub.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 60)  return `${diffMin}분 전`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)    return `${diffH}시간 전`;
  return `${Math.floor(diffH / 24)}일 전`;
}

// ─── 썸네일 플레이스홀더 (SVG 신문 아이콘) ───────────────────────────────────

function NewsPlaceholder({ source }: { source: string }) {
  const brand = SOURCE_COLORS[source] ?? { bg: '#1E3A5F', text: '#FFFFFF', initial: source[0] ?? '?' };
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-1"
      style={{ background: `linear-gradient(145deg, ${brand.bg} 0%, ${brand.bg}BB 100%)` }}
    >
      {/* 신문/기사 아이콘 */}
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="white" strokeWidth="1.4" strokeOpacity="0.9"/>
        <rect x="3" y="4" width="8" height="7" rx="1" fill="white" fillOpacity="0.15"/>
        <path d="M7 13h10M7 16h6" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.8"/>
        <path d="M13 7h4M13 10h4" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.8"/>
      </svg>
      <span
        className="text-[8px] font-extrabold uppercase tracking-widest"
        style={{ color: brand.text, opacity: 0.75 }}
      >
        {brand.initial}
      </span>
    </div>
  );
}

// ─── 썸네일 ───────────────────────────────────────────────────────────────────

function Thumbnail({ source, thumbnail }: { source: string; thumbnail: string | null }) {
  const [imgFailed, setImgFailed] = useState(false);
  const onError = useCallback(() => setImgFailed(true), []);

  if (thumbnail && !imgFailed) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={thumbnail}
        alt={source}
        className="h-full w-full object-cover"
        onError={onError}
      />
    );
  }

  return <NewsPlaceholder source={source} />;
}

// ─── 스켈레톤 카드 ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex flex-none w-72 gap-4 rounded-2xl border border-border/70 bg-white p-4 shadow-sm">
      <div className="flex-none">
        <div className="h-16 w-20 rounded-xl bg-gray-200 animate-pulse" />
      </div>
      <div className="flex flex-1 flex-col justify-between gap-2">
        <div className="space-y-2">
          <div className="h-3.5 rounded bg-gray-200 animate-pulse" />
          <div className="h-3.5 w-4/5 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-16 rounded bg-gray-200 animate-pulse" />
          <div className="h-2.5 w-12 rounded bg-gray-200 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ─── 뉴스 카드 ────────────────────────────────────────────────────────────────

function NewsCard({ item, rank }: { item: NewsItem; rank: number }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-none w-72 gap-4 rounded-2xl border border-border/70 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-border"
      aria-label={item.title}
    >
      <div className="flex-none">
        <div className="relative flex h-16 w-20 flex-none overflow-hidden rounded-xl">
          <Thumbnail source={item.source} thumbnail={item.thumbnail} />
          <span className="absolute left-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-black/40 text-[10px] font-bold leading-none text-white">
            {rank}
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-bull transition-colors">
          {item.title}
        </p>

        <div className="mt-2 flex items-center gap-2">
          <span className="text-[11px] font-medium text-market-neutral">{item.source}</span>
          <span className="size-1 rounded-full bg-border flex-none" />
          <span className="text-[11px] text-market-neutral/70">{relativeTime(item.publishedAt)}</span>
          <ExternalLink
            size={10}
            className="ml-auto flex-none text-market-neutral/40 opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>
      </div>
    </a>
  );
}

// ─── NewsSection ──────────────────────────────────────────────────────────────

export default function NewsSection() {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/market/news')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ items: NewsItem[] }>;
      })
      .then((data) => setItems(data.items.slice(0, 5)))
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="flex h-28 items-center justify-center rounded-2xl border border-border/70 bg-white text-sm text-market-neutral">
        뉴스를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.
      </div>
    );
  }

  if (items === null) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((item, i) => (
        <NewsCard key={item.id} item={item} rank={i + 1} />
      ))}
    </div>
  );
}
