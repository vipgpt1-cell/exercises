import { useEffect, useRef, useState } from 'react'
import { Headphones, Pause, Play, Volume2 } from 'lucide-react'
import { Stage } from '../../components/shell'
import { Button, Callout, cx } from '../../components/ui'
import { playTone, unlockAudio, type Ear } from '../../lib/audio'
import { shuffle } from '../../lib/rng'
import { fmtDate, useLang, useStrings } from '../../lib/i18n'
import { updateSettings, useSettings, type HearingCalibration } from '../../lib/store'
import { common } from '../../i18n/common'
import { setupStrings } from './setup-strings'
import { DEFAULT_REF_SPL, REF_DBFS } from './audiometry'

/** Verifies headphones are worn and not swapped. */
export function HeadphoneCheck({ onOk }: { onOk: () => void }) {
  const s = useStrings(setupStrings)
  const t = useStrings(common)
  const [order, setOrder] = useState<Ear[]>(() => shuffle(['left', 'right'] as Ear[]))
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Ear[]>([])
  const [played, setPlayed] = useState(false)
  const [outcome, setOutcome] = useState<'ok' | 'swapped' | 'speakers' | 'mixed' | null>(null)

  const play = async () => {
    await unlockAudio()
    playTone({ freq: 750, dbfs: -24, ear: order[idx], duration: 0.25, pulses: 3, gap: 0.15 })
    setPlayed(true)
  }
  const answer = (a: Ear) => {
    const next = [...answers, a]
    setAnswers(next)
    setPlayed(false)
    if (idx + 1 < order.length) {
      setIdx(idx + 1)
      return
    }
    if (next.some((x) => x === 'both')) setOutcome('speakers')
    else if (next.every((x, i) => x === order[i])) setOutcome('ok')
    else if (next.every((x, i) => x !== order[i])) setOutcome('swapped')
    else setOutcome('mixed')
  }
  const retry = () => {
    setOrder(shuffle(['left', 'right'] as Ear[]))
    setIdx(0)
    setAnswers([])
    setOutcome(null)
    setPlayed(false)
  }

  if (outcome) {
    return (
      <Stage
        icon={<Headphones className="h-8 w-8" />}
        title={s.lrTitle}
        footer={
          outcome === 'ok' ? (
            <Button variant="accent" size="lg" onClick={onOk}>
              {t.btn.continue}
            </Button>
          ) : (
            <Button variant="accent" size="lg" onClick={retry}>
              {t.btn.tryAgain}
            </Button>
          )
        }
      >
        <Callout tone={outcome === 'ok' ? 'success' : 'warn'}>
          {outcome === 'ok' ? s.lrOk : outcome === 'swapped' ? s.lrSwapped : outcome === 'mixed' ? s.lrMixed : s.lrSpeakers}
        </Callout>
      </Stage>
    )
  }

  return (
    <Stage
      icon={<Headphones className="h-8 w-8" />}
      title={s.lrTitle}
      footer={
        played ? (
          <div className="grid grid-cols-3 gap-2">
            <Button variant="secondary" size="lg" onClick={() => answer('left')}>
              {s.lrOnlyLeft}
            </Button>
            <Button variant="secondary" size="lg" onClick={() => answer('both')} className="text-sm">
              {s.lrBoth}
            </Button>
            <Button variant="secondary" size="lg" onClick={() => answer('right')}>
              {s.lrOnlyRight}
            </Button>
          </div>
        ) : (
          <Button variant="accent" size="lg" onClick={play} icon={<Volume2 className="h-5 w-5" />}>
            {s.lrPlay} ({idx + 1}/2)
          </Button>
        )
      }
    >
      <p>{played ? s.lrWhere : s.lrText}</p>
      {played && (
        <button type="button" onClick={play} className="mt-3 text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
          {t.btn.replay}
        </button>
      )}
      <p className="mt-4 text-sm text-muted">{s.bluetooth}</p>
    </Stage>
  )
}

/** Reference-tone volume calibration (stored for re-use). */
export function VolumeCalibration({ onDone }: { onDone: (cal: HearingCalibration) => void }) {
  const s = useStrings(setupStrings)
  const t = useStrings(common)
  const lang = useLang()
  const saved = useSettings().hearingCal
  const [mode, setMode] = useState<'choose' | 'set'>(saved ? 'choose' : 'set')
  const [playing, setPlaying] = useState(false)
  const [advanced, setAdvanced] = useState(false)
  const [meter, setMeter] = useState('')
  const timer = useRef<number | null>(null)

  useEffect(() => () => stopLoop(), [])
  const stopLoop = () => {
    if (timer.current !== null) window.clearInterval(timer.current)
    timer.current = null
  }
  const toggle = async () => {
    if (playing) {
      stopLoop()
      setPlaying(false)
      return
    }
    await unlockAudio()
    const beep = () => playTone({ freq: 1000, dbfs: REF_DBFS, ear: 'both', duration: 0.7, ramp: 0.03 })
    beep()
    timer.current = window.setInterval(beep, 1200)
    setPlaying(true)
  }
  const finish = () => {
    stopLoop()
    const m = Number(meter.replace(',', '.'))
    const cal: HearingCalibration = {
      refSpl: advanced && m >= 30 && m <= 110 ? m : DEFAULT_REF_SPL,
      corrections: {},
      method: advanced && m >= 30 && m <= 110 ? 'meter' : 'comfortable',
      date: new Date().toISOString(),
    }
    updateSettings({ hearingCal: cal })
    onDone(cal)
  }

  if (mode === 'choose' && saved) {
    return (
      <Stage
        icon={<Volume2 className="h-8 w-8" />}
        title={s.calTitle}
        footer={
          <>
            <Button variant="accent" size="lg" onClick={() => onDone(saved)}>
              {s.calReuse(fmtDate(lang, saved.date))}
            </Button>
            <Button variant="secondary" size="lg" onClick={() => setMode('set')}>
              {s.calNew}
            </Button>
          </>
        }
      >
        <p>{s.calReuseText}</p>
      </Stage>
    )
  }

  return (
    <Stage
      icon={<Volume2 className="h-8 w-8" />}
      title={s.calTitle}
      footer={
        <>
          <Button variant={playing ? 'secondary' : 'accent'} size="lg" onClick={toggle} icon={playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}>
            {playing ? t.btn.stop : t.btn.play}
          </Button>
          <Button variant="accent" size="lg" onClick={finish} className={cx(!playing && 'opacity-90')}>
            {s.calDone}
          </Button>
        </>
      }
    >
      <p>{s.calText}</p>
      {playing && <p className="animate-pulse-soft mt-3 text-sm font-semibold text-[var(--accent)]">{s.calPlaying}</p>}
      <div className="mt-5 text-left">
        <button type="button" className="text-sm font-semibold text-muted underline underline-offset-4" onClick={() => setAdvanced((a) => !a)}>
          {s.calAdvanced}
        </button>
        {advanced && (
          <div className="mt-3 rounded-2xl bg-surface-2 p-4 text-sm">
            <p className="text-ink-2">{s.calMeterText}</p>
            <label className="mt-3 block">
              <span className="mb-1 block font-semibold text-ink-2">{s.calMeterLabel}</span>
              <input
                inputMode="decimal"
                value={meter}
                onChange={(e) => setMeter(e.target.value)}
                placeholder="60"
                className="h-11 w-32 rounded-xl border border-line-strong bg-surface px-3 text-base text-ink outline-none focus:border-primary"
              />
            </label>
          </div>
        )}
      </div>
    </Stage>
  )
}
