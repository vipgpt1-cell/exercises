import { Delete } from 'lucide-react'
import { useKey } from '../lib/hooks'
import { useStrings } from '../lib/i18n'
import { common } from '../i18n/common'
import { cx } from './ui'

/** Large on-screen number pad (also accepts the keyboard). */
export function Keypad({
  digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0],
  value,
  maxLength,
  onChange,
  onSubmit,
  submitLabel,
  disabled,
}: {
  digits?: number[]
  value: number[]
  maxLength: number
  onChange: (v: number[]) => void
  onSubmit?: () => void
  submitLabel?: string
  disabled?: boolean
}) {
  const t = useStrings(common)
  const add = (d: number) => {
    if (disabled || value.length >= maxLength) return
    onChange([...value, d])
  }
  const del = () => !disabled && onChange(value.slice(0, -1))
  useKey(
    ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Backspace', 'Enter', 'NumpadEnter'],
    (e) => {
      if (e.key === 'Backspace') del()
      else if (e.key === 'Enter' || e.code === 'NumpadEnter') {
        if (onSubmit && value.length === maxLength) onSubmit()
      } else {
        const d = Number(e.key)
        if (digits.includes(d)) add(d)
      }
    },
    !disabled,
  )
  const ordered = [...digits.filter((d) => d !== 0).sort((a, b) => a - b), ...(digits.includes(0) ? [0] : [])]
  const cols = ordered.length === 9 ? 3 : 3
  return (
    <div className="mx-auto w-full max-w-xs">
      <div className={cx('grid gap-2.5', cols === 3 && 'grid-cols-3')}>
        {ordered.map((d, i) => (
          <button
            key={d}
            type="button"
            disabled={disabled || value.length >= maxLength}
            onClick={() => add(d)}
            className={cx(
              'h-16 rounded-2xl border border-line bg-surface text-2xl font-bold text-ink shadow-sm transition active:scale-95 active:bg-surface-2 disabled:opacity-40',
              ordered.length === 10 && i === 9 && 'col-start-2',
            )}
          >
            {d}
          </button>
        ))}
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={del}
          disabled={disabled || value.length === 0}
          aria-label={t.btn.delete}
          className="flex h-14 items-center justify-center rounded-2xl bg-surface-2 text-ink-2 transition active:scale-95 disabled:opacity-40"
        >
          <Delete className="h-6 w-6" />
        </button>
        {onSubmit && (
          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled || value.length !== maxLength}
            className="col-span-2 h-14 rounded-2xl bg-[var(--accent)] text-lg font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-40 dark:text-[#0b1020]"
          >
            {submitLabel ?? 'OK'}
          </button>
        )}
      </div>
    </div>
  )
}

/** Boxes showing typed digits. */
export function DigitSlots({ value, length, state }: { value: number[]; length: number; state?: 'ok' | 'bad' | null }) {
  const small = length > 5
  return (
    <div className={cx('flex flex-wrap justify-center', small ? 'gap-1.5' : 'gap-2.5')}>
      {Array.from({ length }, (_, i) => (
        <div
          key={i}
          className={cx(
            'flex items-center justify-center rounded-2xl border-2 font-black tabular transition',
            small ? 'h-13 w-10 text-2xl' : 'h-16 w-14 text-3xl',
            value[i] !== undefined ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-ink' : 'border-dashed border-line-strong text-muted',
            state === 'ok' && 'border-great bg-great-soft',
            state === 'bad' && 'border-urgent bg-urgent-soft',
          )}
        >
          {value[i] ?? ''}
        </div>
      ))}
    </div>
  )
}
