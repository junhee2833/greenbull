// ─── Tab / Section Navigation ─────────────────────────────────────────────────
export type TabId = 'macro' | 'liquidity' | 'sentiment' | 'sector' | 'stock';

// ─── Service Status ────────────────────────────────────────────────────────────
export type ServiceStatusState = 'normal' | 'delayed' | 'error';

export interface ServiceStatus {
  id: 'service_status';
  status: ServiceStatusState;
  label: '정상' | '지연' | '장애';
  successRate: number;
  averageResponseTime: number;
  staleSourceCount: number;
  fallbackSourceCount: number;
  failedSourceCount: number;
  criticalFailure: boolean;
  updatedAt: string;
}

// ─── Shared ────────────────────────────────────────────────────────────────────
export interface TimeSeriesPoint {
  date: string;
  value: number;
}

// ─── Common Market Indicator (정규화된 공통 형식) ──────────────────────────────
// Data_Management_Skill.md [공통 데이터 형식 정규화]
export interface MarketIndicator {
  id: string;
  name: string;
  source: string;
  unit: string;
  currentValue: number | null;
  previousValue: number | null;
  change: number | null;       // currentValue - previousValue
  changeRate: number | null;   // % — previousValue=0 이면 null
  updatedAt: string;
  timeSeries?: TimeSeriesPoint[];
}

// ─── Macro ─────────────────────────────────────────────────────────────────────
export type MacroIndicatorId =
  | 'sp500' | 'nasdaq' | 'usd_krw' | 'usd_jpy' | 'dxy' | 'wti' | 'us10y';

export interface MacroIndicator extends MarketIndicator {
  id: MacroIndicatorId;
}

// ─── Liquidity Raw Inputs (엔진 계산용 원시 데이터) ───────────────────────────
// Data_Management_Skill.md [유동성 통합 지표 설계] 입력 데이터
export interface LiquidityRawInputs {
  fedAssets:   { current: number; previous: number }; // 억 달러 (billion USD)
  tgaBalance:  { current: number; previous: number }; // 억 달러
  rrpBalance:  { current: number; previous: number }; // 억 달러
  fedRate:     { current: number; previous: number }; // %
  updatedAt: string;
}

// ─── Liquidity Composite (엔진 출력) ──────────────────────────────────────────
export type LiquidityStateLabel = 'Easing' | 'Neutral' | 'Tightening';

export interface LiquidityComposite {
  id: 'liquidity_composite';
  name: string;
  currentValue: number;   // -3 ~ +3
  state: LiquidityStateLabel;
  components: {
    rateScore: number;
    netLiquidityScore: number;
    liquidityFlowScore: number;
  };
  updatedAt: string;
}

export type LiquidityIndicatorId =
  | 'fed_rate' | 'tga_balance' | 'fed_assets' | 'reserves' | 'rrp_balance';

export interface LiquidityIndicator extends MarketIndicator {
  id: LiquidityIndicatorId;
}

// ─── Sentiment Raw Inputs (엔진 계산용 원시 데이터) ───────────────────────────
// Data_Management_Skill.md [종합 시장 센티멘트 지표 설계] 입력 데이터
export interface RationalEmotionalData {
  finalIndex: number;          // 0~100 (높을수록 감정적)
  averageRationalScore: number;
  averageEmotionalScore: number;
  validPostCount: number;
  updatedAt: string;
}

export interface SentimentRawInputs {
  vix:               { current: number; previous: number };
  fearGreed:         { current: number; previous: number };
  rationalEmotional: RationalEmotionalData;
  highYieldSpread:   { current: number; previous: number }; // %
  updatedAt: string;
}

// ─── Sentiment Composite (엔진 출력) ──────────────────────────────────────────
// Data_Management_Skill.md [종합 시장 센티멘트 지표 설계] 투자 상태 분류 5단계 + Kill Switch
export type SentimentStateLabel =
  | 'Aggressive Buy'   // TotalScore +2 ~ +3 : 적극 매수 국면
  | 'Buy Recommended'  // TotalScore +1       : 매수 추천 국면
  | 'DCA Maintain'     // TotalScore  0       : 기계적 적립식 국면
  | 'Cash Reserve'     // TotalScore -1       : 현금 확보 권장 국면
  | 'Wait'             // TotalScore -2 ~ -3  : 현금 확보 및 관망 국면
  | 'Risk Override';   // Kill Switch 활성     : 매수 보류

export interface MarketSentimentComposite {
  id: 'market_sentiment';
  name: string;
  currentValue: number;   // -3 ~ +3
  state: SentimentStateLabel;
  riskOverride: boolean;
  riskOverrideReason: string | null;
  components: {
    vixScore: number;
    fearGreedScore: number;
    rationalityScore: number;
  };
  updatedAt: string;
}

export type SentimentIndicatorId =
  | 'vix' | 'fear_greed' | 'rational_emotional' | 'high_yield_spread';

export interface SentimentIndicator extends MarketIndicator {
  id: SentimentIndicatorId;
}

// ─── Sector ────────────────────────────────────────────────────────────────────
export interface SectorData {
  id: string;
  name: string;
  returnRate: number | null;
  estimatedFlow: number | null;
  volume: number | null;
  marketSize: number | null;
  updatedAt: string;
}

// ─── Aggregated Dashboard Data ────────────────────────────────────────────────
// 복합 지표(composite)는 스토어에 저장하지 않고 엔진이 런타임에 계산한다
export interface DashboardData {
  macro: MacroIndicator[];
  liquidity: {
    indicators: LiquidityIndicator[];
  };
  sentiment: {
    indicators: SentimentIndicator[];
  };
  sectors: SectorData[];
}
