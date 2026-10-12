import { useState, type ReactNode } from 'react'
import type { Level } from '../lib/store'
import { useElementSize } from '../lib/hooks'
import { niceMax } from '../lib/analytics'
import { LEVEL_STYLE, cx } from './ui'

/* ------------------------------------------------------------------ */
/* Stacked columns: exercise minutes per day / week, split by section  */
/* ------------------------------------------------------------------ */

export interface Series<K extends string> {
  key: K
  label: string
  color: string
}

export interface Column<K extends string> {
  label: string
  /** Full label for the tooltip and the table (e.g. a full date). */
  title: string
  values: Record<K, number>
  total: number
  extra?: string
}

/** Path for a column segment with rounded top corners and a square base. */
function topRounded(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, h, w / 2))
  return `M${x},${y + h}L${x},${y + rr}Q${x},${y} ${x + rr},${y}L${x + w - rr},${y}Q${x + w},${y} ${x + w},${y + rr}L${x + w},${y + h}Z`
}

export function StackedColumns<K extends string>({
  columns,
  series,
  unit,
  format = (v) => String(Math.round(v)),
  height = 168,
}: {
  columns: Column<K>[]
  series: Series<K>[]
  unit: string
  format?: (v: number) => string
  height?: number
}) {
  const [ref, { width }] = useElementSize<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const pad = { l: 34, r: 6, t: 10, b: 24 }
  const w = Math.max(240, width)
  const n = Math.max(1, columns.length)
  const max = niceMax(Math.max(...columns.map((c) => c.total), 0))
  const plotW = w - pad.l - pad.r
  const plotH = height - pad.t - pad.b
  const band = plotW / n
  const bw = Math.min(24, Math.max(3, band * 0.64))
  const X = (i: number) => pad.l + band * i + (band - bw) / 2
  const Y = (v: number) => pad.t + plotH - (v / max) * plotH
  const step = Math.max(1, Math.ceil(46 / band))
  const showLabel = (i: number) => (n - 1 - i) % step === 0
  const ticks = [0, max / 2, max]
  const h = hover !== null ? columns[hover] : null
  const tipLeft = hover !== null ? Math.min(Math.max(X(hover) + bw / 2, 84), w - 84) : 0

  return (
    <div ref={ref} className="relative w-full select-none">
      {width > 0 && (
        <svg width={w} height={height} className="block" role="img" onPointerLeave={() => setHover(null)}>
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={pad.l} x2={w - pad.r} y1={Y(t)} y2={Y(t)} stroke="var(--border)" strokeWidth={1} />
              <text x={pad.l - 6} y={Y(t)} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="var(--muted)" className="tabular">
                {format(t)}
              </text>
            </g>
          ))}
          {columns.map((c, i) => {
            let base = Y(0)
            const segs: ReactNode[] = []
            const present = series.filter((s) => c.values[s.key] > 0)
            present.forEach((s, j) => {
              const hgt = (c.values[s.key] / max) * plotH
              const gap = j > 0 ? 2 : 0
              const top = base - hgt
              const segH = Math.max(0, hgt - gap)
              const isTop = j === present.length - 1
              segs.push(
                isTop ? (
                  <path key={s.key} d={topRounded(X(i), top, bw, segH, 4)} fill={s.color} />
                ) : (
                  <rect key={s.key} x={X(i)} y={top} width={bw} height={segH} fill={s.color} />
                ),
              )
              base = top
            })
            return (
              <g key={i} opacity={hover !== null && hover !== i ? 0.45 : 1}>
                {segs}
              </g>
            )
          })}
          {columns.map((c, i) =>
            showLabel(i) ? (
              <text key={i} x={X(i) + bw / 2} y={height - 7} textAnchor="middle" fontSize="10.5" fill="var(--muted)">
                {c.label}
              </text>
            ) : null,
          )}
          {columns.map((c, i) => (
            <rect
              key={i}
              x={pad.l + band * i}
              y={pad.t}
              width={band}
              height={plotH}
              fill="transparent"
              tabIndex={0}
              role="img"
              aria-label={`${c.title}: ${format(c.total)} ${unit}${c.extra ? ', ' + c.extra : ''}`}
              onPointerEnter={() => setHover(i)}
              onPointerMove={() => setHover(i)}
              onPointerDown={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="cursor-default outline-none"
            />
          ))}
        </svg>
      )}
      {h && (
        <div
          className="pointer-events-none absolute top-0 z-10 w-[168px] -translate-x-1/2 -translate-y-[calc(100%+4px)] rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-float"
          style={{ left: tipLeft }}
        >
          <div className="font-semibold text-ink-2">{h.title}</div>
          {series
            .filter((s) => h.values[s.key] > 0)
            .map((s) => (
              <div key={s.key} className="mt-1 flex items-center gap-2">
                <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: s.color }} />
                <span className="tabular font-bold text-ink">{format(h.values[s.key])}</span>
                <span className="truncate text-muted">{s.label}</span>
              </div>
            ))}
          <div className="mt-1.5 border-t border-line pt-1.5 text-muted">
            <span className="tabular font-bold text-ink">{format(h.total)}</span> {unit}
            {h.extra && <span className="block">{h.extra}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

export function Legend<K extends string>({ series, shape = 'rect' }: { series: Series<K>[]; shape?: 'rect' | 'line' }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-2">
      {series.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <span className={cx('shrink-0', shape === 'rect' ? 'h-2.5 w-2.5 rounded-[3px]' : 'h-0.5 w-3 rounded-full')} style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Status meter: how many tests of a section sit at each level         */
/* ------------------------------------------------------------------ */

export function StatusMeter({
  parts,
  empty,
  emptyLabel,
}: {
  parts: { level: Level; count: number; label: string }[]
  empty: number
  emptyLabel: string
}) {
  const total = parts.reduce((a, p) => a + p.count, 0) + empty
  const segs = [...parts.filter((p) => p.count > 0).map((p) => ({ key: p.level as string, count: p.count, label: p.label, cls: LEVEL_STYLE[p.level].solid })), ...(empty > 0 ? [{ key: 'empty', count: empty, label: emptyLabel, cls: 'bg-surface-3' }] : [])]
  return (
    <div>
      <div className="flex h-2.5 w-full gap-[2px]" role="img" aria-label={segs.map((s) => `${s.label}: ${s.count}`).join(', ')}>
        {segs.map((s, i) => (
          <div
            key={s.key}
            title={`${s.label}: ${s.count}`}
            className={cx('h-full', s.cls, i === 0 && 'rounded-l-full', i === segs.length - 1 && 'rounded-r-full')}
            style={{ width: `${(s.count / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-ink-2">
        {segs.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className={cx('h-2 w-2 rounded-full', s.cls)} />
            {s.label} <span className="tabular font-semibold text-ink">{s.count}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Sparkline with a nearest-point readout                              */
/* ------------------------------------------------------------------ */

export function Sparkline({
  values,
  color,
  height = 52,
  onHover,
}: {
  values: number[]
  color: string
  height?: number
  onHover?: (index: number | null) => void
}) {
  const [ref, { width }] = useElementSize<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const w = Math.max(80, width)
  const pad = 6
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const span = hi - lo || 1
  const n = values.length
  const X = (i: number) => pad + (n === 1 ? (w - 2 * pad) / 2 : (i / (n - 1)) * (w - 2 * pad))
  const Y = (v: number) => pad + (1 - (v - lo) / span) * (height - 2 * pad)
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('')
  const area = `${line}L${X(n - 1).toFixed(1)},${height}L${X(0).toFixed(1)},${height}Z`
  const pick = (clientX: number, el: SVGSVGElement) => {
    const r = el.getBoundingClientRect()
    const x = clientX - r.left
    const i = Math.max(0, Math.min(n - 1, Math.round(((x - pad) / (w - 2 * pad)) * (n - 1))))
    setHover(i)
    onHover?.(i)
  }
  const active = hover ?? n - 1
  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg
          width={w}
          height={height}
          className="block touch-pan-y"
          onPointerMove={(e) => pick(e.clientX, e.currentTarget)}
          onPointerDown={(e) => pick(e.clientX, e.currentTarget)}
          onPointerLeave={() => {
            setHover(null)
            onHover?.(null)
          }}
        >
          <path d={area} fill={color} opacity={0.1} />
          <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {hover !== null && <line x1={X(hover)} x2={X(hover)} y1={0} y2={height} stroke="var(--border-strong)" strokeWidth={1} />}
          <circle cx={X(active)} cy={Y(values[active])} r={4} fill={color} stroke="var(--surface)" strokeWidth={2} />
        </svg>
      )}
    </div>
  )
}
