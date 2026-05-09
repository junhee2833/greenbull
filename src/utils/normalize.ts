/**
 * Data_Management_Skill.md — [공통 데이터 형식 정규화] 및 [데이터 전처리 규칙] 구현
 *
 * 서로 다른 데이터 소스(Yahoo Finance, FRED, CNN 등)에서 수집된 값을
 * 대시보드에서 동일하게 사용할 수 있도록 공통 형식으로 변환한다.
 */

import type { MarketIndicator, TimeSeriesPoint } from '@/src/types/market';

// ─── 숫자 파싱 ────────────────────────────────────────────────────────────────

/**
 * 문자열·숫자·null 등 다양한 형태의 값을 number | null 로 변환한다.
 * 변환 불가능한 경우 null 반환 → UI에서 "N/A" 로 표시
 */
export function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '' || value === 'N/A') {
    return null;
  }
  const n = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : Number(value);
  return isFinite(n) ? n : null;
}

// ─── 소수점 2자리 제한 ────────────────────────────────────────────────────────
// Data_Management_Skill.md: "소수점 자릿수는 최대 2자리로 제한한다"

export function roundTo2(value: number | null): number | null {
  if (value === null) return null;
  return Math.round(value * 100) / 100;
}

export function roundToN(value: number | null, decimals: number): number | null {
  if (value === null) return null;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// ─── 변동폭 / 변동률 계산 ─────────────────────────────────────────────────────
// Data_Management_Skill.md: change = currentValue − previousValue
//                           changeRate = ((current − prev) / prev) × 100

export function computeChange(
  current: number | null,
  previous: number | null,
): number | null {
  if (current === null || previous === null) return null;
  return roundTo2(current - previous);
}

export function computeChangeRate(
  current: number | null,
  previous: number | null,
): number | null {
  // previousValue가 0이거나 존재하지 않는 경우 → N/A (null)
  if (current === null || previous === null || previous === 0) return null;
  return roundTo2(((current - previous) / previous) * 100);
}

// ─── UI 포맷팅 ────────────────────────────────────────────────────────────────

/** number | null → 표시 문자열. null 이면 "N/A" */
export function formatValue(value: number | null, decimals = 2): string {
  if (value === null) return 'N/A';
  return value.toFixed(decimals);
}

/** change 값에 +/− 부호 추가 */
export function formatChange(change: number | null, decimals = 2): string {
  if (change === null) return 'N/A';
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(decimals)}`;
}

/** changeRate 값을 % 형태로 표시 */
export function formatChangeRate(rate: number | null, decimals = 2): string {
  if (rate === null) return 'N/A';
  const sign = rate >= 0 ? '+' : '';
  return `${sign}${rate.toFixed(decimals)}%`;
}

/** 큰 숫자를 B / T 단위로 약식 표현 */
export function formatBillions(value: number | null, prefix = '$'): string {
  if (value === null) return 'N/A';
  if (Math.abs(value) >= 1000) {
    return `${prefix}${(value / 1000).toFixed(2)}T`;
  }
  return `${prefix}${value.toFixed(0)}B`;
}

// ─── 정규화 함수 ──────────────────────────────────────────────────────────────

/**
 * 외부 API 응답(형태 불특정)에서 공통 MarketIndicator 형식으로 변환한다.
 * 필수 필드 누락 시 null 처리 — 임의 값 생성 금지.
 */
export interface RawIndicatorInput {
  id: string;
  name: string;
  source: string;
  unit?: string;
  currentValue: unknown;
  previousValue?: unknown;
  updatedAt?: string;
  timeSeries?: TimeSeriesPoint[];
}

export function normalizeIndicator(
  raw: RawIndicatorInput,
  overrides?: Partial<MarketIndicator>,
): MarketIndicator {
  const current = parseNumber(raw.currentValue);
  const previous = parseNumber(raw.previousValue ?? null);

  return {
    id: raw.id,
    name: raw.name,
    source: raw.source,
    unit: raw.unit ?? '',
    currentValue: roundTo2(current),
    previousValue: roundTo2(previous),
    change: computeChange(current, previous),
    changeRate: computeChangeRate(current, previous),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
    timeSeries: raw.timeSeries,
    ...overrides,
  };
}

/**
 * 여러 지표를 일괄 정규화한다.
 * 필수 필드(currentValue)가 없는 항목은 제외한다.
 */
export function normalizeIndicators(
  items: RawIndicatorInput[],
  overridesMap?: Record<string, Partial<MarketIndicator>>,
): MarketIndicator[] {
  return items
    .map((item) => normalizeIndicator(item, overridesMap?.[item.id]))
    .filter((ind) => ind.currentValue !== null);
}

/**
 * 시계열 데이터 정규화
 * Data_Management_Skill.md: 날짜 형식 YYYY-MM-DD 통일, 숫자 변환 불가 포인트 제거
 */
export function normalizeTimeSeries(
  raw: Array<{ date?: string; timestamp?: string; value?: unknown }>,
): TimeSeriesPoint[] {
  return raw
    .map((point) => {
      const dateStr = point.date ?? point.timestamp ?? '';
      const value = parseNumber(point.value ?? null);
      if (!dateStr || value === null) return null;

      // YYYY-MM-DD 형식으로 통일
      const isoDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      return { date: isoDate, value };
    })
    .filter((p): p is TimeSeriesPoint => p !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Stale 데이터 판단 ────────────────────────────────────────────────────────
// Data_Management_Skill.md [Stale 데이터 처리 규칙]

export type DataSourceType = 'yahoo' | 'fred' | 'cnn' | 'reddit' | 'polymarket' | 'news';

const STALE_THRESHOLD_MS: Record<DataSourceType, number> = {
  yahoo:     5  * 60 * 1000,  // 5분
  fred:      60 * 60 * 1000,  // 1시간
  cnn:       10 * 60 * 1000,  // 10분
  reddit:    10 * 60 * 1000,  // 10분
  polymarket:10 * 60 * 1000,  // 10분
  news:      10 * 60 * 1000,  // 10분
};

export function isStale(updatedAt: string, source: DataSourceType): boolean {
  const elapsed = Date.now() - new Date(updatedAt).getTime();
  return elapsed > STALE_THRESHOLD_MS[source];
}
