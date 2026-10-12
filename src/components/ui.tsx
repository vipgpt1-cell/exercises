import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, Info, OctagonAlert, X } from 'lucide-react'
import type { Level } from '../lib/store'
import { useStrings } from '../lib/i18n'
import { common } from '../i18n/common'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'soft' | 'danger'
type Size = 'sm' | 'md' | 'lg' | 'xl'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-strong shadow-sm',
  accent: 'bg-[var(--accent)] text-white dark:text-[#0b1020] hover:brightness-110 shadow-sm',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-surface-2',
  ghost: 'text-ink-2 hover:bg-surface-2',
  soft: 'bg-[var(--accent-soft)] text-[var(--accent)] hover:brightness-95 dark:hover:brightness-125',
  danger: 'bg-urgent text-white hover:brightness-110',
}
const SIZE: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-4 text-[0.95rem] gap-2 rounded-xl',
  lg: 'h-13 px-6 text-base gap-2 rounded-2xl',
  xl: 'h-16 px-8 text-lg gap-2.5 rounded-2xl',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  block?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
}

export function Button({ variant = 'primary', size = 'md', block, icon, iconRight, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex select-none items-center justify-center font-semibold transition-[background,filter,transform,box-shadow] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45',
        VARIANT[variant],
        SIZE[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  )
}

export function IconButton({ className, label, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx('inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-2 transition hover:bg-surface-2 active:scale-95', className)}
      {...rest}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */

export function Card({ className, children, as: As = 'div', ...rest }: { className?: string; children?: ReactNode; as?: 'div' | 'section' | 'article' } & Record<string, unknown>) {
  return (
    <As className={cx('print-card rounded-2xl border border-line bg-surface shadow-card', className)} {...rest}>
      {children}
    </As>
  )
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx('mb-3 flex items-end justify-between gap-3', className)}>
      <h2 className="text-[1.05rem] font-bold tracking-tight text-ink">{children}</h2>
      {action}
    </div>
  )
}

export function Chip({ children, className, icon }: { children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-2', className)}>
      {icon}
      {children}
    </span>
  )
}

export const LEVEL_STYLE: Record<Level, { text: string; soft: string; solid: string; ring: string; hex: string }> = {
  great: { text: 'text-great', soft: 'bg-great-soft', solid: 'bg-great', ring: 'ring-great/30', hex: 'var(--great)' },
  normal: { text: 'text-normal', soft: 'bg-normal-soft', solid: 'bg-normal', ring: 'ring-normal/30', hex: 'var(--normal)' },
  borderline: { text: 'text-borderline', soft: 'bg-borderline-soft', solid: 'bg-borderline', ring: 'ring-borderline/30', hex: 'var(--borderline)' },
  attention: { text: 'text-attention', soft: 'bg-attention-soft', solid: 'bg-attention', ring: 'ring-attention/30', hex: 'var(--attention)' },
  urgent: { text: 'text-urgent', soft: 'bg-urgent-soft', solid: 'bg-urgent', ring: 'ring-urgent/30', hex: 'var(--urgent)' },
  info: { text: 'text-primary', soft: 'bg-primary-soft', solid: 'bg-primary', ring: 'ring-primary/30', hex: 'var(--primary)' },
}

export function LevelBadge({ level, label, size = 'md' }: { level: Level; label?: string; size?: 'sm' | 'md' }) {
  const t = useStrings(common)
  const s = LEVEL_STYLE[level]
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        s.soft,
        s.text,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      )}
    >
      <span className={cx('h-2 w-2 shrink-0 rounded-full', s.solid)} />
      {label ?? t.level[level]}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  className,
  size = 'md',
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div role="radiogroup" className={cx('inline-flex w-full rounded-xl bg-surface-2 p-1', className)}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex-1 rounded-lg px-3 font-semibold transition',
            size === 'sm' ? 'h-8 text-xs' : 'h-10 text-sm',
            o.value === value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2">
      <span>
        <span className="block font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-primary' : 'bg-surface-3')}
      >
        <span className={cx('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-6' : 'left-1')} />
      </button>
    </label>
  )
}

export function ProgressBar({ value, className, tone = 'accent' }: { value: number; className?: string; tone?: 'accent' | 'primary' }) {
  return (
    <div className={cx('h-2 w-full overflow-hidden rounded-full bg-surface-3', className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <div
        className={cx('h-full rounded-full transition-[width] duration-300', tone === 'accent' ? 'bg-[var(--accent)]' : 'bg-primary')}
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
      />
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cx('inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent', className)} />
}

/* ------------------------------------------------------------------ */
/* Callouts                                                            */
/* ------------------------------------------------------------------ */

const CALLOUT = {
  info: { icon: Info, cls: 'bg-primary-soft text-ink border-primary/20', ic: 'text-primary' },
  success: { icon: CheckCircle2, cls: 'bg-great-soft text-ink border-great/20', ic: 'text-great' },
  warn: { icon: AlertTriangle, cls: 'bg-borderline-soft text-ink border-borderline/25', ic: 'text-borderline' },
  danger: { icon: OctagonAlert, cls: 'bg-urgent-soft text-ink border-urgent/25', ic: 'text-urgent' },
}

export function Callout({ tone = 'info', title, children, className }: { tone?: keyof typeof CALLOUT; title?: ReactNode; children?: ReactNode; className?: string }) {
  const c = CALLOUT[tone]
  const Icon = c.icon
  return (
    <div className={cx('flex gap-3 rounded-2xl border p-4 text-sm leading-relaxed', c.cls, className)}>
      <Icon className={cx('mt-0.5 h-5 w-5 shrink-0', c.ic)} aria-hidden />
      <div className="min-w-0">
        {title && <div className="mb-0.5 font-semibold">{title}</div>}
        {children && <div className="text-ink-2">{children}</div>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title?: ReactNode; children?: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const t = useStrings(common)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={ref} tabIndex={-1} className="animate-fade-up relative w-full max-w-md rounded-3xl bg-surface p-5 shadow-float outline-none sm:p-6">
        <div className="flex items-start justify-between gap-4">
          {title && <h3 className="text-lg font-bold text-ink">{title}</h3>}
          <IconButton label={t.btn.close} onClick={onClose} className="-mr-2 -mt-1">
            <X className="h-5 w-5" />
          </IconButton>
        </div>
        <div className="mt-2 text-ink-2">{children}</div>
        {footer && <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel,
  onConfirm,
  onCancel,
  danger,
}: {
  open: boolean
  title: ReactNode
  text?: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}) {
  const t = useStrings(common)
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {t.btn.cancel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {text}
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Metrics                                                             */
/* ------------------------------------------------------------------ */

export function Metric({ label, value, unit, hint, emphasis }: { label: ReactNode; value: ReactNode; unit?: ReactNode; hint?: ReactNode; emphasis?: boolean }) {
  return (
    <div className={cx('rounded-2xl p-3.5', emphasis ? 'bg-[var(--accent-soft)]' : 'bg-surface-2')}>
      <div className="text-xs font-medium leading-snug text-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="tabular text-xl font-bold text-ink">{value}</span>
        {unit && <span className="text-sm font-medium text-muted">{unit}</span>}
      </div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  )
}

export function MetricGrid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  return <div className={cx('grid gap-2.5', cols === 2 && 'grid-cols-2', cols === 3 && 'grid-cols-2 sm:grid-cols-3', cols === 4 && 'grid-cols-2 sm:grid-cols-4')}>{children}</div>
}

export function Bullets({ items, className }: { items: ReactNode[]; className?: string }) {
  return (
    <ul className={cx('space-y-2', className)}>
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5 text-[0.95rem] leading-relaxed text-ink-2">
          <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent,var(--primary))]" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  )
}

export function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-3">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent)]">{i + 1}</span>
          <span className="pt-0.5 text-[0.95rem] leading-relaxed text-ink-2">{it}</span>
        </li>
      ))}
    </ol>
  )
}
