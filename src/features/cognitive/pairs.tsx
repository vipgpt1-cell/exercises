import { useRef, useState } from 'react'
import { Anchor, Apple, Bell, Bird, Car, Cherry, Cloud, Fish, Flower2, Heart, Leaf, Moon, Star, Sun, Umbrella, Copy, type LucideIcon } from 'lucide-react'
import type { ExerciseModule } from '../../catalog/types'
import { FocusShell, Stage } from '../../components/shell'
import { Button, Segmented, cx } from '../../components/ui'
import { defineStrings, fmtNum, useLang, useStrings, type Lang } from '../../lib/i18n'
import { fx } from '../../lib/audio'
import { useInterval } from '../../lib/hooks'
import { shuffle } from '../../lib/rng'
import { common } from '../../i18n/common'

const ICONS: [LucideIcon, string][] = [
  [Apple, '#ef4444'],
  [Sun, '#f59e0b'],
  [Moon, '#6366f1'],
  [Star, '#eab308'],
  [Heart, '#ec4899'],
  [Fish, '#0ea5e9'],
  [Flower2, '#d946ef'],
  [Leaf, '#22c55e'],
  [Bird, '#14b8a6'],
  [Car, '#3b82f6'],
  [Anchor, '#64748b'],
  [Bell, '#f97316'],
  [Cherry, '#dc2626'],
  [Cloud, '#38bdf8'],
  [Umbrella, '#8b5cf6'],
]

const LEVELS = [
  { id: 'easy', cols: 3, rows: 4 },
  { id: 'medium', cols: 4, rows: 4 },
  { id: 'hard', cols: 4, rows: 5 },
] as const

const S = defineStrings({
  en: {
    info: {
      name: 'Memory pairs',
      short: 'Find matching cards. Trains visual memory.',
      measures: 'Turn over two cards at a time and find all the pairs in as few moves as you can. This trains your memory for pictures and places.',
      steps: ['Choose how hard it should be.', 'Tap two cards to turn them over.', 'Matching cards stay open. Remember where the others are.'],
      tips: ['Try to remember where each picture was.', 'Aim for fewer moves each time.'],
    },
    level: 'How hard?',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    begin: 'Begin',
    moves: 'Moves',
    pairs: 'Pairs',
    stars: 'Rating',
  },
  uz: {
    info: {
      name: 'Juftliklar',
      short: 'Bir xil kartalarni toping. Ko‘rish xotirasini mashq qildiradi.',
      measures: 'Bir vaqtda ikkita kartani oching va barcha juftlarni imkon qadar kam yurish bilan toping. Bu rasmlar va joylarni eslab qolishni mashq qildiradi.',
      steps: ['Qiyinlik darajasini tanlang.', 'Ikkita kartani ochish uchun ularni bosing.', 'Bir xil kartalar ochiq qoladi. Qolganlari qayerdaligini eslab qoling.'],
      tips: ['Har bir rasm qayerda bo‘lganini eslab qolishga harakat qiling.', 'Har safar kamroq yurishga intiling.'],
    },
    level: 'Qanchalik qiyin?',
    easy: 'Oson',
    medium: 'O‘rtacha',
    hard: 'Qiyin',
    begin: 'Boshlash',
    moves: 'Yurishlar',
    pairs: 'Juftlar',
    stars: 'Baho',
  },
  ru: {
    info: {
      name: 'Пары',
      short: 'Найдите одинаковые карточки. Тренирует зрительную память.',
      measures: 'Открывайте по две карточки и найдите все пары за как можно меньшее число ходов. Это тренирует память на картинки и их расположение.',
      steps: ['Выберите сложность.', 'Нажмите на две карточки, чтобы открыть их.', 'Одинаковые карточки остаются открытыми. Запоминайте, где лежат остальные.'],
      tips: ['Старайтесь запомнить, где была каждая картинка.', 'Каждый раз старайтесь уложиться в меньшее число ходов.'],
    },
    level: 'Сложность',
    easy: 'Легко',
    medium: 'Средне',
    hard: 'Сложно',
    begin: 'Начать',
    moves: 'Ходы',
    pairs: 'Пары',
    stars: 'Оценка',
  },
})

export const pairStars = (moves: number, pairs: number) => (moves <= pairs * 1.4 ? 3 : moves <= pairs * 2 ? 2 : 1)

function Runner({ onDone, onExit }: { onDone: (l: { seconds: number; score?: number; detail?: Record<string, number | string> }) => void; onExit: () => void }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const lang = useLang()
  const [levelId, setLevelId] = useState<(typeof LEVELS)[number]['id']>('easy')
  const [cards, setCards] = useState<number[]>([])
  const [open, setOpen] = useState<number[]>([])
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [moves, setMoves] = useState(0)
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const t0 = useRef(0)
  const lock = useRef(false)
  const level = LEVELS.find((l) => l.id === levelId)!
  const pairsN = (level.cols * level.rows) / 2
  useInterval(() => setElapsed((performance.now() - t0.current) / 1000), running ? 500 : null)

  const begin = () => {
    const ids = shuffle(ICONS.map((_, i) => i)).slice(0, pairsN)
    setCards(shuffle([...ids, ...ids]))
    setOpen([])
    setMatched(new Set())
    setMoves(0)
    t0.current = performance.now()
    setRunning(true)
  }

  const flip = (i: number) => {
    if (lock.current || open.includes(i) || matched.has(cards[i])) return
    fx('tap')
    const o = [...open, i]
    setOpen(o)
    if (o.length < 2) return
    const m = moves + 1
    setMoves(m)
    lock.current = true
    if (cards[o[0]] === cards[o[1]]) {
      const mm = new Set(matched)
      mm.add(cards[i])
      setTimeout(() => {
        fx('good')
        setMatched(mm)
        setOpen([])
        lock.current = false
        if (mm.size === pairsN) {
          fx('done')
          setRunning(false)
          const secs = Math.round((performance.now() - t0.current) / 1000)
          setTimeout(() => onDone({ seconds: secs, score: m, detail: { level: levelId, moves: m, pairs: pairsN, stars: pairStars(m, pairsN) } }), 700)
        }
      }, 350)
    } else {
      setTimeout(() => {
        setOpen([])
        lock.current = false
      }, 850)
    }
  }

  return (
    <FocusShell
      title={s.info.name}
      subtitle={running ? `${s.pairs}: ${matched.size}/${pairsN} · ${s.moves}: ${moves}` : undefined}
      progress={running ? matched.size / pairsN : null}
      right={running ? <span className="tabular rounded-lg bg-surface-2 px-2.5 py-1 text-sm font-bold text-ink">{fmtNum(lang, elapsed, 0)} {t.seconds}</span> : undefined}
      onExit={onExit}
    >
      {!running && cards.length === 0 && (
        <Stage
          icon={<Copy className="h-8 w-8" />}
          title={s.level}
          footer={
            <Button variant="accent" size="lg" onClick={begin}>
              {s.begin}
            </Button>
          }
        >
          <Segmented value={levelId} onChange={setLevelId} options={LEVELS.map((l) => ({ value: l.id, label: `${s[l.id]} ${l.cols}×${l.rows}` }))} />
        </Stage>
      )}
      {cards.length > 0 && (
        <div className="flex flex-1 items-center justify-center">
          <div className="grid w-full max-w-md gap-2.5" style={{ gridTemplateColumns: `repeat(${level.cols}, minmax(0, 1fr))` }}>
            {cards.map((c, i) => {
              const up = open.includes(i) || matched.has(c)
              const [Icon, color] = ICONS[c]
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => flip(i)}
                  className={cx(
                    'flex aspect-[4/5] items-center justify-center rounded-2xl border-2 shadow-sm transition-all duration-200',
                    up ? 'border-line bg-surface' : 'border-transparent bg-[var(--accent)] hover:brightness-110',
                    matched.has(c) && 'opacity-60',
                  )}
                  aria-label={up ? 'card' : 'hidden card'}
                >
                  {up ? <Icon className="animate-pop h-1/2 w-1/2" style={{ color }} strokeWidth={2.2} /> : <span className="text-2xl font-black text-white/70">?</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </FocusShell>
  )
}

const pairs: ExerciseModule = {
  kind: 'exercise',
  id: 'memory-pairs',
  field: 'memory',
  icon: Copy,
  minutes: 3,
  requirements: ['touch'],
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  describe: (log, lang: Lang) => [
    { label: S[lang].moves, value: String(log.detail?.moves ?? log.score ?? '—') },
    { label: S[lang].stars, value: '★'.repeat(Number(log.detail?.stars ?? 1)) + '☆'.repeat(3 - Number(log.detail?.stars ?? 1)) },
    { label: S[lang].level, value: S[lang][(log.detail?.level as 'easy' | 'medium' | 'hard') ?? 'easy'] ?? '' },
  ],
}

export default pairs
