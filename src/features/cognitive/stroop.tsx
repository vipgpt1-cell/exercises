import { useEffect, useRef, useState } from 'react'
import { Palette } from 'lucide-react'
import type { TestModule } from '../../catalog/types'
import { FocusShell, Stage } from '../../components/shell'
import { Bullets, Button, Callout, Card, Metric, MetricGrid, SectionTitle, cx } from '../../components/ui'
import { CompareBars, ScaleBar } from '../../components/charts'
import { defineStrings, fmtNum, useLang, useStrings, type Lang } from '../../lib/i18n'
import { fx } from '../../lib/audio'
import { useKey } from '../../lib/hooks'
import { shuffle } from '../../lib/rng'
import { ageOf, usePerson, type Level } from '../../lib/store'
import { common } from '../../i18n/common'
import { DEFAULT_AGE, stroopLevel, stroopScore, type StroopTrial } from './norms'
import { eventTime, presentStimulus, wait } from './timing'

export interface StroopData {
  trials: StroopTrial[]
  age: number | null
  lang: Lang
}

/** Ink colours – bright enough on the dark stimulus card, distinct for normal colour vision. */
const INK = ['#f87171', '#4ade80', '#60a5fa', '#facc15']
const WORDS: Record<Lang, string[]> = {
  en: ['RED', 'GREEN', 'BLUE', 'YELLOW'],
  uz: ['QIZIL', 'YASHIL', 'KO‘K', 'SARIQ'],
  ru: ['КРАСНЫЙ', 'ЗЕЛЁНЫЙ', 'СИНИЙ', 'ЖЁЛТЫЙ'],
}
const NAMES: Record<Lang, string[]> = {
  en: ['Red', 'Green', 'Blue', 'Yellow'],
  uz: ['Qizil', 'Yashil', 'Ko‘k', 'Sariq'],
  ru: ['Красный', 'Зелёный', 'Синий', 'Жёлтый'],
}
const N_MAIN = 48
const N_PRACTICE = 8
const TIMEOUT = 3000

const S = defineStrings({
  en: {
    info: {
      name: 'Stroop test',
      short: 'Name the colour of the letters, not the word. Checks attention and self-control.',
      measures: 'Checks how well you can focus on one thing and ignore another. A colour word appears in a different colour (for example, “RED” written in blue), and it’s tempting to read the word instead of naming the colour. The test measures how much that slows you down.',
      steps: ['A colour word appears, written in coloured letters.', 'Tap the button with the colour of the LETTERS. Ignore what the word says.', 'Be quick and accurate. 8 practice words + 48 words, about 3 minutes.'],
      tips: ['Hold the phone comfortably and keep your finger close to the buttons.', 'Not suitable if you have trouble telling colours apart (for example red and green).'],
    },
    instruction: 'Tap the COLOUR of the letters, not the word',
    example: 'For example, for',
    exampleAnswer: 'tap “Blue”.',
    practice: 'Practice',
    tooSlow: 'Too slow',
    congruent: 'Word and colour match',
    incongruent: 'Word and colour differ',
    interference: 'Extra time when they differ',
    rtByType: 'Average time',
    acc: 'Accuracy',
    accConflict: 'Accuracy when they differ',
    meaning: {
      great: 'The words barely slowed you down. Your attention control is excellent.',
      normal: 'The words slowed you down as much as most people. Your attention control is normal.',
      borderline: 'The words slowed you down more than usual. Self-control may be a bit weaker, or you may have been tired.',
      attention: 'The words slowed you down a lot or caused many mistakes. This points to weaker attention control.',
    } as Record<string, string>,
    rec: [
      'The result depends on tiredness, stress and reading speed. Compare results taken in similar conditions.',
      'Train your focus with the Schulte tables and N-back exercises.',
      'If trouble concentrating keeps getting in the way of daily life, talk to a doctor.',
    ],
  },
  uz: {
    info: {
      name: 'Strup testi',
      short: 'So‘zni emas, harflar rangini ayting. Diqqat va o‘zini tutishni tekshiradi.',
      measures: 'Bir narsaga diqqat qaratib, boshqasiga e’tibor bermaslik qobiliyatingizni tekshiradi. Rang nomi boshqa rangda yoziladi (masalan, “QIZIL” so‘zi ko‘k harflar bilan), va rangni aytish o‘rniga so‘zni o‘qib yuborgingiz keladi. Test bu sizni qanchalik sekinlashtirishini o‘lchaydi.',
      steps: ['Rangli harflar bilan yozilgan rang nomi chiqadi.', 'HARFLAR rangidagi tugmani bosing. So‘z nima deyayotganiga qaramang.', 'Tez va aniq bo‘ling. 8 ta sinov so‘zi + 48 ta so‘z, taxminan 3 daqiqa.'],
      tips: ['Telefonni qulay ushlang, barmog‘ingizni tugmalarga yaqin tuting.', 'Ranglarni ajratishda qiynalsangiz (masalan, qizil va yashilni), bu test sizga to‘g‘ri kelmaydi.'],
    },
    instruction: 'So‘zni emas, harflar RANGINI bosing',
    example: 'Masalan,',
    exampleAnswer: 'uchun “Ko‘k”ni bosing.',
    practice: 'Sinov',
    tooSlow: 'Juda sekin',
    congruent: 'So‘z va rang mos',
    incongruent: 'So‘z va rang har xil',
    interference: 'Har xil bo‘lganda qo‘shimcha vaqt',
    rtByType: 'O‘rtacha vaqt',
    acc: 'Aniqlik',
    accConflict: 'Har xil bo‘lgandagi aniqlik',
    meaning: {
      great: 'So‘zlar sizni deyarli sekinlashtirmadi. Diqqatni boshqarishingiz a’lo darajada.',
      normal: 'So‘zlar sizni ko‘pchilik kabi sekinlashtirdi. Diqqatni boshqarishingiz me’yorida.',
      borderline: 'So‘zlar sizni odatdagidan ko‘proq sekinlashtirdi. O‘zini tutish biroz sustlashgan bo‘lishi yoki shunchaki charchagan bo‘lishingiz mumkin.',
      attention: 'So‘zlar sizni ancha sekinlashtirdi yoki ko‘p xatoga sabab bo‘ldi. Bu diqqatni boshqarish susayganini ko‘rsatadi.',
    } as Record<string, string>,
    rec: [
      'Natija charchoq, stress va o‘qish tezligiga bog‘liq. Natijalarni o‘xshash sharoitda solishtiring.',
      'Diqqatni Shulte jadvallari va N-back mashqlari bilan charxlang.',
      'Agar diqqatni jamlay olmaslik kundalik hayotga doim xalaqit bersa, shifokor bilan maslahatlashing.',
    ],
  },
  ru: {
    info: {
      name: 'Тест Струпа',
      short: 'Называйте цвет букв, а не слово. Проверяет внимание и самоконтроль.',
      measures: 'Проверяет, насколько хорошо вы удерживаете внимание на одном и не отвлекаетесь на другое. Название цвета написано другим цветом (например, «КРАСНЫЙ» синими буквами), и хочется прочитать слово, а не назвать цвет. Тест измеряет, насколько это вас замедляет.',
      steps: ['Появляется название цвета, написанное цветными буквами.', 'Нажмите кнопку с цветом БУКВ. Не обращайте внимания на само слово.', 'Отвечайте быстро и точно. 8 пробных слов + 48 слов, около 3 минут.'],
      tips: ['Держите телефон удобно, палец — рядом с кнопками.', 'Тест не подходит, если вам трудно различать цвета (например, красный и зелёный).'],
    },
    instruction: 'Нажмите ЦВЕТ букв, а не слово',
    example: 'Например, для',
    exampleAnswer: 'нажмите «Синий».',
    practice: 'Проба',
    tooSlow: 'Слишком медленно',
    congruent: 'Слово и цвет совпадают',
    incongruent: 'Слово и цвет разные',
    interference: 'Задержка, когда они разные',
    rtByType: 'Среднее время',
    acc: 'Точность',
    accConflict: 'Точность, когда они разные',
    meaning: {
      great: 'Слова почти не замедлили вас. Отличный контроль внимания.',
      normal: 'Слова замедлили вас так же, как большинство людей. Контроль внимания в норме.',
      borderline: 'Слова замедлили вас сильнее обычного. Самоконтроль может быть немного снижен — или вы устали.',
      attention: 'Слова сильно замедлили вас или привели ко многим ошибкам. Это говорит о сниженном контроле внимания.',
    } as Record<string, string>,
    rec: [
      'Результат зависит от усталости, стресса и скорости чтения. Сравнивайте результаты, полученные в похожих условиях.',
      'Тренируйте внимание с таблицами Шульте и упражнением N-back.',
      'Если трудности с концентрацией постоянно мешают в жизни, обсудите это с врачом.',
    ],
  },
})

export function makeTrials(n: number): { word: number; ink: number; congruent: boolean }[] {
  const half = n / 2
  const items: { word: number; ink: number; congruent: boolean }[] = []
  for (let i = 0; i < half; i++) items.push({ word: i % 4, ink: i % 4, congruent: true })
  for (let i = 0; i < half; i++) {
    const ink = i % 4
    // each ink appears with each of the three other words equally often
    const word = (ink + 1 + (Math.floor(i / 4) % 3)) % 4
    items.push({ word, ink, congruent: false })
  }
  // Randomise with no immediate repetition of ink colour (avoids repetition priming).
  for (let attempt = 0; attempt < 200; attempt++) {
    let pool = shuffle(items)
    const out: typeof items = []
    while (pool.length) {
      const prev = out[out.length - 1]
      const cands = pool.filter((x) => !prev || x.ink !== prev.ink)
      if (!cands.length) break
      const pick = cands[Math.floor(Math.random() * cands.length)]
      out.push(pick)
      pool = pool.filter((x) => x !== pick)
    }
    if (out.length === items.length) return out
  }
  return shuffle(items)
}

function Runner({ onDone, onExit }: { onDone: (s: { value: number | null; level: Level }, d: StroopData) => void; onExit: () => void }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const lang = useLang()
  const person = usePerson()
  const [stage, setStage] = useState<'intro' | 'run' | 'practiceDone'>('intro')
  const [phase, setPhase] = useState<'practice' | 'main'>('practice')
  const [idx, setIdx] = useState(0)
  const [stim, setStim] = useState<{ word: number; ink: number } | null>(null)
  const [fb, setFb] = useState<'ok' | 'bad' | 'slow' | null>(null)
  const list = useRef(makeTrials(N_PRACTICE))
  const results = useRef<StroopTrial[]>([])
  const onset = useRef<number | null>(null)
  const answered = useRef(true)
  const timer = useRef<number | null>(null)
  const alive = useRef(true)
  const phaseRef = useRef<'practice' | 'main'>('practice')
  const idxRef = useRef(0)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const run = async (i: number) => {
    idxRef.current = i
    setIdx(i)
    setFb(null)
    setStim(null)
    await wait(450) // fixation
    if (!alive.current) return
    const item = list.current[i]
    answered.current = false
    onset.current = await presentStimulus(() => setStim({ word: item.word, ink: item.ink }))
    timer.current = window.setTimeout(() => respond(null, null), TIMEOUT)
  }

  const respond = async (answer: number | null, ts: number | null) => {
    if (answered.current) return
    answered.current = true
    if (timer.current) clearTimeout(timer.current)
    const item = list.current[idxRef.current]
    const rt = answer === null || ts === null || onset.current === null ? null : Math.round(ts - onset.current)
    const ok = answer === item.ink
    if (phaseRef.current === 'main') results.current.push({ word: item.word, ink: item.ink, congruent: item.congruent, answer, rt })
    if (phaseRef.current === 'practice') {
      setFb(answer === null ? 'slow' : ok ? 'ok' : 'bad')
      fx(ok ? 'good' : 'bad')
      await wait(700)
    } else if (!ok) {
      fx('bad')
    }
    if (!alive.current) return
    const next = idxRef.current + 1
    if (next < list.current.length) {
      run(next)
      return
    }
    if (phaseRef.current === 'practice') {
      setStage('practiceDone')
      return
    }
    const sc = stroopScore(results.current)
    const age = ageOf(person)
    onDone(
      { value: Number.isFinite(sc.interference) ? Math.round(sc.interference) : null, level: stroopLevel(sc.interference, sc.accIncongruent, age ?? DEFAULT_AGE) },
      { trials: results.current, age, lang },
    )
  }

  useKey(['1', '2', '3', '4'], (e) => {
    if (stage === 'run' && !answered.current) respond(Number(e.key) - 1, eventTime(e))
  })

  const start = (p: 'practice' | 'main') => {
    phaseRef.current = p
    setPhase(p)
    list.current = makeTrials(p === 'practice' ? N_PRACTICE : N_MAIN)
    setStage('run')
    run(0)
  }

  const total = phase === 'practice' ? N_PRACTICE : N_MAIN
  return (
    <FocusShell title={s.info.name} subtitle={stage === 'run' ? (phase === 'practice' ? s.practice : `${idx + 1} / ${N_MAIN}`) : undefined} progress={stage === 'run' && phase === 'main' ? idx / N_MAIN : null} onExit={onExit}>
      {stage === 'intro' && (
        <Stage
          icon={<Palette className="h-8 w-8" />}
          title={s.instruction}
          footer={
            <Button variant="accent" size="lg" onClick={() => start('practice')}>
              {t.btn.start}
            </Button>
          }
        >
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <span>{s.example}</span>
            <span className="rounded-xl bg-[#111827] px-3 py-1.5 text-lg font-black" style={{ color: INK[2] }}>
              {WORDS[lang][0]}
            </span>
            <span>{s.exampleAnswer}</span>
          </div>
        </Stage>
      )}
      {stage === 'practiceDone' && (
        <Stage
          icon={<Palette className="h-8 w-8" />}
          title={t.practiceDone}
          footer={
            <Button variant="accent" size="lg" onClick={() => start('main')}>
              {t.btn.startTest}
            </Button>
          }
        >
          <p>{s.instruction}</p>
        </Stage>
      )}
      {stage === 'run' && (
        <div className="flex flex-1 flex-col justify-between gap-5">
          <div className="text-center text-sm font-semibold text-muted">{s.instruction}</div>
          <div
            className={cx(
              'flex min-h-[38vh] items-center justify-center rounded-3xl bg-[#111827] transition-none',
              fb === 'ok' && 'ring-4 ring-great',
              (fb === 'bad' || fb === 'slow') && 'ring-4 ring-urgent',
            )}
          >
            {stim ? (
              <span className="select-none px-4 text-center text-5xl font-black tracking-wide sm:text-6xl" style={{ color: INK[stim.ink] }}>
                {WORDS[lang][stim.word]}
              </span>
            ) : (
              <span className="text-4xl font-light text-white/50">+</span>
            )}
          </div>
          <div className="h-5 text-center text-sm font-semibold text-urgent">{fb === 'slow' ? s.tooSlow : ''}</div>
          <div className="pb-safe grid grid-cols-2 gap-3">
            {NAMES[lang].map((name, i) => (
              <button
                key={i}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault()
                  if (!answered.current) respond(i, eventTime(e))
                }}
                className="no-touch-scroll flex h-16 items-center gap-3 rounded-2xl border border-line bg-surface px-4 text-left text-lg font-bold text-ink shadow-sm transition active:scale-[0.98]"
              >
                <span className="h-7 w-7 shrink-0 rounded-full" style={{ background: INK[i] }} />
                <span className="flex-1">{name}</span>
                <span className="hidden text-xs font-semibold text-muted sm:inline">{i + 1}</span>
              </button>
            ))}
          </div>
          <span className="sr-only">
            {idx + 1}/{total}
          </span>
        </div>
      )}
    </FocusShell>
  )
}

function Details({ result }: { result: { data: StroopData; summary: { level: Level; value: number | null } } }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const lang = useLang()
  const d = result.data
  const sc = stroopScore(d.trials)
  const shift = Math.max(0, (d.age ?? DEFAULT_AGE) - 40) * 2
  return (
    <>
      <Card className="p-5">
        <SectionTitle>{s.interference}</SectionTitle>
        <ScaleBar
          min={-50}
          max={500 + shift}
          value={sc.interference}
          valueLabel={`${Math.round(sc.interference)} ${t.ms}`}
          format={(v) => String(Math.round(v))}
          segments={[
            { to: 100 + shift, level: 'great' },
            { to: 200 + shift, level: 'normal' },
            { to: 320 + shift, level: 'borderline' },
            { to: 500 + shift, level: 'attention' },
          ]}
        />
        <p className="mt-4 leading-relaxed text-ink-2">{s.meaning[result.summary.level]}</p>
        <p className="mt-1 text-sm text-muted">{d.age ? t.ageCompare(d.age) : t.ageMissing}</p>
      </Card>
      <Card className="p-5">
        <SectionTitle>{s.rtByType}</SectionTitle>
        <CompareBars
          max={Math.max(sc.congruentRt, sc.incongruentRt) * 1.15}
          format={(v) => `${Math.round(v)} ${t.ms}`}
          rows={[
            { label: s.congruent, value: sc.congruentRt, color: 'var(--great)' },
            { label: s.incongruent, value: sc.incongruentRt, color: 'var(--attention)' },
          ]}
        />
        <div className="mt-4">
          <MetricGrid cols={3}>
            <Metric label={s.interference} value={Math.round(sc.interference)} unit={t.ms} emphasis />
            <Metric label={s.acc} value={Math.round(sc.accCongruent * 100)} unit="%" hint={s.congruent} />
            <Metric label={s.accConflict} value={Math.round(sc.accIncongruent * 100)} unit="%" />
          </MetricGrid>
        </div>
        <p className="mt-3 text-xs text-muted">
          {s.interference}: {fmtNum(lang, sc.interferencePct, 0)}%
        </p>
      </Card>
      {sc.accIncongruent < 0.85 && <Callout tone="warn">{s.meaning.borderline}</Callout>}
      <Card className="p-5">
        <SectionTitle>{t.recommendations}</SectionTitle>
        <Bullets items={s.rec} />
      </Card>
    </>
  )
}

const stroop: TestModule<StroopData> = {
  kind: 'test',
  usesAge: true,
  id: 'stroop',
  field: 'memory',
  icon: Palette,
  minutes: 3,
  requirements: ['touch', 'keyboard'],
  version: 1,
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  Details,
  headline: (r, lang) => ({ value: r.summary.value === null ? '—' : String(r.summary.value), unit: common[lang].ms, label: common[lang].level[r.summary.level] }),
  trend: { higherIsBetter: false, unit: (lang) => common[lang].ms, digits: 0 },
}

export default stroop
