'use client';

import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/src/hooks/useLocalStorage';
import SectorHeatmap from '@/src/components/charts/SectorHeatmap';
import SectorFlowBarChart from '@/src/components/charts/SectorFlowBarChart';
import type { SectorData } from '@/src/types/market';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = '1W' | '1M' | '3M' | '1Y';

const PERIOD_LABELS: Record<Period, string> = {
  '1W': '1주',
  '1M': '1개월',
  '3M': '3개월',
  '1Y': '1년',
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SectorSkeleton() {
  return (
    <div className="space-y-4">
      <div className="animate-pulse rounded-xl bg-surface" style={{ height: 320 }} />
      <div className="animate-pulse rounded-xl bg-surface" style={{ height: 340 }} />
    </div>
  );
}

// ─── SectorTab ────────────────────────────────────────────────────────────────

export default function SectorTab() {
  const [period, setPeriod]   = useLocalStorage<Period>('period:sector', '1M' as Period);
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/market/sector/history?period=${period}`)
      .then(r => r.json())
      .then((data: { sectors: SectorData[]; updatedAt: string }) => {
        if (!cancelled) {
          setSectors(data.sectors ?? []);
          setUpdatedAt(data.updatedAt ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [period]);

  return (
    <section aria-label="산업 트렌드">
      {/* Period selector */}
      <div className="mb-4 flex items-center justify-between rounded-xl border border-border bg-card px-5 py-3.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-market-neutral">
          기간별 섹터 수익률
        </p>
        <div className="flex gap-1">
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                period === p
                  ? 'bg-bull/10 text-bull'
                  : 'text-market-neutral hover:bg-surface hover:text-foreground'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <SectorSkeleton />
      ) : (
        <>
          {/* Heatmap */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-market-neutral">
                섹터 Heatmap
              </p>
              {updatedAt && (
                <p className="text-xs text-gray-400">
                  {new Date(updatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            <SectorHeatmap sectors={sectors} />
          </div>

          {/* Flow bar chart */}
          <div className="mt-4 rounded-xl border border-border bg-card p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-market-neutral">
              섹터별 추정 자금흐름 ({PERIOD_LABELS[period]}, 단위: 십억 달러)
            </p>
            <SectorFlowBarChart sectors={sectors} />
          </div>
        </>
      )}
    </section>
  );
}
