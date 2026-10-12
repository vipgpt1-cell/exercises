import { useEffect, useRef, useState } from 'react'
import { Smartphone, Vibrate } from 'lucide-react'
import type { TestModule } from '../../catalog/types'
import { Countdown, FocusShell, Stage } from '../../components/shell'
import { Bullets, Button, Callout, Card, Metric, MetricGrid, SectionTitle } from '../../components/ui'
import { CompareBars, Ring } from '../../components/charts'
import { defineStrings, fmtNum, useLang, useStrings } from '../../lib/i18n'
import { fx, vibrate } from '../../lib/audio'
import { usePerson, type Level } from '../../lib/store'
import { common } from '../../i18n/common'
import { HandPicker, handName, type Side } from './hand-shared'
import { TREMOR_BANDS, analyzeTremor, tremorLevel, type AccSample } from './analysis'

const RECORD_S = 15

type TremorResult = NonNullable<ReturnType<typeof analyzeTremor>>
export interface TremorData {
  dominant: Side
  hands: { hand: Side; result: TremorResult }[]
}

const S = defineStrings({
  en: {
    info: {
      name: 'Hand tremor',
      short: 'Measure hand shaking with the phone’s motion sensor.',
      measures: 'Measures shaking of each hand while you hold it out in front of you. The phone’s motion sensor picks up tiny movements, and the app works out how strong the tremor is and how fast it is.',
      steps: ['Sit up straight. Hold the phone in one hand, screen up.', 'Stretch your arm forward at shoulder height and keep it as still as you can for 15 seconds.', 'Repeat with the other hand.'],
      tips: ['Hold the phone lightly, don’t squeeze it.', 'Don’t talk or move during the measurement.', 'Coffee, stress, tiredness and cold make normal shaking stronger.'],
    },
    allow: 'Allow the motion sensor',
    allowText: 'This test needs the phone’s motion sensor. The data stays on your phone.',
    noSensor: 'No data came from the motion sensor. Open this on a phone and allow access to motion.',
    hold: (side: Side) => `Hold the phone in your ${side} hand`,
    holdText: 'Arm stretched forward at shoulder height, screen up. Keep still.',
    recording: 'Keep still…',
    amplitude: 'Tremor strength',
    freq: 'Tremor speed',
    disp: 'Estimated movement',
    rate: 'Sensor readings',
    hz: 'Hz',
    ms2: 'm/s²',
    mm: 'mm',
    labels: { great: 'No noticeable tremor', normal: 'Normal slight tremor', borderline: 'Mild tremor', attention: 'Marked tremor' } as Record<string, string>,
    meaning: {
      great: 'Your hands were very steady.',
      normal: 'A small, normal tremor was measured. Everyone has it.',
      borderline: 'A mild tremor was measured. It may simply be a stronger normal tremor (coffee, stress, tiredness, some medicines) or an early sign of a tremor condition.',
      attention: 'A marked tremor was measured. Please talk to a doctor (a neurologist) about it, especially if it’s new or getting worse.',
    } as Record<string, string>,
    freqNote: 'Tremor at 4–6 Hz is typical of Parkinson’s disease, 5–8 Hz of essential tremor, 8–12 Hz of normal tremor. The speed alone is not a diagnosis.',
    unreliable: 'The measurement was short or the sensor sent few readings, so the result is less reliable.',
    rec: [
      'For comparable results, measure at the same time of day, before coffee.',
      'Hand exercises and relaxation (for example, breathing exercises) can reduce stronger normal tremor.',
      'A tremor that gets in the way of writing, eating or drinking should be checked by a neurologist.',
    ],
  },
  uz: {
    info: {
      name: 'Qo‘l titrashi',
      short: 'Telefon harakat sensori bilan qo‘l titrashini o‘lchang.',
      measures: 'Qo‘lingizni oldinga cho‘zib turganingizda har bir qo‘lning titrashini o‘lchaydi. Telefonning harakat sensori mayda harakatlarni sezadi, ilova esa titrash qanchalik kuchli va qanchalik tez ekanini hisoblaydi.',
      steps: ['Tik o‘tiring. Telefonni bir qo‘lingizda, ekrani yuqoriga qaratib ushlang.', 'Qo‘lingizni yelka balandligida oldinga cho‘zing va 15 soniya imkon qadar qimirlatmay turing.', 'Ikkinchi qo‘l bilan takrorlang.'],
      tips: ['Telefonni yengil ushlang, siqmang.', 'O‘lchash vaqtida gapirmang va qimirlamang.', 'Kofe, stress, charchoq va sovuq odatiy titrashni kuchaytiradi.'],
    },
    allow: 'Harakat sensoriga ruxsat berish',
    allowText: 'Bu test uchun telefonning harakat sensori kerak. Ma’lumotlar telefoningizda qoladi.',
    noSensor: 'Harakat sensoridan ma’lumot kelmadi. Buni telefonda oching va harakatga ruxsat bering.',
    hold: (side: Side) => `Telefonni ${side === 'right' ? 'o‘ng' : 'chap'} qo‘lingizda ushlang`,
    holdText: 'Qo‘l yelka balandligida oldinga cho‘zilgan, ekran yuqoriga qaragan. Qimirlamang.',
    recording: 'Qimirlamang…',
    amplitude: 'Titrash kuchi',
    freq: 'Titrash tezligi',
    disp: 'Taxminiy harakat',
    rate: 'Sensor o‘lchovlari',
    hz: 'Gs',
    ms2: 'm/s²',
    mm: 'mm',
    labels: { great: 'Titrash sezilmadi', normal: 'Odatiy yengil titrash', borderline: 'Yengil titrash', attention: 'Kuchli titrash' } as Record<string, string>,
    meaning: {
      great: 'Qo‘llaringiz juda barqaror turdi.',
      normal: 'Kichik, odatiy titrash o‘lchandi. U hammada bo‘ladi.',
      borderline: 'Yengil titrash o‘lchandi. Bu shunchaki kuchaygan odatiy titrash (kofe, stress, charchoq, ba’zi dorilar) yoki titrash kasalligining dastlabki belgisi bo‘lishi mumkin.',
      attention: 'Kuchli titrash o‘lchandi. Iltimos, bu haqda shifokor (nevrolog) bilan gaplashing, ayniqsa u yangi paydo bo‘lgan yoki kuchayib borayotgan bo‘lsa.',
    } as Record<string, string>,
    freqNote: '4–6 Gs titrash Parkinson kasalligiga, 5–8 Gs essensial titrashga, 8–12 Gs odatiy titrashga xos. Faqat tezlikka qarab tashxis qo‘yilmaydi.',
    unreliable: 'O‘lchash qisqa bo‘ldi yoki sensor kam ma’lumot yubordi, shuning uchun natija kamroq ishonchli.',
    rec: [
      'Solishtirsa bo‘ladigan natija uchun kunning o‘sha vaqtida, kofe ichishdan oldin o‘lchang.',
      'Qo‘l mashqlari va bo‘shashish (masalan, nafas mashqlari) kuchaygan odatiy titrashni kamaytirishi mumkin.',
      'Yozish, ovqatlanish yoki ichishga xalaqit beradigan titrashni nevrolog ko‘rishi kerak.',
    ],
  },
  ru: {
    info: {
      name: 'Дрожание рук',
      short: 'Измерьте дрожание рук датчиком движения телефона.',
      measures: 'Измеряет дрожание каждой руки, пока вы держите её вытянутой перед собой. Датчик движения телефона улавливает мельчайшие движения, а приложение рассчитывает силу и частоту дрожания.',
      steps: ['Сядьте ровно. Держите телефон в одной руке экраном вверх.', 'Вытяните руку вперёд на уровне плеча и держите её как можно неподвижнее 15 секунд.', 'Повторите другой рукой.'],
      tips: ['Держите телефон легко, не сжимайте.', 'Во время измерения не говорите и не двигайтесь.', 'Кофе, стресс, усталость и холод усиливают обычное дрожание.'],
    },
    allow: 'Разрешить датчик движения',
    allowText: 'Для теста нужен датчик движения телефона. Данные остаются на вашем телефоне.',
    noSensor: 'От датчика движения не пришло данных. Откройте это на телефоне и разрешите доступ к движению.',
    hold: (side: Side) => `Держите телефон в ${side === 'right' ? 'правой' : 'левой'} руке`,
    holdText: 'Рука вытянута вперёд на уровне плеча, экран вверх. Не двигайтесь.',
    recording: 'Не двигайтесь…',
    amplitude: 'Сила дрожания',
    freq: 'Частота дрожания',
    disp: 'Примерное смещение',
    rate: 'Показаний датчика',
    hz: 'Гц',
    ms2: 'м/с²',
    mm: 'мм',
    labels: { great: 'Дрожание незаметно', normal: 'Обычное лёгкое дрожание', borderline: 'Лёгкий тремор', attention: 'Выраженный тремор' } as Record<string, string>,
    meaning: {
      great: 'Руки были очень неподвижны.',
      normal: 'Измерено небольшое обычное дрожание. Оно есть у всех.',
      borderline: 'Измерен лёгкий тремор. Это может быть просто усиленное обычное дрожание (кофе, стресс, усталость, некоторые лекарства) или ранний признак заболевания с тремором.',
      attention: 'Измерен выраженный тремор. Пожалуйста, обсудите это с врачом (неврологом), особенно если дрожание появилось недавно или усиливается.',
    } as Record<string, string>,
    freqNote: 'Тремор 4–6 Гц типичен для болезни Паркинсона, 5–8 Гц — для эссенциального тремора, 8–12 Гц — для обычного дрожания. Только по частоте диагноз не ставят.',
    unreliable: 'Измерение было коротким или датчик прислал мало данных, поэтому результат менее надёжен.',
    rec: [
      'Чтобы результаты можно было сравнивать, измеряйте в одно и то же время дня, до кофе.',
      'Упражнения для рук и расслабление (например, дыхательные упражнения) могут уменьшить усиленное обычное дрожание.',
      'Дрожание, которое мешает писать, есть или пить, нужно показать неврологу.',
    ],
  },
})

const supported = () =>
  typeof window !== 'undefined' && 'DeviceMotionEvent' in window && (matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0)

function Runner({ onDone, onExit }: { onDone: (s: { value: number | null; level: Level }, d: TremorData) => void; onExit: () => void }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const lang = useLang()
  const person = usePerson()
  const [dominant, setDominant] = useState<Side | null>(person.hand)
  const [stage, setStage] = useState<'permission' | 'ready' | 'count' | 'record' | 'error'>('permission')
  const [idx, setIdx] = useState(0)
  const [left, setLeft] = useState(RECORD_S)
  const samples = useRef<AccSample[]>([])
  const hands = useRef<TremorData['hands']>([])
  const listener = useRef<((e: DeviceMotionEvent) => void) | null>(null)
  const timer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (listener.current) window.removeEventListener('devicemotion', listener.current)
      if (timer.current) clearInterval(timer.current)
    },
    [],
  )

  const requestPermission = async () => {
    try {
      const DME = window.DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }
      if (typeof DME.requestPermission === 'function') {
        const res = await DME.requestPermission()
        if (res !== 'granted') {
          setStage('error')
          return
        }
      }
      setStage('ready')
    } catch {
      setStage('error')
    }
  }

  if (!dominant)
    return (
      <FocusShell title={s.info.name} onExit={onExit}>
        <HandPicker onPick={setDominant} />
      </FocusShell>
    )
  const order: Side[] = [dominant, dominant === 'right' ? 'left' : 'right']
  const hand = order[idx]

  const record = () => {
    samples.current = []
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.acceleration && e.acceleration.x !== null ? e.acceleration : e.accelerationIncludingGravity
      if (!a || a.x === null || a.y === null || a.z === null) return
      samples.current.push({ t: e.timeStamp || performance.now(), x: a.x, y: a.y, z: a.z })
    }
    listener.current = onMotion
    window.addEventListener('devicemotion', onMotion)
    setStage('record')
    setLeft(RECORD_S)
    const start = performance.now()
    let checked = false
    timer.current = window.setInterval(() => {
      const el = (performance.now() - start) / 1000
      setLeft(Math.max(0, RECORD_S - el))
      if (!checked && el > 1.5) {
        checked = true
        if (samples.current.length < 5) {
          stop()
          setStage('error')
          return
        }
      }
      if (el >= RECORD_S) {
        stop()
        vibrate([60, 60, 60])
        fx('done')
        const res = analyzeTremor(samples.current)
        if (!res) {
          setStage('error')
          return
        }
        hands.current.push({ hand, result: res })
        if (idx + 1 < order.length) {
          setIdx(idx + 1)
          setStage('ready')
        } else {
          const worst = Math.max(...hands.current.map((h) => h.result.rms))
          onDone({ value: Math.round(worst * 1000) / 1000, level: tremorLevel(worst) }, { dominant, hands: hands.current })
        }
      }
    }, 100)
  }
  const stop = () => {
    if (listener.current) window.removeEventListener('devicemotion', listener.current)
    listener.current = null
    if (timer.current) clearInterval(timer.current)
    timer.current = null
  }

  return (
    <FocusShell title={s.info.name} subtitle={stage === 'permission' || stage === 'error' ? undefined : handName(lang, hand)} progress={stage === 'permission' ? null : idx / 2} onExit={onExit}>
      {stage === 'permission' && (
        <Stage
          icon={<Smartphone className="h-8 w-8" />}
          title={s.allow}
          footer={
            <Button variant="accent" size="lg" onClick={requestPermission}>
              {t.btn.continue}
            </Button>
          }
        >
          <p>{s.allowText}</p>
        </Stage>
      )}
      {stage === 'error' && (
        <Stage icon={<Smartphone className="h-8 w-8" />} title={t.notSupported} footer={<Button variant="secondary" size="lg" onClick={onExit}>{t.btn.close}</Button>}>
          <Callout tone="warn">{s.noSensor}</Callout>
        </Stage>
      )}
      {stage === 'ready' && (
        <Stage
          icon={<Vibrate className="h-8 w-8" />}
          title={s.hold(hand)}
          footer={
            <Button variant="accent" size="lg" onClick={() => setStage('count')}>
              {t.btn.start}
            </Button>
          }
        >
          <p>{s.holdText}</p>
        </Stage>
      )}
      {stage === 'count' && <Countdown onDone={record} label={s.holdText} />}
      {stage === 'record' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <Ring value={left / RECORD_S} size={200} stroke={12}>
            <span className="text-5xl font-black tabular text-ink">{Math.ceil(left)}</span>
            <span className="text-sm text-muted">{t.seconds}</span>
          </Ring>
          <p className="text-lg font-semibold text-ink">{s.recording}</p>
        </div>
      )}
    </FocusShell>
  )
}

function Details({ result }: { result: { data: TremorData; summary: { level: Level } } }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const lang = useLang()
  const d = result.data
  return (
    <>
      <Card className="p-5">
        <SectionTitle>{s.amplitude} ({s.ms2})</SectionTitle>
        <CompareBars
          max={Math.max(1, ...d.hands.map((h) => h.result.rms)) * 1.05}
          format={(v) => fmtNum(lang, v, 2)}
          rows={d.hands.map((h) => ({
            label: `${handName(lang, h.hand)}${h.hand === d.dominant ? ` (${t.dominant})` : ''}`,
            value: h.result.rms,
            color: `var(--${tremorLevel(h.result.rms)})`,
            note: s.labels[tremorLevel(h.result.rms)],
          }))}
        />
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {TREMOR_BANDS.map((b, i) => (
            <span key={i}>
              {s.labels[b.level]}: {i === 0 ? '<' : '≤'} {fmtNum(lang, b.to, 2)}
            </span>
          ))}
        </div>
        <p className="mt-4 leading-relaxed text-ink-2">{s.meaning[result.summary.level]}</p>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {d.hands.map((h) => (
          <Card key={h.hand} className="p-4">
            <div className="mb-3 text-sm font-bold text-ink">{handName(lang, h.hand)}</div>
            <MetricGrid>
              <Metric label={s.amplitude} value={fmtNum(lang, h.result.rms, 2)} unit={s.ms2} emphasis />
              <Metric label={s.freq} value={Number.isFinite(h.result.peakFreq) ? fmtNum(lang, h.result.peakFreq, 1) : '—'} unit={s.hz} />
              <Metric label={s.disp} value={Number.isFinite(h.result.displacementMm) ? fmtNum(lang, h.result.displacementMm, 2) : '—'} unit={s.mm} />
              <Metric label={s.rate} value={Math.round(h.result.sampleRate)} unit={s.hz} />
            </MetricGrid>
          </Card>
        ))}
      </div>
      {d.hands.some((h) => !h.result.reliable) && <Callout tone="warn">{s.unreliable}</Callout>}
      <Callout tone="info">{s.freqNote}</Callout>
      <Card className="p-5">
        <SectionTitle>{t.recommendations}</SectionTitle>
        <Bullets items={s.rec} />
      </Card>
    </>
  )
}

const tremor: TestModule<TremorData> = {
  kind: 'test',
  id: 'hand-tremor',
  field: 'hands',
  icon: Vibrate,
  minutes: 1,
  requirements: ['phone', 'seated'],
  version: 1,
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  Details,
  supported,
  headline: (r, lang) => ({ value: fmtNum(lang, r.summary.value ?? 0, 2), unit: S[lang].ms2, label: S[lang].labels[r.summary.level] }),
  trend: { higherIsBetter: false, unit: (lang) => S[lang].ms2, digits: 2 },
}

export default tremor
