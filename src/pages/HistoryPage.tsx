import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { AppLayout, PageHeader } from '../components/Layout'
import { Card, LevelBadge, Segmented, SectionTitle, cx } from '../components/ui'
import { TrendChart } from '../components/charts'
import { FIELDS, fieldById, fieldStrings } from '../catalog/fields'
import { TESTS, exerciseById, testById } from '../catalog'
import type { FieldId } from '../catalog/types'
import { Link } from '../lib/router'
import { fmtDate, fmtDuration, fmtNum, fmtShortDate, useLang, useStrings } from '../lib/i18n'
import { useLogs, useResults } from '../lib/store'
import { common } from '../i18n/common'
import { pages } from '../i18n/pages'
import { NotFound } from './NotFound'
import { weekStart } from '../lib/analytics'

export function HistoryPage() {
  const lang = useLang()
  const t = useStrings(common)
  const p = useStrings(pages).history
  const fs = useStrings(fieldStrings)
  const results = useResults()
  const logs = useLogs()
  const [field, setField] = useState<FieldId | 'all'>('all')
  const [tab, setTab] = useState<'tests' | 'exercises'>('tests')

  const groups = useMemo(() => {
    return TESTS.filter((m) => field === 'all' || m.field === field)
      .map((m) => ({ m, list: results.filter((r) => r.testId === m.id) }))
      .filter((g) => g.list.length > 0)
      .sort((a, b) => (a.list[0].date < b.list[0].date ? 1 : -1))
  }, [results, field])

  const exLogs = logs.filter((l) => {
    const e = exerciseById(l.exerciseId)
    return e && (field === 'all' || e.field === field)
  })
  const ws = weekStart().toISOString()
  const week = exLogs.filter((l) => l.date >= ws)

  return (
    <AppLayout>
      <div className="animate-fade-up">
        <PageHeader title={p.title} subtitle={p.subtitle} back={false} />
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {(['all', ...FIELDS.map((f) => f.id)] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setField(f)}
              className={cx(
                'shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition',
                field === f ? 'bg-ink text-bg' : 'bg-surface text-ink-2 ring-1 ring-line hover:bg-surface-2',
              )}
            >
              {f === 'all' ? p.all : fs[f].name}
            </button>
          ))}
        </div>
        <Segmented
          className="mb-5 max-w-sm"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'tests', label: p.tests },
            { value: 'exercises', label: p.exercises },
          ]}
        />

        {tab === 'tests' && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {groups.length === 0 && <Card className="p-6 text-muted md:col-span-2">{p.empty}</Card>}
            {groups.map(({ m, list }) => {
              const last = list[0]
              const h = m.headline(last, lang)
              const Icon = m.icon
              return (
                <Link key={m.id} to={`/history/${m.id}`} className={cx('group block', fieldById(m.field)?.accent)}>
                  <Card className="flex items-center gap-3.5 p-4 transition group-hover:border-line-strong">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                      <Icon className="h-5.5 w-5.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold text-ink">{m.info[lang].name}</div>
                      <div className="text-xs text-muted">
                        {p.results(list.length)} · {fmtShortDate(lang, last.date)}
                      </div>
                      <div className="mt-1.5">
                        <LevelBadge level={last.summary.level} size="sm" label={h.label} />
                      </div>
                    </div>
                    <span className="tabular shrink-0 text-right text-sm font-bold text-ink">
                      {h.value}
                      {h.unit && <span className="block text-xs font-medium text-muted">{h.unit}</span>}
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
                  </Card>
                </Link>
              )
            })}
          </div>
        )}

        {tab === 'exercises' && (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <Card className="p-4">
                <div className="text-xs font-medium text-muted">{p.thisWeek}</div>
                <div className="mt-1 text-2xl font-extrabold tabular text-ink">
                  {Math.round(week.reduce((a, l) => a + l.seconds, 0) / 60)} <span className="text-sm font-medium text-muted">{p.minutes}</span>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-xs font-medium text-muted">{p.thisWeek}</div>
                <div className="mt-1 text-2xl font-extrabold tabular text-ink">
                  {week.length} <span className="text-sm font-medium text-muted">{p.sessions(week.length)}</span>
                </div>
              </Card>
            </div>
            <Card className="divide-y divide-line">
              {exLogs.length === 0 && <div className="p-6 text-muted">{p.emptyEx}</div>}
              {exLogs.slice(0, 200).map((l) => {
                const e = exerciseById(l.exerciseId)!
                const Icon = e.icon
                const rows = e.describe?.(l, lang) ?? []
                return (
                  <div key={l.id} className={cx('flex items-center gap-3 p-3.5', fieldById(e.field)?.accent)}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-ink">{e.info[lang].name}</div>
                      <div className="text-xs text-muted">{fmtDate(lang, l.date, true)}</div>
                    </div>
                    <div className="text-right">
                      <div className="tabular text-sm font-bold text-ink">{fmtDuration(l.seconds)}</div>
                      {rows[0] && (
                        <div className="text-xs text-muted">
                          {rows[0].label}: {rows[0].value}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </Card>
          </>
        )}
        <p className="mt-6 text-xs text-muted">{t.savedLocally}</p>
      </div>
    </AppLayout>
  )
}

export function TestHistoryPage({ testId }: { testId: string }) {
  const m = testById(testId)
  const lang = useLang()
  const t = useStrings(common)
  const p = useStrings(pages).history
  const results = useResults()
  if (!m) return <NotFound />
  const list = results.filter((r) => r.testId === m.id)
  const pts = list
    .filter((r) => r.summary.value !== null && Number.isFinite(r.summary.value))
    .map((r) => ({ x: new Date(r.date).getTime(), y: r.summary.value as number, level: r.summary.level }))
  return (
    <AppLayout>
      <div className={cx('animate-fade-up', fieldById(m.field)?.accent)}>
        <PageHeader title={m.info[lang].name} subtitle={p.testHistory} back="/history" />
        {m.trend && pts.length >= 2 && (
          <Card className="mb-4 p-4">
            <SectionTitle>
              {t.trend} <span className="text-sm font-medium text-muted">({m.trend.unit(lang)})</span>
            </SectionTitle>
            <TrendChart points={pts} format={(v) => fmtNum(lang, v, m.trend!.digits)} xLabel={(x) => fmtShortDate(lang, new Date(x).toISOString())} />
          </Card>
        )}
        <Card className="divide-y divide-line">
          {list.length === 0 && <div className="p-6 text-muted">{t.noResultsYet}</div>}
          {list.map((r) => {
            const h = m.headline(r, lang)
            return (
              <Link key={r.id} to={`/result/${r.id}`} className="flex items-center gap-3 p-3.5 transition hover:bg-surface-2">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ink">{fmtDate(lang, r.date, true)}</div>
                </div>
                <span className="tabular text-sm font-bold text-ink">
                  {h.value} <span className="text-xs font-medium text-muted">{h.unit}</span>
                </span>
                <LevelBadge level={r.summary.level} size="sm" label={h.label} />
                <ChevronRight className="h-5 w-5 text-muted" />
              </Link>
            )
          })}
        </Card>
      </div>
    </AppLayout>
  )
}
