'use client';

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { SectorData } from '@/src/types/market';

// ─── Toss Light Theme palette ─────────────────────────────────────────────────

const BULL_COLOR  = '#16C784';
const BEAR_COLOR  = '#EA3943';
const GRID_COLOR  = '#E5E8EB';
const TICK_COLOR  = '#4E5968';
const ZERO_LINE   = '#CBD5E1';

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function FlowTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const flow: number = payload[0].value;
  const rate: number = payload[0].payload.returnRate;
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2.5 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-foreground">{label}</p>
      <p className={`font-bold ${flow >= 0 ? 'text-bull' : 'text-bear'}`}>
        자금흐름&ensp;{flow >= 0 ? '+' : ''}${(flow / 1_000).toFixed(2)}B
      </p>
      <p className={`mt-0.5 ${rate >= 0 ? 'text-bull' : 'text-bear'}`}>
        수익률&ensp;{rate >= 0 ? '+' : ''}{rate.toFixed(2)}%
      </p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SectorFlowBarChartProps {
  sectors: SectorData[];
}

export default function SectorFlowBarChart({ sectors }: SectorFlowBarChartProps) {
  const data = [...sectors]
    .sort((a, b) => (b.estimatedFlow ?? 0) - (a.estimatedFlow ?? 0))
    .map(s => ({ name: s.name, flow: s.estimatedFlow ?? 0, returnRate: s.returnRate ?? 0 }));

  const maxAbs = Math.max(...data.map(d => Math.abs(d.flow)), 1);
  const domainPad = maxAbs * 1.15;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 12, bottom: 4, left: 4 }}
      >
        <CartesianGrid horizontal={false} stroke={GRID_COLOR} strokeDasharray="3 3" />

        <XAxis
          type="number"
          tickFormatter={v => `$${(v / 1_000).toFixed(0)}B`}
          tick={{ fill: TICK_COLOR, fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          domain={[-domainPad, domainPad]}
        />

        <YAxis
          type="category"
          dataKey="name"
          width={100}
          tick={{ fill: TICK_COLOR, fontSize: 10 }}
          tickLine={false}
          axisLine={false}
        />

        <Tooltip content={<FlowTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />

        <ReferenceLine x={0} stroke={ZERO_LINE} strokeWidth={1.5} />

        <Bar dataKey="flow" radius={[0, 4, 4, 0]} maxBarSize={18}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.flow >= 0 ? BULL_COLOR : BEAR_COLOR}
              opacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
