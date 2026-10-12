import { useEffect, useMemo, useRef, useState } from 'react'
import { Route } from 'lucide-react'
import type { TestModule } from '../../catalog/types'
import { Countdown, FocusShell, Stage } from '../../components/shell'
import { Bullets, Button, Callout, Card, Metric, MetricGrid, SectionTitle, cx } from '../../components/ui'
import { CompareBars } from '../../components/charts'
import { defineStrings, fmtNum, useLang, useStrings, type Lang } from '../../lib/i18n'
import { fx } from '../../lib/audio'
import { useElementSize, useInterval } from '../../lib/hooks'
import { ageOf, usePerson, type Level } from '../../lib/store'
import { common } from '../../i18n/common'
import { DEFAULT_AGE, tmtLevel, tmtNorm } from './norms'
import { TRAIL_ASPECT, trailLabels, trailLayout } from './trail-layout'

export interface TrailData {
  a: { time: number; errors: number }
  b: { time: number; errors: number }
  age: number | null
  lang: Lang
}

const SEEDS = { practiceA: 11, A: 2024, practiceB: 37, B: 4099 }

const S = defineStrings({
  en: {
    info: {
      name: 'Trail Making (A and B)',
      short: 'Connect numbers and letters in order. Checks speed and mental flexibility.',
      measures: 'Part A checks how quickly you find and connect numbers in order. Part B adds switching between numbers and letters, which shows how flexibly you can shift your attention.',
      steps: ['Part A: tap the circles in order: 1 → 2 → 3 … → 25.', 'Part B: switch between numbers and letters: 1 → A → 2 → B → 3 → C … → 13.', 'Go as fast as you can. Each part starts with a short practice.'],
      tips: ['If you tap the wrong circle, it flashes red. Just carry on from the last correct one.', 'A bigger screen makes it easier, if you have one.'],
    },
    partA: 'Part A',
    partB: 'Part B',
    textA: 'Tap the circles in order: 1 → 2 → 3 … as fast as you can.',
    textB: 'Switch between numbers and letters in order: 1 → A → 2 → B → 3 → C …',
    practice: 'Practice',
    practiceText: 'First, a short practice.',
    next: 'Next',
    time: 'Time',
    errors: 'Mistakes',
    ratio: 'B compared with A',
    diff: 'B minus A',
    yourTimes: 'Your times and typical times for your age',
    typical: 'typical',
    meaning: {
      great: 'You finished both parts faster than is usual at your age.',
      normal: 'Your times are usual for your age.',
      borderline: 'One or both parts took longer than usual for your age, or switching (part B) was rather slow.',
      attention: 'Your times were much longer than usual for your age.',
    } as Record<string, string>,
    ratioHigh: 'Part B took more than 3 times as long as part A. This can mean switching between tasks is hard for you.',
    rec: [
      'Times depend on the screen size, so compare mainly with your own earlier results on the same phone.',
      'Train flexibility with the Schulte tables and N-back. Physical activity helps too.',
      'Clearly slow results, especially together with memory problems, are worth discussing with a neurologist.',
    ],
    normsNote: 'Typical times come from the paper version of the test (Tombaugh, 2004). The phone version can differ a little.',
  },
  uz: {
    info: {
      name: 'Iz qoldirish testi (A va B)',
      short: 'Raqam va harflarni tartib bilan ulang. Tezlik va fikrlash moslashuvchanligini tekshiradi.',
      measures: 'A qism raqamlarni tartib bilan qanchalik tez topib ulashingizni tekshiradi. B qismda raqam va harflar navbatlashadi — bu diqqatni bir narsadan boshqasiga qanchalik oson o‘tkazishingizni ko‘rsatadi.',
      steps: ['A qism: doirachalarni tartib bilan bosing: 1 → 2 → 3 … → 25.', 'B qism: raqam va harflarni navbatlab bosing: 1 → A → 2 → B → 3 → D … → 13.', 'Imkon qadar tez bajaring. Har bir qism oldidan qisqa sinov bor.'],
      tips: ['Noto‘g‘ri doirachani bossangiz, u qizil bo‘lib yonadi. Oxirgi to‘g‘ri doirachadan davom eting.', 'Imkoningiz bo‘lsa, kattaroq ekranda bajaring.'],
    },
    partA: 'A qism',
    partB: 'B qism',
    textA: 'Doirachalarni tartib bilan imkon qadar tez bosing: 1 → 2 → 3 …',
    textB: 'Raqam va harflarni navbatlab, tartib bilan bosing: 1 → A → 2 → B → 3 → D …',
    practice: 'Sinov',
    practiceText: 'Avval qisqa sinov.',
    next: 'Keyingisi',
    time: 'Vaqt',
    errors: 'Xatolar',
    ratio: 'B ning A ga nisbati',
    diff: 'B va A farqi',
    yourTimes: 'Sizning vaqtingiz va yoshingizdagilarning odatiy vaqti',
    typical: 'odatiy',
    meaning: {
      great: 'Ikkala qismni yoshingizdagilarga qaraganda tezroq bajardingiz.',
      normal: 'Vaqtlaringiz yoshingiz uchun odatiy.',
      borderline: 'Bir yoki ikkala qism yoshingiz uchun odatdagidan uzoqroq davom etdi yoki navbatlash (B qism) ancha sekin bo‘ldi.',
      attention: 'Vaqtlaringiz yoshingiz uchun odatdagidan ancha uzoq bo‘ldi.',
    } as Record<string, string>,
    ratioHigh: 'B qism A qismdan 3 barobardan ko‘proq vaqt oldi. Bu bir ishdan boshqasiga o‘tish sizga qiyinligini bildirishi mumkin.',
    rec: [
      'Vaqt ekran o‘lchamiga bog‘liq, shuning uchun asosan o‘sha telefondagi oldingi natijalaringiz bilan solishtiring.',
      'Moslashuvchanlikni Shulte jadvallari va N-back bilan mashq qildiring. Jismoniy faollik ham yordam beradi.',
      'Natija ancha sekin bo‘lsa, ayniqsa xotira muammolari bilan birga, nevrolog bilan maslahatlashing.',
    ],
    normsNote: 'Odatiy vaqtlar testning qog‘oz variantidan olingan (Tombaugh, 2004). Telefondagi variantda biroz farq bo‘lishi mumkin.',
  },
  ru: {
    info: {
      name: 'Тест «Соедини точки» (A и B)',
      short: 'Соединяйте цифры и буквы по порядку. Проверяет скорость и гибкость мышления.',
      measures: 'Часть A проверяет, как быстро вы находите и соединяете числа по порядку. В части B числа чередуются с буквами — это показывает, насколько легко вы переключаете внимание.',
      steps: ['Часть A: нажимайте на кружки по порядку: 1 → 2 → 3 … → 25.', 'Часть B: чередуйте числа и буквы: 1 → А → 2 → Б → 3 → В … → 13.', 'Действуйте как можно быстрее. Перед каждой частью есть короткая проба.'],
      tips: ['Если нажмёте не тот кружок, он мигнёт красным. Просто продолжайте с последнего правильного.', 'Если есть возможность, используйте экран побольше.'],
    },
    partA: 'Часть A',
    partB: 'Часть B',
    textA: 'Нажимайте на кружки по порядку как можно быстрее: 1 → 2 → 3 …',
    textB: 'Чередуйте числа и буквы по порядку: 1 → А → 2 → Б → 3 → В …',
    practice: 'Проба',
    practiceText: 'Сначала короткая проба.',
    next: 'Далее',
    time: 'Время',
    errors: 'Ошибки',
    ratio: 'Отношение B к A',
    diff: 'Разница B и A',
    yourTimes: 'Ваше время и обычное время для вашего возраста',
    typical: 'обычно',
    meaning: {
      great: 'Вы прошли обе части быстрее, чем обычно в вашем возрасте.',
      normal: 'Ваше время обычное для вашего возраста.',
      borderline: 'Одна или обе части заняли больше времени, чем обычно в вашем возрасте, или чередование (часть B) далось довольно медленно.',
      attention: 'Ваше время намного больше обычного для вашего возраста.',
    } as Record<string, string>,
    ratioHigh: 'Часть B заняла больше чем в 3 раза больше времени, чем часть A. Это может означать, что вам трудно переключаться между задачами.',
    rec: [
      'Время зависит от размера экрана, поэтому сравнивайте в первую очередь со своими прошлыми результатами на том же телефоне.',
      'Тренируйте гибкость с таблицами Шульте и N-back. Физическая активность тоже помогает.',
      'Заметно медленные результаты, особенно вместе с проблемами памяти, стоит обсудить с неврологом.',
    ],
    normsNote: 'Обычное время взято из бумажной версии теста (Tombaugh, 2004). Версия на телефоне может немного отличаться.',
  },
})

function TrailBoard({
  labels,
  seed,
  onFinish,
  running,
}: {
  labels: string[]
  seed: number
  onFinish: (time: number, errors: number) => void
  running: boolean
}) {
  const pts = useMemo(() => trailLayout(labels.length, seed), [labels.length, seed])
  const [ref, { width }] = useElementSize<HTMLDivElement>()
  const [next, setNext] = useState(0)
  const [bad, setBad] = useState<number | null>(null)
  const errors = useRef(0)
  const t0 = useRef<number | null>(null)
  const maxH = typeof window !== 'undefined' ? window.innerHeight - 150 : 800
  const W = Math.min(width, maxH / TRAIL_ASPECT)
  const H = W * TRAIL_ASPECT
  const r = Math.max(19, W * 0.052)
  useEffect(() => {
    if (running && t0.current === null) t0.current = performance.now()
  }, [running])

  const tap = (i: number) => {
    if (!running) return
    if (i === next) {
      fx('tap')
      const n = next + 1
      setNext(n)
      if (n === labels.length) {
        fx('done')
        onFinish((performance.now() - (t0.current ?? performance.now())) / 1000, errors.current)
      }
    } else if (i > next) {
      errors.current++
      fx('bad')
      setBad(i)
      setTimeout(() => setBad((b) => (b === i ? null : b)), 450)
    }
  }

  return (
    <div ref={ref} className="flex w-full justify-center">
      {W > 0 && (
        <svg width={W} height={H} className="no-touch-scroll block rounded-3xl bg-surface shadow-card" role="application">
          {pts.slice(0, next).map((p, i) =>
            i === 0 ? null : <line key={i} x1={pts[i - 1].x * W} y1={pts[i - 1].y * W} x2={p.x * W} y2={p.y * W} stroke="var(--accent)" strokeWidth={3.5} strokeLinecap="round" />,
          )}
          {pts.map((p, i) => {
            const done = i < next
            const isBad = bad === i
            return (
              <g
                key={i}
                onPointerDown={(e) => {
                  e.preventDefault()
                  tap(i)
                }}
                style={{ cursor: 'pointer' }}
                className={isBad ? 'animate-shake' : undefined}
              >
                <circle cx={p.x * W} cy={p.y * W} r={r + 6} fill="transparent" />
                <circle
                  cx={p.x * W}
                  cy={p.y * W}
                  r={r}
                  fill={isBad ? 'var(--urgent-soft)' : done ? 'var(--accent)' : 'var(--surface)'}
                  stroke={isBad ? 'var(--urgent)' : done ? 'var(--accent)' : 'var(--text)'}
                  strokeWidth={2.2}
                />
                <text
                  x={p.x * W}
                  y={p.y * W}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={Math.max(13, r * 0.85)}
                  fontWeight={700}
                  fill={done ? 'white' : 'var(--text)'}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {labels[i]}
                </text>
              </g>
            )
          })}
        </svg>
      )}
    </div>
  )
}

type Step = 'introA' | 'practiceA' | 'countA' | 'A' | 'introB' | 'practiceB' | 'countB' | 'B'

function Runner({ onDone, onExit }: { onDone: (s: { value: number | null; level: Level }, d: TrailData) => void; onExit: () => void }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const lang = useLang()
  const person = usePerson()
  const script = lang === 'ru' ? 'cyrillic' : lang === 'uz' ? 'uzbek' : 'latin'
  const [step, setStep] = useState<Step>('introA')
  const [elapsed, setElapsed] = useState(0)
  const startT = useRef(0)
  const res = useRef<{ a?: { time: number; errors: number } }>({})
  useInterval(() => setElapsed((performance.now() - startT.current) / 1000), step === 'A' || step === 'B' ? 200 : null)

  const labelsA = trailLabels('A', 25, script)
  const labelsB = trailLabels('B', 25, script)

  const begin = (st: 'A' | 'B') => {
    startT.current = performance.now()
    setElapsed(0)
    setStep(st)
  }

  const intro = (part: 'A' | 'B') => (
    <Stage
      icon={<Route className="h-8 w-8" />}
      title={part === 'A' ? s.partA : s.partB}
      footer={
        <Button variant="accent" size="lg" onClick={() => setStep(part === 'A' ? 'practiceA' : 'practiceB')}>
          {s.practice}
        </Button>
      }
    >
      <p>{part === 'A' ? s.textA : s.textB}</p>
      <p className="mt-2 text-sm text-muted">{s.practiceText}</p>
    </Stage>
  )

  return (
    <FocusShell
      title={s.info.name}
      subtitle={step.includes('A') ? s.partA : s.partB}
      right={step === 'A' || step === 'B' ? <span className="tabular rounded-lg bg-surface-2 px-2.5 py-1 text-sm font-bold text-ink">{fmtNum(lang, elapsed, 0)} {t.seconds}</span> : undefined}
      onExit={onExit}
      wide
    >
      {step === 'introA' && intro('A')}
      {step === 'introB' && intro('B')}
      {(step === 'practiceA' || step === 'practiceB') && (
        <div className="flex flex-1 flex-col gap-3">
          <p className="text-center font-semibold text-ink">
            {s.practice}: {step === 'practiceA' ? s.textA : s.textB}
          </p>
          <TrailBoard
            key={step}
            labels={step === 'practiceA' ? trailLabels('A', 8, script) : trailLabels('B', 8, script)}
            seed={step === 'practiceA' ? SEEDS.practiceA : SEEDS.practiceB}
            running
            onFinish={() => setTimeout(() => setStep(step === 'practiceA' ? 'countA' : 'countB'), 500)}
          />
        </div>
      )}
      {(step === 'countA' || step === 'countB') && <Countdown onDone={() => begin(step === 'countA' ? 'A' : 'B')} label={step === 'countA' ? s.partA : s.partB} />}
      {step === 'A' && (
        <TrailBoard
          key="A"
          labels={labelsA}
          seed={SEEDS.A}
          running
          onFinish={(time, errors) => {
            res.current.a = { time, errors }
            setTimeout(() => setStep('introB'), 600)
          }}
        />
      )}
      {step === 'B' && (
        <TrailBoard
          key="B"
          labels={labelsB}
          seed={SEEDS.B}
          running
          onFinish={(time, errors) => {
            const a = res.current.a!
            const b = { time, errors }
            const age = ageOf(person)
            const lv = tmtLevel(a.time, b.time, age ?? DEFAULT_AGE)
            setTimeout(
              () =>
                onDone(
                  { value: Math.round(b.time * 10) / 10, level: lv.level },
                  { a: { time: Math.round(a.time * 10) / 10, errors: a.errors }, b: { time: Math.round(b.time * 10) / 10, errors: b.errors }, age, lang },
                ),
              500,
            )
          }}
        />
      )}
    </FocusShell>
  )
}

function Details({ result }: { result: { data: TrailData; summary: { level: Level } } }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const lang = useLang()
  const d = result.data
  const n = tmtNorm(d.age ?? DEFAULT_AGE)
  const lv = tmtLevel(d.a.time, d.b.time, d.age ?? DEFAULT_AGE)
  const sec = (v: number) => `${fmtNum(lang, v, 1)} ${t.seconds}`
  const max = Math.max(d.b.time, n.b.mean + n.b.sd) * 1.1
  return (
    <>
      <Card className="p-5">
        <SectionTitle>{s.yourTimes}</SectionTitle>
        <CompareBars
          max={max}
          format={sec}
          rows={[
            { label: `${s.partA} — ${t.you}`, value: d.a.time, color: 'var(--accent)' },
            { label: `${s.partA} — ${s.typical}`, value: n.a.mean, color: 'var(--border-strong)' },
            { label: `${s.partB} — ${t.you}`, value: d.b.time, color: 'var(--accent)' },
            { label: `${s.partB} — ${s.typical}`, value: n.b.mean, color: 'var(--border-strong)' },
          ]}
        />
        <p className="mt-4 leading-relaxed text-ink-2">{s.meaning[result.summary.level]}</p>
        <p className="mt-1 text-sm text-muted">{d.age ? t.ageCompare(d.age) : t.ageMissing}</p>
      </Card>
      <Card className="p-5">
        <MetricGrid cols={3}>
          <Metric label={`${s.partA} · ${s.time}`} value={fmtNum(lang, d.a.time, 1)} unit={t.seconds} emphasis />
          <Metric label={`${s.partB} · ${s.time}`} value={fmtNum(lang, d.b.time, 1)} unit={t.seconds} emphasis />
          <Metric label={s.ratio} value={fmtNum(lang, lv.ratio, 2)} />
          <Metric label={s.diff} value={fmtNum(lang, d.b.time - d.a.time, 1)} unit={t.seconds} />
          <Metric label={`${s.partA} · ${s.errors}`} value={d.a.errors} />
          <Metric label={`${s.partB} · ${s.errors}`} value={d.b.errors} />
        </MetricGrid>
      </Card>
      {lv.ratio >= 3 && <Callout tone="warn">{s.ratioHigh}</Callout>}
      <Card className="p-5">
        <SectionTitle>{t.recommendations}</SectionTitle>
        <Bullets items={s.rec} />
      </Card>
      <p className={cx('text-xs text-muted')}>{s.normsNote}</p>
    </>
  )
}

const trail: TestModule<TrailData> = {
  kind: 'test',
  usesAge: true,
  id: 'trail-making',
  field: 'memory',
  icon: Route,
  minutes: 4,
  requirements: ['touch'],
  version: 1,
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  Details,
  headline: (r, lang) => ({
    value: `${fmtNum(lang, r.data.a.time, 0)} / ${fmtNum(lang, r.data.b.time, 0)}`,
    unit: `${common[lang].seconds} (A / B)`,
    label: common[lang].level[r.summary.level],
  }),
  trend: { higherIsBetter: false, unit: (lang) => `${common[lang].seconds} (B)`, digits: 1 },
}

export default trail
