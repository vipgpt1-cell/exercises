import { useEffect, useRef, useState } from 'react'
import { Grid3x3 } from 'lucide-react'
import type { TestModule } from '../../catalog/types'
import { FocusShell, Stage } from '../../components/shell'
import { Bullets, Button, Card, Metric, MetricGrid, SectionTitle, cx } from '../../components/ui'
import { defineStrings, useStrings } from '../../lib/i18n'
import { fx } from '../../lib/audio'
import { ageOf, usePerson, type Level } from '../../lib/store'
import { common } from '../../i18n/common'
import { DEFAULT_AGE, SpanProcedure, expectedCorsi, spanLevel, type SpanTrial } from './norms'
import { SpanScale, SpanTrialList, makeSequence } from './span-shared'
import { wait } from './timing'

export interface CorsiData {
  forward: { span: number; trials: SpanTrial[] }
  backward: { span: number; trials: SpanTrial[] }
  age: number | null
}

/** Irregular 9-block layout (normalised), in the spirit of the original Corsi board. */
const BLOCKS: [number, number][] = [
  [0.1, 0.6],
  [0.27, 0.17],
  [0.44, 0.5],
  [0.62, 0.1],
  [0.84, 0.3],
  [0.18, 0.87],
  [0.55, 0.83],
  [0.74, 0.57],
  [0.9, 0.84],
]
const IDS = BLOCKS.map((_, i) => i)

const S = defineStrings({
  en: {
    info: {
      name: 'Corsi blocks',
      short: 'Visual memory: repeat the order in which blocks light up.',
      measures: 'Checks how well you remember places and the order they were shown in — the same memory you use to find your way or remember where you left things.',
      steps: ['Blocks light up one at a time.', 'Part 1: tap them in the same order.', 'Part 2: tap them in REVERSE order.', 'The rows get longer until you make two mistakes at the same length.'],
      tips: ['Don’t point at the blocks while they light up, just watch.', 'Some people imagine a path or a shape that connects the blocks.'],
    },
    fwdTitle: 'Part 1 · Same order',
    fwdText: 'Watch the blocks light up, then tap them in the SAME order.',
    bwdTitle: 'Part 2 · Reverse order',
    bwdText: 'Now tap the blocks in REVERSE order: start with the last one that lit up.',
    practice: 'Practice',
    watch: 'Watch…',
    yourTurn: (rev: boolean): string => (rev ? 'Your turn — reverse order' : 'Your turn — same order'),
    forward: 'Same order',
    backward: 'Reverse order',
    fwdShort: 'forward',
    bwdShort: 'backward',
    trials: 'All rows',
    correctTrials: 'Rows remembered',
    meaning: {
      great: 'Your visual memory is above average for your age.',
      normal: 'Your visual memory is usual for your age.',
      borderline: 'Your visual memory is a bit below usual for your age.',
      attention: 'Your visual memory is clearly below usual for your age.',
    } as Record<string, string>,
    rec: [
      'This kind of memory helps you find your way, find things and learn new routes.',
      'Train it with the memory pairs and N-back exercises, puzzles and reading maps.',
      'If the difficulty is marked or getting worse, talk to a neurologist.',
    ],
  },
  uz: {
    info: {
      name: 'Korsi kubiklari',
      short: 'Ko‘rish xotirasi: kubiklar yonish tartibini takrorlang.',
      measures: 'Joylarni va ular qaysi tartibda ko‘rsatilganini qanchalik yaxshi eslab qolishingizni tekshiradi. Bu yo‘l topish yoki narsani qayerga qo‘yganingizni eslash uchun kerak bo‘ladigan xotira.',
      steps: ['Kubiklar birin-ketin yonadi.', '1-qism: ularni o‘sha tartibda bosing.', '2-qism: ularni TESKARI tartibda bosing.', 'Qatorlar bir xil uzunlikda ikki marta xato qilguningizcha uzayib boradi.'],
      tips: ['Kubiklar yonayotganda ularni barmoq bilan ko‘rsatmang, faqat kuzating.', 'Ba’zilar kubiklarni tutashtiruvchi yo‘l yoki shaklni tasavvur qiladi.'],
    },
    fwdTitle: '1-qism · O‘sha tartibda',
    fwdText: 'Kubiklar qanday yonishini kuzating, keyin ularni O‘SHA tartibda bosing.',
    bwdTitle: '2-qism · Teskari tartibda',
    bwdText: 'Endi kubiklarni TESKARI tartibda bosing: eng oxirgi yonganidan boshlang.',
    practice: 'Sinov',
    watch: 'Kuzating…',
    yourTurn: (rev: boolean): string => (rev ? 'Navbat sizda — teskari tartibda' : 'Navbat sizda — o‘sha tartibda'),
    forward: 'O‘sha tartibda',
    backward: 'Teskari tartibda',
    fwdShort: 'to‘g‘ri',
    bwdShort: 'teskari',
    trials: 'Barcha qatorlar',
    correctTrials: 'Eslab qolingan qatorlar',
    meaning: {
      great: 'Ko‘rish xotirangiz yoshingizdagilarnikidan yaxshiroq.',
      normal: 'Ko‘rish xotirangiz yoshingiz uchun odatiy.',
      borderline: 'Ko‘rish xotirangiz yoshingiz uchun odatdagidan biroz past.',
      attention: 'Ko‘rish xotirangiz yoshingiz uchun odatdagidan ancha past.',
    } as Record<string, string>,
    rec: [
      'Bu xotira yo‘l topish, narsalarni topish va yangi yo‘nalishlarni o‘rganishga yordam beradi.',
      'Uni juftliklar va N-back mashqlari, boshqotirmalar va xarita o‘qish bilan mashq qildiring.',
      'Qiyinchilik sezilarli bo‘lsa yoki kuchayib borsa, nevrolog bilan maslahatlashing.',
    ],
  },
  ru: {
    info: {
      name: 'Кубики Корси',
      short: 'Зрительная память: повторите порядок, в котором загорались кубики.',
      measures: 'Проверяет, как хорошо вы запоминаете места и порядок, в котором их показали. Это та память, которая помогает находить дорогу и помнить, куда вы что-то положили.',
      steps: ['Кубики загораются по одному.', 'Часть 1: нажмите на них в том же порядке.', 'Часть 2: нажмите на них в ОБРАТНОМ порядке.', 'Ряды становятся длиннее, пока вы не ошибётесь дважды на одной длине.'],
      tips: ['Не показывайте на кубики пальцем, пока они загораются, — просто смотрите.', 'Некоторым помогает представить путь или фигуру, соединяющую кубики.'],
    },
    fwdTitle: 'Часть 1 · В том же порядке',
    fwdText: 'Смотрите, как загораются кубики, затем нажмите на них в ТОМ ЖЕ порядке.',
    bwdTitle: 'Часть 2 · В обратном порядке',
    bwdText: 'Теперь нажимайте на кубики в ОБРАТНОМ порядке: начните с последнего загоревшегося.',
    practice: 'Проба',
    watch: 'Смотрите…',
    yourTurn: (rev: boolean): string => (rev ? 'Ваша очередь — в обратном порядке' : 'Ваша очередь — в том же порядке'),
    forward: 'В том же порядке',
    backward: 'В обратном порядке',
    fwdShort: 'прямой',
    bwdShort: 'обратный',
    trials: 'Все ряды',
    correctTrials: 'Запомнено рядов',
    meaning: {
      great: 'Зрительная память лучше средней для вашего возраста.',
      normal: 'Зрительная память обычная для вашего возраста.',
      borderline: 'Зрительная память немного ниже обычной для вашего возраста.',
      attention: 'Зрительная память заметно ниже обычной для вашего возраста.',
    } as Record<string, string>,
    rec: [
      'Такая память помогает ориентироваться, находить вещи и запоминать новые маршруты.',
      'Тренируйте её упражнениями «Пары» и N-back, головоломками и чтением карт.',
      'Если трудности заметные или усиливаются, обсудите это с неврологом.',
    ],
  },
})

type Part = 'forward' | 'backward'

function Board({ lit, tapped, onTap, disabled, flash }: { lit: number | null; tapped: number[]; onTap: (i: number) => void; disabled: boolean; flash: 'ok' | 'bad' | null }) {
  return (
    <div className="relative mx-auto w-full max-w-md" style={{ aspectRatio: '1 / 0.92' }}>
      <div className={cx('absolute inset-0 rounded-3xl bg-surface-2 transition-colors', flash === 'ok' && 'bg-great-soft', flash === 'bad' && 'bg-urgent-soft')} />
      {BLOCKS.map(([x, y], i) => {
        const isLit = lit === i
        const wasTapped = tapped.includes(i)
        return (
          <button
            key={i}
            type="button"
            aria-label={`block ${i + 1}`}
            disabled={disabled}
            onPointerDown={(e) => {
              e.preventDefault()
              if (!disabled) onTap(i)
            }}
            className={cx(
              'no-touch-scroll absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl border-b-4 shadow-sm transition-colors duration-100',
              isLit ? 'border-[#ca8a04] bg-[#facc15]' : wasTapped ? 'border-[color-mix(in_srgb,var(--accent)_70%,black)] bg-[var(--accent)]' : 'border-[#1e3a8a] bg-[#3b5bdb]',
            )}
            style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: '15%', aspectRatio: '1' }}
          />
        )
      })}
    </div>
  )
}

function Runner({ onDone, onExit }: { onDone: (s: { value: number | null; level: Level }, d: CorsiData) => void; onExit: () => void }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const person = usePerson()
  const [stage, setStage] = useState<'intro' | 'present' | 'answer' | 'feedback'>('intro')
  const [part, setPart] = useState<Part>('forward')
  const [practice, setPractice] = useState(true)
  const [lit, setLit] = useState<number | null>(null)
  const [tapped, setTapped] = useState<number[]>([])
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null)
  const target = useRef<number[]>([])
  const taps = useRef<number[]>([])
  const proc = useRef<Record<Part, SpanProcedure>>({ forward: new SpanProcedure(2, 9), backward: new SpanProcedure(2, 9) })
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const present = async (p: Part, isPractice: boolean) => {
    const L = isPractice ? 2 : proc.current[p].length
    const seq = makeSequence(IDS, L)
    target.current = seq
    taps.current = []
    setTapped([])
    setFlash(null)
    setStage('present')
    await wait(900)
    for (const b of seq) {
      if (!alive.current) return
      setLit(b)
      fx('soft')
      await wait(700)
      setLit(null)
      await wait(300)
    }
    if (alive.current) setStage('answer')
  }

  const onTap = async (i: number) => {
    if (stage !== 'answer') return
    fx('tap')
    taps.current = [...taps.current, i]
    setTapped(taps.current)
    setLit(i)
    setTimeout(() => alive.current && setLit((l) => (l === i ? null : l)), 180)
    const expected = part === 'forward' ? target.current : [...target.current].reverse()
    if (taps.current.length < expected.length) return
    const answer = taps.current
    const ok = answer.every((d, k) => d === expected[k])
    setStage('feedback')
    setFlash(ok ? 'ok' : 'bad')
    fx(ok ? 'good' : 'bad')
    if (!practice) proc.current[part].respond(expected, answer)
    await wait(900)
    if (!alive.current) return
    if (practice) {
      setPractice(false)
      present(part, false)
      return
    }
    if (!proc.current[part].done) {
      present(part, false)
      return
    }
    if (part === 'forward') {
      setPart('backward')
      setPractice(true)
      setStage('intro')
      return
    }
    const f = proc.current.forward
    const b = proc.current.backward
    const age = ageOf(person)
    const lv = spanLevel(f.span, b.span, expectedCorsi(age ?? DEFAULT_AGE))
    onDone({ value: f.span + b.span, level: lv.level }, { forward: { span: f.span, trials: f.trials }, backward: { span: b.span, trials: b.trials }, age })
  }

  const title = part === 'forward' ? s.fwdTitle : s.bwdTitle
  const L = practice ? 2 : proc.current[part].length
  return (
    <FocusShell title={s.info.name} subtitle={`${title}${practice ? ' · ' + s.practice : ''}`} onExit={onExit}>
      {stage === 'intro' ? (
        <Stage
          icon={<Grid3x3 className="h-8 w-8" />}
          title={title}
          footer={
            <Button variant="accent" size="lg" onClick={() => present(part, true)}>
              {t.btn.start}
            </Button>
          }
        >
          <p>{part === 'forward' ? s.fwdText : s.bwdText}</p>
        </Stage>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <div className="text-center">
            <div className={cx('text-lg font-semibold', flash === 'ok' ? 'text-great' : flash === 'bad' ? 'text-urgent' : 'text-ink')}>
              {stage === 'present' ? s.watch : stage === 'answer' ? s.yourTurn(part === 'backward') : flash === 'ok' ? t.correct : t.wrong}
            </div>
            <div className="mt-2 flex justify-center gap-1.5">
              {Array.from({ length: L }, (_, k) => (
                <span key={k} className={cx('h-2.5 w-2.5 rounded-full', k < tapped.length ? 'bg-[var(--accent)]' : 'bg-surface-3')} />
              ))}
            </div>
          </div>
          <Board lit={lit} tapped={stage === 'present' ? [] : tapped} onTap={onTap} disabled={stage !== 'answer'} flash={flash} />
        </div>
      )}
    </FocusShell>
  )
}

function Details({ result }: { result: { data: CorsiData; summary: { level: Level } } }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const d = result.data
  const exp = expectedCorsi(d.age ?? DEFAULT_AGE)
  const fmt = (xs: number[]) => (xs.length ? xs.map((x) => x + 1).join('·') : '—')
  return (
    <>
      <Card className="p-5">
        <SectionTitle>{s.forward}</SectionTitle>
        <SpanScale value={d.forward.span} exp={exp.forward} sd={exp.sd} min={1} max={9} label={String(d.forward.span)} />
        <SectionTitle className="mt-6">{s.backward}</SectionTitle>
        <SpanScale value={d.backward.span} exp={exp.backward} sd={exp.sd} min={1} max={9} label={String(d.backward.span)} />
        <p className="mt-4 leading-relaxed text-ink-2">{s.meaning[result.summary.level]}</p>
        <p className="mt-1 text-sm text-muted">{d.age ? t.ageCompare(d.age) : t.ageMissing}</p>
      </Card>
      <Card className="p-5">
        <MetricGrid cols={3}>
          <Metric label={s.forward} value={d.forward.span} emphasis />
          <Metric label={s.backward} value={d.backward.span} emphasis />
          <Metric label={s.correctTrials} value={d.forward.trials.filter((x) => x.correct).length + d.backward.trials.filter((x) => x.correct).length} />
        </MetricGrid>
      </Card>
      <Card className="p-5">
        <SectionTitle>{s.trials}</SectionTitle>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">{s.fwdTitle}</div>
        <SpanTrialList trials={d.forward.trials} format={fmt} />
        <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">{s.bwdTitle}</div>
        <SpanTrialList trials={d.backward.trials} format={fmt} />
      </Card>
      <Card className="p-5">
        <SectionTitle>{t.recommendations}</SectionTitle>
        <Bullets items={s.rec} />
      </Card>
    </>
  )
}

const corsi: TestModule<CorsiData> = {
  kind: 'test',
  usesAge: true,
  id: 'corsi-blocks',
  field: 'memory',
  icon: Grid3x3,
  minutes: 5,
  requirements: ['touch'],
  version: 1,
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  Details,
  headline: (r, lang) => ({
    value: `${r.data.forward.span} / ${r.data.backward.span}`,
    unit: `${S[lang].fwdShort} / ${S[lang].bwdShort}`,
    label: common[lang].level[r.summary.level],
  }),
  trend: { higherIsBetter: true, unit: (lang) => `${S[lang].fwdShort} + ${S[lang].bwdShort}`, digits: 0 },
}

export default corsi
