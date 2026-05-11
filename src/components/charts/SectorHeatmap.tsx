'use client';

import { useState, useRef } from 'react';
import { useBreakpointValue } from '@/src/hooks/useBreakpointValue';
import { Treemap, ResponsiveContainer } from 'recharts';
import type { SectorData } from '@/src/types/market';

// ─── 색상 (returnRate: 퍼센트 단위, ex. 3.42) ────────────────────────────────

function returnColor(rate: number | null): string {
  if (rate === null) return '#94A3B8';  // 데이터 없음 — 중립 회색
  if (rate >=  3)    return '#16A34A';  // 강한 상승
  if (rate >=  1.5)  return '#22C55E';  // 상승
  if (rate >=  0.5)  return '#4ADE80';  // 소폭 상승
  if (rate >= -0.5)  return '#94A3B8';  // 보합
  if (rate >= -1.5)  return '#F87171';  // 소폭 하락
  return '#EF4444';                      // 하락
}

// ─── 섹터 ID → ETF 티커 역매핑 ───────────────────────────────────────────────

const SECTOR_TICKER: Record<string, string> = {
  tech:          'XLK',
  financials:    'XLF',
  healthcare:    'XLV',
  consumer_disc: 'XLY',
  consumer_stap: 'XLP',
  energy:        'XLE',
  industrials:   'XLI',
  utilities:     'XLU',
  materials:     'XLB',
  real_estate:   'XLRE',
  comm_services: 'XLC',
};

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface TooltipState {
  x: number;
  y: number;
  name: string;
  ticker: string;
  returnRate: number | null;
  marketSize: number | null;
  estimatedFlow: number | null;
}

interface SectorHeatmapProps {
  sectors: SectorData[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SectorHeatmap({ sectors }: SectorHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const chartHeight = useBreakpointValue(220, 320);

  // marketSize 기준 내림차순 정렬 — 큰 섹터가 좌상단에 배치
  const data = [...sectors]
    .sort((a, b) => (b.marketSize ?? 0) - (a.marketSize ?? 0))
    .map(s => ({
      name:          s.name,
      size:          s.marketSize ?? 1,  // null이면 최소 크기(1)
      returnRate:    s.returnRate,
      sectorId:      s.id,
      estimatedFlow: s.estimatedFlow,
      marketSize:    s.marketSize,
    }));

  // ─── 커스텀 셀 (클로저 — containerRef·setTooltip에 접근) ─────────────────────

  function SectorCell(props: {
    x?: number; y?: number; width?: number; height?: number; depth?: number;
    name?: string; returnRate?: number | null;
    sectorId?: string; estimatedFlow?: number | null; marketSize?: number | null;
  }) {
    const {
      x = 0, y = 0, width = 0, height = 0, depth = 1,
      name = '', returnRate = null,
      sectorId = '', estimatedFlow = null, marketSize = null,
    } = props;

    if (depth === 0 || width < 5 || height < 5) return null;

    const ticker = SECTOR_TICKER[sectorId] ?? sectorId.toUpperCase();
    const fill   = returnColor(returnRate);
    const cx     = x + width  / 2;
    const cy     = y + height / 2;

    // 동적 폰트 크기 — 셀 너비에 비례, 최소 8px 보장
    const labelFontSize = Math.max(8, Math.min(11, Math.floor(width / 6)));
    const rateFontSize  = Math.max(8, Math.min(10, Math.floor(width / 7)));

    // 두 줄 모두 세로로 쌓을 공간이 있으면 위아래로, 없으면 겹쳐서 중앙 부근에 렌더링
    const stackable = height >= labelFontSize + rateFontSize + 4;
    const labelY    = stackable ? cy - rateFontSize / 2 - 2 : cy - 1;
    const rateY     = stackable ? cy + labelFontSize / 2 + 2 : cy + rateFontSize + 2;

    const handleMouseEnter = (e: React.MouseEvent<SVGRectElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltip({
        x: e.clientX - rect.left + 14,
        y: e.clientY - rect.top  - 8,
        name, ticker, returnRate, marketSize, estimatedFlow,
      });
    };

    return (
      <g>
        <rect
          x={x + 1} y={y + 1}
          width={width - 2} height={height - 2}
          fill={fill} rx={5}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={() => setTooltip(null)}
          style={{ cursor: 'default' }}
        />

        {/* 섹터명 — 항상 렌더링, 동적 폰트 크기 (최소 8px) */}
        <text
          x={cx} y={labelY}
          textAnchor="middle" dominantBaseline="middle"
          fill="white" fontSize={labelFontSize} fontWeight={700}
          style={{ pointerEvents: 'none' }}
        >
          {name.split(' ')[0]}
        </text>

        {/* 수익률 — 항상 렌더링, 동적 폰트 크기 (최소 8px) */}
        <text
          x={cx} y={rateY}
          textAnchor="middle" dominantBaseline="middle"
          fill="rgba(255,255,255,0.85)" fontSize={rateFontSize}
          style={{ pointerEvents: 'none' }}
        >
          {returnRate !== null
            ? `${returnRate >= 0 ? '+' : ''}${returnRate.toFixed(2)}%`
            : 'N/A'}
        </text>
      </g>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <Treemap
          data={data}
          dataKey="size"
          content={(props: any) => <SectorCell {...props} />}
          isAnimationActive={false}
        />
      </ResponsiveContainer>

      {/* Hover 툴팁 */}
      {tooltip && (
        <div
          style={{ left: tooltip.x, top: tooltip.y, pointerEvents: 'none' }}
          className="absolute z-50 min-w-36 rounded-xl border border-border bg-white px-3.5 py-3 shadow-lg"
        >
          <p className="text-xs font-bold text-foreground">{tooltip.name}</p>
          <p className="mb-2 text-[10px] text-market-neutral">{tooltip.ticker}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-6 text-[11px]">
              <span className="text-market-neutral">수익률</span>
              <span className={`font-semibold ${
                tooltip.returnRate === null ? 'text-market-neutral' :
                tooltip.returnRate >= 0    ? 'text-bull' : 'text-bear'
              }`}>
                {tooltip.returnRate !== null
                  ? `${tooltip.returnRate >= 0 ? '+' : ''}${tooltip.returnRate.toFixed(2)}%`
                  : 'N/A'}
              </span>
            </div>
            {tooltip.marketSize !== null && (
              <div className="flex items-center justify-between gap-6 text-[11px]">
                <span className="text-market-neutral">AUM</span>
                <span className="font-semibold text-foreground">${tooltip.marketSize}B</span>
              </div>
            )}
            {tooltip.estimatedFlow !== null && (
              <div className="flex items-center justify-between gap-6 text-[11px]">
                <span className="text-market-neutral">추정 자금흐름</span>
                <span className={`font-semibold ${tooltip.estimatedFlow >= 0 ? 'text-bull' : 'text-bear'}`}>
                  {tooltip.estimatedFlow >= 0 ? '+' : ''}{tooltip.estimatedFlow.toFixed(2)}B
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
