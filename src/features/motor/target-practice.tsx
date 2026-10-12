import { useEffect, useRef, useState } from 'react'
import { Target } from 'lucide-react'
import type { ExerciseModule } from '../../catalog/types'
import { FocusShell, Stage } from '../../components/shell'
import { Button, Segmented } from '../../components/ui'
import { defineStrings, useStrings, type Lang } from '../../lib/i18n'
import { fx } from '../../lib/audio'
import { useElementSize, useInterval } from '../../lib/hooks'
import { common } from '../../i18n/common'

const GAME_S = 45

const S = defineStrings({
  en: {
    info: {
      name: 'Target practice',
      short: 'Tap targets as they pop up. Trains speed and accuracy.',
      measures: 'A 45-second game: targets pop up anywhere on the screen and get smaller as you get better. It trains hand–eye coordination, reaction and precise finger movements.',
      steps: ['Choose the starting size.', 'Tap each target as quickly as you can.', 'After every 5 hits the targets get smaller.'],
      tips: ['Use the hand you want to train.', 'Try to beat your best score.'],
    },
    size: 'Starting size',
    big: 'Big',
    medium: 'Medium',
    small: 'Small',
    begin: 'Begin',
    hits: 'Hits',
    accuracy: 'Accuracy',
    avgTime: 'Average time per target',
    level: 'Level',
  },
  uz: {
    info: {
      name: 'Nishon mashqi',
      short: 'Paydo bo‘lgan nishonlarni bosing. Tezlik va aniqlikni mashq qildiradi.',
      measures: '45 soniyalik o‘yin: nishonlar ekranning istalgan joyida paydo bo‘ladi va yaxshilangan sari kichrayadi. Qo‘l va ko‘z muvofiqligini, reaksiyani va barmoqning aniq harakatini mashq qildiradi.',
      steps: ['Boshlang‘ich o‘lchamni tanlang.', 'Har bir nishonni imkon qadar tez bosing.', 'Har 5 ta tegishdan keyin nishonlar kichrayadi.'],
      tips: ['Mashq qildirmoqchi bo‘lgan qo‘lingiz bilan bajaring.', 'Eng yaxshi natijangizni yangilashga harakat qiling.'],
    },
    size: 'Boshlang‘ich o‘lcham',
    big: 'Katta',
    medium: 'O‘rtacha',
    small: 'Kichik',
    begin: 'Boshlash',
    hits: 'Tegishlar',
    accuracy: 'Aniqlik',
    avgTime: 'Bir nishonga o‘rtacha vaqt',
    level: 'Daraja',
  },
  ru: {
    info: {
      name: 'Цели',
      short: 'Нажимайте на появляющиеся цели. Тренирует скорость и точность.',
      measures: 'Игра на 45 секунд: цели появляются в любом месте экрана и становятся меньше по мере ваших успехов. Тренирует координацию «рука — глаз», реакцию и точные движения пальцев.',
      steps: ['Выберите начальный размер.', 'Нажимайте на каждую цель как можно быстрее.', 'После каждых 5 попаданий цели становятся меньше.'],
      tips: ['Работайте той рукой, которую хотите тренировать.', 'Постарайтесь побить свой лучший результат.'],
    },
    size: 'Начальный размер',
    big: 'Большие',
    medium: 'Средние',
    small: 'Маленькие',
    begin: 'Начать',
    hits: 'Попадания',
    accuracy: 'Точность',
    avgTime: 'Среднее время на цель',
    level: 'Уровень',
  },
})

function Runner({ onDone, onExit }: { onDone: (l: { seconds: number; score?: number; detail?: Record<string, number | string> }) => void; onExit: () => void }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const [ref, { width, height }] = useElementSize<HTMLDivElement>()
  const [startSize, setStartSize] = useState(0.2)
  const [running, setRunning] = useState(false)
  const [target, setTarget] = useState<{ x: number; y: number; r: number } | null>(null)
  const [hits, setHits] = useState(0)
  const [left, setLeft] = useState(GAME_S)
  const misses = useRef(0)
  const times = useRef<number[]>([])
  const shownAt = useRef(0)
  const start = useRef(0)
  const hitsRef = useRef(0)

  const place = (h: number) => {
    const S0 = Math.min(width, height)
    const r = Math.max(16, (startSize * S0 * Math.pow(0.88, Math.floor(h / 5))) / 2)
    setTarget({ x: r + Math.random() * (width - 2 * r), y: r + Math.random() * (height - 2 * r), r })
    shownAt.current = performance.now()
  }
  const begin = () => {
    hitsRef.current = 0
    setHits(0)
    misses.current = 0
    times.current = []
    start.current = performance.now()
    setLeft(GAME_S)
    setRunning(true)
  }
  useEffect(() => {
    if (running && width > 0 && !target) place(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, width])
  useInterval(
    () => {
      const l = GAME_S - (performance.now() - start.current) / 1000
      setLeft(Math.max(0, l))
      if (l <= 0) {
        setRunning(false)
        fx('done')
        const total = hitsRef.current + misses.current
        const acc = total ? Math.round((hitsRef.current / total) * 100) : 0
        const avg = times.current.length ? Math.round(times.current.reduce((a, b) => a + b, 0) / times.current.length) : 0
        onDone({ seconds: GAME_S, score: hitsRef.current, detail: { hits: hitsRef.current, accuracy: acc, avgMs: avg, level: Math.floor(hitsRef.current / 5) + 1 } })
      }
    },
    running ? 200 : null,
  )

  return (
    <FocusShell
      title={s.info.name}
      subtitle={running ? `${s.hits}: ${hits} · ${s.level} ${Math.floor(hits / 5) + 1}` : undefined}
      progress={running ? 1 - left / GAME_S : null}
      right={running ? <span className="tabular rounded-lg bg-surface-2 px-2.5 py-1 text-sm font-bold text-ink">{Math.ceil(left)} {t.seconds}</span> : undefined}
      onExit={onExit}
    >
      {!running ? (
        <Stage
          icon={<Target className="h-8 w-8" />}
          title={s.size}
          footer={
            <Button variant="accent" size="lg" onClick={begin}>
              {s.begin}
            </Button>
          }
        >
          <Segmented
            value={startSize}
            onChange={setStartSize}
            options={[
              { value: 0.26, label: s.big },
              { value: 0.2, label: s.medium },
              { value: 0.13, label: s.small },
            ]}
          />
        </Stage>
      ) : (
        <div
          ref={ref}
          className="no-touch-scroll relative flex-1 overflow-hidden rounded-3xl bg-surface shadow-card"
          style={{ minHeight: '60vh' }}
          onPointerDown={(e) => {
            e.preventDefault()
            if (!target) return
            const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
            const x = e.clientX - r.left
            const y = e.clientY - r.top
            if (Math.hypot(x - target.x, y - target.y) <= target.r) {
              fx('tap')
              times.current.push(performance.now() - shownAt.current)
              hitsRef.current++
              setHits(hitsRef.current)
              place(hitsRef.current)
            } else {
              misses.current++
              fx('bad')
            }
          }}
        >
          {target && (
            <div
              key={`${target.x}-${target.y}`}
              className="animate-pop pointer-events-none absolute rounded-full"
              style={{
                left: target.x - target.r,
                top: target.y - target.r,
                width: target.r * 2,
                height: target.r * 2,
                background: 'radial-gradient(circle, var(--surface) 0 18%, var(--accent) 19% 42%, var(--surface) 43% 58%, var(--accent) 59%)',
              }}
            />
          )}
        </div>
      )}
    </FocusShell>
  )
}

const targetPractice: ExerciseModule = {
  kind: 'exercise',
  id: 'target-practice',
  field: 'hands',
  icon: Target,
  minutes: 1,
  requirements: ['touch'],
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  describe: (log, lang: Lang) => [
    { label: S[lang].hits, value: String(log.detail?.hits ?? log.score ?? 0) },
    { label: S[lang].accuracy, value: `${log.detail?.accuracy ?? 0}%` },
    { label: S[lang].avgTime, value: `${log.detail?.avgMs ?? 0} ${common[lang].ms}` },
  ],
}

export default targetPractice
