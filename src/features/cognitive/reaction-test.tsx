import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { Zap } from 'lucide-react'
import type { TestModule } from '../../catalog/types'
import { FocusShell, Stage } from '../../components/shell'
import { Bullets, Button, Card, Metric, MetricGrid, SectionTitle, cx } from '../../components/ui'
import { ScaleBar } from '../../components/charts'
import { defineStrings, fmtNum, useLang, useStrings } from '../../lib/i18n'
import { fx } from '../../lib/audio'
import { useKey, useElementSize } from '../../lib/hooks'
import { ageOf, usePerson, type Level } from '../../lib/store'
import { common } from '../../i18n/common'
import { shuffle, uniform } from '../../lib/rng'
import { presentStimulus, eventTime } from './timing'
import { CHOICE_RT_SD, DEFAULT_AGE, SIMPLE_RT_SD, expectedChoiceRt, expectedSimpleRt, rtLevel, summarizeRt } from './norms'

const SIMPLE_N = 15
const CHOICE_N = 20
const PRACTICE_N = 2

export interface ReactionData {
  simple: { rts: number[]; falseStarts: number; misses: number }
  choice: { trials: { side: 'L' | 'R'; answer: 'L' | 'R' | null; rt: number | null }[]; falseStarts: number }
  age: number | null
  input: 'touch' | 'mouse' | 'key'
}

const S = defineStrings({
  en: {
    info: {
      name: 'Reaction time',
      short: 'How quickly you respond to a signal.',
      measures: 'How fast you react to a signal, and how fast you pick the right one of two options. Reaction speed shows how quickly your brain handles information and how alert you are.',
      steps: [
        'Part 1: wait until the field turns green, then tap it as fast as you can.',
        'Part 2: a circle appears on the left or right. Tap that side.',
        'Don’t tap before the signal. There are two practice rounds first.',
      ],
      tips: ['Sit comfortably and keep your finger close to the screen.', 'Use the same phone each time: every screen adds a small delay of its own.', 'Don’t test right after coffee or when very tired, unless that is what you want to check.'],
    },
    part1: 'Part 1 · Wait for green',
    part1Text: 'When the field turns GREEN, tap it as fast as you can.',
    part2: 'Part 2 · Left or right',
    part2Text: 'A circle will appear on the LEFT or the RIGHT. Tap that side as fast as you can.',
    wait: 'Wait for green…',
    tap: 'TAP!',
    early: 'Too early! Wait for the signal.',
    slow: 'Missed. Be ready!',
    wrong: 'Wrong side',
    practice: 'Practice',
    simple: 'Wait for green',
    choice: 'Left or right',
    median: 'Typical time',
    mean: 'Average',
    variability: 'Variation',
    fastest: 'Fastest 10%',
    slowest: 'Slowest 10%',
    falseStarts: 'Taps too early',
    misses: 'Missed',
    accuracy: 'Accuracy',
    perTrial: 'Each try',
    meaning: {
      great: 'You react faster than is usual at your age.',
      normal: 'Your reaction speed is usual for your age.',
      borderline: 'You react a bit slower than is usual at your age.',
      attention: 'You react clearly slower than is usual at your age.',
    } as Record<string, string>,
    highCv: 'Your times changed a lot from try to try. This often happens with tiredness, poor sleep or trouble concentrating.',
    rec: [
      'Reaction speed depends on sleep, tiredness, medicines, alcohol and stress. Compare results taken in similar conditions.',
      'Physical activity, good sleep and reaction games help keep you quick.',
      'If you suddenly become slower along with weakness, trouble speaking or seeing, get emergency help.',
    ],
    deviceNote: 'The times include your screen’s own delay (usually 30–60 ms). Compare results on the same phone.',
  },
  uz: {
    info: {
      name: 'Reaksiya tezligi',
      short: 'Signalga qanchalik tez javob berishingiz.',
      measures: 'Signalga qanchalik tez javob berishingiz va ikki variantdan to‘g‘risini qanchalik tez tanlashingizni o‘lchaydi. Reaksiya tezligi miya ma’lumotni qanchalik tez qayta ishlashini va hushyorligingizni ko‘rsatadi.',
      steps: [
        '1-qism: maydon yashil bo‘lishini kuting, keyin uni imkon qadar tez bosing.',
        '2-qism: chapda yoki o‘ngda doira paydo bo‘ladi. O‘sha tomonni bosing.',
        'Signaldan oldin bosmang. Avval ikkita sinov raundi bo‘ladi.',
      ],
      tips: ['Qulay o‘tiring, barmog‘ingizni ekranga yaqin tuting.', 'Har safar o‘sha telefondan foydalaning: har bir ekran o‘zidan biroz kechikish qo‘shadi.', 'Kofe ichgandan keyin yoki juda charchaganingizda topshirmang, agar aynan shuni tekshirmoqchi bo‘lmasangiz.'],
    },
    part1: '1-qism · Yashilni kuting',
    part1Text: 'Maydon YASHIL bo‘lganda, uni imkon qadar tez bosing.',
    part2: '2-qism · Chap yoki o‘ng',
    part2Text: 'CHAPDA yoki O‘NGDA doira paydo bo‘ladi. O‘sha tomonni imkon qadar tez bosing.',
    wait: 'Yashilni kuting…',
    tap: 'BOSING!',
    early: 'Juda erta! Signalni kuting.',
    slow: 'Ulgurmadingiz. Tayyor turing!',
    wrong: 'Boshqa tomon',
    practice: 'Sinov',
    simple: 'Yashilni kutish',
    choice: 'Chap yoki o‘ng',
    median: 'Odatiy vaqt',
    mean: 'O‘rtacha',
    variability: 'O‘zgaruvchanlik',
    fastest: 'Eng tez 10%',
    slowest: 'Eng sekin 10%',
    falseStarts: 'Erta bosishlar',
    misses: 'O‘tkazib yuborilgan',
    accuracy: 'Aniqlik',
    perTrial: 'Har bir urinish',
    meaning: {
      great: 'Siz yoshingizdagilarga qaraganda tezroq javob berasiz.',
      normal: 'Reaksiya tezligingiz yoshingiz uchun odatiy.',
      borderline: 'Siz yoshingizdagilarga qaraganda biroz sekinroq javob berasiz.',
      attention: 'Siz yoshingizdagilarga qaraganda ancha sekin javob berasiz.',
    } as Record<string, string>,
    highCv: 'Vaqtlaringiz urinishdan urinishga ancha o‘zgarib turdi. Bu ko‘pincha charchoq, uyqusizlik yoki diqqatni jamlash qiyinligida bo‘ladi.',
    rec: [
      'Reaksiya tezligi uyqu, charchoq, dori-darmon, spirtli ichimlik va stressga bog‘liq. Natijalarni o‘xshash sharoitda solishtiring.',
      'Jismoniy faollik, yaxshi uyqu va reaksiya o‘yinlari tezkorlikni saqlashga yordam beradi.',
      'Agar to‘satdan sekinlashish bilan birga holsizlik, gapirish yoki ko‘rishda qiyinchilik paydo bo‘lsa, zudlik bilan tez yordam chaqiring.',
    ],
    deviceNote: 'Vaqtlarga ekranning o‘z kechikishi ham kiradi (odatda 30–60 ms). Natijalarni o‘sha telefonda solishtiring.',
  },
  ru: {
    info: {
      name: 'Скорость реакции',
      short: 'Как быстро вы реагируете на сигнал.',
      measures: 'Насколько быстро вы реагируете на сигнал и насколько быстро выбираете правильный из двух вариантов. Скорость реакции показывает, как быстро мозг обрабатывает информацию, и насколько вы собраны.',
      steps: [
        'Часть 1: дождитесь, когда поле станет зелёным, и нажмите на него как можно быстрее.',
        'Часть 2: слева или справа появится круг. Нажмите на эту сторону.',
        'Не нажимайте раньше сигнала. Сначала будут два пробных раунда.',
      ],
      tips: ['Сядьте удобно и держите палец рядом с экраном.', 'Используйте каждый раз один и тот же телефон: каждый экран добавляет свою небольшую задержку.', 'Не проходите тест сразу после кофе или в сильной усталости, если только не хотите проверить именно это.'],
    },
    part1: 'Часть 1 · Ждите зелёный',
    part1Text: 'Когда поле станет ЗЕЛЁНЫМ, нажмите на него как можно быстрее.',
    part2: 'Часть 2 · Слева или справа',
    part2Text: 'Круг появится СЛЕВА или СПРАВА. Нажмите на эту сторону как можно быстрее.',
    wait: 'Ждите зелёный…',
    tap: 'ЖМИТЕ!',
    early: 'Слишком рано! Дождитесь сигнала.',
    slow: 'Не успели. Будьте наготове!',
    wrong: 'Не та сторона',
    practice: 'Проба',
    simple: 'Ждите зелёный',
    choice: 'Слева или справа',
    median: 'Обычное время',
    mean: 'Среднее',
    variability: 'Разброс',
    fastest: 'Быстрейшие 10%',
    slowest: 'Медленнейшие 10%',
    falseStarts: 'Ранние нажатия',
    misses: 'Пропуски',
    accuracy: 'Точность',
    perTrial: 'Каждая попытка',
    meaning: {
      great: 'Вы реагируете быстрее, чем обычно в вашем возрасте.',
      normal: 'Скорость реакции обычная для вашего возраста.',
      borderline: 'Вы реагируете немного медленнее, чем обычно в вашем возрасте.',
      attention: 'Вы реагируете заметно медленнее, чем обычно в вашем возрасте.',
    } as Record<string, string>,
    highCv: 'Время сильно менялось от попытки к попытке. Так часто бывает при усталости, недосыпе или трудностях с концентрацией.',
    rec: [
      'На скорость реакции влияют сон, усталость, лекарства, алкоголь и стресс. Сравнивайте результаты, полученные в похожих условиях.',
      'Физическая активность, хороший сон и игры на реакцию помогают сохранять быстроту.',
      'Если вы внезапно стали медленнее и при этом появилась слабость, нарушение речи или зрения, срочно вызывайте скорую.',
    ],
    deviceNote: 'Время включает собственную задержку экрана (обычно 30–60 мс). Сравнивайте результаты на одном и том же телефоне.',
  },
})

type Phase = 'intro1' | 'simple' | 'intro2' | 'choice'
type TState = 'idle' | 'wait' | 'go' | 'early' | 'result' | 'miss' | 'wrong'

function Runner({ onDone, onExit }: { onDone: (s: { value: number | null; level: Level }, d: ReactionData) => void; onExit: () => void }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const person = usePerson()
  const [phase, setPhase] = useState<Phase>('intro1')
  const [ts, setTs] = useState<TState>('idle')
  const [side, setSide] = useState<'L' | 'R'>('L')
  const [lastRt, setLastRt] = useState<number | null>(null)
  const [trialIdx, setTrialIdx] = useState(0)
  const st = useRef<TState>('idle')
  const onset = useRef<number | null>(null)
  const timers = useRef<number[]>([])
  const input = useRef<ReactionData['input']>('touch')
  const simple = useRef<ReactionData['simple']>({ rts: [], falseStarts: 0, misses: 0 })
  const choice = useRef<ReactionData['choice']>({ trials: [], falseStarts: 0 })
  const sides = useRef<('L' | 'R')[]>(shuffle([...Array(CHOICE_N / 2).fill('L'), ...Array(CHOICE_N / 2).fill('R')]))
  const idx = useRef(0)
  const phaseRef = useRef<Phase>('intro1')
  const sideRef = useRef<'L' | 'R'>('L')

  const set = (x: TState) => {
    st.current = x
    setTs(x)
  }
  const clear = () => {
    timers.current.forEach((x) => clearTimeout(x))
    timers.current = []
  }
  useEffect(() => clear, [])

  const total = () => (phaseRef.current === 'simple' ? SIMPLE_N : CHOICE_N) + PRACTICE_N
  const isPractice = () => idx.current < PRACTICE_N

  const startTrial = () => {
    clear()
    onset.current = null
    setLastRt(null)
    setTrialIdx(idx.current)
    const sd: 'L' | 'R' = isPractice() ? (Math.random() < 0.5 ? 'L' : 'R') : sides.current[idx.current - PRACTICE_N]
    setSide(sd)
    sideRef.current = sd
    set('wait')
    const fp = uniform(1500, 4000)
    timers.current.push(
      window.setTimeout(async () => {
        if (st.current !== 'wait') return
        const t0 = await presentStimulus(() => set('go'))
        onset.current = t0
        timers.current.push(
          window.setTimeout(() => {
            if (st.current !== 'go') return
            if (!isPractice()) {
              if (phaseRef.current === 'simple') simple.current.misses++
              else choice.current.trials.push({ side: sd, answer: null, rt: null })
            }
            set('miss')
            fx('bad')
            next(1100)
          }, 2000),
        )
      }, fp),
    )
  }

  const next = (delay: number) => {
    timers.current.push(
      window.setTimeout(() => {
        idx.current++
        if (idx.current >= total()) {
          if (phaseRef.current === 'simple') {
            phaseRef.current = 'intro2'
            setPhase('intro2')
            set('idle')
          } else finish()
        } else startTrial()
      }, delay),
    )
  }

  const press = (e: { timeStamp: number }, answer: 'L' | 'R' | null) => {
    const cur = st.current
    if (cur === 'wait') {
      clear()
      if (!isPractice()) {
        if (phaseRef.current === 'simple') simple.current.falseStarts++
        else choice.current.falseStarts++
      }
      set('early')
      fx('bad')
      timers.current.push(window.setTimeout(startTrial, 1300))
      return
    }
    if (cur !== 'go' || onset.current === null) return
    const rt = eventTime(e) - onset.current
    if (rt < 100) {
      // anticipation – treat like an early tap
      clear()
      set('early')
      timers.current.push(window.setTimeout(startTrial, 1300))
      return
    }
    clear()
    if (phaseRef.current === 'simple') {
      if (!isPractice()) simple.current.rts.push(Math.round(rt))
      setLastRt(rt)
      set('result')
      fx('tap')
    } else {
      const sd = sideRef.current
      const ok = answer === sd
      if (!isPractice()) choice.current.trials.push({ side: sd, answer, rt: Math.round(rt) })
      setLastRt(rt)
      set(ok ? 'result' : 'wrong')
      if (!ok) fx('bad')
      else fx('tap')
    }
    next(900)
  }

  const finish = () => {
    const age = ageOf(person)
    const rtS = summarizeRt(simple.current.rts)
    const correct = choice.current.trials.filter((x) => x.answer === x.side && x.rt !== null).map((x) => x.rt as number)
    const rtC = correct.length ? summarizeRt(correct).median : null
    const lv = rtLevel(rtS.median, rtC, age ?? DEFAULT_AGE)
    onDone({ value: Number.isFinite(rtS.median) ? Math.round(rtS.median) : null, level: Number.isFinite(rtS.median) ? lv.level : 'attention' }, { simple: simple.current, choice: choice.current, age, input: input.current })
  }

  const begin = (p: 'simple' | 'choice') => {
    phaseRef.current = p
    setPhase(p)
    idx.current = 0
    startTrial()
  }

  useKey([' ', 'Space'], (e) => {
    e.preventDefault()
    input.current = 'key'
    if (phaseRef.current === 'simple') press(e, null)
  })
  useKey(['ArrowLeft', 'KeyF'], (e) => {
    input.current = 'key'
    if (phaseRef.current === 'choice') press(e, 'L')
  })
  useKey(['ArrowRight', 'KeyJ'], (e) => {
    input.current = 'key'
    if (phaseRef.current === 'choice') press(e, 'R')
  })

  const onPointer = (e: RPointerEvent, answer: 'L' | 'R' | null) => {
    e.preventDefault()
    input.current = e.pointerType === 'mouse' ? 'mouse' : 'touch'
    press(e, answer)
  }

  const practiceLabel = isPractice() && (phase === 'simple' || phase === 'choice') ? s.practice : null
  const n = phase === 'simple' ? SIMPLE_N : CHOICE_N
  const progress = phase === 'simple' ? Math.max(0, trialIdx - PRACTICE_N) / (SIMPLE_N + CHOICE_N) : phase === 'choice' ? (SIMPLE_N + Math.max(0, trialIdx - PRACTICE_N)) / (SIMPLE_N + CHOICE_N) : phase === 'intro2' ? SIMPLE_N / (SIMPLE_N + CHOICE_N) : 0

  const message =
    ts === 'early' ? s.early : ts === 'miss' ? s.slow : ts === 'wrong' ? s.wrong : ts === 'result' && lastRt !== null ? `${Math.round(lastRt)} ${t.ms}` : ts === 'go' ? s.tap : s.wait

  return (
    <FocusShell
      title={s.info.name}
      subtitle={phase === 'simple' || phase === 'choice' ? `${phase === 'simple' ? s.simple : s.choice} · ${practiceLabel ?? `${Math.max(1, trialIdx - PRACTICE_N + 1)} / ${n}`}` : undefined}
      progress={progress}
      onExit={onExit}
    >
      {phase === 'intro1' && (
        <Stage
          icon={<Zap className="h-8 w-8" />}
          title={s.part1}
          footer={
            <Button variant="accent" size="lg" onClick={() => begin('simple')}>
              {t.btn.start}
            </Button>
          }
        >
          <p>{s.part1Text}</p>
        </Stage>
      )}
      {phase === 'intro2' && (
        <Stage
          icon={<Zap className="h-8 w-8" />}
          title={s.part2}
          footer={
            <Button variant="accent" size="lg" onClick={() => begin('choice')}>
              {t.btn.continue}
            </Button>
          }
        >
          <p>{s.part2Text}</p>
        </Stage>
      )}
      {phase === 'simple' && (
        <div
          className={cx(
            'no-touch-scroll flex flex-1 cursor-pointer select-none flex-col items-center justify-center rounded-3xl text-center transition-none',
            ts === 'go' ? 'bg-[#16a34a] text-white' : ts === 'early' ? 'bg-borderline-soft text-borderline' : ts === 'miss' ? 'bg-urgent-soft text-urgent' : 'bg-surface-3 text-ink-2',
          )}
          style={{ minHeight: '55vh' }}
          onPointerDown={(e) => onPointer(e, null)}
        >
          <div className={cx('font-black tabular', ts === 'result' || ts === 'go' ? 'text-5xl' : 'text-2xl')}>{message}</div>
          {practiceLabel && <div className="mt-3 text-sm font-semibold opacity-70">{practiceLabel}</div>}
        </div>
      )}
      {phase === 'choice' && (
        <div className="flex flex-1 flex-col gap-4">
          <div className="grid flex-1 grid-cols-2 gap-3" style={{ minHeight: '50vh' }}>
            {(['L', 'R'] as const).map((sd) => (
              <div
                key={sd}
                onPointerDown={(e) => onPointer(e, sd)}
                className="no-touch-scroll flex cursor-pointer select-none items-center justify-center rounded-3xl bg-surface-3 transition-none"
              >
                <div
                  className={cx(
                    'h-28 w-28 rounded-full border-4 transition-none sm:h-36 sm:w-36',
                    ts === 'go' && side === sd ? 'border-[#16a34a] bg-[#16a34a]' : 'border-line-strong bg-transparent',
                  )}
                />
              </div>
            ))}
          </div>
          <div className={cx('h-10 text-center text-2xl font-black tabular', ts === 'wrong' || ts === 'miss' ? 'text-urgent' : ts === 'early' ? 'text-borderline' : 'text-ink')}>
            {ts === 'go' || ts === 'wait' ? '' : message}
            {practiceLabel && ts === 'wait' && <span className="text-sm font-semibold text-muted">{practiceLabel}</span>}
          </div>
        </div>
      )}
    </FocusShell>
  )
}

/* ------------------------------------------------------------------ */

function RtBars({ values, errors }: { values: (number | null)[]; errors?: boolean[] }) {
  const [ref, { width }] = useElementSize<HTMLDivElement>()
  const max = Math.max(600, ...values.filter((v): v is number => v !== null))
  const H = 110
  const w = Math.max(200, width)
  const bw = w / values.length
  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg width={w} height={H} className="block">
          {values.map((v, i) => {
            const h = v === null ? H : (v / max) * (H - 4)
            return (
              <rect
                key={i}
                x={i * bw + 1.5}
                y={H - h}
                width={Math.max(2, bw - 3)}
                height={h}
                rx={3}
                fill={v === null ? 'var(--urgent-soft)' : errors?.[i] ? 'var(--urgent)' : 'var(--accent)'}
                opacity={v === null ? 1 : 0.85}
              />
            )
          })}
        </svg>
      )}
    </div>
  )
}

function Details({ result }: { result: { data: ReactionData; summary: { level: Level } } }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const lang = useLang()
  const d = result.data
  const age = d.age ?? DEFAULT_AGE
  const rs = summarizeRt(d.simple.rts)
  const correct = d.choice.trials.filter((x) => x.answer === x.side && x.rt !== null).map((x) => x.rt as number)
  const rc = correct.length ? summarizeRt(correct) : null
  const acc = d.choice.trials.length ? d.choice.trials.filter((x) => x.answer === x.side).length / d.choice.trials.length : NaN
  const bands = (exp: number, sdv: number) => ({
    min: Math.round(exp - 3 * sdv),
    max: Math.round(exp + 4 * sdv),
    segments: [
      { to: exp - sdv, level: 'great' as const },
      { to: exp + sdv, level: 'normal' as const },
      { to: exp + 2 * sdv, level: 'borderline' as const },
      { to: exp + 4 * sdv, level: 'attention' as const },
    ],
  })
  const b1 = bands(expectedSimpleRt(age), SIMPLE_RT_SD)
  const b2 = bands(expectedChoiceRt(age), CHOICE_RT_SD)
  return (
    <>
      <Card className="p-5">
        <SectionTitle>{s.simple}</SectionTitle>
        <ScaleBar {...b1} value={rs.median} valueLabel={`${Math.round(rs.median)} ${t.ms}`} format={(v) => String(Math.round(v))} />
        <div className="mt-4">
          <MetricGrid cols={3}>
            <Metric label={s.median} value={Math.round(rs.median)} unit={t.ms} emphasis />
            <Metric label={s.fastest} value={Math.round(rs.fastest10)} unit={t.ms} />
            <Metric label={s.slowest} value={Math.round(rs.slowest10)} unit={t.ms} />
            <Metric label={s.variability} value={fmtNum(lang, rs.cv, 0)} unit="%" />
            <Metric label={s.falseStarts} value={d.simple.falseStarts} />
            <Metric label={s.misses} value={d.simple.misses} />
          </MetricGrid>
        </div>
        <div className="mt-4 text-xs font-semibold text-muted">{s.perTrial}</div>
        <RtBars values={d.simple.rts} />
      </Card>
      {rc && (
        <Card className="p-5">
          <SectionTitle>{s.choice}</SectionTitle>
          <ScaleBar {...b2} value={rc.median} valueLabel={`${Math.round(rc.median)} ${t.ms}`} format={(v) => String(Math.round(v))} />
          <div className="mt-4">
            <MetricGrid cols={3}>
              <Metric label={s.median} value={Math.round(rc.median)} unit={t.ms} emphasis />
              <Metric label={s.accuracy} value={Math.round(acc * 100)} unit="%" />
              <Metric label={s.variability} value={fmtNum(lang, rc.cv, 0)} unit="%" />
            </MetricGrid>
          </div>
          <div className="mt-4 text-xs font-semibold text-muted">{s.perTrial}</div>
          <RtBars values={d.choice.trials.map((x) => x.rt)} errors={d.choice.trials.map((x) => x.answer !== x.side)} />
        </Card>
      )}
      <Card className="p-5">
        <SectionTitle>{t.whatItMeans}</SectionTitle>
        <p className="leading-relaxed text-ink-2">{s.meaning[result.summary.level]}</p>
        {rs.cv > 25 && <p className="mt-2 leading-relaxed text-borderline">{s.highCv}</p>}
        <p className="mt-2 text-sm text-muted">{d.age ? t.ageCompare(d.age) : t.ageMissing}</p>
      </Card>
      <Card className="p-5">
        <SectionTitle>{t.recommendations}</SectionTitle>
        <Bullets items={s.rec} />
      </Card>
      <p className="text-xs text-muted">{s.deviceNote}</p>
    </>
  )
}

const reactionTest: TestModule<ReactionData> = {
  kind: 'test',
  usesAge: true,
  id: 'reaction-time',
  field: 'memory',
  icon: Zap,
  minutes: 3,
  requirements: ['touch', 'keyboard'],
  version: 1,
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  Details,
  headline: (r, lang) => {
    const rs = summarizeRt(r.data.simple.rts)
    return { value: String(Math.round(rs.median)), unit: common[lang].ms, label: common[lang].level[r.summary.level] }
  },
  trend: { higherIsBetter: false, unit: (lang) => common[lang].ms, digits: 0 },
}

export default reactionTest
