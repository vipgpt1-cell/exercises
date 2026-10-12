import { ChevronRight, Clock } from 'lucide-react'
import { AppLayout, PageHeader } from '../components/Layout'
import { Card, LevelBadge, SectionTitle, cx } from '../components/ui'
import { fieldById, fieldStrings } from '../catalog/fields'
import { exercisesOf, testsOf } from '../catalog'
import type { FieldId, Requirement } from '../catalog/types'
import { Link } from '../lib/router'
import { fmtShortDate, useLang, useStrings } from '../lib/i18n'
import { useLogs, useResults } from '../lib/store'
import { common } from '../i18n/common'
import { pages } from '../i18n/pages'
import { NotFound } from './NotFound'
import { ReqIcon } from '../components/ReqIcon'

export function FieldPage({ id }: { id: string }) {
  const f = fieldById(id)
  const lang = useLang()
  const t = useStrings(common)
  const p = useStrings(pages).field
  const fs = useStrings(fieldStrings)
  const results = useResults()
  const logs = useLogs()
  if (!f) return <NotFound />
  const Icon = f.icon
  const fid = f.id as FieldId
  return (
    <AppLayout>
      <div className={cx('animate-fade-up', f.accent)}>
        <PageHeader
          title={fs[fid].name}
          subtitle={fs[fid].about}
          icon={
            <div className="mr-1 hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-white sm:flex dark:text-[#0b1020]">
              <Icon className="h-7 w-7" />
            </div>
          }
        />

        <SectionTitle>{p.tests}</SectionTitle>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {testsOf(fid).map((m) => {
            const last = results.find((r) => r.testId === m.id)
            const h = last ? m.headline(last, lang) : null
            const MIcon = m.icon
            return (
              <Link key={m.id} to={`/test/${m.id}`} className="group block">
                <Card className="flex h-full gap-4 p-4 transition group-hover:border-line-strong group-hover:shadow-float">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                    <MIcon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold leading-snug text-ink">{m.info[lang].name}</div>
                      <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-muted transition group-hover:translate-x-0.5" />
                    </div>
                    <div className="mt-0.5 text-sm leading-snug text-muted">{m.info[lang].short}</div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
                      <span className="inline-flex items-center gap-1 font-medium">
                        <Clock className="h-3.5 w-3.5" /> {t.minutes(m.minutes)}
                      </span>
                      {m.requirements.filter((r: Requirement) => r !== 'keyboard' && r !== 'touch').slice(0, 3).map((r: Requirement) => (
                        <span key={r} className="inline-flex items-center gap-1">
                          <ReqIcon r={r} className="h-3.5 w-3.5" />
                          {t.req[r]}
                        </span>
                      ))}
                    </div>
                    {last && h && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-2.5 text-xs">
                        <span className="text-muted">{fmtShortDate(lang, last.date)}</span>
                        <span className="tabular font-bold text-ink">
                          {h.value} {h.unit}
                        </span>
                        <LevelBadge level={last.summary.level} size="sm" label={h.label} />
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>

        <SectionTitle className="mt-8">{p.exercises}</SectionTitle>
        <p className="-mt-1.5 mb-3 text-sm text-muted">{p.exercisesText}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {exercisesOf(fid).map((e) => {
            const EIcon = e.icon
            const count = logs.filter((l) => l.exerciseId === e.id).length
            return (
              <Link key={e.id} to={`/exercise/${e.id}`} className="group block">
                <Card className="flex h-full items-center gap-3.5 p-4 transition group-hover:border-line-strong group-hover:shadow-float">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-[var(--accent)]">
                    <EIcon className="h-5.5 w-5.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold leading-snug text-ink">{e.info[lang].name}</div>
                    <div className="mt-0.5 text-xs text-muted">
                      {t.minutes(e.minutes)}
                      {count > 0 && ` · ${p.timesDone(count)}`}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted transition group-hover:translate-x-0.5" />
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </AppLayout>
  )
}
