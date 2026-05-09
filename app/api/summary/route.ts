import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── 출력 타입 ────────────────────────────────────────────────────────────────

export interface SummaryResponse {
  headline: string;
  regimeSummary: string;
  keyDrivers: string;
  marketImplication: string;
  caution: string;
}

// ─── 프롬프트 빌더 ────────────────────────────────────────────────────────────

function buildLiquidityPrompt(d: Record<string, any>): string {
  const sign = (n: number) => (n > 0 ? `+${n}` : String(n));
  const score = d.totalScore;

  return `너는 'GreenBull Dashboard'의 핵심 브레인인 시니어 투자 전략가야.
제공된 유동성 통합 지표 계산 결과와 아래의 [투자 행동 알고리즘]을 바탕으로, 장기 투자자를 위한 정교한 인사이트를 생성해줘.

### [현재 유동성 데이터]
- **종합 점수: ${sign(score)} / 3** (현재 국면: ${d.state})
- 기준금리 방향: ${d.rateDirection === 'cut' ? '인하' : d.rateDirection === 'hike' ? '인상' : '동결'} (점수 ${sign(d.rateScore)}) — ${d.descriptions.rateScore}
- 순유동성 MoM: ${d.netLiquidityMoM > 0 ? '+' : ''}${Number(d.netLiquidityMoM).toFixed(2)}% (점수 ${sign(d.netLiquidityScore)}) — ${d.descriptions.netLiquidityScore}
- TGA+RRP 자금흐름: ${d.liquidityFlowMoM > 0 ? '+' : ''}${Number(d.liquidityFlowMoM).toFixed(0)}B (점수 ${sign(d.liquidityFlowScore)}) — ${d.descriptions.liquidityFlowScore}
- 순유동성 현황: 현재 $${(d.netLiquidityCurrent / 1000).toFixed(2)}T (전월 $${(d.netLiquidityPrevious / 1000).toFixed(2)}T)

### [투자 행동 알고리즘 (Score-to-Action)]
1. **+2 ~ +3 [적극 매수 국면 / 엑셀]:** 펀더멘털은 양호하나 거시경제/심리 요인으로 과도한 하락 압력을 받는 상태. (전략: 정립식 매수 금액 대비 2~3배 수준으로 비중 확대 권장)
2. **-1 ~ +1 [기계적 적립식 국면 / 유지]:** 시장이 이성적 범위 내 정상 궤도에 있는 상태. (전략: 감정에 흔들리지 말고 원칙대로 기계적인 분할 매수 유지)
3. **-3 ~ -1 [현금 확보 및 관망 국면 / 브레이크]:** 과도한 낙관 및 버블 신호 감지, 본질 가치 대비 과대평가 국면. (전략: 신규 매수를 일시 보류하고 조정에 대비한 현금 비중 확대 권장)

### [JSON 출력 제약사항]
반드시 아래 JSON 구조로만 응답하세요 (다른 설명 텍스트 금지):
{
  "headline": "[국면 이름] 현재 유동성/심리 상태를 한 문장으로 요약 (예: [적극 매수] 시장의 공포를 기회로 삼아야 할 시점입니다)",
  "regimeSummary": "기획서의 '시장 상태' 설명을 바탕으로 위 데이터를 결합하여 현재 상황의 배경을 2~3문장으로 설명",
  "investmentAction": "알고리즘의 '전략' 내용을 바탕으로 한 구체적이고 단호한 행동 지침",
  "keyDrivers": "기준금리, 순유동성, 자금흐름 중 현재 점수를 결정지은 핵심 동인 분석",
  "marketImplication": "현재의 '엑셀/유지/브레이크' 상태가 향후 1~2주간 시장에 미칠 영향",
  "caution": "단기적 과열 또는 시스템 리스크 발생 가능성에 대한 경고"
}`;
}

function buildSentimentPrompt(d: Record<string, any>): string {
  const sign = (n: number) => (n > 0 ? `+${n}` : String(n));
  const killLine = d.killSwitchActive
    ? `\n⚠ Kill Switch 활성: ${d.killSwitchReason}`
    : '';
  return `현재 종합 시장 센티멘트 계산 결과:
종합 점수: ${sign(d.totalScore)} / 3  →  국면: ${d.state}${killLine}
- VIX: ${Number(d.vixValue).toFixed(1)} (점수 ${sign(d.vixScore)}) — ${d.descriptions.vixScore}
- 공포/탐욕 지수: ${Number(d.fearGreedValue).toFixed(0)} / 100 (점수 ${sign(d.fearGreedScore)}) — ${d.descriptions.fearGreedScore}
- 이성/감성 지수: ${Number(d.rationalEmotionalIndex).toFixed(1)} / 100 (점수 ${sign(d.rationalityScore)}) — ${d.descriptions.rationalityScore}
- 하이일드 스프레드: ${Number(d.highYieldSpreadValue).toFixed(2)}%  /  전월: ${Number(d.highYieldSpreadPrevious).toFixed(2)}%

반드시 아래 JSON 키를 갖는 객체로만 응답하세요 (다른 텍스트 없이):
{
  "headline": "현재 시장 심리를 한 문장으로",
  "regimeSummary": "현재 센티멘트 국면의 특성과 배경 (2~3문장)",
  "keyDrivers": "센티멘트를 움직이는 핵심 동인",
  "marketImplication": "현재 심리 환경이 시장에 미치는 영향",
  "caution": "투자자가 주목해야 할 리스크${d.killSwitchActive ? ' — 하이일드 스프레드 경고를 caution 첫 문장에서 반드시 강조' : ''}"
}`;
}

// ─── System Prompts ───────────────────────────────────────────────────────────

const SYSTEM_LIQUIDITY = `당신은 거시경제 유동성 분석 전문가입니다.
제공된 유동성 지표 계산 결과를 바탕으로 현재 시장 유동성 상태를 객관적으로 요약합니다.
규칙:
1. 반드시 요청된 JSON 형식으로만 응답합니다.
2. 각 필드는 1~3문장으로 간결하게 작성합니다.
3. "매수하세요", "투자하세요" 등 직접적 투자 권유 문구는 절대 사용하지 않습니다.
4. 계산된 수치 데이터를 근거로 사실 기반 서술만 합니다.
5. 한국어로 작성합니다.`;

const SYSTEM_SENTIMENT = `당신은 시장 심리(센티멘트) 분석 전문가입니다.
제공된 계산 결과를 바탕으로 현재 시장 심리 상태를 객관적으로 요약합니다.
규칙:
1. 반드시 요청된 JSON 형식으로만 응답합니다.
2. 각 필드는 1~3문장으로 간결하게 작성합니다.
3. "매수하세요", "투자하세요" 등 직접적 투자 권유 문구는 절대 사용하지 않습니다.
4. 계산된 수치 데이터를 근거로 사실 기반 서술만 합니다.
5. 하이일드 스프레드 경고가 활성화된 경우 caution 필드에서 반드시 강조합니다.
6. 한국어로 작성합니다.`;

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  let body: { type: string; data: Record<string, any> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { type, data } = body;
  if ((type !== 'liquidity' && type !== 'sentiment') || !data) {
    return NextResponse.json({ error: 'type must be "liquidity" or "sentiment"' }, { status: 400 });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: type === 'liquidity' ? SYSTEM_LIQUIDITY : SYSTEM_SENTIMENT },
        { role: 'user',   content: type === 'liquidity' ? buildLiquidityPrompt(data) : buildSentimentPrompt(data) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 700,
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw) as SummaryResponse;
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[/api/summary]', err);
    return NextResponse.json({ error: 'OpenAI request failed' }, { status: 500 });
  }
}
