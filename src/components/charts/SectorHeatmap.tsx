'use client';

import { Treemap, ResponsiveContainer } from 'recharts';
import type { SectorData } from '@/src/types/market';

// ─── Color helpers (라이트 테마 — 채도 낮춘 파스텔) ──────────────────────────────

function returnColor(rate: number): string {
  if (rate >= 3)    return '#16A34A'; // green-700  — strong up
  if (rate >= 1.5)  return '#22C55E'; // green-500  — up
  if (rate >= 0.5)  return '#4ADE80'; // green-400  — slight up
  if (rate >= -0.5) return '#94A3B8'; // slate-400  — near-flat
  if (rate >= -1.5) return '#F87171'; // red-400    — slight down
  return '#EF4444';                   // red-500    — down
}

// text 대비: 짙은 셀(≥1.5, ≤-1.5)은 white 유지, 중간 셀(green-400/slate-400)도 white bold로 충분히 가독
function textColor(_rate: number): string {
  return 'white';
}

// ─── Custom treemap cell ──────────────────────────────────────────────────────

function SectorCell(props: {
  x?: number; y?: number; width?: number; height?: number;
  name?: string; returnRate?: number; depth?: number;
}) {
  const { x = 0, y = 0, width = 0, height = 0, name = '', returnRate = 0, depth = 1 } = props;

  if (depth === 0 || width < 5 || height < 5) return null;

  const fill = returnColor(returnRate);
  const textFill = textColor(returnRate);
  const showLabel = width > 52 && height > 26;
  const showRate  = width > 56 && height > 44;
  const labelY    = y + height / 2 + (showRate ? -7 : 4);

  return (
    <g>
      <rect x={x + 1} y={y + 1} width={width - 2} height={height - 2} fill={fill} rx={5} />
      {showLabel && (
        <text
          x={x + width / 2}
          y={labelY}
          textAnchor="middle"
          fill={textFill}
          fontSize={11}
          fontWeight={700}
          style={{ pointerEvents: 'none' }}
        >
          {name.split(' ')[0]}
        </text>
      )}
      {showRate && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 10}
          textAnchor="middle"
          fill={`${textFill}CC`}
          fontSize={10}
          style={{ pointerEvents: 'none' }}
        >
          {returnRate >= 0 ? '+' : ''}{returnRate.toFixed(2)}%
        </text>
      )}
    </g>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SectorHeatmapProps {
  sectors: SectorData[];
}

export default function SectorHeatmap({ sectors }: SectorHeatmapProps) {
  const data = sectors.map(s => ({
    name: s.name,
    size: s.marketSize ?? 100_000,
    returnRate: s.returnRate ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <Treemap
        data={data}
        dataKey="size"
        content={(props: any) => <SectorCell {...props} />}
        isAnimationActive={false}
      />
    </ResponsiveContainer>
  );
}
