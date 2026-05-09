'use client';

import { Sparkles } from 'lucide-react';
import type { SummaryData, SummaryStatus } from '@/src/hooks/useSummary';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SummarySkeleton() {
  return (
    <div className="animate-pulse space-y-3.5">
      <div className="h-4 w-4/5 rounded-lg bg-market-neutral/12" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded-md bg-market-neutral/8" />
        <div className="h-3 w-11/12 rounded-md bg-market-neutral/8" />
        <div className="h-3 w-4/5 rounded-md bg-market-neutral/8" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded-md bg-market-neutral/8" />
        <div className="h-3 w-3/4 rounded-md bg-market-neutral/8" />
      </div>
      <div className="h-8 w-full rounded-lg bg-market-neutral/6" />
    </div>
  );
}

// ─── Field row ────────────────────────────────────────────────────────────────

function FieldRow({ label, text }: { label: string; text: string }) {
  return (
    <div className="text-xs leading-relaxed">
      <span className="font-semibold text-market-neutral">{label}&ensp;</span>
      <span className="text-foreground/80">{text}</span>
    </div>
  );
}

// ─── SummaryCard ──────────────────────────────────────────────────────────────

interface SummaryCardProps {
  type: 'liquidity' | 'sentiment';
  summary: SummaryData | null;
  status: SummaryStatus;
  hasWarning?: boolean;
}

export default function SummaryCard({ type, summary, status, hasWarning = false }: SummaryCardProps) {
  const label = type === 'liquidity' ? 'GPT 유동성 상태 요약' : 'GPT 센티멘트 상태 요약';

  return (
    <div className="mt-5 rounded-xl border border-border bg-surface p-5">
      {/* 헤더 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-bull/10">
            <Sparkles size={12} className="text-bull" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-market-neutral">
            {label}
          </p>
        </div>
      </div>

      {/* 스켈레톤 */}
      {(status === 'idle' || status === 'loading') && <SummarySkeleton />}

      {/* 에러 */}
      {status === 'error' && (
        <p className="text-xs text-market-neutral/50">
          요약을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
      )}

      {/* 성공 */}
      {status === 'success' && summary && (
        <div className="space-y-4">
          {/* 헤드라인 */}
          <p className="text-sm font-semibold leading-snug text-foreground">
            {summary.headline}
          </p>

          {/* 필드 목록 */}
          <div className="space-y-3 border-t border-border pt-3.5">
            <FieldRow label="국면 요약" text={summary.regimeSummary} />
            <FieldRow label="핵심 동인" text={summary.keyDrivers} />
            <FieldRow label="시장 시사점" text={summary.marketImplication} />
          </div>

          {/* 주의/경고 */}
          <div
            className={`rounded-xl px-4 py-3 text-xs leading-relaxed ${
              hasWarning
                ? 'border border-bear/25 bg-bear/5 text-bear/90'
                : 'border border-border bg-white text-foreground/70'
            }`}
          >
            <span className={`mr-1.5 font-bold ${hasWarning ? 'text-bear' : 'text-risk'}`}>
              {hasWarning ? '⚠ 경고' : '주의'}
            </span>
            {summary.caution}
          </div>
        </div>
      )}
    </div>
  );
}
