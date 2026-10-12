import { useState, type ReactNode } from 'react'
import { Clock, History, Play, UserRound } from 'lucide-react'
import { AppLayout, PageHeader } from '../components/Layout'
import { Bullets, Button, Callout, Card, Chip, LevelBadge, SectionTitle, Steps, cx } from '../components/ui'
import { ReqIcon } from '../components/ReqIcon'
import { fieldById } from '../catalog/fields'
import { exerciseById, testById } from '../catalog'
import type { ExerciseModule, InfoStrings, Requirement } from '../catalog/types'
import { Link, goBack, leaveGuard, navigate } from '../lib/router'
import { fmtDate, useLang, useStrings } from '../lib/i18n'
import { MAX_AGE, MIN_AGE, ageOf, saveLog, saveResult, setAge, usePerson, useResults } from '../lib/store'
import { common } from '../i18n/common'
import { pages } from '../i18n/pages'
import { NotFound } from './NotFound'
import { ExerciseDone } from './ExerciseDone'

/** Shared intro screen for tests and exercises. */
function Intro({
  kind,
  info,
  icon,
  minutes,
  requirements,
  field,
  onStart,
  aside,
  before,
  disabledReason,
  startDisabled,
  startLabel,
}: {
  kind: 'test' | 'exercise'
  info: InfoStrings
  icon: ReactNode
  minutes: number
  requirements: Requirement[]
  field: string
  onStart: () => void
  aside?: ReactNode
  before?: ReactNode
  disabledReason?: string
  startDisabled?: boolean
  startLabel?: string
}) {
  const disabled = !!disabledReason || !!startDisabled
  const t = useStrings(common)
  return (
    <AppLayout tabs={false}>
      <div className={cx('animate-fade-up', fieldById(field)?.accent)}>
        <PageHeader title={info.name} back={`/field/${field}`} />
        <div className="grid gap-4 md:grid-cols-[1.35fr_1fr]">
          <div className="space-y-4">
            {before}
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-sm dark:text-[#0b1020]">{icon}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">{kind === 'test' ? t.measures : t.goodFor}</div>
              </div>
              <p className="mt-3 leading-relaxed text-ink-2">{info.measures}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Chip icon={<Clock className="h-3.5 w-3.5" />}>{t.minutes(minutes)}</Chip>
                {requirements.filter((r) => r !== 'keyboard' && r !== 'touch').map((r) => (
                  <Chip key={r} icon={<ReqIcon r={r} className="h-3.5 w-3.5" />}>
                    {t.req[r]}
                  </Chip>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <SectionTitle>{t.howItWorks}</SectionTitle>
              <Steps items={info.steps} />
            </Card>
          </div>
          <div className="space-y-4">
            {info.tips.length > 0 && (
              <Card className="p-5">
                <SectionTitle>{kind === 'test' ? t.tips : t.tipsEx}</SectionTitle>
                <Bullets items={info.tips} />
              </Card>
            )}
            {info.caution && info.caution.length > 0 && <Callout tone="warn">{info.caution.map((c, i) => <p key={i} className={i ? 'mt-1.5' : ''}>{c}</p>)}</Callout>}
            {aside}
            <div className="hidden md:block">
              <Button variant="accent" size="lg" block onClick={onStart} disabled={disabled} icon={<Play className="h-5 w-5" />}>
                {startLabel ?? t.btn.start}
              </Button>
            </div>
            {disabledReason && <Callout tone="warn">{disabledReason}</Callout>}
            {kind === 'test' && <p className="text-xs leading-relaxed text-muted">{t.disclaimerShort}</p>}
          </div>
        </div>
        <div className="h-24 md:hidden" />
      </div>
      {/* Sticky start on mobile */}
      <div className={cx('pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 px-4 pt-3 backdrop-blur md:hidden', fieldById(field)?.accent)}>
        <div className="mx-auto max-w-md">
          <Button variant="accent" size="lg" block onClick={onStart} disabled={disabled} icon={disabled ? undefined : <Play className="h-5 w-5" />}>
            {startLabel ?? t.btn.start}
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}

/** Asks for the age once, for tests that are scored against age norms. */
function AgeCard() {
  const p = useStrings(pages).intro
  const person = usePerson()
  const age = ageOf(person)
  const [editing, setEditing] = useState(age === null)
  const [value, setValue] = useState(age !== null ? String(age) : '')
  const n = Number(value)
  const valid = value !== '' && Number.isInteger(n) && n >= MIN_AGE && n <= MAX_AGE
  if (!editing && age !== null) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm">
        <UserRound className="h-5 w-5 shrink-0 text-muted" />
        <span className="min-w-0 flex-1 text-ink-2">{p.ageSet(age)}</span>
        <button type="button" className="shrink-0 font-semibold text-[var(--accent)]" onClick={() => setEditing(true)}>
          {p.change}
        </button>
      </div>
    )
  }
  return (
    <Card className="p-4">
      <label htmlFor="age-input" className="font-bold text-ink">
        {p.ageTitle}
      </label>
      <p className="mt-0.5 text-sm text-muted">{p.ageText}</p>
      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid) return
          setAge(n)
          setEditing(false)
        }}
      >
        <div className="relative w-44">
          <input
            id="age-input"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            placeholder={p.agePlaceholder}
            value={value}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 3)
              setValue(v)
              const k = Number(v)
              if (v.length >= 2 && k >= MIN_AGE && k <= MAX_AGE) setAge(k)
            }}
            className="h-12 w-full rounded-xl border border-line-strong bg-surface pl-3.5 pr-14 text-lg font-semibold text-ink outline-none transition placeholder:text-sm placeholder:font-normal focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{p.ageYears}</span>
        </div>
        {age !== null && (
          <Button type="submit" variant="secondary" disabled={!valid}>
            {p.save}
          </Button>
        )}
      </form>
    </Card>
  )
}

export function TestPage({ id }: { id: string }) {
  const m = testById(id)
  const lang = useLang()
  const t = useStrings(common)
  const p = useStrings(pages).intro
  const results = useResults()
  const person = usePerson()
  const [running, setRunning] = useState(false)
  const [runKey, setRunKey] = useState(0)
  if (!m) return <NotFound />
  const Icon = m.icon
  const last = results.find((r) => r.testId === m.id)
  const supported = !m.supported || m.supported()
  const needAge = !!m.usesAge && ageOf(person) === null

  if (running) {
    const Runner = m.Runner
    return (
      <div className={fieldById(m.field)?.accent}>
        <Runner
          key={runKey}
          onExit={() => leaveGuard(() => setRunning(false))}
          onDone={(summary, data) => {
            const r = saveResult(m.id, m.version, summary, data)
            leaveGuard(() => navigate(`/result/${r.id}?new=1`, { replace: true }))
          }}
        />
      </div>
    )
  }

  return (
    <Intro
      kind="test"
      info={m.info[lang]}
      icon={<Icon className="h-6 w-6" />}
      minutes={m.minutes}
      requirements={m.requirements}
      field={m.field}
      disabledReason={!supported ? `${p.unsupported}. ${p.openOnPhone}` : undefined}
      startDisabled={needAge}
      startLabel={needAge ? p.ageNeeded : undefined}
      before={m.usesAge ? <AgeCard /> : null}
      onStart={() => {
        setRunKey((k) => k + 1)
        setRunning(true)
        window.scrollTo({ top: 0 })
      }}
      aside={
        last ? (
          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-muted">
                  {p.lastTaken} · {fmtDate(lang, last.date)}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="tabular text-lg font-bold text-ink">
                    {m.headline(last, lang).value} <span className="text-sm font-medium text-muted">{m.headline(last, lang).unit}</span>
                  </span>
                  <LevelBadge level={last.summary.level} size="sm" label={m.headline(last, lang).label} />
                </div>
              </div>
              <Link to={`/history/${m.id}`} className="inline-flex items-center gap-1.5 rounded-xl bg-surface-2 px-3 py-2 text-sm font-semibold text-ink-2">
                <History className="h-4 w-4" /> {p.history}
              </Link>
            </div>
          </Card>
        ) : (
          <div className="text-sm text-muted">{t.notTakenYet}</div>
        )
      }
    />
  )
}

export function ExercisePage({ id }: { id: string }) {
  const e = exerciseById(id)
  const lang = useLang()
  const [stage, setStage] = useState<'intro' | 'run' | 'done'>('intro')
  const [runKey, setRunKey] = useState(0)
  const [last, setLast] = useState<{ seconds: number; score?: number; detail?: Record<string, number | string> } | null>(null)
  if (!e) return <NotFound />
  const Icon = e.icon
  if (stage === 'run') {
    const Runner = (e as ExerciseModule).Runner
    return (
      <div className={fieldById(e.field)?.accent}>
        <Runner
          key={runKey}
          onExit={() => leaveGuard(() => setStage('intro'))}
          onDone={(log) => {
            if (log.seconds >= 5) saveLog({ ...log, exerciseId: e.id })
            leaveGuard(() => {
              setLast(log)
              setStage('done')
            })
          }}
        />
      </div>
    )
  }
  if (stage === 'done' && last) {
    return (
      <ExerciseDone
        exercise={e}
        log={last}
        onAgain={() => {
          setRunKey((k) => k + 1)
          setStage('run')
        }}
        onBack={() => goBack(`/field/${e.field}`)}
      />
    )
  }
  return (
    <Intro
      kind="exercise"
      info={e.info[lang]}
      icon={<Icon className="h-6 w-6" />}
      minutes={e.minutes}
      requirements={e.requirements}
      field={e.field}
      onStart={() => {
        setRunKey((k) => k + 1)
        setStage('run')
        window.scrollTo({ top: 0 })
      }}
    />
  )
}
