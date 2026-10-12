import { CheckCircle2, Flame, RotateCcw } from 'lucide-react'
import { AppLayout } from '../components/Layout'
import { Button, Card, Metric, MetricGrid, cx } from '../components/ui'
import type { ExerciseModule } from '../catalog/types'
import { fieldById } from '../catalog/fields'
import { fmtDuration, useLang, useStrings } from '../lib/i18n'
import { useLogs, type ExerciseLog } from '../lib/store'
import { common } from '../i18n/common'
import { pages } from '../i18n/pages'
import { streakOf } from '../lib/analytics'

export function ExerciseDone({
  exercise,
  log,
  onAgain,
  onBack,
}: {
  exercise: ExerciseModule
  log: Pick<ExerciseLog, 'seconds' | 'score' | 'detail'>
  onAgain: () => void
  onBack: () => void
}) {
  const lang = useLang()
  const t = useStrings(common)
  const p = useStrings(pages).result
  const logs = useLogs()
  const rows = exercise.describe?.(log, lang) ?? []
  const streak = streakOf(logs.map((l) => l.date))
  return (
    <AppLayout>
      <div className={cx('animate-fade-up mx-auto max-w-lg', fieldById(exercise.field)?.accent)}>
        <Card className="p-6 text-center">
          <div className="animate-pop mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
            <CheckCircle2 className="h-11 w-11" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-ink">{p.exerciseDone}</h1>
          <p className="mt-1 text-muted">{exercise.info[lang].name}</p>
          <div className="mt-5 text-left">
            <MetricGrid>
              <Metric label={t.time} value={fmtDuration(log.seconds)} emphasis />
              {rows.slice(0, 1).map((r) => (
                <Metric key={r.label} label={r.label} value={r.value} emphasis />
              ))}
              {rows.slice(1).map((r) => (
                <Metric key={r.label} label={r.label} value={r.value} />
              ))}
            </MetricGrid>
          </div>
          {streak > 1 && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-memory-soft px-3 py-1.5 text-sm font-semibold text-memory">
              <Flame className="h-4 w-4" /> {t.streakDays(streak)}
            </div>
          )}
          <p className="mt-3 text-xs text-muted">{log.seconds >= 5 ? p.exerciseSaved : ''}</p>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            <Button variant="secondary" size="lg" onClick={onBack}>
              {p.backToArea}
            </Button>
            <Button variant="accent" size="lg" onClick={onAgain} icon={<RotateCcw className="h-5 w-5" />}>
              {p.again}
            </Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
