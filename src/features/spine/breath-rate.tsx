import { useEffect, useRef, useState } from 'react'
import { Wind } from 'lucide-react'
import type { TestModule } from '../../catalog/types'
import { FocusShell, ResponseButton, Stage } from '../../components/shell'
import { Bullets, Button, Card, Metric, MetricGrid, SectionTitle } from '../../components/ui'
import { ScaleBar } from '../../components/charts'
import { defineStrings, fmtNum, useLang, useStrings, type Lang } from '../../lib/i18n'
import { fx } from '../../lib/audio'
import { useKey } from '../../lib/hooks'
import type { Level } from '../../lib/store'
import { common } from '../../i18n/common'
import { breathLevel, breathRate } from './scoring'

const DURATION = 60
export interface BreathRateData {
  taps: number[]
}

const S = defineStrings({
  en: {
    info: {
      name: 'Breathing rate at rest',
      short: 'How many breaths you take per minute at rest.',
      measures: 'Counts your breaths per minute at rest, one of the basic signs of health. For adults, 12–20 breaths a minute is normal. Slow, calm breathing goes with relaxation and fitness; fast breathing can come with stress, fever, anaemia or heart and lung problems.',
      steps: ['Sit comfortably and breathe as usual. Don’t change your breathing on purpose.', 'Tap the button every time you start to breathe IN.', 'The measurement takes 60 seconds.'],
      tips: ['Rest for 5 minutes before measuring.', 'It helps to watch your belly or chest rise.', 'If watching your breathing changes it, ask someone else to tap for you.'],
    },
    ready: 'Sit comfortably. Tap every time you breathe IN.',
    tap: 'Breath in',
    breaths: 'breaths',
    rate: 'Breathing rate',
    perMin: 'per minute',
    count: 'Breaths counted',
    interval: 'Average breath length',
    regularity: 'Unevenness',
    labels: { great: 'Calm', normal: 'Normal', borderline: 'A bit off', attention: 'Fast', info: 'Not enough data' } as Record<string, string>,
    meaning: {
      great: 'Calm, relaxed breathing.',
      normal: 'Your breathing rate is normal for an adult.',
      borderline: 'Your breathing rate is slightly outside the usual range. Measure again after resting for 5 minutes.',
      attention: 'You breathe fast at rest. If this is confirmed at rest, or you feel short of breath, see a doctor.',
      info: 'Too few breaths were recorded. Please try again and tap at the start of every breath in.',
    } as Record<string, string>,
    rec: [
      'Slow, relaxed breathing (6–10 breaths a minute) during practice lowers stress and blood pressure. Try the guided breathing exercise.',
      'Measure at the same time of day to compare results.',
      'Shortness of breath at rest, chest pain or bluish lips need urgent medical help.',
    ],
  },
  uz: {
    info: {
      name: 'Tinch holatda nafas soni',
      short: 'Tinch holatda bir daqiqada necha marta nafas olasiz.',
      measures: 'Tinch holatda bir daqiqadagi nafaslar sonini sanaydi — bu salomatlikning asosiy ko‘rsatkichlaridan biri. Kattalar uchun daqiqasiga 12–20 marta me’yor. Sekin, xotirjam nafas bo‘shashganlik va chiniqqanlikka xos; tez nafas stress, isitma, kamqonlik yoki yurak va o‘pka muammolarida bo‘lishi mumkin.',
      steps: ['Qulay o‘tiring va odatdagidek nafas oling. Nafasingizni ataylab o‘zgartirmang.', 'Har safar nafas OLA boshlaganingizda tugmani bosing.', 'O‘lchash 60 soniya davom etadi.'],
      tips: ['O‘lchashdan oldin 5 daqiqa dam oling.', 'Qorin yoki ko‘krak ko‘tarilishini kuzatish yordam beradi.', 'Nafasingizni kuzatganda u o‘zgarib ketsa, boshqa kishidan siz uchun bosib turishini so‘rang.'],
    },
    ready: 'Qulay o‘tiring. Har safar nafas OLGANDA bosing.',
    tap: 'Nafas oldim',
    breaths: 'marta',
    rate: 'Nafas soni',
    perMin: 'daqiqasiga',
    count: 'Sanalgan nafaslar',
    interval: 'Bir nafasning o‘rtacha davomi',
    regularity: 'Notekislik',
    labels: { great: 'Xotirjam', normal: 'Me’yorida', borderline: 'Biroz chetda', attention: 'Tez', info: 'Ma’lumot yetarli emas' } as Record<string, string>,
    meaning: {
      great: 'Xotirjam, bo‘shashgan nafas.',
      normal: 'Nafas soningiz kattalar uchun me’yorida.',
      borderline: 'Nafas soningiz odatiy oraliqdan biroz chetda. 5 daqiqa dam olgandan keyin qayta o‘lchang.',
      attention: 'Tinch holatda tez nafas olasiz. Bu tinch holatda tasdiqlansa yoki hansirasangiz, shifokorga murojaat qiling.',
      info: 'Juda kam nafas qayd etildi. Iltimos, qaytadan urinib ko‘ring va har bir nafas olish boshida bosing.',
    } as Record<string, string>,
    rec: [
      'Mashq paytida sekin, bo‘shashgan nafas (daqiqasiga 6–10 marta) stress va qon bosimini pasaytiradi. “Nafas mashqi”ni sinab ko‘ring.',
      'Natijalarni solishtirish uchun kunning o‘sha vaqtida o‘lchang.',
      'Tinch holatda hansirash, ko‘krakdagi og‘riq yoki lablarning ko‘karishi shoshilinch tibbiy yordamni talab qiladi.',
    ],
  },
  ru: {
    info: {
      name: 'Частота дыхания в покое',
      short: 'Сколько вдохов в минуту вы делаете в покое.',
      measures: 'Считает число вдохов в минуту в покое — один из основных показателей здоровья. Для взрослых нормой считается 12–20 вдохов в минуту. Медленное спокойное дыхание типично для расслабления и хорошей формы, частое может сопровождать стресс, температуру, анемию или болезни сердца и лёгких.',
      steps: ['Сядьте удобно и дышите как обычно. Не меняйте дыхание специально.', 'Нажимайте кнопку каждый раз, когда начинаете ВДОХ.', 'Измерение длится 60 секунд.'],
      tips: ['Перед измерением отдохните 5 минут.', 'Помогает следить, как поднимается живот или грудь.', 'Если, наблюдая за дыханием, вы его меняете, попросите кого-нибудь нажимать за вас.'],
    },
    ready: 'Сядьте удобно. Нажимайте на каждом ВДОХЕ.',
    tap: 'Вдох',
    breaths: 'вдохов',
    rate: 'Частота дыхания',
    perMin: 'в минуту',
    count: 'Посчитано вдохов',
    interval: 'Средняя длина вдоха-выдоха',
    regularity: 'Неровность',
    labels: { great: 'Спокойное', normal: 'Норма', borderline: 'Чуть вне нормы', attention: 'Частое', info: 'Мало данных' } as Record<string, string>,
    meaning: {
      great: 'Спокойное, расслабленное дыхание.',
      normal: 'Частота дыхания в норме для взрослого.',
      borderline: 'Частота дыхания немного вне обычного диапазона. Измерьте ещё раз после 5 минут отдыха.',
      attention: 'В покое вы дышите часто. Если это подтвердится в покое или есть одышка, обратитесь к врачу.',
      info: 'Записано слишком мало вдохов. Пожалуйста, попробуйте ещё раз и нажимайте в начале каждого вдоха.',
    } as Record<string, string>,
    rec: [
      'Медленное расслабленное дыхание (6–10 вдохов в минуту) во время упражнений снижает стресс и давление. Попробуйте упражнение «Дыхание с подсказками».',
      'Измеряйте в одно и то же время дня, чтобы сравнивать результаты.',
      'Одышка в покое, боль в груди или синеватые губы требуют срочной медицинской помощи.',
    ],
  },
})

function Runner({ onDone, onExit }: { onDone: (s: { value: number | null; level: Level }, d: BreathRateData) => void; onExit: () => void }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const [stage, setStage] = useState<'ready' | 'run'>('ready')
  const [left, setLeft] = useState(DURATION)
  const [count, setCount] = useState(0)
  const [pk, setPk] = useState(0)
  const taps = useRef<number[]>([])
  const t0 = useRef(0)
  useEffect(() => {
    if (stage !== 'run') return
    const id = window.setInterval(() => {
      const l = Math.max(0, DURATION - (performance.now() - t0.current) / 1000)
      setLeft(l)
      if (l <= 0) {
        clearInterval(id)
        fx('done')
        const r = breathRate(taps.current)
        onDone({ value: Number.isFinite(r.rate) ? Math.round(r.rate * 10) / 10 : null, level: breathLevel(r.rate) }, { taps: taps.current.map(Math.round) })
      }
    }, 200)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])
  const tap = () => {
    if (stage !== 'run') return
    taps.current.push(performance.now() - t0.current)
    setCount(taps.current.length)
    setPk((k) => k + 1)
  }
  useKey([' ', 'Space'], (e) => {
    e.preventDefault()
    tap()
  })
  return (
    <FocusShell title={s.info.name} progress={stage === 'run' ? 1 - left / DURATION : null} onExit={onExit}>
      {stage === 'ready' ? (
        <Stage
          icon={<Wind className="h-8 w-8" />}
          title={s.ready}
          footer={
            <Button
              variant="accent"
              size="lg"
              onClick={() => {
                t0.current = performance.now()
                setStage('run')
              }}
            >
              {t.btn.start}
            </Button>
          }
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-8">
          <div className="text-center">
            <div className="text-5xl font-black tabular text-ink">{Math.ceil(left)}</div>
            <div className="text-sm text-muted">{t.seconds}</div>
          </div>
          <ResponseButton onPress={tap} label={s.tap} sub={`${count} ${s.breaths}`} size={Math.min(230, window.innerWidth - 90)} pressedKey={pk} />
        </div>
      )}
    </FocusShell>
  )
}

function Details({ result }: { result: { data: BreathRateData; summary: { level: Level } } }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const lang = useLang()
  const r = breathRate(result.data.taps)
  return (
    <>
      <Card className="p-5">
        <SectionTitle>{s.rate}</SectionTitle>
        {Number.isFinite(r.rate) && (
          <ScaleBar
            min={4}
            max={32}
            value={r.rate}
            valueLabel={`${fmtNum(lang, r.rate, 1)} / ${t.minUnit}`}
            format={(v) => String(v)}
            segments={[
              { to: 8, level: 'borderline' },
              { to: 10, level: 'normal' },
              { to: 16, level: 'great' },
              { to: 20, level: 'normal' },
              { to: 24, level: 'borderline' },
              { to: 32, level: 'attention' },
            ]}
          />
        )}
        <p className="mt-4 leading-relaxed text-ink-2">{s.meaning[result.summary.level]}</p>
      </Card>
      <Card className="p-5">
        <MetricGrid cols={3}>
          <Metric label={s.rate} value={Number.isFinite(r.rate) ? fmtNum(lang, r.rate, 1) : '—'} unit={s.perMin} emphasis />
          <Metric label={s.count} value={result.data.taps.length} />
          <Metric label={s.interval} value={Number.isFinite(r.meanInterval) ? fmtNum(lang, r.meanInterval, 1) : '—'} unit={t.seconds} />
          <Metric label={s.regularity} value={Number.isFinite(r.variability) ? fmtNum(lang, r.variability, 0) : '—'} unit="%" />
        </MetricGrid>
      </Card>
      <Card className="p-5">
        <SectionTitle>{t.recommendations}</SectionTitle>
        <Bullets items={s.rec} />
      </Card>
    </>
  )
}

const breathRateTest: TestModule<BreathRateData> = {
  kind: 'test',
  id: 'breathing-rate',
  field: 'spine',
  icon: Wind,
  minutes: 2,
  requirements: ['seated', 'keyboard'],
  version: 1,
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  Details,
  headline: (r, lang: Lang) => ({ value: r.summary.value === null ? '—' : fmtNum(lang, r.summary.value, 1), unit: S[lang].perMin, label: S[lang].labels[r.summary.level] }),
  trend: { higherIsBetter: false, unit: (lang) => S[lang].perMin, digits: 1 },
}

export default breathRateTest
