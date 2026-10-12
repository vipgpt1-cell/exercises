import { useState } from 'react'
import { ChevronRight, Settings, ShieldCheck, Timer } from 'lucide-react'
import { AppLayout } from '../components/Layout'
import { Card, IconButton, LevelBadge, SectionTitle, cx } from '../components/ui'
import { SettingsSheet } from '../components/SettingsSheet'
import { FIELDS, fieldStrings } from '../catalog/fields'
import { exerciseById, exercisesOf, testById, testsOf } from '../catalog'
import { Link } from '../lib/router'
import { fmtShortDate, useLang, useStrings } from '../lib/i18n'
import { useLogs, useResults } from '../lib/store'
import { streakOf, weekStart } from '../lib/analytics'
import { common } from '../i18n/common'
import { pages } from '../i18n/pages'

const QUICK = ['breathing', 'neck-routine', 'desk-break'] as const

export function Home() {
  const t = useStrings(common)
  const p = useStrings(pages).home
  const fs = useStrings(fieldStrings)
  const lang = useLang()
  const results = useResults()
  const logs = useLogs()
  const [settings, setSettings] = useState(false)

  const ws = weekStart().toISOString()
  const weekLogs = logs.filter((l) => l.date >= ws)
  const weekMin = Math.round(weekLogs.reduce((a, l) => a + l.seconds, 0) / 60)
  const streak = streakOf(logs.map((l) => l.date))

  return (
    <AppLayout>
      <div className="animate-fade-up">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[1.7rem] font-extrabold leading-tight tracking-tight text-ink">{p.title}</h1>
            <p className="mt-1.5 max-w-2xl leading-relaxed text-muted">{p.subtitle}</p>
          </div>
          <IconButton label={p.settings} onClick={() => setSettings(true)} className="-mr-2 shrink-0">
            <Settings className="h-6 w-6" />
          </IconButton>
        </div>

        {/* Sections */}
        <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {FIELDS.map((f) => {
            const Icon = f.icon
            return (
              <Link key={f.id} to={`/field/${f.id}`} className={cx('group block', f.accent)}>
                <Card className="relative h-full overflow-hidden p-5 transition group-hover:-translate-y-0.5 group-hover:shadow-float">
                  <div className="pointer-events-none absolute -bottom-10 -right-10 h-36 w-36 rounded-full bg-[var(--accent-soft)]" />
                  <div className="relative flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-sm dark:text-[#0b1020]">
                      <Icon className="h-7 w-7" strokeWidth={2.1} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-lg font-bold leading-tight text-ink">{fs[f.id].name}</div>
                      <div className="mt-1 text-sm leading-snug text-muted">{fs[f.id].tagline}</div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-2">
                        <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[var(--accent)]">{p.testsCount(testsOf(f.id).length)}</span>
                        <span className="rounded-full bg-surface-2 px-2.5 py-1">{p.exCount(exercisesOf(f.id).length)}</span>
                      </div>
                    </div>
                    <ChevronRight className="mt-1 h-5 w-5 text-muted transition group-hover:translate-x-0.5" />
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-[1.4fr_1fr]">
          {/* Latest results */}
          <section>
            <SectionTitle
              action={
                <Link to="/history" className="text-sm font-semibold text-primary">
                  {p.seeAll}
                </Link>
              }
            >
              {p.recent}
            </SectionTitle>
            <Card className="divide-y divide-line">
              {results.length === 0 && <div className="p-5 text-sm text-muted">{t.noResultsYet}</div>}
              {results.slice(0, 4).map((r) => {
                const m = testById(r.testId)
                if (!m) return null
                const h = m.headline(r, lang)
                const f = FIELDS.find((x) => x.id === m.field)!
                const Icon = m.icon
                return (
                  <Link key={r.id} to={`/result/${r.id}`} className={cx('flex items-center gap-3 p-3.5 transition hover:bg-surface-2', f.accent)}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-ink">{m.info[lang].name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <LevelBadge level={r.summary.level} size="sm" label={h.label} />
                        <span className="text-xs text-muted">{fmtShortDate(lang, r.date)}</span>
                      </div>
                    </div>
                    <span className="tabular shrink-0 text-right text-sm font-bold text-ink">
                      {h.value}
                      {h.unit && <span className="block text-xs font-medium text-muted">{h.unit}</span>}
                    </span>
                  </Link>
                )
              })}
            </Card>
          </section>

          {/* This week */}
          <section>
            <SectionTitle>{p.week}</SectionTitle>
            <Card className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-spine-soft text-spine">
                  <Timer className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-extrabold tabular text-ink">{p.weekMinutes(weekMin)}</div>
                  {streak > 1 && <div className="text-sm text-muted">{t.streakDays(streak)}</div>}
                </div>
              </div>
              <WeekDots dates={weekLogs.map((l) => l.date)} />
              {weekLogs.length === 0 && <p className="mt-3 text-sm text-muted">{p.noActivity}</p>}
              <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted">{p.quickStart}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {QUICK.map((id) => {
                  const e = exerciseById(id)
                  if (!e) return null
                  return (
                    <Link key={id} to={`/exercise/${id}`} className="accent-spine inline-flex items-center rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-sm font-semibold text-[var(--accent)]">
                      {e.info[lang].name}
                    </Link>
                  )
                })}
              </div>
            </Card>
          </section>
        </div>

        <div className="mt-8 flex items-start gap-2.5 rounded-2xl bg-surface-2 p-4 text-sm text-muted">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-great" />
          <span>
            {p.privacy} {t.disclaimerShort}
          </span>
        </div>
      </div>
      <SettingsSheet open={settings} onClose={() => setSettings(false)} />
    </AppLayout>
  )
}

function WeekDots({ dates }: { dates: string[] }) {
  const lang = useLang()
  const start = weekStart()
  const days = new Set(dates.map((d) => new Date(d).toDateString()))
  const today = new Date().toDateString()
  const labels = {
    en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    uz: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'],
    ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  }[lang]
  return (
    <div className="mt-4 flex justify-between">
      {labels.map((l, i) => {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        const on = days.has(d.toDateString())
        const isToday = d.toDateString() === today
        return (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className={cx(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
                on ? 'bg-spine text-white dark:text-[#0b1020]' : 'bg-surface-2 text-muted',
                isToday && !on && 'ring-2 ring-spine/40',
              )}
            >
              {on ? '✓' : ''}
            </div>
            <span className={cx('text-[0.65rem] font-medium', isToday ? 'text-ink' : 'text-muted')}>{l}</span>
          </div>
        )
      })}
    </div>
  )
}
