'use client';

import { useMemo } from 'react';
import { useMarketStore } from '@/src/store/useMarketStore';
import {
  calculateLiquidity,
  describeRateScore,
  describeNetLiquidityScore,
  describeLiquidityFlowScore,
  type LiquidityEngineResult,
} from '@/src/utils/liquidityEngine';

export interface LiquidityEngineHookResult extends LiquidityEngineResult {
  // UI용 설명 텍스트 (계산 과정 투명화)
  descriptions: {
    rateScore: string;
    netLiquidityScore: string;
    liquidityFlowScore: string;
  };
  // 포맷된 표시값
  formatted: {
    netLiquidityCurrent: string;
    netLiquidityPrevious: string;
    netLiquidityMoM: string;
    liquidityFlowMoM: string;
    totalScore: string;
  };
}

/**
 * 유동성 통합 지표 계산 훅
 *
 * - Zustand store에서 raw inputs 읽기
 * - liquidityEngine.ts의 순수 계산 함수 호출
 * - useMemo로 inputs 변경 시에만 재계산
 */
export function useLiquidityEngine(): LiquidityEngineHookResult {
  const rawInputs = useMarketStore((s) => s.liquidityRawInputs);

  return useMemo((): LiquidityEngineHookResult => {
    const result = calculateLiquidity(rawInputs);

    const descriptions = {
      rateScore:         describeRateScore(result.rateScore, result.rateDirection),
      netLiquidityScore: describeNetLiquidityScore(result.netLiquidityScore, result.netLiquidityMoM),
      liquidityFlowScore: describeLiquidityFlowScore(result.liquidityFlowScore, result.liquidityFlowMoM),
    };

    const formatted = {
      netLiquidityCurrent:  `$${(result.netLiquidityCurrent  / 1000).toFixed(2)}T`,
      netLiquidityPrevious: `$${(result.netLiquidityPrevious / 1000).toFixed(2)}T`,
      netLiquidityMoM:      `${result.netLiquidityMoM >= 0 ? '+' : ''}${result.netLiquidityMoM.toFixed(2)}%`,
      liquidityFlowMoM:     `${result.liquidityFlowMoM >= 0 ? '+' : ''}$${result.liquidityFlowMoM.toFixed(0)}B`,
      totalScore:           `${result.totalScore >= 0 ? '+' : ''}${result.totalScore}`,
    };

    return { ...result, descriptions, formatted };
  }, [rawInputs]);
}
