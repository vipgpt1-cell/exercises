import type { ReactNode } from 'react'
import { ChartColumn, ChevronLeft, ClipboardList, History, House } from 'lucide-react'
import { Link, goBack, useRoute } from '../lib/router'
import { LANGS, useStrings } from '../lib/i18n'
import { updateSettings, useSettings } from '../lib/store'
import { common } from '../i18n/common'
import { nav } from '../i18n/report'
import { IconButton, cx } from './ui'

const TABS = [
  { to: '/', icon: House, key: 'home' as const },
  { to: '/history', icon: History, key: 'history' as const },
  { to: '/analytics', icon: ChartColumn, key: 'analytics' as const },
  { to: '/report', icon: ClipboardList, key: 'report' as const },
]

function isActive(path: string, to: string) {
  if (to === '/') return path === '/' || path.startsWith('/field') || path.startsWith('/result')
  return path.startsWith(to)
}

/** Tabs: a bar at the bottom on phones, a row at the top on wide screens. */
function Tabs() {
  const { path } = useRoute()
  const t = useStrings(nav)
  return (
    <>
      <nav className="pt-safe sticky top-0 z-30 hidden border-b border-line/70 bg-bg/90 backdrop-blur-md md:block" aria-label="Main">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-1 px-4">
          {TABS.map((n) => {
            const Icon = n.icon
            return (
              <Link
                key={n.to}
                to={n.to}
                aria-current={isActive(path, n.to) ? 'page' : undefined}
                className={cx(
                  'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition',
                  isActive(path, n.to) ? 'bg-primary-soft text-primary' : 'text-ink-2 hover:bg-surface-2',
                )}
              >
                <Icon className="h-4 w-4" />
                {t[n.key]}
              </Link>
            )
          })}
        </div>
      </nav>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-md md:hidden" aria-label="Main">
        <div className="mx-auto flex max-w-md">
          {TABS.map((n) => {
            const active = isActive(path, n.to)
            const Icon = n.icon
            return (
              <Link
                key={n.to}
                to={n.to}
                aria-current={active ? 'page' : undefined}
                className={cx('flex flex-1 flex-col items-center gap-0.5 pb-1 pt-2 text-[0.7rem] font-semibold transition', active ? 'text-primary' : 'text-muted')}
              >
                <span className={cx('flex h-8 w-14 items-center justify-center rounded-full transition', active && 'bg-primary-soft')}>
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                </span>
                {t[n.key]}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}

export function LangSwitch({ compact }: { compact?: boolean }) {
  const { lang } = useSettings()
  return (
    <div className="inline-flex rounded-xl bg-surface-2 p-0.5" role="radiogroup" aria-label="Language">
      {LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          role="radio"
          aria-checked={lang === l.id}
          title={l.label}
          onClick={() => updateSettings({ lang: l.id })}
          className={cx(
            'rounded-[0.6rem] font-semibold transition',
            compact ? 'h-8 px-2.5 text-xs' : 'h-10 flex-1 px-3 text-sm',
            lang === l.id ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {compact ? l.short : l.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Page frame. The module is opened inside the host app, so there is no brand header;
 * four tabs (home, history, analytics, report) sit at the bottom on phones.
 * Test intros hide the tabs to keep their Start button in the same place.
 */
export function AppLayout({ children, tabs = true }: { children: ReactNode; tabs?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col">
      {tabs && <Tabs />}
      <main className={cx('mx-auto w-full max-w-5xl flex-1 px-4', tabs ? 'pt-safe-page pb-28 md:pt-6 md:pb-12' : 'pt-safe-page pb-10')}>{children}</main>
    </div>
  )
}

/** Page header with a back button. */
export function PageHeader({ title, subtitle, back = '/', right, icon }: { title: ReactNode; subtitle?: ReactNode; back?: string | false; right?: ReactNode; icon?: ReactNode }) {
  const t = useStrings(common)
  return (
    <div className="mb-5 flex items-start gap-2">
      {back !== false && (
        <IconButton label={t.btn.back} onClick={() => goBack(back)} className="-ml-2 mt-0.5 shrink-0">
          <ChevronLeft className="h-6 w-6" />
        </IconButton>
      )}
      {icon}
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink text-balance">{title}</h1>
        {subtitle && <p className="mt-1 text-[0.95rem] leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}
