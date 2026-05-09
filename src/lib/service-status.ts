import type { ServiceStatus, ServiceStatusState } from '@/src/types/market';
import type { SourceRecord } from '@/src/lib/source-tracker';

// Core data sources whose failure is treated as critical per spec §7
const CRITICAL_IDS = new Set([
  'fed_assets', 'tga_balance', 'rrp_balance', 'fed_rate',   // liquidity
  'vix', 'fear_greed', 'rational_emotional', 'high_yield_spread', // sentiment
]);

const FIFTEEN_MIN_MS = 15 * 60 * 1_000;

const LABEL: Record<ServiceStatusState, '정상' | '지연' | '장애'> = {
  normal:  '정상',
  delayed: '지연',
  error:   '장애',
};

export function computeServiceStatus(records: SourceRecord[]): ServiceStatus {
  const now = new Date().toISOString();

  if (records.length === 0) {
    return {
      id: 'service_status', status: 'normal', label: '정상',
      successRate: 1, averageResponseTime: 0,
      staleSourceCount: 0, fallbackSourceCount: 0, failedSourceCount: 0,
      criticalFailure: false, updatedAt: now,
    };
  }

  const total              = records.length;
  const successCount       = records.filter((r) => r.success).length;
  const successRate        = successCount / total;
  const failedSourceCount  = total - successCount;
  const staleSourceCount   = records.filter((r) => r.isStale).length;
  const fallbackSourceCount= records.filter((r) => r.usedFallback).length;

  const responded = records.filter((r) => r.responseTimeMs > 0);
  const averageResponseTime =
    responded.length > 0
      ? responded.reduce((s, r) => s + r.responseTimeMs, 0) / responded.length
      : 0;

  // ── Critical failure detection ────────────────────────────────────────────
  const criticals = records.filter((r) => CRITICAL_IDS.has(r.sourceId));
  const criticalFailure =
    criticals.some((r) => r.consecutiveFailureCount >= 2) ||
    criticals.some((r) => {
      const age = Date.now() - new Date(r.updatedAt).getTime();
      return age > FIFTEEN_MIN_MS;
    });

  const criticalStale = criticals.some((r) => r.isStale);

  // ── State determination (most severe wins) ────────────────────────────────
  const staleRatio    = staleSourceCount    / total;
  const fallbackRatio = fallbackSourceCount / total;

  let status: ServiceStatusState;

  if (successRate < 0.5 || criticalFailure) {
    status = 'error';
  } else if (
    successRate < 0.8           ||
    averageResponseTime > 2_000 ||
    staleRatio   >= 0.2         ||
    fallbackRatio >= 0.2        ||
    criticalStale
  ) {
    status = 'delayed';
  } else {
    status = 'normal';
  }

  return {
    id: 'service_status',
    status,
    label: LABEL[status],
    successRate:        Math.round(successRate        * 1_000) / 1_000,
    averageResponseTime: Math.round(averageResponseTime),
    staleSourceCount,
    fallbackSourceCount,
    failedSourceCount,
    criticalFailure,
    updatedAt: now,
  };
}
