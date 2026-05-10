'use client';

import { useEffect, useRef, useId } from 'react';
import { useSpring } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GaugeSegment {
  startDoc: number;   // −90 = left end, +90 = right end
  endDoc:   number;
  color:    string;
  label?:   string;
}

export interface PastValue {
  label:    string;   // "1주 전", "1개월 전", "1년 전"
  value:    string;   // display text, e.g. "71"
  bullish?: boolean;  // true → green, false → red, undefined → neutral
}

interface GaugeChartProps {
  segments:    GaugeSegment[];
  normalized:  number;          // 0 = left/min, 1 = right/max
  score?:      string;          // large centre text (omit to hide)
  status?:     string;          // subtitle below score
  pastValues?: PastValue[];     // historical row (1주·1개월·1년 전)
  size?:       number;          // rendered px width (default 280)
  leftLabel?:  string;          // curved label at the left arc end
  rightLabel?: string;          // curved label at the right arc end
}

// ─── Segment presets ─────────────────────────────────────────────────────────

export const LIQUIDITY_SEGMENTS: GaugeSegment[] = [
  { startDoc: -90, endDoc: -30, color: '#EA3943', label: 'Tight'   },
  { startDoc: -30, endDoc:  30, color: '#F59E0B', label: 'Neutral' },
  { startDoc:  30, endDoc:  90, color: '#16C784', label: 'Ease'    },
];

export const SENTIMENT_SEGMENTS: GaugeSegment[] = [
  { startDoc: -90, endDoc: -45, color: '#B71C1C', label: 'Wait'  },
  { startDoc: -45, endDoc: -15, color: '#EA3943', label: 'Cash'  },
  { startDoc: -15, endDoc:  15, color: '#F59E0B', label: 'DCA'   },
  { startDoc:  15, endDoc:  45, color: '#4ADE80', label: 'Buy'   },
  { startDoc:  45, endDoc:  90, color: '#16C784', label: 'Agrsv' },
];

export const RATIONAL_EMOTIONAL_SEGMENTS: GaugeSegment[] = [
  { startDoc: -90, endDoc: -36, color: '#1D4ED8', label: '극이성' },
  { startDoc: -36, endDoc:  -9, color: '#60A5FA', label: '이성'   },
  { startDoc:  -9, endDoc:   9, color: '#F59E0B', label: '중립'   },
  { startDoc:   9, endDoc:  36, color: '#F97316', label: '감성'   },
  { startDoc:  36, endDoc:  90, color: '#EA3943', label: '극감성' },
];

// ─── Canvas renderer ──────────────────────────────────────────────────────────

const GAP_DEG = 2.8;

// doc-angle (−90..+90) → canvas arc angle
// −90 → π (9 o'clock / left), 0 → 3π/2 (12 o'clock / top), +90 → 2π (3 o'clock / right)
function d2a(docDeg: number): number {
  return Math.PI + (docDeg + 90) / 180 * Math.PI;
}

function segmentColorAt(segments: GaugeSegment[], n: number): string {
  const doc = n * 180 - 90;
  return (
    segments.find(s => doc >= s.startDoc && doc <= s.endDoc)?.color ??
    segments[Math.floor(segments.length / 2)].color
  );
}

function drawGauge(
  canvas: HTMLCanvasElement,
  segments: GaugeSegment[],
  n: number,          // clamped 0–1
): void {
  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.clientWidth;
  const H   = canvas.clientHeight;
  if (W === 0 || H === 0) return;

  canvas.width  = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  // ── Layout ────────────────────────────────────────────────────────────────
  // Pivot sits at the bottom-centre. The semi-circle arcs over the top.
  const cx  = W / 2;
  const cy  = H;                          // pivot at the canvas bottom edge
  const R   = Math.min(cx - 4, H - 4);   // outer radius (fills canvas)
  const TW  = R * 0.28;                   // track stroke width
  const TR  = R - TW / 2;                // radius at track centreline

  const arcStart = Math.PI;              // left  (docDeg = −90)
  const arcEnd   = 2 * Math.PI;         // right (docDeg = +90)

  // ── 1. Gray background rail ───────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(cx, cy, TR, arcStart, arcEnd, false);
  ctx.strokeStyle = '#D1D5DB';
  ctx.lineWidth   = TW;
  ctx.lineCap     = 'butt';
  ctx.stroke();

  // ── 2. Coloured segments (butt caps; gaps reveal the rail beneath) ─────
  segments.forEach((seg, i) => {
    const isFirst = i === 0;
    const isLast  = i === segments.length - 1;
    const a1 = d2a(isFirst ? seg.startDoc           : seg.startDoc + GAP_DEG / 2);
    const a2 = d2a(isLast  ? seg.endDoc             : seg.endDoc   - GAP_DEG / 2);

    ctx.beginPath();
    ctx.arc(cx, cy, TR, a1, a2, false);
    ctx.strokeStyle = seg.color;
    ctx.lineWidth   = TW;
    ctx.lineCap     = 'butt';
    ctx.stroke();
  });

  // ── 3. Semicircular end-caps (visible upper-half only, cy = H) ────────
  // The circle centres sit at y = cy = H; the lower half is clipped by the
  // canvas edge, leaving a natural rounded tip at each outer extreme.
  if (segments.length > 0) {
    const cr = TW / 2 + 0.5;

    const lx = cx + TR * Math.cos(arcStart);
    const ly = cy + TR * Math.sin(arcStart);
    ctx.beginPath();
    ctx.arc(lx, ly, cr, 0, 2 * Math.PI);
    ctx.fillStyle = segments[0].color;
    ctx.fill();

    const rx = cx + TR * Math.cos(arcEnd);
    const ry = cy + TR * Math.sin(arcEnd);
    ctx.beginPath();
    ctx.arc(rx, ry, cr, 0, 2 * Math.PI);
    ctx.fillStyle = segments[segments.length - 1].color;
    ctx.fill();
  }

  // ── 4. Needle (tapered triangle with drop shadow) ─────────────────────
  const needleAngle = arcStart + n * Math.PI;   // π → 2π
  const tipLen      = TR - 2;
  const stubLen     = TR * 0.13;
  const halfW       = Math.max(1.8, TR * 0.028);
  const perp        = needleAngle + Math.PI / 2;

  const tipX  = cx + tipLen  * Math.cos(needleAngle);
  const tipY  = cy + tipLen  * Math.sin(needleAngle);
  const baseX = cx - stubLen * Math.cos(needleAngle);
  const baseY = cy - stubLen * Math.sin(needleAngle);

  ctx.save();
  ctx.shadowColor   = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur    = 8;
  ctx.shadowOffsetY = 3;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(baseX + halfW * Math.cos(perp), baseY + halfW * Math.sin(perp));
  ctx.lineTo(baseX - halfW * Math.cos(perp), baseY - halfW * Math.sin(perp));
  ctx.closePath();
  ctx.fillStyle = '#111827';
  ctx.fill();
  ctx.restore();

  // ── 5. Pivot circle ───────────────────────────────────────────────────
  const pivR = Math.max(4, TW * 0.24);

  ctx.beginPath();
  ctx.arc(cx, cy, pivR, 0, 2 * Math.PI);
  ctx.fillStyle = '#111827';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, pivR * 0.42, 0, 2 * Math.PI);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
}

// ─── GaugeChart ───────────────────────────────────────────────────────────────

export default function GaugeChart({
  segments,
  normalized,
  score,
  status,
  pastValues,
  size = 280,
  leftLabel,
  rightLabel,
}: GaugeChartProps) {
  const n          = Math.max(0, Math.min(1, normalized));
  const canvasRef  = useRef<HTMLCanvasElement>(null);

  // Spring-animated needle position
  const springNorm = useSpring(n, { stiffness: 60, damping: 18, mass: 0.6 });

  // Drive spring toward new target whenever normalized changes
  useEffect(() => { springNorm.set(n); }, [n, springNorm]);

  // Subscribe to spring — redraw canvas on every animated frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = (v: number) => drawGauge(canvas, segments, v);
    draw(springNorm.get());                   // paint immediately on mount / segments change
    return springNorm.on('change', draw);     // animate thereafter
  }, [segments, springNorm]);

  // ResizeObserver — handle initial layout pass and container width changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() =>
      drawGauge(canvas, segments, springNorm.get()),
    );
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [segments, springNorm]);

  const canvasH    = Math.round(size * 0.52);
  const scoreColor = segmentColorAt(segments, n);
  const px         = (r: number) => Math.round(size * r);

  // Curved end-label geometry — all values derived from size so nothing is hard-coded
  const uid   = useId().replace(/:/g, '');
  const cx    = size / 2;
  const Rv    = Math.min(cx - 4, canvasH - 4);      // matches drawGauge's R
  const TWv   = Rv * 0.28;                           // matches drawGauge's TW
  const tR    = Rv + Math.max(4, Math.round(TWv * 0.2)); // just outside the track outer edge
  const SPAN  = 50 * Math.PI / 180;                 // arc span for each label
  const lfs   = Math.max(9, Math.round(size * 0.055)); // label font size

  // Arc endpoints (canvas angle: π = left end, 2π = right end)
  const lEndX = cx  + tR * Math.cos(Math.PI + SPAN);
  const lEndY = canvasH + tR * Math.sin(Math.PI + SPAN);
  const rStaX = cx  + tR * Math.cos(2 * Math.PI - SPAN);
  const rStaY = canvasH + tR * Math.sin(2 * Math.PI - SPAN);

  return (
    <div style={{ width: size, fontFamily: 'inherit', userSelect: 'none' }}>

      {/* ── Canvas gauge + SVG label overlay ── */}
      <div style={{ position: 'relative', width: size, height: canvasH }}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: size, height: canvasH }}
          aria-label={`게이지: ${score}`}
        />
        {(leftLabel || rightLabel) && (
          <svg
            style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }}
            width={size}
            height={canvasH}
            aria-hidden="true"
          >
            <defs>
              {leftLabel && (
                <path
                  id={`${uid}gl`}
                  d={`M ${cx - tR} ${canvasH} A ${tR} ${tR} 0 0 1 ${lEndX} ${lEndY}`}
                  fill="none"
                />
              )}
              {rightLabel && (
                <path
                  id={`${uid}gr`}
                  d={`M ${rStaX} ${rStaY} A ${tR} ${tR} 0 0 1 ${cx + tR} ${canvasH}`}
                  fill="none"
                />
              )}
            </defs>
            {leftLabel && (
              <text fill="#9CA3AF" fontSize={lfs} fontWeight={500} fontFamily="inherit">
                <textPath href={`#${uid}gl`} textAnchor="middle" startOffset="50%">
                  {leftLabel}
                </textPath>
              </text>
            )}
            {rightLabel && (
              <text fill="#9CA3AF" fontSize={lfs} fontWeight={500} fontFamily="inherit">
                <textPath href={`#${uid}gr`} textAnchor="middle" startOffset="50%">
                  {rightLabel}
                </textPath>
              </text>
            )}
          </svg>
        )}
      </div>

      {/* ── Score + status ── */}
      <div style={{ textAlign: 'center', marginTop: -2 }}>
        {score && (
          <span
            style={{
              display: 'block',
              fontSize: px(0.118),
              fontWeight: 800,
              color: scoreColor,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
            }}
          >
            {score}
          </span>
        )}

        {status && (
          <span
            style={{
              display: 'block',
              fontSize: px(0.05),
              fontWeight: 600,
              color: scoreColor,
              opacity: 0.82,
              marginTop: 3,
              letterSpacing: '0.01em',
            }}
          >
            {status}
          </span>
        )}
      </div>

      {/* ── Past values row ── */}
      {pastValues && pastValues.length > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            marginTop: px(0.045),
            paddingTop: px(0.032),
            borderTop: '1px solid #E5E7EB',
          }}
        >
          {pastValues.map((pv) => (
            <div key={pv.label} style={{ textAlign: 'center' }}>
              <span
                style={{
                  display: 'block',
                  fontSize: px(0.038),
                  color: '#8B95A1',
                  marginBottom: 2,
                }}
              >
                {pv.label}
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: px(0.058),
                  fontWeight: 700,
                  color:
                    pv.bullish === true  ? '#16A34A' :
                    pv.bullish === false ? '#DC2626' :
                                           '#374151',
                }}
              >
                {pv.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
