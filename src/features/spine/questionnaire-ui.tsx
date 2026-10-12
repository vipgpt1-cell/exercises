import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cx } from '../../components/ui'

/** Big, touch-friendly single-choice list. */
export function ChoiceList<T extends string | number>({ value, options, onChange }: { value: T | null; options: { value: T; label: ReactNode; hint?: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="grid gap-2.5">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(o.value)}
            className={cx(
              'flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition',
              on ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-line bg-surface hover:border-line-strong',
            )}
          >
            <span className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2', on ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-line-strong')}>
              {on && <Check className="h-4 w-4" strokeWidth={3} />}
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-ink">{o.label}</span>
              {o.hint && <span className="block text-sm text-muted">{o.hint}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Yes / No toggle row. */
export function YesNo({ label, value, onChange, yes, no, danger }: { label: ReactNode; value: boolean | null; onChange: (v: boolean) => void; yes: string; no: string; danger?: boolean }) {
  return (
    <div className={cx('rounded-2xl border p-3.5', value && danger ? 'border-urgent/40 bg-urgent-soft' : 'border-line bg-surface')}>
      <div className="text-[0.95rem] font-medium leading-snug text-ink">{label}</div>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={cx(
              'h-11 rounded-xl border-2 text-sm font-bold transition',
              value === v ? (v && danger ? 'border-urgent bg-urgent text-white' : 'border-[var(--accent)] bg-[var(--accent)] text-white dark:text-[#0b1020]') : 'border-line bg-surface-2 text-ink-2',
            )}
          >
            {v ? yes : no}
          </button>
        ))}
      </div>
    </div>
  )
}

const NRS_COLORS = ['#16a34a', '#22c55e', '#65a30d', '#84cc16', '#ca8a04', '#eab308', '#f59e0b', '#f97316', '#ea580c', '#dc2626', '#b91c1c']

/** 0–10 Numeric Rating Scale with big tappable numbers. */
export function NrsScale({ value, onChange, low, high }: { value: number | null; onChange: (v: number) => void; low: string; high: string }) {
  return (
    <div>
      <div className="grid grid-cols-11 gap-1">
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            aria-pressed={value === i}
            className={cx('h-12 rounded-lg text-sm font-bold tabular transition', value === i ? 'scale-110 text-white shadow' : 'bg-surface-2 text-ink-2')}
            style={value === i ? { background: NRS_COLORS[i] } : { boxShadow: `inset 0 -3px 0 ${NRS_COLORS[i]}` }}
          >
            {i}
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-muted">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  )
}
