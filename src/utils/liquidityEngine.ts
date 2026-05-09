/**
 * Data_Management_Skill.md — [유동성 통합 지표 설계] 완전 구현
 *
 * 순수 함수(Pure Function) 집합 — React / 브라우저 의존성 없음.
 * Route Handler 또는 클라이언트 훅 어디서든 호출 가능.
 */

import type { LiquidityRawInputs, LiquidityStateLabel } from '@/src/types/market';
import { roundTo2 } from './normalize';

// ─── 출력 타입 ────────────────────────────────────────────────────────────────

export interface LiquidityEngineResult {
  // ── 중간 계산값 (투명성 / 디버깅) ──────────────────────────────────────────
  netLiquidityCurrent: number;    // 억 달러
  netLiquidityPrevious: number;   // 억 달러
  netLiquidityMoM: number;        // % (전월 대비 변화율)
  liquidityFlowMoM: number;       // 억 달러 (TGA+RRP 변화량)
  rateDirection: 'cut' | 'hold' | 'hike';

  // ── 점수 (각 -1 / 0 / +1) ──────────────────────────────────────────────────
  rateScore: number;
  netLiquidityScore: number;
  liquidityFlowScore: number;

  // ── 최종 출력 ───────────────────────────────────────────────────────────────
  totalScore: number;             // -3 ~ +3
  state: LiquidityStateLabel;
  updatedAt: string;
}

// ─── 계산 엔진 ────────────────────────────────────────────────────────────────

/**
 * 유동성 통합 지표 계산
 *
 * 1) Net Liquidity = Fed Total Assets − (TGA + RRP)
 * 2) NetLiquidity_MoM = ((current − prev) / prev) × 100
 * 3) LiquidityFlow_MoM = (TGA+RRP)_current − (TGA+RRP)_prev  (billion $)
 * 4) Rate Direction: current vs previous FOMC 결정
 * 5) 점수화 → TotalScore → 국면 분류
 */
export function calculateLiquidity(inputs: LiquidityRawInputs): LiquidityEngineResult {
  const { fedAssets, tgaBalance, rrpBalance, fedRate, updatedAt } = inputs;

  // ── Step 1: Net Liquidity ──────────────────────────────────────────────────
  const netLiquidityCurrent  = fedAssets.current  - (tgaBalance.current  + rrpBalance.current);
  const netLiquidityPrevious = fedAssets.previous - (tgaBalance.previous + rrpBalance.previous);

  // ── Step 2: NetLiquidity MoM (%) ──────────────────────────────────────────
  // previousValue가 0이면 계산 불가 → 0 처리
  const netLiquidityMoM = netLiquidityPrevious !== 0
    ? roundTo2(((netLiquidityCurrent - netLiquidityPrevious) / netLiquidityPrevious) * 100) ?? 0
    : 0;

  // ── Step 3: TGA+RRP Flow MoM (billion $) ──────────────────────────────────
  // 양수 = TGA+RRP 증가 (유동성 흡수) / 음수 = TGA+RRP 감소 (유동성 공급)
  const liquidityFlowMoM = roundTo2(
    (tgaBalance.current + rrpBalance.current) - (tgaBalance.previous + rrpBalance.previous),
  ) ?? 0;

  // ── Step 4: Rate Direction ─────────────────────────────────────────────────
  let rateDirection: 'cut' | 'hold' | 'hike';
  if (fedRate.current < fedRate.previous)      rateDirection = 'cut';
  else if (fedRate.current > fedRate.previous) rateDirection = 'hike';
  else                                          rateDirection = 'hold';

  // ── Step 5: 점수화 (Data_Management_Skill.md [점수화 규칙]) ──────────────────

  // (1) 기준금리 방향
  //   금리 인하 → +1 / 금리 동결 → 0 / 금리 인상 → -1
  const rateScore =
    rateDirection === 'cut'  ?  1 :
    rateDirection === 'hike' ? -1 : 0;

  // (2) 순유동성 변화율 MoM
  //   +1% 초과 증가 → +1 / -1%~+1% → 0 / -1% 이하 감소 → -1
  const netLiquidityScore =
    netLiquidityMoM >  1 ?  1 :
    netLiquidityMoM < -1 ? -1 : 0;

  // (3) TGA+RRP 자금 흐름 MoM (단위: 억 달러, 1000억 = $100B)
  //   1000억($100B) 이상 감소 → +1 (유동성 공급)
  //   1000억($100B) ~ +1000억($100B) → 0
  //   1000억($100B) 이상 증가 → -1 (유동성 흡수)
  const liquidityFlowScore =
    liquidityFlowMoM < -100 ?  1 :
    liquidityFlowMoM >  100 ? -1 : 0;

  // ── Step 6: 최종 점수 ─────────────────────────────────────────────────────
  const totalScore = rateScore + netLiquidityScore + liquidityFlowScore;

  // ── Step 7: 국면 분류 ─────────────────────────────────────────────────────
  // 완화 국면(Easing): TotalScore ≥ +1
  // 중립 국면(Neutral): -1 < TotalScore < +1  (즉, TotalScore = 0)
  // 긴축 국면(Tightening): TotalScore ≤ -1
  let state: LiquidityStateLabel;
  if (totalScore >=  1) state = 'Easing';
  else if (totalScore <= -1) state = 'Tightening';
  else                       state = 'Neutral';

  return {
    netLiquidityCurrent,
    netLiquidityPrevious,
    netLiquidityMoM,
    liquidityFlowMoM,
    rateDirection,
    rateScore,
    netLiquidityScore,
    liquidityFlowScore,
    totalScore,
    state,
    updatedAt,
  };
}

// ─── 점수 설명 텍스트 (UI용) ─────────────────────────────────────────────────

export function describeRateScore(score: number, direction: string): string {
  if (score ===  1) return `금리 인하 → 유동성 완화 (+1)`;
  if (score === -1) return `금리 인상 → 유동성 긴축 (-1)`;
  return `금리 동결 (0)`;
}

export function describeNetLiquidityScore(score: number, mom: number): string {
  if (score ===  1) return `순유동성 MoM +${mom.toFixed(2)}% > 1% → 증가 (+1)`;
  if (score === -1) return `순유동성 MoM ${mom.toFixed(2)}% < -1% → 감소 (-1)`;
  return `순유동성 MoM ${mom.toFixed(2)}% (−1%~+1%) → 중립 (0)`;
}

export function describeLiquidityFlowScore(score: number, flow: number): string {
  if (score ===  1) return `TGA+RRP ${flow.toFixed(0)}B 감소 → 유동성 공급 (+1)`;
  if (score === -1) return `TGA+RRP +${flow.toFixed(0)}B 증가 → 유동성 흡수 (-1)`;
  return `TGA+RRP ${flow.toFixed(0)}B 변화 (±100B 이내) → 중립 (0)`;
}
