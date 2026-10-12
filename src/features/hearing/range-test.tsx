import { useEffect, useRef, useState } from 'react'
import { AudioWaveform } from 'lucide-react'
import type { TestModule } from '../../catalog/types'
import { FocusShell, ResponseButton, Stage } from '../../components/shell'
import { Bullets, Button, Callout, Card, Metric, MetricGrid, SectionTitle } from '../../components/ui'
import { ScaleBar } from '../../components/charts'
import { defineStrings, fmtNum, ruPlural, useLang, useStrings } from '../../lib/i18n'
import { createLiveTone, getCtx, unlockAudio } from '../../lib/audio'
import { useKey } from '../../lib/hooks'
import { ageOf, usePerson, type Level } from '../../lib/store'
import { common } from '../../i18n/common'
import { VolumeCalibration } from './setup'
import { REACTION_S, SWEEP_LOW, expectedLimit, rangeLevel, sweepDuration, sweepFreqAt, typicalAge, upperLimit, type SweepResult } from './range'

export interface RangeData {
  sweeps: SweepResult[]
  limit: number
  top: number
  age: number | null
}

const LEVEL_DBFS = -24
const ORDER: ('down' | 'up')[] = ['down', 'up', 'down', 'up']

const S = defineStrings({
  en: {
    info: {
      name: 'High-pitch hearing',
      short: 'The highest sound you can still hear.',
      measures: 'Finds the highest pitch you can hear. Very high sounds are the first to fade with age and loud noise, often years before speech becomes harder to follow.',
      steps: [
        'Set a comfortable volume.',
        'A very high tone slowly goes lower. Tap as soon as you START to hear it.',
        'Then a tone slowly goes higher. Tap when it DISAPPEARS.',
        'Twice each, about 1 minute.',
      ],
      tips: ['Headphones work much better than the phone speaker.', 'Many phones and headphones can’t play sounds above 16–18 kHz, which limits the result.', 'Don’t turn the volume up to hear the tone. Keep it the same.'],
    },
    down: 'Tap as soon as you HEAR the tone',
    up: 'Tap when the tone DISAPPEARS',
    downBtn: 'I hear it',
    upBtn: 'It’s gone',
    sweep: (i: number, n: number) => `Try ${i} of ${n}`,
    ready: 'Next try',
    limit: 'Highest sound you hear',
    hearingAge: 'Typical for age',
    under: (a: number) => `about ${a}`,
    yourAge: 'Typical at your age',
    sweeps: 'Tries',
    heard: 'first heard',
    gone: 'disappeared',
    notHeard: 'not heard',
    stillHeard: 'still heard',
    khz: 'kHz',
    meaning: {
      great: 'You hear high sounds better than is usual at your age.',
      normal: 'Your hearing of high sounds is usual for your age.',
      borderline: 'The highest sound you hear is lower than usual for your age. This can be an early sign of hearing ageing or noise damage, or simply a limit of the headphones.',
      info: 'Age wasn’t given, so there is nothing to compare with.',
    } as Record<string, string>,
    rec: [
      'Losing the highest sounds is common and usually doesn’t affect daily life at first.',
      'Protect your ears from loud noise to slow it down.',
      'For a fuller picture, take the tone hearing test and the speech in noise test.',
    ],
    deviceNote: 'The result depends on the phone and headphones: many can’t play very high sounds. Compare results made with the same ones.',
  },
  uz: {
    info: {
      name: 'Ingichka tovushlarni eshitish',
      short: 'Hali eshita oladigan eng ingichka tovushingiz.',
      measures: 'Eshita oladigan eng ingichka (yuqori) tovushni aniqlaydi. Yosh o‘tishi va kuchli shovqin ta’sirida birinchi bo‘lib aynan juda ingichka tovushlar eshitilmay qoladi — ko‘pincha gapni tushunish qiyinlashishidan ancha oldin.',
      steps: [
        'Qulay ovoz balandligini sozlang.',
        'Juda ingichka tovush asta-sekin yo‘g‘onlashadi. Uni ESHITA BOSHLASHINGIZ bilan bosing.',
        'Keyin tovush asta-sekin ingichkalashadi. U YO‘QOLGANDA bosing.',
        'Har biri ikki marta, taxminan 1 daqiqa.',
      ],
      tips: ['Quloqchin telefon karnayidan ancha yaxshi ishlaydi.', 'Ko‘p telefon va quloqchinlar 16–18 kGs dan yuqori tovushni chiqara olmaydi, bu natijani cheklaydi.', 'Tovushni eshitish uchun ovozni oshirmang, bir xil qoldiring.'],
    },
    down: 'Tovushni ESHITISHINGIZ bilan bosing',
    up: 'Tovush YO‘QOLGANDA bosing',
    downBtn: 'Eshitdim',
    upBtn: 'Yo‘qoldi',
    sweep: (i: number, n: number) => `${i}-urinish, jami ${n}`,
    ready: 'Keyingi urinish',
    limit: 'Eshitadigan eng ingichka tovush',
    hearingAge: 'Qaysi yoshga xos',
    under: (a: number) => `taxminan ${a} yosh`,
    yourAge: 'Yoshingizda odatiy',
    sweeps: 'Urinishlar',
    heard: 'eshitildi',
    gone: 'yo‘qoldi',
    notHeard: 'eshitilmadi',
    stillHeard: 'hali eshitilardi',
    khz: 'kGs',
    meaning: {
      great: 'Ingichka tovushlarni yoshingizdagilarga qaraganda yaxshiroq eshitasiz.',
      normal: 'Ingichka tovushlarni eshitishingiz yoshingiz uchun odatiy.',
      borderline: 'Eshitadigan eng ingichka tovushingiz yoshingiz uchun odatdagidan pastroq. Bu eshitishning yosh bilan o‘zgarishi yoki shovqin ta’sirining dastlabki belgisi bo‘lishi mumkin. Yoki shunchaki quloqchinning imkoniyati cheklangan.',
      info: 'Yosh ko‘rsatilmagan, shuning uchun solishtirib bo‘lmaydi.',
    } as Record<string, string>,
    rec: [
      'Eng ingichka tovushlarni eshitmay qolish ko‘p uchraydi va dastlab kundalik hayotga deyarli ta’sir qilmaydi.',
      'Bu jarayonni sekinlashtirish uchun quloqlaringizni kuchli shovqindan asrang.',
      'To‘liqroq bilish uchun tovush eshitish va shovqinda nutqni tushunish testlarini ham topshiring.',
    ],
    deviceNote: 'Natija telefon va quloqchinga bog‘liq: ko‘plari juda ingichka tovushni chiqara olmaydi. Natijalarni o‘sha quloqchin bilan solishtiring.',
  },
  ru: {
    info: {
      name: 'Высокие звуки',
      short: 'Самый высокий звук, который вы ещё слышите.',
      measures: 'Определяет самый высокий звук, который вы слышите. Очень высокие звуки с возрастом и от громкого шума пропадают первыми — часто за годы до того, как становится труднее понимать речь.',
      steps: [
        'Настройте комфортную громкость.',
        'Очень высокий тон медленно понижается. Нажмите, как только НАЧНЁТЕ его слышать.',
        'Затем тон медленно повышается. Нажмите, когда он ПРОПАДЁТ.',
        'По два раза, около 1 минуты.',
      ],
      tips: ['Наушники работают намного лучше динамика телефона.', 'Многие телефоны и наушники не воспроизводят звуки выше 16–18 кГц, это ограничивает результат.', 'Не прибавляйте громкость, чтобы услышать тон. Оставьте её прежней.'],
    },
    down: 'Нажмите, как только УСЛЫШИТЕ тон',
    up: 'Нажмите, когда тон ПРОПАДЁТ',
    downBtn: 'Слышу',
    upBtn: 'Пропал',
    sweep: (i: number, n: number) => `Попытка ${i} из ${n}`,
    ready: 'Следующая попытка',
    limit: 'Самый высокий слышимый звук',
    hearingAge: 'Обычно в возрасте',
    under: (a: number) => `около ${a} ${ruPlural(a, 'года', 'лет', 'лет')}`,
    yourAge: 'Обычно в вашем возрасте',
    sweeps: 'Попытки',
    heard: 'услышан',
    gone: 'пропал',
    notHeard: 'не услышан',
    stillHeard: 'ещё слышен',
    khz: 'кГц',
    meaning: {
      great: 'Вы слышите высокие звуки лучше, чем обычно в вашем возрасте.',
      normal: 'Вы слышите высокие звуки так, как обычно в вашем возрасте.',
      borderline: 'Самый высокий слышимый звук ниже, чем обычно в вашем возрасте. Это может быть ранним признаком возрастных изменений слуха или повреждения шумом — или просто ограничением наушников.',
      info: 'Возраст не указан, поэтому сравнить не с чем.',
    } as Record<string, string>,
    rec: [
      'Потеря самых высоких звуков встречается часто и поначалу почти не мешает в жизни.',
      'Берегите уши от громкого шума, чтобы замедлить этот процесс.',
      'Чтобы получить полную картину, пройдите тональный тест слуха и тест «Речь в шуме».',
    ],
    deviceNote: 'Результат зависит от телефона и наушников: многие не воспроизводят очень высокие звуки. Сравнивайте результаты с теми же наушниками.',
  },
})

function Runner({ onDone, onExit }: { onDone: (s: { value: number | null; level: Level }, d: RangeData) => void; onExit: () => void }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const person = usePerson()
  const [stage, setStage] = useState<'cal' | 'wait' | 'sweep'>('cal')
  const [i, setI] = useState(0)
  const results = useRef<SweepResult[]>([])
  const tone = useRef<ReturnType<typeof createLiveTone> | null>(null)
  const sweepInfo = useRef<{ start: number; f0: number; f1: number; dur: number } | null>(null)
  const top = useRef(19800)
  const [pressKey, setPressKey] = useState(0)

  useEffect(() => () => tone.current?.stop(), [])

  const finishSweep = (freq: number, censored: boolean) => {
    tone.current?.stop()
    tone.current = null
    sweepInfo.current = null
    results.current.push({ dir: ORDER[i], freq: Math.round(freq), censored })
    if (i + 1 < ORDER.length) {
      setI(i + 1)
      setStage('wait')
    } else {
      const limit = upperLimit(results.current)
      const age = ageOf(person)
      onDone({ value: limit / 1000, level: rangeLevel(limit, age) }, { sweeps: results.current, limit, top: top.current, age })
    }
  }

  const startSweep = async () => {
    await unlockAudio()
    const ctx = getCtx()
    if (i === 0) top.current = Math.min(20000, Math.floor((ctx.sampleRate * 0.45) / 100) * 100)
    const dir = ORDER[i]
    const f0 = dir === 'down' ? top.current : SWEEP_LOW
    const f1 = dir === 'down' ? SWEEP_LOW : top.current
    const dur = sweepDuration(top.current)
    const tn = createLiveTone(f0, LEVEL_DBFS, 'both')
    tn.sweepTo(f1, dur)
    tone.current = tn
    sweepInfo.current = { start: ctx.currentTime, f0, f1, dur }
    setStage('sweep')
  }

  // Sweep timeout
  useEffect(() => {
    if (stage !== 'sweep') return
    const info = sweepInfo.current
    if (!info) return
    const id = window.setTimeout(() => finishSweep(info.f1, true), (info.dur + 0.4) * 1000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, i])

  const press = () => {
    const info = sweepInfo.current
    if (stage !== 'sweep' || !info) return
    setPressKey((k) => k + 1)
    const el = getCtx().currentTime - info.start
    finishSweep(sweepFreqAt(info.f0, info.f1, info.dur, Math.max(0, el - REACTION_S)), false)
  }
  useKey([' ', 'Space'], (e) => {
    e.preventDefault()
    press()
  }, stage === 'sweep')

  const dir = ORDER[i]
  return (
    <FocusShell title={s.info.name} subtitle={stage !== 'cal' ? s.sweep(i + 1, ORDER.length) : undefined} progress={stage !== 'cal' ? i / ORDER.length : null} onExit={onExit}>
      {stage === 'cal' && <VolumeCalibration onDone={() => setStage('wait')} />}
      {stage === 'wait' && (
        <Stage
          icon={<AudioWaveform className="h-8 w-8" />}
          title={dir === 'down' ? s.down : s.up}
          footer={
            <Button variant="accent" size="lg" onClick={startSweep}>
              {i === 0 ? t.btn.start : s.ready}
            </Button>
          }
        />
      )}
      {stage === 'sweep' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-8">
          <p className="max-w-xs text-center text-lg font-semibold text-ink">{dir === 'down' ? s.down : s.up}</p>
          <ResponseButton onPress={press} label={dir === 'down' ? s.downBtn : s.upBtn} size={Math.min(230, window.innerWidth - 90)} pressedKey={pressKey} />
        </div>
      )}
    </FocusShell>
  )
}

function Details({ result }: { result: { data: RangeData; summary: { level: Level } } }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const lang = useLang()
  const d = result.data
  const khz = (f: number) => fmtNum(lang, f / 1000, 1)
  const hAge = Math.round(typicalAge(d.limit))
  const exp = d.age !== null ? expectedLimit(d.age) : null
  return (
    <>
      <Card className="p-5">
        <SectionTitle>{s.limit}</SectionTitle>
        <ScaleBar
          min={6}
          max={20}
          value={d.limit / 1000}
          valueLabel={`${khz(d.limit)} ${s.khz}`}
          segments={
            exp === null
              ? [{ to: 20, level: 'info' }]
              : [
                  { to: Math.max(6.1, (exp - 1500) / 1000), level: 'borderline' },
                  { to: Math.min(19.9, (exp + 1000) / 1000), level: 'normal' },
                  { to: 20, level: 'great' },
                ]
          }
          format={(v) => fmtNum(lang, v, v % 1 ? 1 : 0)}
        />
        <p className="mt-4 leading-relaxed text-ink-2">{s.meaning[result.summary.level] ?? s.meaning.info}</p>
      </Card>
      <Card className="p-5">
        <MetricGrid cols={3}>
          <Metric label={s.limit} value={khz(d.limit)} unit={s.khz} emphasis />
          <Metric label={s.hearingAge} value={d.limit >= 19000 ? '≤ 15' : d.limit <= 8000 ? '≥ 80' : s.under(hAge)} />
          {exp !== null && <Metric label={s.yourAge} value={khz(exp)} unit={s.khz} />}
        </MetricGrid>
      </Card>
      <Card className="p-5">
        <SectionTitle>{s.sweeps}</SectionTitle>
        <ul className="divide-y divide-line text-sm">
          {d.sweeps.map((w, k) => (
            <li key={k} className="flex items-center justify-between py-2">
              <span className="text-muted">
                {k + 1}. {w.dir === 'down' ? '↓' : '↑'} {w.censored ? (w.dir === 'down' ? s.notHeard : s.stillHeard) : w.dir === 'down' ? s.heard : s.gone}
              </span>
              <span className="tabular font-semibold text-ink">{khz(w.freq)} {s.khz}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="p-5">
        <SectionTitle>{t.recommendations}</SectionTitle>
        <Bullets items={s.rec} />
      </Card>
      <Callout tone="info">{s.deviceNote}</Callout>
    </>
  )
}

const rangeTest: TestModule<RangeData> = {
  kind: 'test',
  usesAge: true,
  id: 'high-frequency-range',
  field: 'hearing',
  icon: AudioWaveform,
  minutes: 2,
  requirements: ['headphones', 'quiet'],
  version: 1,
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  Details,
  headline: (r, lang) => ({
    value: fmtNum(lang, r.data.limit / 1000, 1),
    unit: S[lang].khz,
    label: `${S[lang].hearingAge}: ${S[lang].under(Math.round(typicalAge(r.data.limit)))}`,
  }),
  trend: { higherIsBetter: true, unit: () => 'kHz', digits: 1 },
}

export default rangeTest
