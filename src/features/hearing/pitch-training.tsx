import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Music } from 'lucide-react'
import type { ExerciseModule } from '../../catalog/types'
import { FocusShell, Stage } from '../../components/shell'
import { Button, cx } from '../../components/ui'
import { defineStrings, fmtNum, useLang, useStrings, type Lang } from '../../lib/i18n'
import { fx, getCtx, playTone, unlockAudio } from '../../lib/audio'
import { useKey } from '../../lib/hooks'
import { geoMean } from '../../lib/stats'
import { common } from '../../i18n/common'

const TRIALS = 30

const S = defineStrings({
  en: {
    info: {
      name: 'Pitch training',
      short: 'Higher or lower? Train your ear to hear small differences.',
      measures: 'Two tones play one after the other, and you decide whether the second was higher or lower. As you get better, the difference gets smaller. This trains the hearing part of the brain, which helps you follow speech.',
      steps: ['Listen to two tones.', 'Tap “Higher” or “Lower”.', 'The task adjusts to your level. 30 rounds, about 3 minutes.'],
      tips: ['Use headphones for the clearest sound.', 'Listen to the whole second tone before you answer.'],
    },
    question: 'Was the second tone higher or lower?',
    higher: 'Higher',
    lower: 'Lower',
    listen: 'Listen…',
    diff: 'Difference now',
    begin: 'Begin',
    threshold: 'Smallest difference you heard',
    at1k: 'At 1000 Hz, that is',
    hz: 'Hz',
  },
  uz: {
    info: {
      name: 'Tovush farqini sezish',
      short: 'Ingichkaroqmi yoki yo‘g‘onroq? Quloqni kichik farqlarga o‘rgating.',
      measures: 'Ketma-ket ikkita tovush eshitiladi, siz ikkinchisi ingichkaroq yoki yo‘g‘onroq ekanini aytasiz. Yaxshilangan sari farq kichrayib boradi. Bu miyaning eshitish qismini mashq qildiradi va gapni tushunishga yordam beradi.',
      steps: ['Ikkita tovushni tinglang.', '“Ingichkaroq” yoki “Yo‘g‘onroq”ni bosing.', 'Topshiriq darajangizga moslashadi. 30 ta raund, taxminan 3 daqiqa.'],
      tips: ['Aniq eshitish uchun quloqchindan foydalaning.', 'Javob berishdan oldin ikkinchi tovushni oxirigacha tinglang.'],
    },
    question: 'Ikkinchi tovush ingichkaroqmi yoki yo‘g‘onroq?',
    higher: 'Ingichkaroq',
    lower: 'Yo‘g‘onroq',
    listen: 'Tinglang…',
    diff: 'Hozirgi farq',
    begin: 'Boshlash',
    threshold: 'Siz sezgan eng kichik farq',
    at1k: '1000 Gs da bu',
    hz: 'Gs',
  },
  ru: {
    info: {
      name: 'Различение высоты звука',
      short: 'Выше или ниже? Учим слух замечать небольшую разницу.',
      measures: 'Звучат два тона подряд, а вы решаете, второй выше или ниже. Чем лучше получается, тем меньше разница. Это тренирует слуховые отделы мозга и помогает понимать речь.',
      steps: ['Послушайте два тона.', 'Нажмите «Выше» или «Ниже».', 'Задание подстраивается под ваш уровень. 30 раундов, около 3 минут.'],
      tips: ['Для самого чистого звука используйте наушники.', 'Дослушайте второй тон до конца, прежде чем отвечать.'],
    },
    question: 'Второй тон был выше или ниже?',
    higher: 'Выше',
    lower: 'Ниже',
    listen: 'Слушайте…',
    diff: 'Разница сейчас',
    begin: 'Начать',
    threshold: 'Самая маленькая разница, которую вы услышали',
    at1k: 'На 1000 Гц это',
    hz: 'Гц',
  },
})

const centsToHzAt1k = (c: number) => 1000 * (Math.pow(2, c / 1200) - 1)
/** Pitch difference as a percentage of the base frequency (easier to read than musical cents). */
const centsToPct = (c: number) => (Math.pow(2, c / 1200) - 1) * 100

function Runner({ onDone, onExit }: { onDone: (l: { seconds: number; score?: number; detail?: Record<string, number | string> }) => void; onExit: () => void }) {
  const s = useStrings(S)
  const lang = useLang()
  const [started, setStarted] = useState(false)
  const [trial, setTrial] = useState(0)
  const [state, setState] = useState<'playing' | 'answer' | 'feedback'>('playing')
  const [last, setLast] = useState<boolean | null>(null)
  const delta = useRef(200)
  const [shownDelta, setShownDelta] = useState(200)
  const streak = useRef(0)
  const dirUp = useRef<boolean | null>(null)
  const lastMove = useRef<'down' | 'up' | null>(null)
  const reversals = useRef<number[]>([])
  const correctN = useRef(0)
  const t0 = useRef(0)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const play = async () => {
    setState('playing')
    const ctx = getCtx()
    const base = 350 * Math.pow(4, Math.random()) // 350–1400 Hz, log-uniform
    const up = Math.random() < 0.5
    dirUp.current = up
    const f2 = base * Math.pow(2, ((up ? 1 : -1) * delta.current) / 1200)
    const t = ctx.currentTime + 0.25
    playTone({ freq: base, dbfs: -22, duration: 0.4, when: t, ramp: 0.03 })
    playTone({ freq: f2, dbfs: -22, duration: 0.4, when: t + 0.75, ramp: 0.03 })
    await new Promise((r) => setTimeout(r, 1500))
    if (alive.current) setState('answer')
  }

  const begin = async () => {
    await unlockAudio()
    t0.current = performance.now()
    setStarted(true)
    play()
  }

  const answer = async (up: boolean) => {
    if (state !== 'answer') return
    const ok = up === dirUp.current
    setLast(ok)
    setState('feedback')
    fx(ok ? 'good' : 'bad')
    if (ok) correctN.current++
    // 2-down / 1-up (converges on 70.7 % correct)
    let move: 'down' | 'up' | null = null
    if (ok) {
      streak.current++
      if (streak.current >= 2) {
        streak.current = 0
        move = 'down'
      }
    } else {
      streak.current = 0
      move = 'up'
    }
    if (move) {
      if (lastMove.current && lastMove.current !== move) reversals.current.push(delta.current)
      lastMove.current = move
      delta.current = Math.min(700, Math.max(2, move === 'down' ? delta.current * 0.7 : delta.current / 0.7))
      setShownDelta(delta.current)
    }
    const n = trial + 1
    setTrial(n)
    await new Promise((r) => setTimeout(r, 700))
    if (!alive.current) return
    if (n >= TRIALS) {
      const rev = reversals.current.slice(-6)
      const thr = rev.length ? geoMean(rev) : delta.current
      onDone({
        seconds: Math.round((performance.now() - t0.current) / 1000),
        score: Math.round(thr),
        detail: { thresholdCents: Math.round(thr), accuracy: Math.round((correctN.current / TRIALS) * 100) },
      })
      return
    }
    play()
  }
  useKey(['ArrowUp'], () => answer(true), started)
  useKey(['ArrowDown'], () => answer(false), started)

  return (
    <FocusShell title={s.info.name} progress={started ? trial / TRIALS : null} onExit={onExit} subtitle={started ? `${trial + 1} / ${TRIALS}` : undefined}>
      {!started ? (
        <Stage
          icon={<Music className="h-8 w-8" />}
          title={s.question}
          footer={
            <Button variant="accent" size="lg" onClick={begin}>
              {s.begin}
            </Button>
          }
        >
          <p>{s.info.steps.join(' ')}</p>
        </Stage>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-between gap-6">
          <div className="mt-6 text-center">
            <div
              className={cx(
                'mx-auto flex h-28 w-28 items-center justify-center rounded-full transition-colors',
                state === 'feedback' ? (last ? 'bg-great-soft text-great' : 'bg-urgent-soft text-urgent') : 'bg-[var(--accent-soft)] text-[var(--accent)]',
              )}
            >
              <Music className={cx('h-12 w-12', state === 'playing' && 'animate-pulse-soft')} />
            </div>
            <p className="mt-5 text-lg font-semibold text-ink">{state === 'playing' ? s.listen : s.question}</p>
            <p className="mt-2 text-sm text-muted">
              {s.diff}: <span className="tabular font-semibold text-ink-2">{fmtNum(lang, centsToPct(shownDelta), 1)}%</span>
            </p>
          </div>
          <div className="pb-safe grid w-full max-w-md grid-cols-2 gap-3">
            <Button variant="secondary" size="xl" disabled={state !== 'answer'} onClick={() => answer(false)} icon={<ArrowDown className="h-6 w-6" />}>
              {s.lower}
            </Button>
            <Button variant="accent" size="xl" disabled={state !== 'answer'} onClick={() => answer(true)} icon={<ArrowUp className="h-6 w-6" />}>
              {s.higher}
            </Button>
          </div>
        </div>
      )}
    </FocusShell>
  )
}

const pitchTraining: ExerciseModule = {
  kind: 'exercise',
  id: 'pitch-training',
  field: 'hearing',
  icon: Music,
  minutes: 3,
  requirements: ['headphones', 'keyboard'],
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  describe: (log, lang: Lang) => {
    const c = Number(log.detail?.thresholdCents ?? log.score ?? 0)
    return [
      { label: S[lang].threshold, value: `${fmtNum(lang, centsToPct(c), 1)}%` },
      { label: S[lang].at1k, value: `${fmtNum(lang, centsToHzAt1k(c), 1)} ${S[lang].hz}` },
      { label: common[lang].accuracy, value: `${log.detail?.accuracy ?? 0}%` },
    ]
  },
}

export default pitchTraining
