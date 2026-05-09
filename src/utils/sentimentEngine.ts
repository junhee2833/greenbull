/**
 * Data_Management_Skill.md — [종합 시장 센티멘트 지표 설계] 완전 구현
 *
 * 스코어링 모델 + 특수 리스크 필터(Kill Switch) 포함.
 * 순수 함수(Pure Function) — React 의존성 없음.
 */

import type { SentimentRawInputs, SentimentStateLabel } from '@/src/types/market';

// ─── 출력 타입 ────────────────────────────────────────────────────────────────

export interface SentimentEngineResult {
  // ── 중간 계산값 (투명성 / 디버깅) ──────────────────────────────────────────
  vixValue: number;
  fearGreedValue: number;
  rationalEmotionalIndex: number;
  highYieldSpreadValue: number;
  highYieldSpreadPrevious: number;

  // ── 점수 (각 -1 / 0 / +1) ──────────────────────────────────────────────────
  vixScore: number;
  fearGreedScore: number;
  rationalityScore: number;

  // ── Kill Switch ─────────────────────────────────────────────────────────────
  killSwitchActive: boolean;
  killSwitchReason: string | null;

  // ── 최종 출력 ───────────────────────────────────────────────────────────────
  totalScore: number;             // -3 ~ +3
  state: SentimentStateLabel;
  riskOverride: boolean;
  updatedAt: string;
}

// ─── 내부 점수 계산 ──────────────────────────────────────────────────────────

/** (1) VIX 점수화
 * VIX ≥ 25 → +1 (시장 공포, 과도한 헤지 → 매수 기회)
 * 15 ≤ VIX < 25 → 0 (정상 변동성)
 * VIX < 15 → -1 (과도한 낙관 → 리스크 주의)
 */
function scoreVix(vix: number): number {
  if (vix >= 25) return  1;
  if (vix <  15) return -1;
  return 0;
}

/** (2) 공포/탐욕 지수 점수화
 * 0 ≤ score ≤ 25 → +1 (극단적 공포 → 역발상 매수)
 * 26 ≤ score ≤ 74 → 0 (중립)
 * 75 ≤ score ≤ 100 → -1 (극단적 탐욕 → 고점 경계)
 */
function scoreFearGreed(score: number): number {
  if (score <= 25) return  1;
  if (score >= 75) return -1;
  return 0;
}

/** (3) 이성/감성 여론 지수 점수화 (0~100, 높을수록 감정적)
 * FinalIndex ≤ 45 → 이성 우위 → +1
 * 46 ≤ FinalIndex ≤ 55 → 중립 → 0
 * FinalIndex ≥ 56 → 감성 우위 → -1
 *
 * 구간별 상태 (Data_Management_Skill.md):
 *   0~30: 매우 이성적
 *   31~45: 이성 중심적
 *   46~55: 중립
 *   56~70: 감정 중심적
 *   71~100: 매우 감정적
 */
function scoreRationalEmotional(finalIndex: number): number {
  if (finalIndex <= 45) return  1;
  if (finalIndex >= 56) return -1;
  return 0;
}

/** TotalScore → 투자 상태 분류 (5단계)
 * Data_Management_Skill.md [투자 상태 분류]
 */
function classifyState(totalScore: number): SentimentStateLabel {
  if (totalScore >= 2)  return 'Aggressive Buy';   // +2 ~ +3: 적극 매수 국면
  if (totalScore === 1) return 'Buy Recommended';  // +1     : 매수 추천 국면
  if (totalScore === 0) return 'DCA Maintain';     //  0     : 기계적 적립식 국면
  if (totalScore === -1) return 'Cash Reserve';    // -1     : 현금 확보 권장 국면
  return 'Wait';                                   // -2 ~ -3: 현금 확보 및 관망 국면
}

// ─── 메인 계산 엔진 ──────────────────────────────────────────────────────────

/**
 * 종합 시장 센티멘트 지표 계산
 *
 * 1) 각 입력 지표를 -1 / 0 / +1 로 점수화
 * 2) TotalScore = VIXScore + FearGreedScore + RationalityScore
 * 3) Kill Switch 확인 (하이일드 스프레드 ≥ 5% AND 상승 추세)
 * 4) Kill Switch 활성 시 → 'Risk Override' 강제 반환
 * 5) Kill Switch 비활성 → TotalScore 기반 5단계 분류
 */
export function calculateSentiment(inputs: SentimentRawInputs): SentimentEngineResult {
  const { vix, fearGreed, rationalEmotional, highYieldSpread, updatedAt } = inputs;

  // ── 점수화 ─────────────────────────────────────────────────────────────────
  const vixScore         = scoreVix(vix.current);
  const fearGreedScore   = scoreFearGreed(fearGreed.current);
  const rationalityScore = scoreRationalEmotional(rationalEmotional.finalIndex);
  const totalScore       = vixScore + fearGreedScore + rationalityScore;

  // ── Kill Switch (특수 리스크 필터) ─────────────────────────────────────────
  // 조건: 하이일드 스프레드 ≥ 5% AND 현재값 > 이전값 (상승 추세)
  const killSwitchActive =
    highYieldSpread.current >= 5 &&
    highYieldSpread.current > highYieldSpread.previous;

  if (killSwitchActive) {
    const reason =
      `하이일드 스프레드 ${highYieldSpread.current.toFixed(2)}% ≥ 5% ` +
      `(전월 ${highYieldSpread.previous.toFixed(2)}%에서 상승) — 포트폴리오 리스크 점검`;

    return {
      vixValue:               vix.current,
      fearGreedValue:         fearGreed.current,
      rationalEmotionalIndex: rationalEmotional.finalIndex,
      highYieldSpreadValue:   highYieldSpread.current,
      highYieldSpreadPrevious: highYieldSpread.previous,
      vixScore,
      fearGreedScore,
      rationalityScore,
      killSwitchActive: true,
      killSwitchReason: reason,
      totalScore,
      state: 'Risk Override',
      riskOverride: true,
      updatedAt,
    };
  }

  // ── 정상 분류 ──────────────────────────────────────────────────────────────
  return {
    vixValue:               vix.current,
    fearGreedValue:         fearGreed.current,
    rationalEmotionalIndex: rationalEmotional.finalIndex,
    highYieldSpreadValue:   highYieldSpread.current,
    highYieldSpreadPrevious: highYieldSpread.previous,
    vixScore,
    fearGreedScore,
    rationalityScore,
    killSwitchActive: false,
    killSwitchReason: null,
    totalScore,
    state: classifyState(totalScore),
    riskOverride: false,
    updatedAt,
  };
}

// ─── 점수 설명 텍스트 (UI용) ─────────────────────────────────────────────────

export function describeVixScore(score: number, vix: number): string {
  if (score ===  1) return `VIX ${vix.toFixed(1)} ≥ 25 → 시장 공포 (매수 기회) (+1)`;
  if (score === -1) return `VIX ${vix.toFixed(1)} < 15 → 과도한 낙관 (-1)`;
  return `VIX ${vix.toFixed(1)} — 정상 변동성 구간 15~25 (0)`;
}

export function describeFearGreedScore(score: number, value: number): string {
  if (score ===  1) return `공포/탐욕 ${value.toFixed(0)} ≤ 25 → 극단적 공포 (+1)`;
  if (score === -1) return `공포/탐욕 ${value.toFixed(0)} ≥ 75 → 극단적 탐욕 (-1)`;
  return `공포/탐욕 ${value.toFixed(0)} — 중립 구간 26~74 (0)`;
}

export function describeRationalityScore(score: number, index: number): string {
  if (score ===  1) return `이성/감성 지수 ${index.toFixed(1)} ≤ 45 → 이성 우위 (+1)`;
  if (score === -1) return `이성/감성 지수 ${index.toFixed(1)} ≥ 56 → 감성 우위 (-1)`;
  return `이성/감성 지수 ${index.toFixed(1)} — 중립 구간 46~55 (0)`;
}

/** 이성/감성 FinalIndex → 상태 문자열 */
export function classifyRationalEmotional(finalIndex: number): string {
  if (finalIndex <= 30) return '매우 이성적';
  if (finalIndex <= 45) return '이성 중심';
  if (finalIndex <= 55) return '중립';
  if (finalIndex <= 70) return '감정 중심';
  return '매우 감정적';
}
