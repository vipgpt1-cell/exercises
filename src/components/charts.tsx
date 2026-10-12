import { useMemo, useState, type ReactNode } from 'react'
import type { Level } from '../lib/store'
import { useElementSize } from '../lib/hooks'
import { LEVEL_STYLE, cx } from './ui'

/* ------------------------------------------------------------------ */
/* ScaleBar – where a value falls within reference bands               */
/* ------------------------------------------------------------------ */

export interface ScaleSegment {
  /** Upper bound of the segment (segments are contiguous from `min`). */
  to: number
  level: Level
  label?: string
}

export function ScaleBar({
  min,
  max,
  segments,
  value,
  valueLabel,
  format = (v) => String(v),
  reverse = false,
  caption,
}: {
  min: number
  max: number
  segments: ScaleSegment[]
  value: number | null
  valueLabel?: ReactNode
  format?: (v: number) => string
  /** Draw from max (left) to min (right), e.g. when lower numbers are worse. */
  reverse?: boolean
  caption?: ReactNode
}) {
  const span = max - min
  const pos = (v: number) => {
    const p = (Math.min(max, Math.max(min, v)) - min) / span
    return (reverse ? 1 - p : p) * 100
  }
  const segs = segments.map((s, i) => ({ ...s, from: i === 0 ? min : segments[i - 1].to }))
  const marker = value === null || !Number.isFinite(value) ? null : pos(value)
  // inner tick labels, skipping ones that would collide with the end labels
  const inner = segs.slice(0, -1).map((s) => s.to).filter((v) => { const q = pos(v); return q > 7 && q < 93 })
  return (
    <div className="w-full">
      <div className="relative pt-9">
        {marker !== null && (
          <div className="absolute top-0 -translate-x-1/2 transition-[left] duration-500" style={{ left: `${Math.min(97, Math.max(3, marker))}%` }}>
            <div className="rounded-lg bg-ink px-2 py-1 text-xs font-bold whitespace-nowrap text-bg shadow">{valueLabel ?? format(value!)}</div>
            <div className="mx-auto h-0 w-0 border-x-[6px] border-t-[6px] border-x-transparent border-t-ink" />
          </div>
        )}
        <div className="flex h-3 w-full overflow-hidden rounded-full">
          {(reverse ? [...segs].reverse() : segs).map((s, i) => (
            <div key={i} className={cx('h-full', LEVEL_STYLE[s.level].solid)} style={{ width: `${((s.to - s.from) / span) * 100}%`, opacity: 0.85 }} />
          ))}
        </div>
        {marker !== null && <div className="absolute top-[2.05rem] h-5 w-1.5 -translate-x-1/2 rounded-full border-2 border-surface bg-ink" style={{ left: `${marker}%` }} />}
      </div>
      <div className="relative mt-1.5 h-4 text-[0.7rem] text-muted tabular">
        <span className="absolute left-0">{format(reverse ? max : min)}</span>
        {inner.map((v) => (
          <span key={v} className="absolute -translate-x-1/2" style={{ left: `${pos(v)}%` }}>
            {format(v)}
          </span>
        ))}
        <span className="absolute right-0">{format(reverse ? min : max)}</span>
      </div>
      {segs.some((s) => s.label) && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {segs.map((s, i) =>
            s.label ? (
              <span key={i} className="inline-flex items-center gap-1.5 text-xs text-muted">
                <span className={cx('h-2.5 w-2.5 rounded-full', LEVEL_STYLE[s.level].solid)} />
                {s.label}
              </span>
            ) : null,
          )}
        </div>
      )}
      {caption && <div className="mt-2 text-xs text-muted">{caption}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Trend chart                                                         */
/* ------------------------------------------------------------------ */

export interface TrendPoint {
  x: number // timestamp ms
  y: number
  level?: Level
}

export function TrendChart({
  points,
  height = 180,
  format = (v) => v.toFixed(0),
  xLabel,
  invert = false,
  yDomain,
}: {
  points: TrendPoint[]
  height?: number
  format?: (v: number) => string
  xLabel: (x: number) => string
  /** Plot smaller values higher (e.g. dB HL). */
  invert?: boolean
  yDomain?: [number, number]
}) {
  const [ref, { width }] = useElementSize<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const pad = { l: 40, r: 12, t: 26, b: 26 }
  const w = Math.max(200, width)
  const sorted = useMemo(() => [...points].sort((a, b) => a.x - b.x), [points])
  if (!sorted.length) return <div ref={ref} />
  let lo = yDomain ? yDomain[0] : Math.min(...sorted.map((p) => p.y))
  let hi = yDomain ? yDomain[1] : Math.max(...sorted.map((p) => p.y))
  if (lo === hi) {
    lo -= 1
    hi += 1
  }
  const m = (hi - lo) * 0.12
  if (!yDomain) {
    lo -= m
    hi += m
  }
  const n = sorted.length
  const X = (i: number) => pad.l + (n === 1 ? (w - pad.l - pad.r) / 2 : (i / (n - 1)) * (w - pad.l - pad.r))
  const Y = (v: number) => {
    const p = (v - lo) / (hi - lo)
    return pad.t + (invert ? p : 1 - p) * (height - pad.t - pad.b)
  }
  const ticks = [0, 0.5, 1].map((f) => lo + f * (hi - lo))
  const path = sorted.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ')
  const labelIdx = n <= 6 ? sorted.map((_, i) => i) : [0, Math.floor((n - 1) / 2), n - 1]
  const active = hover ?? n - 1
  const pick = (clientX: number, el: SVGSVGElement) => {
    const x = clientX - el.getBoundingClientRect().left
    setHover(Math.max(0, Math.min(n - 1, Math.round(n === 1 ? 0 : ((x - pad.l) / (w - pad.l - pad.r)) * (n - 1)))))
  }
  const ax = Math.min(Math.max(X(active), 60), w - 60)
  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg
          width={w}
          height={height}
          className="block touch-pan-y"
          role="img"
          onPointerMove={(e) => pick(e.clientX, e.currentTarget)}
          onPointerDown={(e) => pick(e.clientX, e.currentTarget)}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={pad.l} x2={w - pad.r} y1={Y(t)} y2={Y(t)} stroke="var(--border)" strokeWidth={1} />
              <text x={pad.l - 6} y={Y(t)} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="var(--muted)" className="tabular">
                {format(t)}
              </text>
            </g>
          ))}
          {hover !== null && <line x1={X(hover)} x2={X(hover)} y1={pad.t} y2={height - pad.b} stroke="var(--border-strong)" strokeWidth={1} />}
          <path d={path} fill="none" stroke="var(--accent, var(--primary))" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {sorted.map((p, i) => (
            <circle
              key={i}
              cx={X(i)}
              cy={Y(p.y)}
              r={i === active ? 5.5 : 4}
              fill={p.level ? LEVEL_STYLE[p.level].hex : 'var(--accent, var(--primary))'}
              stroke="var(--surface)"
              strokeWidth={2}
            />
          ))}
          <text x={ax} y={12} textAnchor="middle" fontSize="11.5" fill="var(--text-2)">
            <tspan fontWeight="700" fill="var(--text)">
              {format(sorted[active].y)}
            </tspan>
            {'  ·  '}
            {xLabel(sorted[active].x)}
          </text>
          {labelIdx.map((i) => (
            <text key={i} x={X(i)} y={height - 6} textAnchor={n > 1 && i === 0 ? 'start' : n > 1 && i === n - 1 ? 'end' : 'middle'} fontSize="11" fill="var(--muted)">
              {xLabel(sorted[i].x)}
            </text>
          ))}
        </svg>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Simple horizontal comparison bars (e.g. left vs right hand)         */
/* ------------------------------------------------------------------ */

export function CompareBars({ rows, max, format }: { rows: { label: ReactNode; value: number; color?: string; note?: ReactNode }[]; max: number; format: (v: number) => string }) {
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="font-medium text-ink-2">{r.label}</span>
            <span className="tabular font-bold text-ink">{format(r.value)}</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(2, Math.min(100, (r.value / max) * 100))}%`, background: r.color ?? 'var(--accent)' }} />
          </div>
          {r.note && <div className="mt-1 text-xs text-muted">{r.note}</div>}
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Ring progress                                                       */
/* ------------------------------------------------------------------ */

export function Ring({ value, size = 120, stroke = 10, children, color = 'var(--accent)' }: { value: number; size?: number; stroke?: number; children?: ReactNode; color?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))}
          style={{ transition: 'stroke-dashoffset 0.25s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}
