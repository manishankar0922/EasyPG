'use client';

import { useMemo, useRef, useState } from 'react';
import { formatCompactCurrency, formatCurrency, formatPercent } from '@/lib/format';

/* ---------------------------------------------------------------------------
 * Dependency-free SVG charts, built to the dataviz method:
 *  - thin 2px marks, rounded data-ends, recessive hairline grid
 *  - single accent (#2a78d6); text stays in neutral ink, color carries data
 *  - hover layer by default (crosshair + tooltip on the trend, per-bar on bars)
 * ------------------------------------------------------------------------- */

const ACCENT = '#2a78d6';
const GRID = '#eef0f3';
const AXIS_INK = '#94a3b8';

// ── Revenue trend (area + line, single series) ─────────────────────────────

export type TrendPoint = { label: string; value: number };

export function AreaTrendChart({ data, ariaLabel }: { data: TrendPoint[]; ariaLabel?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const W = 760;
  const H = 240;
  const padL = 46;
  const padR = 14;
  const padT = 16;
  const padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const { points, ticks } = useMemo(() => {
    const values = data.map((d) => d.value);
    const rawMax = Math.max(1, ...values);
    // round the axis max up to a "nice" number so ticks read cleanly
    const mag = Math.pow(10, Math.floor(Math.log10(rawMax)));
    const niceMax = Math.ceil(rawMax / mag) * mag;
    const n = data.length;
    const x = (i: number) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const y = (v: number) => padT + plotH - (v / niceMax) * plotH;
    const pts = data.map((d, i) => ({ ...d, x: x(i), y: y(d.value), i }));
    const tk = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ v: niceMax * f, y: padT + plotH - f * plotH }));
    return { points: pts, ticks: tk };
  }, [data]);

  if (!data.length) return null;

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath =
    `M${points[0].x.toFixed(1)},${(padT + plotH).toFixed(1)} ` +
    points.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
    ` L${points[points.length - 1].x.toFixed(1)},${(padT + plotH).toFixed(1)} Z`;

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = 0;
    let best = Infinity;
    points.forEach((p) => {
      const d = Math.abs(p.x - relX);
      if (d < best) {
        best = d;
        nearest = p.i;
      }
    });
    setHover(nearest);
  }

  const hp = hover !== null ? points[hover] : null;

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        style={{ height: 'auto' }}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={ariaLabel ?? 'Revenue trend over the last 12 months'}
      >
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="0.18" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* gridlines + y ticks */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} y1={t.y} x2={W - padR} y2={t.y} stroke={GRID} strokeWidth={1} />
            <text x={padL - 8} y={t.y + 3} textAnchor="end" fontSize={10} fill={AXIS_INK} className="tabular-nums">
              {formatCompactCurrency(t.v)}
            </text>
          </g>
        ))}

        {/* x labels (every other to avoid crowding) */}
        {points.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={H - 8}
            textAnchor="middle"
            fontSize={10}
            fill={AXIS_INK}
            opacity={i % 2 === 0 ? 1 : 0}
          >
            {p.label}
          </text>
        ))}

        <path d={areaPath} fill="url(#revFill)" />
        <path d={linePath} fill="none" stroke={ACCENT} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* hover crosshair */}
        {hp && (
          <>
            <line x1={hp.x} y1={padT} x2={hp.x} y2={padT + plotH} stroke={ACCENT} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
            <circle cx={hp.x} cy={hp.y} r={5} fill="#fff" stroke={ACCENT} strokeWidth={2.5} />
          </>
        )}
      </svg>

      {/* tooltip (HTML overlay) */}
      {hp && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-center shadow-lg"
          style={{ left: `${(hp.x / W) * 100}%`, top: 0 }}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{hp.label}</div>
          <div className="text-sm font-bold tabular-nums text-slate-900">{formatCurrency(hp.value)}</div>
        </div>
      )}
    </div>
  );
}

// ── Branch occupancy (horizontal magnitude bars) ───────────────────────────

export type BarDatum = { label: string; value: number; caption?: string };

export function BarCompare({ data, unit = '%' }: { data: BarDatum[]; unit?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  // percentages are anchored to the true 0–100 scale; a 60%-full branch must
  // never render as a full bar just because it happens to be the max
  const max = unit === '%' ? 100 : Math.max(1, ...data.map((d) => d.value));

  if (!data.length) return null;

  return (
    <div className="space-y-3.5">
      {data.map((d, i) => {
        const pct = Math.min(100, (d.value / max) * 100);
        const active = hover === i;
        return (
          <div
            key={i}
            className="group"
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
          >
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-medium text-slate-700">{d.label}</span>
              <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">
                {unit === '%' ? formatPercent(d.value) : d.value}
                {d.caption && <span className="ml-1 text-xs font-medium text-slate-400">{d.caption}</span>}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-[width,opacity] duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: ACCENT,
                  opacity: active ? 1 : 0.85,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Collection-rate gauge (status donut) ───────────────────────────────────

export function GaugeDonut({
  percent,
  label,
}: {
  percent: number;
  label: string;
}) {
  const p = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  const size = 176;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (p / 100) * c;

  // status color + word, so meaning never rides on color alone
  const status =
    p >= 80 ? { color: '#0ca30c', word: 'Healthy' } : p >= 50 ? { color: '#eda100', word: 'Watch' } : { color: '#d03b3b', word: 'Low' };

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef0f3" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={status.color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            style={{ transition: 'stroke-dasharray 700ms ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[32px] font-bold leading-none tracking-tight text-slate-900 tabular-nums">
            {formatPercent(p)}
          </span>
          <span className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        </div>
      </div>
      <span
        className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-slate-700"
        style={{ backgroundColor: `${status.color}14` }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: status.color }} />
        {status.word}
      </span>
    </div>
  );
}
