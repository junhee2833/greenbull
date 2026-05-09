/**
 * 2026년 5월 기준 시뮬레이션 데이터
 *
 * 시나리오:
 *  - 연준이 2024년 9월 첫 인하 후 총 5회 인하 (5.25% → 4.00%)
 *  - 2026년 초 QT 종료, QE 재개 (대차대조표 재확장)
 *  - TGA·RRP 지속 하락 → 순유동성 개선
 *  - VIX 일시 상승(무역 관세 우려) + 극단적 공포 지수 → 역발상 매수 환경
 */

import type {
  DashboardData,
  MacroIndicator,
  LiquidityIndicator,
  SentimentIndicator,
  SectorData,
  ServiceStatus,
  LiquidityRawInputs,
  SentimentRawInputs,
  RationalEmotionalData,
  TimeSeriesPoint,
} from '@/src/types/market';

// ─── 시계열 생성 헬퍼 ─────────────────────────────────────────────────────────

function buildSeries(
  endValue: number,
  days: number,
  volatility = 0.01,
  seed = 42,
): TimeSeriesPoint[] {
  const series: TimeSeriesPoint[] = [];
  let rng = seed;
  // LCG 방식으로 재현 가능한 시계열 생성
  const rand = () => {
    rng = (rng * 1664525 + 1013904223) & 0xffffffff;
    return (rng >>> 0) / 0xffffffff;
  };

  // 역방향으로 시작값 추산 후 정방향 재생
  let value = endValue / Math.pow(1 + volatility * 0.04, days);
  const now = new Date('2026-05-07');

  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue; // 주말 제외
    const dateStr = d.toISOString().split('T')[0];
    value = value * (1 + (rand() - 0.48) * volatility);
    series.push({ date: dateStr, value: Math.round(value * 1000) / 1000 });
  }
  return series;
}

const AT = '2026-05-07T14:32:00Z';

// ─── 서비스 상태 ──────────────────────────────────────────────────────────────

export const mockServiceStatus: ServiceStatus = {
  id: 'service_status',
  status: 'normal',
  label: '정상',
  successRate: 1.0,
  averageResponseTime: 318,
  staleSourceCount: 0,
  fallbackSourceCount: 0,
  failedSourceCount: 0,
  criticalFailure: false,
  updatedAt: AT,
};

// ─── 매크로 지표 (Yahoo Finance 시뮬레이션) ───────────────────────────────────

export const mockMacroIndicators: MacroIndicator[] = [
  {
    id: 'sp500',
    name: 'S&P 500',
    source: 'Yahoo Finance',
    unit: '',
    currentValue: 5_648.40,
    previousValue: 5_601.20,
    change: 47.20,
    changeRate: 0.84,
    updatedAt: AT,
    timeSeries: buildSeries(5648.4, 365, 0.009, 11),
  },
  {
    id: 'nasdaq',
    name: '나스닥',
    source: 'Yahoo Finance',
    unit: '',
    currentValue: 17_862.30,
    previousValue: 17_710.50,
    change: 151.80,
    changeRate: 0.86,
    updatedAt: AT,
    timeSeries: buildSeries(17862.3, 365, 0.011, 22),
  },
  {
    id: 'usd_krw',
    name: '원/달러 환율',
    source: 'Yahoo Finance',
    unit: '₩',
    currentValue: 1_394.50,
    previousValue: 1_401.20,
    change: -6.70,
    changeRate: -0.48,
    updatedAt: AT,
    timeSeries: buildSeries(1394.5, 365, 0.005, 33),
  },
  {
    id: 'usd_jpy',
    name: '엔/달러 환율',
    source: 'Yahoo Finance',
    unit: '¥',
    currentValue: 148.32,
    previousValue: 147.85,
    change: 0.47,
    changeRate: 0.32,
    updatedAt: AT,
    timeSeries: buildSeries(148.32, 365, 0.004, 44),
  },
  {
    id: 'dxy',
    name: '달러인덱스',
    source: 'Yahoo Finance',
    unit: '',
    currentValue: 103.47,
    previousValue: 103.92,
    change: -0.45,
    changeRate: -0.43,
    updatedAt: AT,
    timeSeries: buildSeries(103.47, 365, 0.003, 55),
  },
  {
    id: 'wti',
    name: 'WTI',
    source: 'Yahoo Finance',
    unit: '$',
    currentValue: 71.84,
    previousValue: 72.51,
    change: -0.67,
    changeRate: -0.92,
    updatedAt: AT,
    timeSeries: buildSeries(71.84, 365, 0.014, 66),
  },
  {
    id: 'us10y',
    name: '10년물 국채금리',
    source: 'Yahoo Finance',
    unit: '%',
    currentValue: 4.27,
    previousValue: 4.31,
    change: -0.04,
    changeRate: -0.93,
    updatedAt: AT,
    timeSeries: buildSeries(4.27, 365, 0.008, 77),
  },
];

// ─── 유동성 원시 입력값 (엔진 계산용) ─────────────────────────────────────────
//
// 검증:
//   Net Liq current  = 6820 - (510 + 265) = 6045 B
//   Net Liq previous = 6600 - (620 + 340) = 5640 B
//   NetLiquidity_MoM = (6045-5640)/5640 × 100 = +7.18%  → +1% 초과 → Score +1
//   LiquidityFlow_MoM= (510+265)-(620+340) = 775-960 = -185B → < -100B → Score +1
//   Rate: 4.00 < 4.25 → 인하 → Score +1
//   TotalScore = +3 → Easing ✓

export const mockLiquidityRawInputs: LiquidityRawInputs = {
  fedAssets:  { current: 6_820, previous: 6_600 },  // 억 달러 (B)
  tgaBalance: { current:   510, previous:   620 },
  rrpBalance: { current:   265, previous:   340 },
  fedRate:    { current:  4.00, previous:  4.25 },
  updatedAt: '2026-05-05T00:00:00Z',
};

// ─── 유동성 세부 지표 카드 (FRED, 표시용) ─────────────────────────────────────

export const mockLiquidityIndicators: LiquidityIndicator[] = [
  {
    id: 'fed_rate',
    name: '연준 기준금리',
    source: 'FRED',
    unit: '%',
    currentValue: 4.00,
    previousValue: 4.25,
    change: -0.25,
    changeRate: -5.88,
    updatedAt: '2026-05-01T00:00:00Z',
    timeSeries: buildSeries(4.00, 365, 0.002, 88),
  },
  {
    id: 'tga_balance',
    name: '재무부 TGA 잔고',
    source: 'FRED',
    unit: '$B',
    currentValue: 510,
    previousValue: 620,
    change: -110,
    changeRate: -17.74,
    updatedAt: '2026-05-05T00:00:00Z',
    timeSeries: buildSeries(510, 365, 0.035, 99),
  },
  {
    id: 'fed_assets',
    name: '연준 대차대조표',
    source: 'FRED',
    unit: '$B',
    currentValue: 6_820,
    previousValue: 6_600,
    change: 220,
    changeRate: 3.33,
    updatedAt: '2026-05-05T00:00:00Z',
    timeSeries: buildSeries(6820, 365, 0.006, 110),
  },
  {
    id: 'reserves',
    name: '지급준비금',
    source: 'FRED',
    unit: '$B',
    currentValue: 3_245,
    previousValue: 3_040,
    change: 205,
    changeRate: 6.74,
    updatedAt: '2026-05-05T00:00:00Z',
    timeSeries: buildSeries(3245, 365, 0.01, 121),
  },
  {
    id: 'rrp_balance',
    name: '역레포(RRP) 잔고',
    source: 'FRED',
    unit: '$B',
    currentValue: 265,
    previousValue: 340,
    change: -75,
    changeRate: -22.06,
    updatedAt: '2026-05-05T00:00:00Z',
    timeSeries: buildSeries(265, 365, 0.055, 132),
  },
];

// ─── 센티멘트 원시 입력값 (엔진 계산용) ──────────────────────────────────────
//
// 검증:
//   VIX 27.4 ≥ 25 → VIXScore +1
//   Fear&Greed 22 ≤ 25 → FearGreedScore +1
//   RE Index 38 ≤ 45 → 이성 우위 → RationalityScore +1
//   TotalScore = +3 → Aggressive Buy ✓
//   HighYieldSpread 3.82% < 5% → Kill Switch 비활성 ✓

export const mockRationalEmotionalData: RationalEmotionalData = {
  finalIndex: 38,              // 이성 중심 (31~45)
  averageRationalScore: 6.2,
  averageEmotionalScore: 3.8,
  validPostCount: 142,
  updatedAt: AT,
};

export const mockSentimentRawInputs: SentimentRawInputs = {
  vix:             { current: 27.4, previous: 24.8 },
  fearGreed:       { current: 22,   previous: 31   },
  rationalEmotional: mockRationalEmotionalData,
  highYieldSpread: { current: 3.82, previous: 3.65 },
  updatedAt: AT,
};

// ─── 센티멘트 세부 지표 카드 (표시용) ────────────────────────────────────────

export const mockSentimentIndicators: SentimentIndicator[] = [
  {
    id: 'fear_greed',
    name: '공포/탐욕 지수',
    source: 'CNN Fear & Greed',
    unit: '',
    currentValue: 22,
    previousValue: 31,
    change: -9,
    changeRate: -29.03,
    updatedAt: AT,
    timeSeries: buildSeries(22, 90, 0.045, 143),
  },
  {
    id: 'vix',
    name: 'VIX',
    source: 'Yahoo Finance',
    unit: '',
    currentValue: 27.4,
    previousValue: 24.8,
    change: 2.6,
    changeRate: 10.48,
    updatedAt: AT,
    timeSeries: buildSeries(27.4, 90, 0.04, 154),
  },
  {
    id: 'rational_emotional',
    name: '이성/감성 여론 지수',
    source: 'Reddit (GreenBull 자체 산출)',
    unit: '',
    currentValue: 38,
    previousValue: 45,
    change: -7,
    changeRate: -15.56,
    updatedAt: AT,
    timeSeries: buildSeries(38, 30, 0.05, 165),
  },
  {
    id: 'high_yield_spread',
    name: '하이일드 스프레드',
    source: 'FRED',
    unit: '%',
    currentValue: 3.82,
    previousValue: 3.65,
    change: 0.17,
    changeRate: 4.66,
    updatedAt: AT,
    timeSeries: buildSeries(3.82, 180, 0.02, 176),
  },
];

// ─── 섹터 데이터 ──────────────────────────────────────────────────────────────

export const mockSectorData: SectorData[] = [
  { id:'XLK',  name:'기술',         returnRate: 3.42,  estimatedFlow: 8_240,  volume: 52_300_000, marketSize: 620_000, updatedAt: AT },
  { id:'XLF',  name:'금융',         returnRate: 1.87,  estimatedFlow: 4_120,  volume: 38_100_000, marketSize: 410_000, updatedAt: AT },
  { id:'XLV',  name:'헬스케어',     returnRate:-0.54,  estimatedFlow:  -980,  volume: 21_500_000, marketSize: 380_000, updatedAt: AT },
  { id:'XLY',  name:'소비자 재량재', returnRate: 2.11,  estimatedFlow: 3_760,  volume: 28_900_000, marketSize: 290_000, updatedAt: AT },
  { id:'XLP',  name:'소비자 필수재', returnRate: 0.38,  estimatedFlow:   510,  volume: 14_200_000, marketSize: 185_000, updatedAt: AT },
  { id:'XLE',  name:'에너지',       returnRate:-1.23,  estimatedFlow:-2_100,  volume: 19_600_000, marketSize: 240_000, updatedAt: AT },
  { id:'XLI',  name:'산업재',       returnRate: 1.05,  estimatedFlow: 1_840,  volume: 16_800_000, marketSize: 210_000, updatedAt: AT },
  { id:'XLU',  name:'유틸리티',     returnRate: 0.72,  estimatedFlow:   820,  volume: 11_300_000, marketSize: 145_000, updatedAt: AT },
  { id:'XLB',  name:'소재',         returnRate:-0.88,  estimatedFlow:-1_320,  volume:  9_800_000, marketSize: 115_000, updatedAt: AT },
  { id:'XLRE', name:'부동산',       returnRate: 0.15,  estimatedFlow:   140,  volume:  7_400_000, marketSize:  98_000, updatedAt: AT },
  { id:'XLC',  name:'커뮤니케이션 서비스', returnRate: 2.76,  estimatedFlow: 5_150,  volume: 23_600_000, marketSize: 275_000, updatedAt: AT },
];

// ─── 집계 대시보드 데이터 ─────────────────────────────────────────────────────

export const mockDashboardData: DashboardData = {
  macro: mockMacroIndicators,
  liquidity: {
    indicators: mockLiquidityIndicators,
  },
  sentiment: {
    indicators: mockSentimentIndicators,
  },
  sectors: mockSectorData,
};
