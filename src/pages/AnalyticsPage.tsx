import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus } from 'lucide-react'
import { AppLayout, PageHeader } from '../components/Layout'
import { Card, SectionTitle, Segmented, cx } from '../components/ui'
import { Legend, Sparkline, StackedColumns, StatusMeter, type Column, type Series } from '../components/analyticsCharts'
import { FIELDS, fieldStrings } from '../catalog/fields'
import { exerciseById, testById, testsOf } from '../catalog'
import type { FieldId } from '../catalog/types'
import { Link } from '../lib/router'
import { fmtDate, fmtNum, fmtShortDate, fmtSigned, useLang, useStrings } from '../lib/i18n'
import { useLogs, useResults } from '../lib/store'
import { LEVEL_ORDER, activityBuckets, change, dayKey, inPeriod, latestByTest, levelCounts, periodStart, streakOf, type Period } from '../lib/analytics'
import { common } from '../i18n/common'
import { analyticsStrings } from '../i18n/report'

const FIELD_IDS = FIELDS.map((f) => f.id) as FieldId[]
const CHART_COLOR: Record<FieldId, string> = {
  hearing: 'var(--chart-hearing)',
  memory: 'var(--chart-memory)',
  hands: 'var(--chart-hands)',
  spine: 'var(--chart-spine)',
}

function Tile({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-ink">
        {value}
        {unit && <span className="ml-1 text-sm font-semibold text-muted">{unit}</span>}
      </div>
    </Card>
  )
}

export function AnalyticsPage() {
  const lang = useLang()
  const t = useStrings(common)
  const a = useStrings(analyticsStrings)
  const fs = useStrings(fieldStrings)
  const results = useResults()
  const logs = useLogs()
  const [period, setPeriod] = useState<Period>(30)
  const [table, setTable] = useState(false)

  const start = useMemo(() => periodStart(period), [period])
  const pResults = useMemo(() => inPeriod(results, start), [results, start])
  const pLogs = useMemo(() => inPeriod(logs, start), [logs, start])
  const series: Series<FieldId>[] = FIELD_IDS.map((f) => ({ key: f, label: fs[f].name, color: CHART_COLOR[f] }))

  const act = useMemo(
    () => activityBuckets(logs, results, FIELD_IDS, (id) => exerciseById(id)?.field, period),
    [logs, results, period],
  )
  const columns: Column<FieldId>[] = act.buckets.map((b) => ({
    label: act.unit === 'day' ? (act.buckets.length <= 7 ? weekday(lang, b.start) : fmtShortDate(lang, b.start.toISOString())) : fmtShortDate(lang, b.start.toISOString()),
    title: act.unit === 'day' ? fmtDate(lang, b.start.toISOString()) : a.weekOf(fmtShortDate(lang, b.start.toISOString())),
    values: b.minutes,
    total: b.total,
    extra: b.tests ? a.testsCount(b.tests) : undefined,
  }))
  const exMinutes = Math.round(pLogs.reduce((s, l) => s + l.seconds, 0) / 60)
  const activeDays = new Set([...pLogs, ...pResults].map((x) => dayKey(x.date))).size
  const streak = streakOf([...logs, ...results].map((x) => x.date))
  const latest = useMemo(() => latestByTest(pResults), [pResults])

  const trends = useMemo(() => {
    const byTest = new Map<string, { date: string; value: number }[]>()
    for (const r of pResults) {
      if (r.summary.value === null || !Number.isFinite(r.summary.value)) continue
      const arr = byTest.get(r.testId) ?? []
      arr.push({ date: r.date, value: r.summary.value })
      byTest.set(r.testId, arr)
    }
    return [...byTest.entries()]
      .filter(([, v]) => v.length >= 2)
      .map(([id, v]) => ({ id, points: v.reverse().slice(-20) }))
      .sort((x, y) => (x.points[x.points.length - 1].date < y.points[y.points.length - 1].date ? 1 : -1))
  }, [pResults])

  const nothing = !results.length && !logs.length
  const mins = (v: number) => (v > 0 && v < 1 ? '<1' : fmtNum(lang, v, 0))

  return (
    <AppLayout>
      <div className="animate-fade-up">
        <PageHeader title={a.title} subtitle={a.subtitle} back={false} />
        <Segmented
          className="mb-5 max-w-md"
          value={period}
          onChange={setPeriod}
          options={([7, 30, 90, 'all'] as Period[]).map((p) => ({ value: p, label: a.periods[String(p)] }))}
        />
        {nothing && <Card className="mb-4 p-5 text-muted">{a.empty}</Card>}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label={a.testsTaken} value={pResults.length} />
          <Tile label={a.exerciseTime} value={exMinutes} unit={a.min} />
          <Tile label={a.activeDays} value={activeDays} />
          <Tile label={a.streak} value={streak} />
        </div>

        <Card className="mt-4 p-5">
          <SectionTitle>{act.unit === 'day' ? a.activity : a.activityWeek}</SectionTitle>
          <div className="mb-3 -mt-1">
            <Legend series={series} />
          </div>
          {columns.some((c) => c.total > 0) ? (
            <StackedColumns columns={columns} series={series} unit={a.min} format={mins} />
          ) : (
            <p className="py-6 text-center text-sm text-muted">{a.activityEmpty}</p>
          )}
          <button type="button" className="mt-3 text-sm font-semibold text-primary" onClick={() => setTable((x) => !x)} aria-expanded={table}>
            {table ? a.hideTable : a.showTable}
          </button>
          {table && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm tabular">
                <thead>
                  <tr className="border-b border-line text-xs text-muted">
                    <th className="py-1.5 pr-3 font-semibold">{a.date}</th>
                    {series.map((s) => (
                      <th key={s.key} className="py-1.5 pr-3 font-semibold">
                        {s.label}
                      </th>
                    ))}
                    <th className="py-1.5 pr-3 font-semibold">{a.total}</th>
                    <th className="py-1.5 font-semibold">{a.tests}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...act.buckets].reverse().map((b, i) => (
                    <tr key={b.key} className="border-b border-line/60 last:border-0">
                      <td className="whitespace-nowrap py-1.5 pr-3 text-ink-2">{columns[columns.length - 1 - i].title}</td>
                      {series.map((s) => (
                        <td key={s.key} className="py-1.5 pr-3 text-ink">
                          {b.minutes[s.key] ? mins(b.minutes[s.key]) : '—'}
                        </td>
                      ))}
                      <td className="py-1.5 pr-3 font-semibold text-ink">{b.total ? mins(b.total) : '—'}</td>
                      <td className="py-1.5 text-ink">{b.tests || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="mt-4 p-5">
          <SectionTitle>{a.sections}</SectionTitle>
          <div className="space-y-5">
            {FIELDS.map((f) => {
              const ids = testsOf(f.id).map((m) => m.id)
              const lc = levelCounts(ids, latest)
              const Icon = f.icon
              return (
                <Link key={f.id} to={`/field/${f.id}`} className={cx('group block', f.accent)}>
                  <div className="mb-2 flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">{fs[f.id].name}</span>
                      <span className="block text-xs text-muted">{a.taken(lc.taken, lc.total)}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5" />
                  </div>
                  <StatusMeter
                    parts={LEVEL_ORDER.map((l) => ({ level: l, count: lc.counts[l], label: t.level[l] }))}
                    empty={lc.notTaken}
                    emptyLabel={a.notTaken}
                  />
                </Link>
              )
            })}
          </div>
        </Card>

        <section className="mt-6">
          <SectionTitle>{a.trends}</SectionTitle>
          <p className="-mt-1.5 mb-3 text-sm text-muted">{trends.length ? a.trendsHint : a.trendsEmpty}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {trends.map(({ id, points }) => (
              <TrendCard key={id} testId={id} points={points} />
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  )
}

function TrendCard({ testId, points }: { testId: string; points: { date: string; value: number }[] }) {
  const lang = useLang()
  const a = useStrings(analyticsStrings)
  const [hover, setHover] = useState<number | null>(null)
  const m = testById(testId)
  if (!m || !m.trend) return null
  const f = FIELDS.find((x) => x.id === m.field)!
  const shown = points[hover ?? points.length - 1]
  const first = points[0]
  const last = points[points.length - 1]
  const ch = change(last.value, first.value, m.trend.higherIsBetter, m.trend.digits)
  const unit = m.trend.unit(lang)
  return (
    <Link to={`/history/${m.id}`} className={cx('group block', f.accent)}>
      <Card className="h-full p-4 transition group-hover:border-line-strong">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 font-semibold leading-snug text-ink">{m.info[lang].name}</div>
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-xl font-extrabold text-ink">{fmtNum(lang, shown.value, m.trend.digits)}</span>
          <span className="text-xs font-medium text-muted">{unit}</span>
          <span className="ml-auto text-xs text-muted">{fmtShortDate(lang, shown.date)}</span>
        </div>
        <div className="mt-2">
          <Sparkline values={points.map((p) => p.value)} color={CHART_COLOR[m.field]} onHover={setHover} />
        </div>
        <div
          className={cx(
            'mt-2 flex items-center gap-1 text-xs font-semibold',
            ch.better === null ? 'text-muted' : ch.better ? 'text-great' : 'text-attention',
          )}
        >
          {ch.better === null ? <Minus className="h-3.5 w-3.5" /> : ch.d > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {ch.better === null ? a.same : ch.better ? a.better : a.worse}
          <span className="font-medium text-muted">
            · {fmtSigned(lang, ch.d, m.trend.digits)} {unit} {a.sinceStart}
          </span>
        </div>
      </Card>
    </Link>
  )
}

function weekday(lang: 'en' | 'uz' | 'ru', d: Date) {
  const names = {
    en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    uz: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'],
    ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  }[lang]
  return names[(d.getDay() + 6) % 7]
}
