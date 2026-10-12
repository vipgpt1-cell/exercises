import { useEffect, useRef, useState } from 'react'
import { Eye, Hash, Volume2 } from 'lucide-react'
import type { TestModule } from '../../catalog/types'
import { FocusShell, Stage } from '../../components/shell'
import { Bullets, Button, Card, Metric, MetricGrid, SectionTitle, cx } from '../../components/ui'
import { DigitSlots, Keypad } from '../../components/Keypad'
import { defineStrings, ruPlural, useLang, useStrings, type Lang } from '../../lib/i18n'
import { fx, getCtx, unlockAudio } from '../../lib/audio'
import { ageOf, usePerson, useSettings, type Level } from '../../lib/store'
import { common } from '../../i18n/common'
import { loadDigitPack, playDigitAt, type DigitPack } from '../hearing/din-audio'
import { DEFAULT_AGE, SpanProcedure, expectedDigitSpan, spanLevel, type SpanTrial } from './norms'
import { SpanScale, SpanTrialList, makeSequence } from './span-shared'
import { wait } from './timing'

export interface DigitSpanData {
  mode: 'visual' | 'audio'
  forward: { span: number; trials: SpanTrial[] }
  backward: { span: number; trials: SpanTrial[] }
  age: number | null
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

const S = defineStrings({
  en: {
    info: {
      name: 'Digit span',
      short: 'How many digits you can keep in mind, forwards and backwards.',
      measures: 'Checks short-term memory (repeating digits in the same order) and working memory (repeating them backwards): how well you can hold information in mind for a few seconds and work with it.',
      steps: [
        'Digits appear one at a time, one per second.',
        'Part 1: type them in the same order.',
        'Part 2: type them in REVERSE order.',
        'The rows get longer until you make two mistakes at the same length.',
      ],
      tips: ['Don’t write anything down, just remember.', 'It helps to repeat the digits silently to yourself.', 'Do the test in a quiet place where no one will interrupt you.'],
    },
    mode: 'How should the digits be given?',
    visual: 'Show on screen',
    audio: 'Say out loud',
    fwdTitle: 'Part 1 · Same order',
    fwdText: 'Remember the digits and type them in the SAME order.',
    bwdTitle: 'Part 2 · Reverse order',
    bwdText: 'Now type the digits in REVERSE order. For example: 3 8 2 → 2 8 3.',
    practice: 'Practice',
    watch: 'Watch…',
    listen: 'Listen…',
    yourTurn: (rev: boolean): string => (rev ? 'Type them in reverse order' : 'Type them in the same order'),
    length: (n: number) => `${n} digits`,
    forward: 'Same order',
    backward: 'Reverse order',
    fwdShort: 'forward',
    bwdShort: 'backward',
    correctTrials: 'Rows remembered',
    trials: 'All rows',
    target: 'shown',
    meaning: {
      great: 'Your memory span is above average for your age.',
      normal: 'Your memory span is usual for your age.',
      borderline: 'Your memory span is a bit below usual for your age.',
      attention: 'Your memory span is clearly below usual for your age.',
    } as Record<string, string>,
    rec: [
      'Tiredness, stress, worry, poor sleep and some medicines lower the result. Repeat the test on a good day to be sure.',
      'Regular mental activity, exercise and good sleep support memory. Try the N-back and memory pairs exercises.',
      'If you or your family notice memory getting worse in daily life, talk to a doctor (a neurologist).',
    ],
  },
  uz: {
    info: {
      name: 'Raqamlarni eslab qolish',
      short: 'Nechta raqamni to‘g‘ri va teskari tartibda eslab qola olasiz.',
      measures: 'Qisqa muddatli xotirani (raqamlarni o‘sha tartibda takrorlash) va ishchi xotirani (ularni teskari takrorlash) tekshiradi: ma’lumotni bir necha soniya yodda saqlash va u bilan ishlash qobiliyatingizni.',
      steps: [
        'Raqamlar birin-ketin, soniyasiga bittadan ko‘rsatiladi.',
        '1-qism: ularni o‘sha tartibda kiriting.',
        '2-qism: ularni TESKARI tartibda kiriting.',
        'Qatorlar bir xil uzunlikda ikki marta xato qilguningizcha uzayib boradi.',
      ],
      tips: ['Hech narsa yozmang, faqat eslab qoling.', 'Raqamlarni ichingizda takrorlab turish yordam beradi.', 'Testni hech kim xalaqit bermaydigan tinch joyda topshiring.'],
    },
    mode: 'Raqamlar qanday berilsin?',
    visual: 'Ekranda ko‘rsatish',
    audio: 'Ovoz chiqarib aytish',
    fwdTitle: '1-qism · O‘sha tartibda',
    fwdText: 'Raqamlarni eslab qoling va ularni O‘SHA tartibda kiriting.',
    bwdTitle: '2-qism · Teskari tartibda',
    bwdText: 'Endi raqamlarni TESKARI tartibda kiriting. Masalan: 3 8 2 → 2 8 3.',
    practice: 'Sinov',
    watch: 'Kuzating…',
    listen: 'Tinglang…',
    yourTurn: (rev: boolean): string => (rev ? 'Teskari tartibda kiriting' : 'O‘sha tartibda kiriting'),
    length: (n: number) => `${n} ta raqam`,
    forward: 'O‘sha tartibda',
    backward: 'Teskari tartibda',
    fwdShort: 'to‘g‘ri',
    bwdShort: 'teskari',
    correctTrials: 'Eslab qolingan qatorlar',
    trials: 'Barcha qatorlar',
    target: 'ko‘rsatilgan',
    meaning: {
      great: 'Xotira hajmingiz yoshingizdagilarnikidan yuqori.',
      normal: 'Xotira hajmingiz yoshingiz uchun odatiy.',
      borderline: 'Xotira hajmingiz yoshingiz uchun odatdagidan biroz past.',
      attention: 'Xotira hajmingiz yoshingiz uchun odatdagidan ancha past.',
    } as Record<string, string>,
    rec: [
      'Charchoq, stress, xavotir, yomon uyqu va ba’zi dorilar natijani pasaytiradi. Ishonch hosil qilish uchun testni yaxshi kayfiyatdagi kunda takrorlang.',
      'Muntazam aqliy faollik, jismoniy mashqlar va yaxshi uyqu xotirani qo‘llab-quvvatlaydi. N-back va juftliklar mashqlarini sinab ko‘ring.',
      'Agar siz yoki yaqinlaringiz kundalik hayotda xotira yomonlashayotganini sezsangiz, shifokor (nevrolog) bilan maslahatlashing.',
    ],
  },
  ru: {
    info: {
      name: 'Запоминание цифр',
      short: 'Сколько цифр вы можете удержать в памяти — в прямом и обратном порядке.',
      measures: 'Проверяет кратковременную память (повторить цифры в том же порядке) и рабочую память (повторить их задом наперёд): как хорошо вы удерживаете информацию несколько секунд и работаете с ней.',
      steps: [
        'Цифры появляются по одной, раз в секунду.',
        'Часть 1: введите их в том же порядке.',
        'Часть 2: введите их в ОБРАТНОМ порядке.',
        'Ряды становятся длиннее, пока вы не ошибётесь дважды на одной длине.',
      ],
      tips: ['Ничего не записывайте, просто запоминайте.', 'Помогает повторять цифры про себя.', 'Проходите тест в тихом месте, где вас не будут отвлекать.'],
    },
    mode: 'Как показывать цифры?',
    visual: 'На экране',
    audio: 'Вслух',
    fwdTitle: 'Часть 1 · В том же порядке',
    fwdText: 'Запомните цифры и введите их в ТОМ ЖЕ порядке.',
    bwdTitle: 'Часть 2 · В обратном порядке',
    bwdText: 'Теперь вводите цифры в ОБРАТНОМ порядке. Например: 3 8 2 → 2 8 3.',
    practice: 'Проба',
    watch: 'Смотрите…',
    listen: 'Слушайте…',
    yourTurn: (rev: boolean): string => (rev ? 'Введите в обратном порядке' : 'Введите в том же порядке'),
    length: (n: number) => `${n} ${ruPlural(n, 'цифра', 'цифры', 'цифр')}`,
    forward: 'В том же порядке',
    backward: 'В обратном порядке',
    fwdShort: 'прямой',
    bwdShort: 'обратный',
    correctTrials: 'Запомнено рядов',
    trials: 'Все ряды',
    target: 'показано',
    meaning: {
      great: 'Объём памяти выше среднего для вашего возраста.',
      normal: 'Объём памяти обычный для вашего возраста.',
      borderline: 'Объём памяти немного ниже обычного для вашего возраста.',
      attention: 'Объём памяти заметно ниже обычного для вашего возраста.',
    } as Record<string, string>,
    rec: [
      'Результат снижают усталость, стресс, тревога, плохой сон и некоторые лекарства. Чтобы убедиться, повторите тест в хороший день.',
      'Регулярная умственная нагрузка, физические упражнения и хороший сон поддерживают память. Попробуйте упражнения N-back и «Пары».',
      'Если вы или ваши близкие замечаете, что память в жизни ухудшается, обсудите это с врачом (неврологом).',
    ],
  },
})

type Part = 'forward' | 'backward'

function Runner({ onDone, onExit }: { onDone: (s: { value: number | null; level: Level }, d: DigitSpanData) => void; onExit: () => void }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const appLang = useLang()
  const dLang: Lang = useSettings().digitLang ?? appLang
  const person = usePerson()
  const [stage, setStage] = useState<'mode' | 'intro' | 'present' | 'answer' | 'feedback'>('mode')
  const [mode, setMode] = useState<'visual' | 'audio'>('visual')
  const [part, setPart] = useState<Part>('forward')
  const [shown, setShown] = useState<number | null>(null)
  const [answer, setAnswer] = useState<number[]>([])
  const [fb, setFb] = useState<'ok' | 'bad' | null>(null)
  const [practice, setPractice] = useState(true)
  const [len, setLen] = useState(3)
  const target = useRef<number[]>([])
  const proc = useRef<Record<Part, SpanProcedure>>({ forward: new SpanProcedure(3, 10), backward: new SpanProcedure(2, 9) })
  const pack = useRef<DigitPack | null>(null)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const present = async (p: Part, isPractice: boolean) => {
    const L = isPractice ? 2 : proc.current[p].length
    setLen(L)
    const seq = makeSequence(DIGITS, L)
    target.current = seq
    setAnswer([])
    setFb(null)
    setStage('present')
    setShown(null)
    await wait(900)
    if (mode === 'audio' && pack.current) {
      const ctx = getCtx()
      const t0 = ctx.currentTime + 0.1
      seq.forEach((d, i) => playDigitAt(pack.current!, d, t0 + i))
      for (let i = 0; i < seq.length; i++) {
        if (!alive.current) return
        setShown(-1)
        await wait(1000)
      }
    } else {
      for (const d of seq) {
        if (!alive.current) return
        setShown(d)
        await wait(800)
        setShown(null)
        await wait(200)
      }
    }
    setShown(null)
    if (alive.current) setStage('answer')
  }

  const startPart = async (p: Part) => {
    await unlockAudio()
    if (mode === 'audio' && !pack.current) pack.current = await loadDigitPack(dLang)
    setPart(p)
    setPractice(true)
    present(p, true)
  }

  const submit = async () => {
    const expected = part === 'forward' ? target.current : [...target.current].reverse()
    const ok = answer.length === expected.length && answer.every((d, i) => d === expected[i])
    setFb(ok ? 'ok' : 'bad')
    setStage('feedback')
    fx(ok ? 'good' : 'bad')
    if (!practice) proc.current[part].respond(expected, answer)
    await wait(1000)
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
      setStage('intro')
      return
    }
    const f = proc.current.forward
    const b = proc.current.backward
    const age = ageOf(person)
    const lv = spanLevel(f.span, b.span, expectedDigitSpan(age ?? DEFAULT_AGE))
    onDone(
      { value: f.span + b.span, level: lv.level },
      { mode, forward: { span: f.span, trials: f.trials }, backward: { span: b.span, trials: b.trials }, age },
    )
  }

  const title = part === 'forward' ? s.fwdTitle : s.bwdTitle
  return (
    <FocusShell title={s.info.name} subtitle={stage === 'mode' ? undefined : `${title}${practice && stage !== 'intro' ? ' · ' + s.practice : ''}`} onExit={onExit}>
      {stage === 'mode' && (
        <Stage
          icon={<Hash className="h-8 w-8" />}
          title={s.mode}
          footer={
            <Button variant="accent" size="lg" onClick={() => setStage('intro')}>
              {t.btn.continue}
            </Button>
          }
        >
          <div className="mt-2 grid grid-cols-2 gap-3">
            {(['visual', 'audio'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cx('flex flex-col items-center gap-2 rounded-2xl border-2 p-4 font-semibold transition', mode === m ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-ink' : 'border-line bg-surface text-ink-2')}
              >
                {m === 'visual' ? <Eye className="h-7 w-7" /> : <Volume2 className="h-7 w-7" />}
                {m === 'visual' ? s.visual : s.audio}
              </button>
            ))}
          </div>
        </Stage>
      )}
      {stage === 'intro' && (
        <Stage
          icon={<Hash className="h-8 w-8" />}
          title={title}
          footer={
            <Button variant="accent" size="lg" onClick={() => startPart(part)}>
              {t.btn.start}
            </Button>
          }
        >
          <p>{part === 'forward' ? s.fwdText : s.bwdText}</p>
        </Stage>
      )}
      {(stage === 'present' || stage === 'answer' || stage === 'feedback') && (
        <div className="flex flex-1 flex-col items-center justify-between gap-6">
          <div className="w-full text-center">
            <div className="text-sm font-semibold text-muted">{s.length(len)}</div>
            <div className="mt-2 flex h-36 items-center justify-center">
              {stage === 'present' ? (
                shown === -1 ? (
                  <Volume2 className="animate-pulse-soft h-16 w-16 text-[var(--accent)]" />
                ) : shown !== null ? (
                  <span className="animate-pop text-8xl font-black tabular text-ink">
                    {shown}
                  </span>
                ) : (
                  <span className="text-lg font-semibold text-muted">{mode === 'audio' ? s.listen : s.watch}</span>
                )
              ) : (
                <div className="w-full">
                  <p className={cx('mb-4 text-lg font-semibold', stage === 'feedback' ? (fb === 'ok' ? 'text-great' : 'text-urgent') : 'text-ink')}>
                    {stage === 'feedback' ? (fb === 'ok' ? t.correct : t.wrong) : s.yourTurn(part === 'backward')}
                  </p>
                  <DigitSlots value={answer} length={len} state={stage === 'feedback' ? fb : null} />
                </div>
              )}
            </div>
          </div>
          <div className="pb-safe w-full">
            <Keypad value={answer} maxLength={len} onChange={setAnswer} onSubmit={submit} submitLabel={t.btn.ok} disabled={stage !== 'answer'} />
          </div>
        </div>
      )}
    </FocusShell>
  )
}

function Details({ result }: { result: { data: DigitSpanData; summary: { level: Level } } }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const d = result.data
  const exp = expectedDigitSpan(d.age ?? DEFAULT_AGE)
  const fmt = (xs: number[]) => (xs.length ? xs.join(' ') : '—')
  return (
    <>
      <Card className="p-5">
        <SectionTitle>{s.forward}</SectionTitle>
        <SpanScale value={d.forward.span} exp={exp.forward} sd={exp.sd} min={2} max={10} label={String(d.forward.span)} />
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

const digitSpan: TestModule<DigitSpanData> = {
  kind: 'test',
  usesAge: true,
  id: 'digit-span',
  field: 'memory',
  icon: Hash,
  minutes: 5,
  requirements: ['quiet', 'keyboard'],
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

export default digitSpan
