import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useStrings } from '../lib/i18n'
import { common } from '../i18n/common'
import { fx } from '../lib/audio'
import { useWakeLock } from '../lib/hooks'
import { useBackGuard } from '../lib/router'
import { ConfirmDialog, IconButton, ProgressBar, cx } from './ui'

/**
 * Full-screen, distraction-free frame used while a test or exercise runs.
 */
export function FocusShell({
  title,
  subtitle,
  progress,
  onExit,
  confirmExit = true,
  right,
  children,
  className,
  wide,
}: {
  title: ReactNode
  subtitle?: ReactNode
  progress?: number | null
  onExit: () => void
  confirmExit?: boolean
  right?: ReactNode
  children: ReactNode
  className?: string
  wide?: boolean
}) {
  const t = useStrings(common)
  const [ask, setAsk] = useState(false)
  useWakeLock(true)
  // Phone back button: ask first (a second press closes the question again).
  useBackGuard(() => (confirmExit ? setAsk((a) => !a) : onExit()))
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="pt-safe sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className={cx('mx-auto flex h-14 items-center gap-2 px-3', wide ? 'max-w-5xl' : 'max-w-3xl')}>
          <IconButton label={t.btn.exit} onClick={() => (confirmExit ? setAsk(true) : onExit())}>
            <X className="h-5 w-5" />
          </IconButton>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[0.95rem] font-semibold text-ink">{title}</div>
            {subtitle && <div className="truncate text-xs text-muted">{subtitle}</div>}
          </div>
          {right}
        </div>
        {progress !== undefined && progress !== null && (
          <div className={cx('mx-auto px-4 pb-2', wide ? 'max-w-5xl' : 'max-w-3xl')}>
            <ProgressBar value={progress} className="h-1.5" />
          </div>
        )}
      </header>
      <main className={cx('mx-auto flex w-full flex-1 flex-col px-4 py-5', wide ? 'max-w-5xl' : 'max-w-3xl', className)}>{children}</main>
      <ConfirmDialog
        open={ask}
        title={t.exitConfirmTitle}
        text={t.exitConfirmText}
        confirmLabel={t.btn.exit}
        danger
        onCancel={() => setAsk(false)}
        onConfirm={() => {
          setAsk(false)
          onExit()
        }}
      />
    </div>
  )
}

/** Centered stage content with a large heading. */
export function Stage({ icon, title, children, footer, className }: { icon?: ReactNode; title?: ReactNode; children?: ReactNode; footer?: ReactNode; className?: string }) {
  return (
    <div className={cx('animate-fade-up flex flex-1 flex-col', className)}>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {icon && <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--accent-soft)] text-[var(--accent)]">{icon}</div>}
        {title && <h2 className="max-w-md text-2xl font-bold tracking-tight text-ink text-balance">{title}</h2>}
        {children && <div className="mt-3 w-full max-w-md text-[0.98rem] leading-relaxed text-ink-2">{children}</div>}
      </div>
      {footer && <div className="pb-safe mx-auto mt-6 flex w-full max-w-md flex-col gap-2.5">{footer}</div>}
    </div>
  )
}

/** 3‑2‑1 countdown overlay. */
export function Countdown({ from = 3, onDone, label }: { from?: number; onDone: () => void; label?: ReactNode }) {
  const [n, setN] = useState(from)
  const t = useStrings(common)
  useEffect(() => {
    fx('tick')
    if (n <= 0) {
      onDone()
      return
    }
    const id = setTimeout(() => setN((x) => x - 1), 800)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n])
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div className="text-sm font-semibold uppercase tracking-widest text-muted">{label ?? t.getReady}</div>
      <div key={n} className="animate-pop mt-3 text-8xl font-black tabular text-[var(--accent)]">
        {Math.max(1, n)}
      </div>
    </div>
  )
}

/** Big round response button – responds on pointer-down for minimal latency. */
export function ResponseButton({
  onPress,
  label,
  sub,
  disabled,
  size = 200,
  pressedKey,
}: {
  onPress: (e: { timeStamp: number }) => void
  label: ReactNode
  sub?: ReactNode
  disabled?: boolean
  size?: number
  pressedKey?: number
}) {
  const [ripples, setRipples] = useState<number[]>([])
  const [initialKey] = useState(pressedKey)
  useEffect(() => {
    if (pressedKey === undefined || pressedKey === 0 || pressedKey === initialKey) return
    const id = pressedKey
    setRipples((r) => (r.includes(id) ? r : [...r.slice(-3), id]))
    const tm = setTimeout(() => setRipples((r) => r.filter((x) => x !== id)), 600)
    return () => clearTimeout(tm)
  }, [pressedKey, initialKey])
  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={(e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return
        e.preventDefault()
        onPress({ timeStamp: e.timeStamp })
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onPress({ timeStamp: e.timeStamp })
      }}
      className="no-touch-scroll relative isolate flex select-none flex-col items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-float transition active:scale-[0.97] disabled:opacity-40 dark:text-[#0b1020]"
      style={{ width: size, height: size }}
    >
      {ripples.map((r) => (
        <span key={r} className="absolute inset-0 -z-10 rounded-full bg-[var(--accent)]" style={{ animation: 'ripple 0.6s ease-out forwards' }} />
      ))}
      <span className="text-xl font-bold">{label}</span>
      {sub && <span className="mt-1 text-xs font-medium opacity-80">{sub}</span>}
    </button>
  )
}
