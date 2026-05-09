'use client';

import { useMemo } from 'react';
import { useMarketStore } from '@/src/store/useMarketStore';
import {
  calculateSentiment,
  describeVixScore,
  describeFearGreedScore,
  describeRationalityScore,
  classifyRationalEmotional,
  type SentimentEngineResult,
} from '@/src/utils/sentimentEngine';

export interface SentimentEngineHookResult extends SentimentEngineResult {
  // UI용 설명 텍스트
  descriptions: {
    vixScore: string;
    fearGreedScore: string;
    rationalityScore: string;
    rationalEmotionalState: string;
  };
  // 포맷된 표시값
  formatted: {
    totalScore: string;
    vix: string;
    fearGreed: string;
    rationalEmotional: string;
    highYieldSpread: string;
  };
}

/**
 * 종합 시장 센티멘트 지표 계산 훅
 *
 * - Zustand store에서 raw inputs 읽기
 * - sentimentEngine.ts의 순수 계산 함수 호출
 * - Kill Switch 활성 여부를 포함한 완전한 계산 결과 반환
 */
export function useSentimentEngine(): SentimentEngineHookResult {
  const rawInputs = useMarketStore((s) => s.sentimentRawInputs);

  return useMemo((): SentimentEngineHookResult => {
    const result = calculateSentiment(rawInputs);

    const descriptions = {
      vixScore:             describeVixScore(result.vixScore, result.vixValue),
      fearGreedScore:       describeFearGreedScore(result.fearGreedScore, result.fearGreedValue),
      rationalityScore:     describeRationalityScore(result.rationalityScore, result.rationalEmotionalIndex),
      rationalEmotionalState: classifyRationalEmotional(result.rationalEmotionalIndex),
    };

    const formatted = {
      totalScore:       `${result.totalScore >= 0 ? '+' : ''}${result.totalScore}`,
      vix:              result.vixValue.toFixed(1),
      fearGreed:        result.fearGreedValue.toFixed(0),
      rationalEmotional:`${result.rationalEmotionalIndex.toFixed(1)} / 100`,
      highYieldSpread:  `${result.highYieldSpreadValue.toFixed(2)}%`,
    };

    return { ...result, descriptions, formatted };
  }, [rawInputs]);
}
