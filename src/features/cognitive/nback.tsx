import { useEffect, useRef, useState } from 'react'
import { Layers } from 'lucide-react'
import type { ExerciseModule } from '../../catalog/types'
import { FocusShell, Stage } from '../../components/shell'
import { Button, Segmented, cx } from '../../components/ui'
import { defineStrings, ruPlural, useStrings, type Lang } from '../../lib/i18n'
import { fx } from '../../lib/audio'
import { useKey } from '../../lib/hooks'
import { common } from '../../i18n/common'
import { wait } from './timing'

const BLOCKS = 3
const STIM = 500
const ISI = 2000

export function makeNBackSequence(n: number, len: number, pTarget = 0.3, rng = Math.random) {
  const seq: number[] = []
  for (let i = 0; i < len; i++) {
    if (i >= n && rng() < pTarget) seq.push(seq[i - n])
    else {
      let p = Math.floor(rng() * 9)
      while (i >= n && p === seq[i - n]) p = Math.floor(rng() * 9)
      seq.push(p)
    }
  }
  return seq
}

/** Brain-Workshop style score: hits / (hits + misses + false alarms). */
export function nbackScore(hits: number, misses: number, fa: number) {
  const d = hits + misses + fa
  return d ? Math.round((hits / d) * 100) : 0
}

const S = defineStrings({
  en: {
    info: {
      name: 'N-back',
      short: 'Remember where the square was a few steps ago. Trains working memory.',
      measures: 'Trains working memory. A square appears in one of 9 cells. Tap “Match” when it is in the same cell as n steps earlier. If you score 80% or more, the level (n) goes up; below 50%, it goes down.',
      steps: ['Choose the starting level (1-back is the easiest).', 'Watch where the square appears.', 'Tap “Match” if it’s in the same cell as n steps before.', '3 blocks, about 4 minutes.'],
      tips: ['Repeat the positions silently to yourself.', 'Short sessions every day work better than long ones once in a while.'],
    },
    level: 'Starting level',
    begin: 'Begin',
    match: 'Match',
    rule: (n: number) => (n === 1 ? 'Tap “Match” if the square is in the SAME cell as the one before' : `Tap “Match” if the square is in the same cell as ${n} steps back`),
    block: (i: number, n: number) => `Block ${i} of ${n}`,
    blockScore: (s: number) => `Block score: ${s}%.`,
    up: (n: number) => `Great! Moving up to ${n}-back.`,
    down: (n: number) => `Let’s go back to ${n}-back.`,
    stay: (n: number) => `Staying at ${n}-back.`,
    next: 'Next block',
    maxLevel: 'Highest level',
    avgScore: 'Average score',
  },
  uz: {
    info: {
      name: 'N-back',
      short: 'Kvadrat bir necha qadam oldin qayerda bo‘lganini eslang. Ishchi xotirani mashq qildiradi.',
      measures: 'Ishchi xotirani mashq qildiradi. Kvadrat 9 ta katakdan birida paydo bo‘ladi. U n qadam oldingi katakda bo‘lsa, “Bir xil”ni bosing. 80% va undan ko‘p to‘plasangiz, daraja (n) oshadi, 50% dan kam bo‘lsa, pasayadi.',
      steps: ['Boshlang‘ich darajani tanlang (1-back eng oson).', 'Kvadrat qayerda paydo bo‘lishini kuzating.', 'U n qadam oldingi katakda bo‘lsa, “Bir xil”ni bosing.', '3 ta blok, taxminan 4 daqiqa.'],
      tips: ['Joylarni ichingizda takrorlab boring.', 'Har kuni qisqa mashq qilish vaqti-vaqti bilan uzoq mashq qilishdan foydaliroq.'],
    },
    level: 'Boshlang‘ich daraja',
    begin: 'Boshlash',
    match: 'Bir xil',
    rule: (n: number) => (n === 1 ? 'Kvadrat oldingisi bilan BIR XIL katakda bo‘lsa, “Bir xil”ni bosing' : `Kvadrat ${n} qadam oldingi katakda bo‘lsa, “Bir xil”ni bosing`),
    block: (i: number, n: number) => `${i}-blok, jami ${n}`,
    blockScore: (s: number) => `Blok natijasi: ${s}%.`,
    up: (n: number) => `Zo‘r! Endi ${n}-back.`,
    down: (n: number) => `${n}-back ga qaytamiz.`,
    stay: (n: number) => `${n}-back da davom etamiz.`,
    next: 'Keyingi blok',
    maxLevel: 'Eng yuqori daraja',
    avgScore: 'O‘rtacha natija',
  },
  ru: {
    info: {
      name: 'N-back',
      short: 'Запоминайте, где был квадрат несколько шагов назад. Тренирует рабочую память.',
      measures: 'Тренирует рабочую память. Квадрат появляется в одной из 9 клеток. Нажмите «Совпадает», если он в той же клетке, что n шагов назад. При результате от 80% уровень (n) повышается, ниже 50% — понижается.',
      steps: ['Выберите начальный уровень (1-back — самый лёгкий).', 'Следите, где появляется квадрат.', 'Нажмите «Совпадает», если он в той же клетке, что n шагов назад.', '3 блока, около 4 минут.'],
      tips: ['Мысленно повторяйте позиции.', 'Короткие ежедневные занятия полезнее длинных, но редких.'],
    },
    level: 'Начальный уровень',
    begin: 'Начать',
    match: 'Совпадает',
    rule: (n: number) => (n === 1 ? 'Нажмите «Совпадает», если квадрат в ТОЙ ЖЕ клетке, что и предыдущий' : `Нажмите «Совпадает», если квадрат в той же клетке, что ${n} ${ruPlural(n, 'шаг', 'шага', 'шагов')} назад`),
    block: (i: number, n: number) => `Блок ${i} из ${n}`,
    blockScore: (s: number) => `Результат блока: ${s}%.`,
    up: (n: number) => `Отлично! Переходим на ${n}-back.`,
    down: (n: number) => `Вернёмся к ${n}-back.`,
    stay: (n: number) => `Остаёмся на ${n}-back.`,
    next: 'Следующий блок',
    maxLevel: 'Максимальный уровень',
    avgScore: 'Средний результат',
  },
})

function Runner({ onDone, onExit }: { onDone: (l: { seconds: number; score?: number; detail?: Record<string, number | string> }) => void; onExit: () => void }) {
  const s = useStrings(S)
  const [stage, setStage] = useState<'setup' | 'run' | 'between'>('setup')
  const [n, setN] = useState(1)
  const [block, setBlock] = useState(0)
  const [cell, setCell] = useState<number | null>(null)
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null)
  const [trial, setTrial] = useState(0)
  const [len, setLen] = useState(21)
  const [msg, setMsg] = useState('')
  const pressed = useRef(false)
  const isTarget = useRef(false)
  const scores = useRef<number[]>([])
  const levels = useRef<number[]>([])
  const alive = useRef(true)
  const t0 = useRef(0)
  const running = useRef(false)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const runBlock = async (level: number, b: number) => {
    setBlock(b)
    setStage('run')
    running.current = true
    const L = 20 + level
    setLen(L)
    const seq = makeNBackSequence(level, L)
    let hits = 0
    let misses = 0
    let fa = 0
    await wait(800)
    for (let i = 0; i < L; i++) {
      if (!alive.current) return
      setTrial(i)
      pressed.current = false
      isTarget.current = i >= level && seq[i] === seq[i - level]
      setFlash(null)
      setCell(seq[i])
      await wait(STIM)
      setCell(null)
      await wait(ISI)
      if (i >= level) {
        if (isTarget.current && pressed.current) hits++
        else if (isTarget.current && !pressed.current) {
          misses++
          setFlash('bad')
          fx('bad')
          await wait(250)
        } else if (!isTarget.current && pressed.current) fa++
      }
    }
    running.current = false
    const sc = nbackScore(hits, misses, fa)
    scores.current.push(sc)
    levels.current.push(level)
    const next = sc >= 80 ? level + 1 : sc < 50 ? Math.max(1, level - 1) : level
    setMsg(`${s.blockScore(sc)} ${next > level ? s.up(next) : next < level ? s.down(next) : s.stay(next)}`)
    setN(next)
    if (b + 1 >= BLOCKS) {
      const avg = Math.round(scores.current.reduce((a, x) => a + x, 0) / scores.current.length)
      onDone({ seconds: Math.round((performance.now() - t0.current) / 1000), score: Math.max(...levels.current), detail: { maxN: Math.max(...levels.current), avg, blocks: scores.current.join(' / ') } })
      return
    }
    setStage('between')
  }

  const press = () => {
    if (!running.current || pressed.current) return
    pressed.current = true
    if (isTarget.current) {
      setFlash('ok')
      fx('good')
    } else {
      setFlash('bad')
      fx('bad')
    }
  }
  useKey([' ', 'Space'], (e) => {
    e.preventDefault()
    press()
  })

  return (
    <FocusShell title={s.info.name} subtitle={stage !== 'setup' ? `${s.block(block + 1, BLOCKS)} · ${n}-back` : undefined} progress={stage !== 'setup' ? (block + (stage === 'between' ? 1 : trial / len)) / BLOCKS : null} onExit={onExit}>
      {stage === 'setup' && (
        <Stage
          icon={<Layers className="h-8 w-8" />}
          title={s.level}
          footer={
            <Button
              variant="accent"
              size="lg"
              onClick={() => {
                t0.current = performance.now()
                runBlock(n, 0)
              }}
            >
              {s.begin}
            </Button>
          }
        >
          <Segmented value={n} onChange={setN} options={[1, 2, 3].map((x) => ({ value: x, label: `${x}-back` }))} />
          <p className="mt-4 text-sm">{s.rule(n)}</p>
        </Stage>
      )}
      {stage === 'between' && (
        <Stage
          icon={<Layers className="h-8 w-8" />}
          title={msg}
          footer={
            <Button variant="accent" size="lg" onClick={() => runBlock(n, block + 1)}>
              {s.next}
            </Button>
          }
        >
          <p>{s.rule(n)}</p>
        </Stage>
      )}
      {stage === 'run' && (
        <div className="flex flex-1 flex-col items-center justify-between gap-5">
          <p className="text-center text-sm font-semibold text-muted">{s.rule(n)}</p>
          <div
            className={cx(
              'grid w-full max-w-xs grid-cols-3 gap-2 rounded-3xl p-2 transition-colors',
              flash === 'ok' ? 'bg-great-soft' : flash === 'bad' ? 'bg-urgent-soft' : 'bg-surface-3',
            )}
          >
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className={cx('aspect-square rounded-2xl transition-none', cell === i ? 'bg-[var(--accent)]' : 'bg-surface')} />
            ))}
          </div>
          <div className="pb-safe w-full max-w-md">
            <Button variant="accent" size="xl" block onPointerDown={(e) => { e.preventDefault(); press() }}>
              {s.match}
            </Button>
          </div>
        </div>
      )}
    </FocusShell>
  )
}

const nback: ExerciseModule = {
  kind: 'exercise',
  id: 'nback',
  field: 'memory',
  icon: Layers,
  minutes: 4,
  requirements: ['touch', 'keyboard'],
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  describe: (log, lang: Lang) => [
    { label: S[lang].maxLevel, value: `${log.detail?.maxN ?? log.score ?? 1}-back` },
    { label: S[lang].avgScore, value: `${log.detail?.avg ?? 0}%` },
    { label: common[lang].results, value: String(log.detail?.blocks ?? '') },
  ],
}

export default nback
