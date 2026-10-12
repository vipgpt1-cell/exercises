import { useEffect, useRef, useState } from 'react'
import { LayoutGrid } from 'lucide-react'
import type { ExerciseModule } from '../../catalog/types'
import { FocusShell, Stage } from '../../components/shell'
import { Button, Segmented, cx } from '../../components/ui'
import { defineStrings, fmtNum, useLang, useStrings, type Lang } from '../../lib/i18n'
import { fx } from '../../lib/audio'
import { useInterval } from '../../lib/hooks'
import { shuffle } from '../../lib/rng'
import { mean } from '../../lib/stats'
import { common } from '../../i18n/common'

const S = defineStrings({
  en: {
    info: {
      name: 'Schulte tables',
      short: 'Find the numbers in order as fast as you can. Trains attention.',
      measures: 'A classic exercise for attention and quick visual search. It also trains you to take in more of the table at once, without moving your eyes around.',
      steps: ['Numbers are mixed up in a grid.', 'Tap them in order: 1, 2, 3 … as fast as you can.', 'Try to keep your eyes on the centre of the grid and see the rest from the corner of your eye.'],
      tips: ['A few minutes every day works best.', 'If 5 × 5 feels hard, start with 4 × 4.'],
    },
    size: 'Grid size',
    tables: 'How many tables',
    begin: 'Begin',
    find: 'Find',
    tableN: (i: number, n: number) => `Table ${i} of ${n}`,
    tableDone: (s: string) => `Done in ${s}`,
    nextTable: 'Next table',
    avg: 'Average time',
    best: 'Best table',
    warmup: 'Start',
    warmFast: 'Quick from the first table',
    warmSlow: 'Needed a warm-up',
    stability: 'Towards the end',
    steady: 'Kept the pace',
    tired: 'Slowed down',
    errors: 'Wrong taps',
  },
  uz: {
    info: {
      name: 'Shulte jadvallari',
      short: 'Raqamlarni tartib bilan imkon qadar tez toping. Diqqatni mashq qildiradi.',
      measures: 'Diqqat va tez ko‘z bilan qidirish uchun mashhur mashq. U jadvalni ko‘zni yugurtirmasdan, bir qarashda ko‘proq qamrab olishga ham o‘rgatadi.',
      steps: ['Raqamlar katakchalarda aralash joylashgan.', 'Ularni tartib bilan bosing: 1, 2, 3 … imkon qadar tez.', 'Ko‘zingizni jadval markazida ushlab, qolganini ko‘z qiri bilan ko‘rishga harakat qiling.'],
      tips: ['Har kuni bir necha daqiqa mashq qilish eng yaxshi natija beradi.', '5 × 5 qiyin bo‘lsa, 4 × 4 dan boshlang.'],
    },
    size: 'Jadval o‘lchami',
    tables: 'Nechta jadval',
    begin: 'Boshlash',
    find: 'Toping',
    tableN: (i: number, n: number) => `${i}-jadval, jami ${n}`,
    tableDone: (s: string) => `Bajarildi: ${s}`,
    nextTable: 'Keyingi jadval',
    avg: 'O‘rtacha vaqt',
    best: 'Eng yaxshi jadval',
    warmup: 'Boshlanishi',
    warmFast: 'Birinchi jadvaldan tez',
    warmSlow: 'Qizib olish kerak bo‘ldi',
    stability: 'Oxiriga kelib',
    steady: 'Sur’at saqlandi',
    tired: 'Sekinlashdingiz',
    errors: 'Noto‘g‘ri bosishlar',
  },
  ru: {
    info: {
      name: 'Таблицы Шульте',
      short: 'Находите числа по порядку как можно быстрее. Тренирует внимание.',
      measures: 'Классическое упражнение на внимание и быстрый зрительный поиск. Оно также учит охватывать взглядом больше таблицы сразу, не бегая глазами.',
      steps: ['Числа перемешаны в таблице.', 'Нажимайте на них по порядку: 1, 2, 3 … как можно быстрее.', 'Старайтесь смотреть в центр таблицы и видеть остальное боковым зрением.'],
      tips: ['Лучше всего заниматься по несколько минут каждый день.', 'Если 5 × 5 даётся тяжело, начните с 4 × 4.'],
    },
    size: 'Размер таблицы',
    tables: 'Сколько таблиц',
    begin: 'Начать',
    find: 'Найдите',
    tableN: (i: number, n: number) => `Таблица ${i} из ${n}`,
    tableDone: (s: string) => `Готово за ${s}`,
    nextTable: 'Следующая таблица',
    avg: 'Среднее время',
    best: 'Лучшая таблица',
    warmup: 'Начало',
    warmFast: 'Быстро с первой таблицы',
    warmSlow: 'Понадобилось втянуться',
    stability: 'К концу',
    steady: 'Темп сохранился',
    tired: 'Замедлились',
    errors: 'Неверные нажатия',
  },
})

function Runner({ onDone, onExit }: { onDone: (l: { seconds: number; score?: number; detail?: Record<string, number | string> }) => void; onExit: () => void }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const lang = useLang()
  const [size, setSize] = useState(5)
  const [count, setCount] = useState(5)
  const [stage, setStage] = useState<'setup' | 'table' | 'between'>('setup')
  const [grid, setGrid] = useState<number[]>([])
  const [next, setNext] = useState(1)
  const [table, setTable] = useState(0)
  const [bad, setBad] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const times = useRef<number[]>([])
  const errors = useRef(0)
  const t0 = useRef(0)
  const start = useRef(0)
  useInterval(() => setElapsed((performance.now() - t0.current) / 1000), stage === 'table' ? 100 : null)
  useEffect(() => {
    start.current = performance.now()
  }, [])

  const newTable = (k: number) => {
    setTable(k)
    setGrid(shuffle(Array.from({ length: size * size }, (_, i) => i + 1)))
    setNext(1)
    t0.current = performance.now()
    setElapsed(0)
    setStage('table')
  }

  const tap = (n: number) => {
    if (n === next) {
      fx('tap')
      if (n === size * size) {
        const tm = (performance.now() - t0.current) / 1000
        times.current.push(tm)
        fx('done')
        if (table + 1 >= count) {
          const er = mean(times.current)
          const detail: Record<string, number | string> = { size: `${size}×${size}`, tables: count, avg: Math.round(er * 10) / 10, best: Math.round(Math.min(...times.current) * 10) / 10, errors: errors.current }
          if (count >= 5) {
            detail.warmup = Math.round((times.current[0] / er) * 100) / 100
            detail.stability = Math.round((times.current[3] / er) * 100) / 100
          }
          onDone({ seconds: Math.round((performance.now() - start.current) / 1000), score: detail.avg as number, detail })
        } else setStage('between')
      } else setNext(n + 1)
    } else {
      errors.current++
      setBad(n)
      setTimeout(() => setBad((b) => (b === n ? null : b)), 300)
    }
  }

  const sec = (v: number) => `${fmtNum(lang, v, 1)} ${t.seconds}`
  const cellFont = size <= 3 ? 'text-4xl' : size === 4 ? 'text-3xl' : 'text-2xl'

  return (
    <FocusShell
      title={s.info.name}
      subtitle={stage !== 'setup' ? s.tableN(table + 1, count) : undefined}
      progress={stage !== 'setup' ? (table + (stage === 'between' ? 1 : (next - 1) / (size * size))) / count : null}
      right={stage === 'table' ? <span className="tabular rounded-lg bg-surface-2 px-2.5 py-1 text-sm font-bold text-ink">{sec(elapsed)}</span> : undefined}
      onExit={onExit}
    >
      {stage === 'setup' && (
        <Stage
          icon={<LayoutGrid className="h-8 w-8" />}
          title={s.info.name}
          footer={
            <Button variant="accent" size="lg" onClick={() => newTable(0)}>
              {s.begin}
            </Button>
          }
        >
          <div className="mt-2 space-y-4 text-left">
            <div>
              <div className="mb-1.5 text-sm font-semibold text-muted">{s.size}</div>
              <Segmented value={size} onChange={setSize} options={[3, 4, 5].map((n) => ({ value: n, label: `${n} × ${n}` }))} />
            </div>
            <div>
              <div className="mb-1.5 text-sm font-semibold text-muted">{s.tables}</div>
              <Segmented value={count} onChange={setCount} options={[1, 3, 5].map((n) => ({ value: n, label: String(n) }))} />
            </div>
          </div>
        </Stage>
      )}
      {stage === 'between' && (
        <Stage
          icon={<LayoutGrid className="h-8 w-8" />}
          title={s.tableDone(sec(times.current[times.current.length - 1]))}
          footer={
            <Button variant="accent" size="lg" onClick={() => newTable(table + 1)}>
              {s.nextTable}
            </Button>
          }
        >
          <div className="flex flex-wrap justify-center gap-2">
            {times.current.map((x, i) => (
              <span key={i} className="tabular rounded-lg bg-surface-2 px-2.5 py-1 text-sm font-semibold text-ink-2">
                {i + 1}: {sec(x)}
              </span>
            ))}
          </div>
        </Stage>
      )}
      {stage === 'table' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-5">
          <div className="text-center">
            <span className="text-sm font-semibold text-muted">{s.find}: </span>
            <span className="tabular text-2xl font-black text-[var(--accent)]">{next}</span>
          </div>
          <div className="grid w-full max-w-md gap-1.5 rounded-3xl bg-surface-3 p-1.5" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
            {grid.map((n) => (
              <button
                key={n}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault()
                  tap(n)
                }}
                className={cx(
                  'no-touch-scroll aspect-square rounded-2xl bg-surface font-bold tabular text-ink shadow-sm transition-colors duration-100',
                  cellFont,
                  bad === n && 'animate-shake bg-urgent-soft text-urgent',
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
    </FocusShell>
  )
}

const schulte: ExerciseModule = {
  kind: 'exercise',
  id: 'schulte',
  field: 'memory',
  icon: LayoutGrid,
  minutes: 3,
  requirements: ['touch'],
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  describe: (log, lang: Lang) => {
    const d = log.detail ?? {}
    const sec = (v: unknown) => `${fmtNum(lang, Number(v), 1)} ${common[lang].seconds}`
    const rows = [
      { label: `${S[lang].avg} (${d.size ?? ''})`, value: sec(d.avg) },
      { label: S[lang].best, value: sec(d.best) },
    ]
    // Gorbov's indices: first table / average (warm-up) and 4th table / average (stability); ≤ 1 is good.
    if (d.warmup !== undefined) rows.push({ label: S[lang].warmup, value: Number(d.warmup) <= 1.05 ? S[lang].warmFast : S[lang].warmSlow })
    if (d.stability !== undefined) rows.push({ label: S[lang].stability, value: Number(d.stability) <= 1.05 ? S[lang].steady : S[lang].tired })
    rows.push({ label: S[lang].errors, value: String(d.errors ?? 0) })
    return rows
  },
}

export default schulte
