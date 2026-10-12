import type { ReactNode } from 'react'
import { Check, X } from 'lucide-react'
import { ScaleBar } from '../../components/charts'
import { cx } from '../../components/ui'
import type { SpanTrial } from './norms'

/** Scale for "higher is better" span scores based on expected mean and SD. */
export function SpanScale({ value, exp, sd, min, max, label }: { value: number; exp: number; sd: number; min: number; max: number; label: ReactNode }) {
  return (
    <ScaleBar
      min={min}
      max={max}
      value={value}
      valueLabel={label}
      format={(v) => String(Math.round(v * 10) / 10)}
      segments={[
        { to: Math.max(min + 0.2, exp - 2 * sd), level: 'attention' },
        { to: Math.max(min + 0.4, exp - sd), level: 'borderline' },
        { to: Math.min(max - 0.2, exp + sd), level: 'normal' },
        { to: max, level: 'great' },
      ]}
    />
  )
}

export function SpanTrialList({ trials, format }: { trials: SpanTrial[]; format: (xs: number[]) => string }) {
  return (
    <ul className="divide-y divide-line text-sm">
      {trials.map((t, i) => (
        <li key={i} className="flex items-center gap-3 py-2">
          <span className="w-6 shrink-0 text-center text-xs font-bold text-muted">{t.length}</span>
          <span className="tabular min-w-0 flex-1 truncate font-mono text-ink-2">{format(t.target)}</span>
          <span className={cx('tabular min-w-0 flex-1 truncate font-mono', t.correct ? 'text-great' : 'text-urgent')}>{format(t.answer)}</span>
          <span className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full', t.correct ? 'bg-great-soft text-great' : 'bg-urgent-soft text-urgent')}>
            {t.correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Random sequence of distinct items avoiding obvious runs like 3‑4‑5 or 7‑6‑5. */
export function makeSequence(pool: number[], length: number, rng: () => number = Math.random): number[] {
  for (let attempt = 0; attempt < 60; attempt++) {
    const a = [...pool]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    const seq = a.slice(0, length)
    let ok = true
    for (let i = 0; i + 2 < seq.length; i++) {
      const d1 = seq[i + 1] - seq[i]
      const d2 = seq[i + 2] - seq[i + 1]
      if (d1 === d2 && Math.abs(d1) === 1) ok = false
    }
    if (ok) return seq
  }
  return pool.slice(0, length)
}
