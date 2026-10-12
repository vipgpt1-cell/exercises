import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { FocusShell } from '../shell'
import { Button, Callout, IconButton, cx } from '../ui'
import { Ring } from '../charts'
import { defineStrings, useLang, useStrings } from '../../lib/i18n'
import { fx, vibrate } from '../../lib/audio'
import { speak, stopSpeaking } from '../../lib/speech'
import { common } from '../../i18n/common'
import { Animated, BodyFront, BodySide, HandFront, HeadFront, HeadSide, PulseCircle, WristSide, type Pose } from './figures'

export type FigureKind = 'body' | 'bodyFront' | 'headFront' | 'headSide' | 'hand' | 'wrist' | 'pulse'

export interface FigureSpec {
  kind: FigureKind
  frames: Pose[]
  floor?: boolean
  mat?: boolean
}

export interface RoutineStep {
  id: string
  name: string
  cue: string
  mode: 'reps' | 'hold' | 'timed'
  reps?: number
  /** seconds per repetition */
  tempo?: number
  /** hold duration (s) */
  hold?: number
  /** number of holds */
  sets?: number
  /** perform on both sides */
  sides?: boolean
  /** duration for timed steps (s) */
  seconds?: number
  figure: FigureSpec
  caution?: string
}

const T = defineStrings({
  en: {
    getReady: 'Get ready',
    next: 'Next',
    upNext: 'Up next',
    rest: 'Rest',
    rep: (i: number, n: number) => `${i} / ${n}`,
    reps: 'reps',
    hold: 'Hold',
    relax: 'Relax',
    switchSides: 'Other side',
    left: 'Left side',
    right: 'Right side',
    set: (i: number, n: number) => `Set ${i} of ${n}`,
    paused: 'Paused',
    exercise: (i: number, n: number) => `Exercise ${i} of ${n}`,
    stopIfPain: 'Stop if you feel sharp pain, numbness or dizziness.',
    finish: 'Finish',
  },
  uz: {
    getReady: 'Tayyorlaning',
    next: 'Keyingisi',
    upNext: 'Keyingi mashq',
    rest: 'Dam oling',
    rep: (i: number, n: number) => `${i} / ${n}`,
    reps: 'marta',
    hold: 'Ushlab turing',
    relax: 'Bo‘shashing',
    switchSides: 'Boshqa tomon',
    left: 'Chap tomon',
    right: 'O‘ng tomon',
    set: (i: number, n: number) => `${i}-yondashuv, jami ${n}`,
    paused: 'Pauza',
    exercise: (i: number, n: number) => `${i}-mashq, jami ${n}`,
    stopIfPain: 'O‘tkir og‘riq, uvishish yoki bosh aylanishi bo‘lsa, to‘xtating.',
    finish: 'Tugatish',
  },
  ru: {
    getReady: 'Приготовьтесь',
    next: 'Далее',
    upNext: 'Дальше',
    rest: 'Отдых',
    rep: (i: number, n: number) => `${i} / ${n}`,
    reps: 'повторов',
    hold: 'Удерживайте',
    relax: 'Расслабьтесь',
    switchSides: 'Другая сторона',
    left: 'Левая сторона',
    right: 'Правая сторона',
    set: (i: number, n: number) => `Подход ${i} из ${n}`,
    paused: 'Пауза',
    exercise: (i: number, n: number) => `Упражнение ${i} из ${n}`,
    stopIfPain: 'Прекратите при острой боли, онемении или головокружении.',
    finish: 'Завершить',
  },
})

type SegType = 'prep' | 'work' | 'relax' | 'switch' | 'rest'
interface Segment {
  step: number
  type: SegType
  duration: number
  side?: 'left' | 'right'
  set?: number
  sets?: number
}

const PREP = 4
const REST = 6

export function stepDuration(s: RoutineStep) {
  const sides = s.sides ? 2 : 1
  const work = s.mode === 'reps' ? (s.reps ?? 10) * (s.tempo ?? 3) : s.mode === 'hold' ? (s.hold ?? 20) * (s.sets ?? 1) + Math.max(0, (s.sets ?? 1) - 1) * 4 : s.seconds ?? 30
  return work * sides + (s.sides ? 4 : 0)
}

function buildSegments(steps: RoutineStep[]): Segment[] {
  const out: Segment[] = []
  steps.forEach((s, i) => {
    out.push({ step: i, type: 'prep', duration: PREP })
    const sides: ('left' | 'right' | undefined)[] = s.sides ? ['left', 'right'] : [undefined]
    sides.forEach((side, si) => {
      if (si > 0) out.push({ step: i, type: 'switch', duration: 4, side })
      if (s.mode === 'hold') {
        const sets = s.sets ?? 1
        for (let k = 0; k < sets; k++) {
          if (k > 0) out.push({ step: i, type: 'relax', duration: 4, side })
          out.push({ step: i, type: 'work', duration: s.hold ?? 20, side, set: k + 1, sets })
        }
      } else if (s.mode === 'reps') out.push({ step: i, type: 'work', duration: (s.reps ?? 10) * (s.tempo ?? 3), side })
      else out.push({ step: i, type: 'work', duration: s.seconds ?? 30, side })
    })
    if (i < steps.length - 1) out.push({ step: i, type: 'rest', duration: REST })
  })
  return out
}

export function Figure({ spec, pose, mirror }: { spec: FigureSpec; pose: Pose; mirror: boolean }) {
  const inner = (() => {
    switch (spec.kind) {
      case 'body':
        return <BodySide p={pose} floor={spec.floor !== false} mat={spec.mat} />
      case 'bodyFront':
        return <BodyFront p={pose} />
      case 'headFront':
        return <HeadFront p={pose} />
      case 'headSide':
        return <HeadSide p={pose} />
      case 'hand':
        return <HandFront p={pose} />
      case 'wrist':
        return <WristSide p={pose} />
      default:
        return <PulseCircle p={pose} />
    }
  })()
  return <div className="h-full w-full" style={mirror ? { transform: 'scaleX(-1)' } : undefined}>{inner}</div>
}

export function RoutinePlayer({ title, steps, onDone, onExit }: { title: string; steps: RoutineStep[]; onDone: (l: { seconds: number; detail?: Record<string, number | string> }) => void; onExit: () => void }) {
  const t = useStrings(T)
  const c = useStrings(common)
  const lang = useLang()
  const segments = useMemo(() => buildSegments(steps), [steps])
  const [si, setSi] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const start = useRef(performance.now())
  const segStart = useRef(performance.now())
  const pausedAt = useRef<number | null>(null)
  const seg = segments[si]
  const step = steps[seg.step]

  // Announce segment changes
  useEffect(() => {
    if (seg.type === 'prep') {
      speak(`${step.name}. ${step.cue}`, lang)
      fx('soft')
    } else if (seg.type === 'work') {
      fx('go')
      vibrate(40)
      if (step.mode === 'hold') speak(t.hold, lang, { interrupt: false })
    } else if (seg.type === 'switch') {
      speak(t.switchSides, lang)
      fx('soft')
    } else if (seg.type === 'relax') speak(t.relax, lang)
    else if (seg.type === 'rest') fx('done')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [si])
  useEffect(() => () => stopSpeaking(), [])

  // Clock
  useEffect(() => {
    const id = window.setInterval(() => {
      if (pausedAt.current !== null) return
      const el = (performance.now() - segStart.current) / 1000
      setElapsed(el)
      const s = segments[si]
      // rep ticks
      if (s.type === 'work' && steps[s.step].mode === 'reps') {
        const tempo = steps[s.step].tempo ?? 3
        const prevRep = Math.floor((el - 0.1) / tempo)
        const rep = Math.floor(el / tempo)
        if (rep > prevRep && rep > 0 && el < s.duration) fx('tick')
      }
      if (s.type !== 'rest' && s.type !== 'prep' && s.duration - el <= 3 && s.duration - el > 2.9 && steps[s.step].mode !== 'reps') fx('tick')
      if (el >= s.duration) advance(1)
    }, 100)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [si, segments])

  const advance = (dir: 1 | -1) => {
    const next = si + dir
    if (next >= segments.length) {
      fx('done')
      onDone({ seconds: Math.round((performance.now() - start.current) / 1000), detail: { exercises: steps.length } })
      return
    }
    if (next < 0) return
    segStart.current = performance.now()
    setElapsed(0)
    setSi(next)
  }
  const jumpStep = (dir: 1 | -1) => {
    const target = Math.max(0, Math.min(steps.length - 1, seg.step + dir))
    if (dir === 1 && seg.step === steps.length - 1) {
      advance(1)
      return
    }
    const idx = segments.findIndex((x) => x.step === target && x.type === 'prep')
    segStart.current = performance.now()
    setElapsed(0)
    setSi(idx)
  }
  const togglePause = () => {
    if (pausedAt.current === null) {
      pausedAt.current = performance.now()
      setPaused(true)
      stopSpeaking()
    } else {
      segStart.current += performance.now() - pausedAt.current
      pausedAt.current = null
      setPaused(false)
    }
  }

  const remaining = Math.max(0, seg.duration - elapsed)
  const progress = segments.slice(0, si).reduce((a, x) => a + x.duration, 0) + Math.min(elapsed, seg.duration)
  const total = segments.reduce((a, x) => a + x.duration, 0)
  const showStep = seg.type === 'rest' ? steps[seg.step + 1] : step
  const frames =
    seg.type === 'work' && step.mode === 'hold'
      ? [step.figure.frames[step.figure.frames.length - 1]]
      : seg.type === 'work' || seg.type === 'prep'
        ? step.figure.frames
        : [showStep.figure.frames[0]]
  const period = step.mode === 'reps' ? (step.tempo ?? 3) : step.mode === 'timed' ? (step.tempo ?? 4) : 3
  const repNow = step.mode === 'reps' ? Math.min(step.reps ?? 10, Math.floor(elapsed / (step.tempo ?? 3)) + 1) : 0
  const mirror = seg.side === 'left'

  let label = ''
  if (seg.type === 'prep') label = t.getReady
  else if (seg.type === 'rest') label = t.rest
  else if (seg.type === 'switch') label = t.switchSides
  else if (seg.type === 'relax') label = t.relax
  else if (step.mode === 'hold') label = t.hold
  const sideLabel = seg.side === 'left' ? t.left : seg.side === 'right' ? t.right : null

  return (
    <FocusShell
      title={title}
      subtitle={t.exercise(seg.step + 1, steps.length)}
      progress={progress / total}
      onExit={onExit}
      right={
        <IconButton label={paused ? c.btn.resume : c.btn.pause} onClick={togglePause}>
          {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
        </IconButton>
      }
    >
      <div className="flex flex-1 flex-col items-center gap-4">
        <div className="text-center">
          {seg.type === 'rest' && <div className="text-xs font-semibold uppercase tracking-wider text-muted">{t.upNext}</div>}
          <h2 className="text-2xl font-extrabold tracking-tight text-ink text-balance">{showStep.name}</h2>
          {sideLabel && seg.type !== 'rest' && <div className="mt-1 inline-flex rounded-full bg-[var(--accent-soft)] px-3 py-0.5 text-sm font-bold text-[var(--accent)]">{sideLabel}</div>}
        </div>
        <div className={cx('relative aspect-[200/170] w-full max-w-sm rounded-3xl bg-surface shadow-card', (seg.type === 'rest' || paused) && 'opacity-60')}>
          <Animated
            frames={frames}
            period={period}
            paused={paused || seg.type === 'rest' || seg.type === 'switch'}
            render={(pose) => <Figure spec={showStep === step ? step.figure : showStep.figure} pose={pose} mirror={mirror} />}
          />
        </div>
        <p className="max-w-md text-center text-[0.98rem] leading-relaxed text-ink-2">{showStep.cue}</p>
        <div className="flex items-center gap-5">
          <Ring value={seg.duration ? remaining / seg.duration : 0} size={104} stroke={8}>
            {seg.type === 'work' && step.mode === 'reps' ? (
              <>
                <span className="text-2xl font-black tabular text-ink">{t.rep(repNow, step.reps ?? 10)}</span>
                <span className="text-[0.65rem] font-medium text-muted">{t.reps}</span>
              </>
            ) : (
              <>
                <span className="text-3xl font-black tabular text-ink">{Math.ceil(remaining)}</span>
                <span className="text-[0.65rem] font-semibold uppercase text-muted">{label}</span>
              </>
            )}
          </Ring>
          {seg.type === 'work' && step.mode === 'hold' && (seg.sets ?? 1) > 1 && <div className="text-sm font-semibold text-muted">{t.set(seg.set ?? 1, seg.sets ?? 1)}</div>}
        </div>
        {showStep.caution && seg.type === 'prep' && <Callout tone="warn">{showStep.caution}</Callout>}
        <div className="pb-safe mt-auto grid w-full max-w-md grid-cols-[auto_1fr_auto] items-center gap-3">
          <IconButton label={c.btn.back} onClick={() => jumpStep(-1)} className="h-12 w-12 bg-surface-2">
            <ChevronLeft className="h-6 w-6" />
          </IconButton>
          <Button variant={paused ? 'accent' : 'secondary'} size="lg" onClick={togglePause} icon={paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}>
            {paused ? c.btn.resume : c.btn.pause}
          </Button>
          <IconButton label={t.next} onClick={() => jumpStep(1)} className="h-12 w-12 bg-surface-2">
            <ChevronRight className="h-6 w-6" />
          </IconButton>
        </div>
        <p className="text-center text-xs text-muted">{t.stopIfPain}</p>
      </div>
    </FocusShell>
  )
}
