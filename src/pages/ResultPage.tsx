import { useEffect, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, History, Minus, RotateCcw, Trash2 } from 'lucide-react'
import { AppLayout, PageHeader } from '../components/Layout'
import { Button, Callout, Card, ConfirmDialog, LevelBadge, LEVEL_STYLE, cx } from '../components/ui'
import { fieldById } from '../catalog/fields'
import { testById } from '../catalog'
import { navigate, useRoute } from '../lib/router'
import { fmtDate, fmtNum, fmtSigned, useLang, useStrings } from '../lib/i18n'
import { deleteResult, previousOf, useResults } from '../lib/store'
import { fx } from '../lib/audio'
import { common } from '../i18n/common'
import { pages } from '../i18n/pages'
import { NotFound } from './NotFound'

export function ResultPage({ id }: { id: string }) {
  const results = useResults()
  const lang = useLang()
  const t = useStrings(common)
  const p = useStrings(pages).result
  const { query } = useRoute()
  const [askDelete, setAskDelete] = useState(false)
  const r = results.find((x) => x.id === id)
  const m = r ? testById(r.testId) : undefined
  const isNew = query.get('new') === '1'
  useEffect(() => {
    if (isNew) fx('done')
  }, [isNew])
  if (!r || !m) return <NotFound />
  const Icon = m.icon
  const h = m.headline(r, lang)
  const prev = previousOf(results, r)
  const Details = m.Details
  const level = LEVEL_STYLE[r.summary.level]

  let delta: { v: number; better: boolean | null } | null = null
  if (prev && m.trend && r.summary.value !== null && prev.summary.value !== null) {
    const d = r.summary.value - prev.summary.value
    const eps = Math.pow(10, -m.trend.digits) / 2
    delta = { v: d, better: Math.abs(d) < eps ? null : m.trend.higherIsBetter ? d > 0 : d < 0 }
  }

  return (
    <AppLayout>
      <div className={cx('animate-fade-up', fieldById(m.field)?.accent)}>
        <PageHeader title={m.info[lang].name} subtitle={fmtDate(lang, r.date, true)} back={`/field/${m.field}`} />

        <Card className="relative overflow-hidden p-5 sm:p-6">
          <div className={cx('pointer-events-none absolute inset-x-0 top-0 h-1.5', level.solid)} />
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Icon className="h-8 w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">{t.yourResult}</div>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
                <span className="tabular text-4xl font-black tracking-tight text-ink">{h.value}</span>
                {h.unit && <span className="text-lg font-semibold text-muted">{h.unit}</span>}
              </div>
              <div className="mt-2">
                <LevelBadge level={r.summary.level} label={h.label} />
              </div>
            </div>
            {delta && m.trend && (
              <div className="rounded-2xl bg-surface-2 px-4 py-3 text-right">
                <div className="text-xs font-medium text-muted">{t.vsPrevious}</div>
                <div
                  className={cx(
                    'mt-0.5 flex items-center justify-end gap-1 text-lg font-bold tabular',
                    delta.better === null ? 'text-ink-2' : delta.better ? 'text-great' : 'text-attention',
                  )}
                >
                  {delta.better === null ? <Minus className="h-5 w-5" /> : delta.v > 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                  {fmtSigned(lang, delta.v, m.trend.digits)}
                  <span className="text-xs font-medium text-muted">{m.trend.unit(lang)}</span>
                </div>
                <div className="text-xs text-muted">{delta.better === null ? t.same : delta.better ? t.improved : t.worse}</div>
              </div>
            )}
          </div>
          {!prev && isNew && <p className="mt-4 text-sm text-muted">{p.firstTime}</p>}
          {prev && m.trend && prev.summary.value !== null && (
            <p className="mt-4 text-sm text-muted">
              {t.previous}: {fmtDate(lang, prev.date)} — <span className="tabular font-semibold text-ink-2">{fmtNum(lang, prev.summary.value, m.trend.digits)} {m.trend.unit(lang)}</span>
            </p>
          )}
        </Card>

        <div className="mt-4 space-y-4">
          <Details result={r} />
        </div>

        <Callout tone="info" className="mt-4">
          {t.disclaimer}
        </Callout>

        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          <Button variant="accent" size="lg" icon={<RotateCcw className="h-5 w-5" />} onClick={() => navigate(`/test/${m.id}`)}>
            {t.btn.retake}
          </Button>
          <Button variant="secondary" size="lg" icon={<History className="h-5 w-5" />} onClick={() => navigate(`/history/${m.id}`)}>
            {t.btn.viewHistory}
          </Button>
        </div>
        <div className="mt-3 text-center">
          <Button variant="ghost" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={() => setAskDelete(true)} className="text-muted">
            {t.btn.delete}
          </Button>
        </div>
        <ConfirmDialog
          open={askDelete}
          title={p.deleteTitle}
          text={p.deleteText}
          confirmLabel={t.btn.delete}
          danger
          onCancel={() => setAskDelete(false)}
          onConfirm={() => {
            setAskDelete(false)
            deleteResult(r.id)
            navigate(`/history/${m.id}`, { replace: true })
          }}
        />
      </div>
    </AppLayout>
  )
}
