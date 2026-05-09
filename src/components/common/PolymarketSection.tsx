'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, TrendingUp } from 'lucide-react';
import type { PolymarketItem } from '@/app/api/polymarket/route';

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function yesColor(prob: number) {
  if (prob >= 0.65) return { bar: 'bg-bull',  text: 'text-bull'  };
  if (prob <= 0.35) return { bar: 'bg-bear',  text: 'text-bear'  };
  return               { bar: 'bg-risk',  text: 'text-risk'  };
}

// ─── 스켈레톤 ─────────────────────────────────────────────────────────────────

function PolymarketSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
          <div className="mb-3 h-4 w-4/5 rounded-lg bg-market-neutral/10" />
          <div className="mb-1.5 h-4 w-2/3 rounded-lg bg-market-neutral/8" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-3 w-6 rounded bg-market-neutral/10" />
              <div className="h-2 flex-1 rounded-full bg-market-neutral/10" />
              <div className="h-3 w-10 rounded bg-market-neutral/10" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-6 rounded bg-market-neutral/8" />
              <div className="h-2 flex-1 rounded-full bg-market-neutral/8" />
              <div className="h-3 w-10 rounded bg-market-neutral/8" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ─── 카드 ─────────────────────────────────────────────────────────────────────

function PolymarketCard({ item }: { item: PolymarketItem }) {
  const yesPct = Math.round(item.yesProb * 100);
  const noPct  = 100 - yesPct;
  const { bar, text } = yesColor(item.yesProb);

  const href = item.slug
    ? `https://polymarket.com/event/${item.slug}`
    : 'https://polymarket.com';

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-3 rounded-2xl border border-border/70 bg-white p-4 shadow-sm transition-all hover:border-border hover:shadow-md"
      aria-label={item.question}
    >
      {/* 제목 행 */}
      <div className="flex items-start justify-between gap-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-bull">
          {item.question}
        </p>
        <ExternalLink
          size={12}
          className="mt-0.5 flex-none text-market-neutral/40 opacity-0 transition-opacity group-hover:opacity-100"
        />
      </div>

      {/* Yes / No 확률 바 */}
      <div className="space-y-1.5">
        {/* Yes */}
        <div className="flex items-center gap-2">
          <span className="w-6 text-[10px] font-semibold text-market-neutral">Yes</span>
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-border">
            <div
              className={`absolute inset-y-0 left-0 rounded-full ${bar} transition-all`}
              style={{ width: `${yesPct}%` }}
            />
          </div>
          <span className={`w-10 text-right text-xs font-bold ${text}`}>{yesPct}%</span>
        </div>

        {/* No */}
        <div className="flex items-center gap-2">
          <span className="w-6 text-[10px] font-semibold text-market-neutral">No</span>
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-border">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-market-neutral/30 transition-all"
              style={{ width: `${noPct}%` }}
            />
          </div>
          <span className="w-10 text-right text-xs text-market-neutral">{noPct}%</span>
        </div>
      </div>

      {/* 24h 거래량 */}
      <p className="text-right text-[10px] text-market-neutral/50">
        24h 거래량&ensp;{formatVolume(item.volume24hr)}
      </p>
    </a>
  );
}

// ─── PolymarketSection ────────────────────────────────────────────────────────

type Status = 'loading' | 'success' | 'error';

export default function PolymarketSection() {
  const [items, setItems]   = useState<PolymarketItem[]>([]);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/polymarket', { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<PolymarketItem[]>;
      })
      .then((data) => {
        setItems(data);
        setStatus('success');
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setStatus('error');
      });

    return () => controller.abort();
  }, []);

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      {/* 헤더 */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-risk/10">
            <TrendingUp size={14} className="text-risk" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Polymarket 주요 안건</p>
            <p className="text-[10px] text-market-neutral/70">예측 시장 여론 · 상위 5개 이슈</p>
          </div>
        </div>
      </div>

      {/* 카드 그리드 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {status === 'loading' && <PolymarketSkeleton />}

        {status === 'error' && (
          <div className="col-span-full py-6 text-center text-xs text-market-neutral/50">
            데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
          </div>
        )}

        {status === 'success' &&
          items.map((item) => <PolymarketCard key={item.id} item={item} />)}
      </div>
    </div>
  );
}
