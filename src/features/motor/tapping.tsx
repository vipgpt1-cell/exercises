import { useEffect, useRef, useState } from 'react'
import { Pointer } from 'lucide-react'
import type { TestModule } from '../../catalog/types'
import { FocusShell, Stage } from '../../components/shell'
import { Bullets, Callout, Card, Metric, MetricGrid, SectionTitle, cx } from '../../components/ui'
import { CompareBars, Ring } from '../../components/charts'
import { defineStrings, fmtNum, useLang, useStrings } from '../../lib/i18n'
import { fx, vibrate } from '../../lib/audio'
import { useKey } from '../../lib/hooks'
import { usePerson, type Level } from '../../lib/store'
import { mean } from '../../lib/stats'
import { common } from '../../i18n/common'
import { HandPicker, UseHand, handName, type Side } from './hand-shared'
import { handAsymmetry, tapStats, tappingLevel } from './analysis'

const TRIAL_MS = 10000
const REST_S = 5

export interface TappingData {
  dominant: Side
  input: 'touch' | 'mouse' | 'key'
  trials: { hand: Side; times: number[] }[]
}

const S = defineStrings({
  en: {
    info: {
      name: 'Finger tapping',
      short: 'How fast and steadily each index finger can tap.',
      measures: 'Checks the speed and rhythm of each hand. Comparing the two hands helps notice weakness or slowness on one side, for example after a stroke or with Parkinson’s disease, and follow recovery.',
      steps: ['Tap the big button with your INDEX finger as fast as you can for 10 seconds.', 'Two tries for each hand, taking turns, with short rests.', 'Keep your wrist on the table and move only your finger.'],
      tips: ['Put the phone flat on a table.', 'Use one finger only, don’t switch fingers.'],
    },
    tapFast: 'Tap as fast as you can!',
    startTapping: 'The 10 seconds start with your first tap',
    rest: 'Rest',
    next: 'Next',
    taps: 'taps',
    rl: 'right / left',
    oneFinger: 'Use one finger only',
    per10: 'Taps in 10 seconds',
    rhythm: 'Rhythm unevenness',
    fatigue: 'Change during a try',
    asym: 'Difference between hands',
    trialN: (i: number, n: number) => `Try ${i} of ${n}`,
    meaning: {
      great: 'Fast and even tapping with both hands.',
      normal: 'Your tapping speed is normal.',
      borderline: 'Tapping is a bit slow or uneven, or clearly different between the hands.',
      attention: 'Tapping is slow. Hand speed may be reduced.',
    } as Record<string, string>,
    asymNote: (slow: string, pct: string) => `The ${slow.toLowerCase()} was ${pct}% slower. Usually the other hand is at most about 10% slower than the main one. A bigger difference, especially a new one, can point to a problem on one side.`,
    rhythmNote: 'Your rhythm was quite uneven (over 20%). Uneven tapping can be a sign of coordination problems or tiredness.',
    fatigueNote: 'Your speed dropped a lot towards the end of the tries.',
    rec: [
      'To follow changes, repeat the test in the same conditions: same phone, same time of day.',
      'Hand exercises and target practice help keep your fingers quick and well coordinated.',
      'Sudden weakness or clumsiness in one hand is an emergency. Call for medical help right away.',
    ],
    deviceNote: 'Different phones give slightly different speeds. Compare results made on the same phone.',
  },
  uz: {
    info: {
      name: 'Barmoq bilan urish',
      short: 'Har bir ko‘rsatkich barmog‘ingiz qanchalik tez va bir maromda ura oladi.',
      measures: 'Har bir qo‘lning tezligi va maromini tekshiradi. Ikki qo‘lni solishtirish bir tomondagi zaiflik yoki sekinlikni sezishga yordam beradi (masalan, insultdan keyin yoki Parkinson kasalligida) va tiklanishni kuzatish imkonini beradi.',
      steps: ['Katta tugmani KO‘RSATKICH barmog‘ingiz bilan 10 soniya davomida imkon qadar tez bosing.', 'Har bir qo‘lga ikki urinish, navbatma-navbat, qisqa dam bilan.', 'Bilagingizni stolga qo‘yib turing va faqat barmog‘ingizni qimirlating.'],
      tips: ['Telefonni stolga tekis qo‘ying.', 'Faqat bitta barmoq bilan bosing, barmoqni almashtirmang.'],
    },
    tapFast: 'Imkon qadar tez bosing!',
    startTapping: '10 soniya birinchi bosishingiz bilan boshlanadi',
    rest: 'Dam oling',
    next: 'Keyingisi',
    taps: 'marta',
    rl: 'o‘ng / chap',
    oneFinger: 'Faqat bitta barmoq bilan bosing',
    per10: '10 soniyada bosishlar',
    rhythm: 'Marom notekisligi',
    fatigue: 'Urinish davomida o‘zgarish',
    asym: 'Qo‘llar orasidagi farq',
    trialN: (i: number, n: number) => `${i}-urinish, jami ${n}`,
    meaning: {
      great: 'Ikkala qo‘l bilan ham tez va bir maromda bosdingiz.',
      normal: 'Bosish tezligingiz me’yorida.',
      borderline: 'Bosish biroz sekin yoki notekis, yoki qo‘llar orasida sezilarli farq bor.',
      attention: 'Bosish sekin. Qo‘l harakati tezligi pasaygan bo‘lishi mumkin.',
    } as Record<string, string>,
    asymNote: (slow: string, pct: string) => `${slow} ${pct}% sekinroq bo‘ldi. Odatda ikkinchi qo‘l asosiysidan ko‘pi bilan 10% ga sekinroq bo‘ladi. Undan katta farq, ayniqsa yaqinda paydo bo‘lgan bo‘lsa, bir tomondagi muammoni bildirishi mumkin.`,
    rhythmNote: 'Maromingiz ancha notekis bo‘ldi (20% dan ortiq). Notekis bosish muvofiqlashtirish muammosi yoki charchoq belgisi bo‘lishi mumkin.',
    fatigueNote: 'Urinishlar oxiriga kelib tezligingiz ancha pasaydi.',
    rec: [
      'O‘zgarishni kuzatish uchun testni bir xil sharoitda takrorlang: o‘sha telefon, kunning o‘sha vaqti.',
      'Qo‘l mashqlari va nishonga bosish mashqi barmoqlarni tez va chaqqon saqlashga yordam beradi.',
      'Bir qo‘lda to‘satdan holsizlik yoki qo‘pollik paydo bo‘lsa, bu shoshilinch holat. Darhol tez yordam chaqiring.',
    ],
    deviceNote: 'Turli telefonlarda tezlik biroz farq qiladi. Natijalarni o‘sha telefonda solishtiring.',
  },
  ru: {
    info: {
      name: 'Постукивание пальцем',
      short: 'Как быстро и ровно стучит указательный палец каждой руки.',
      measures: 'Проверяет скорость и ритм каждой руки. Сравнение рук помогает заметить слабость или замедленность с одной стороны — например, после инсульта или при болезни Паркинсона — и следить за восстановлением.',
      steps: ['Нажимайте на большую кнопку УКАЗАТЕЛЬНЫМ пальцем как можно быстрее в течение 10 секунд.', 'По две попытки на каждую руку, по очереди, с короткими паузами.', 'Держите запястье на столе и двигайте только пальцем.'],
      tips: ['Положите телефон на стол.', 'Нажимайте одним пальцем, не меняйте пальцы.'],
    },
    tapFast: 'Нажимайте как можно быстрее!',
    startTapping: '10 секунд начнутся с первого нажатия',
    rest: 'Отдых',
    next: 'Далее',
    taps: 'нажатий',
    rl: 'пр. / лев.',
    oneFinger: 'Нажимайте одним пальцем',
    per10: 'Нажатий за 10 секунд',
    rhythm: 'Неровность ритма',
    fatigue: 'Изменение за попытку',
    asym: 'Разница между руками',
    trialN: (i: number, n: number) => `Попытка ${i} из ${n}`,
    meaning: {
      great: 'Быстрые и ровные нажатия обеими руками.',
      normal: 'Скорость нажатий в норме.',
      borderline: 'Нажатия немного медленные или неровные, либо заметна разница между руками.',
      attention: 'Нажатия медленные. Скорость движений руки может быть снижена.',
    } as Record<string, string>,
    asymNote: (slow: string, pct: string) => `${slow}: на ${pct}% медленнее. Обычно неведущая рука медленнее ведущей не больше чем на 10%. Разница больше, особенно появившаяся недавно, может говорить о проблеме с одной стороны.`,
    rhythmNote: 'Ритм был довольно неровным (больше 20%). Неровные нажатия могут быть признаком нарушения координации или усталости.',
    fatigueNote: 'К концу попыток скорость заметно упала.',
    rec: [
      'Чтобы следить за изменениями, повторяйте тест в одинаковых условиях: тот же телефон, то же время дня.',
      'Упражнения для рук и тренировка «Цели» помогают сохранить быстроту и ловкость пальцев.',
      'Внезапная слабость или неловкость в одной руке — это неотложное состояние. Сразу вызывайте скорую.',
    ],
    deviceNote: 'На разных телефонах скорость немного отличается. Сравнивайте результаты на одном и том же телефоне.',
  },
})

function perHand(d: TappingData) {
  const res = (['right', 'left'] as Side[]).map((hand) => {
    const st = d.trials.filter((x) => x.hand === hand).map((x) => tapStats(x.times, TRIAL_MS))
    return { hand, taps: mean(st.map((x) => x.taps)), cv: mean(st.map((x) => x.itiCv).filter(Number.isFinite)), fatigue: mean(st.map((x) => x.fatigue)) }
  })
  return { right: res[0], left: res[1] }
}

export function tappingSummary(d: TappingData) {
  const h = perHand(d)
  const dom = h[d.dominant]
  const non = h[d.dominant === 'right' ? 'left' : 'right']
  const asym = handAsymmetry(dom.taps, non.taps)
  return { h, dom, non, asym, level: tappingLevel(dom.taps, asym, Math.max(dom.cv, non.cv)) }
}

function Runner({ onDone, onExit }: { onDone: (s: { value: number | null; level: Level }, d: TappingData) => void; onExit: () => void }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const lang = useLang()
  const person = usePerson()
  const [dominant, setDominant] = useState<Side | null>(person.hand)
  const [idx, setIdx] = useState(0)
  const [stage, setStage] = useState<'ready' | 'armed' | 'tapping' | 'rest'>('ready')
  const [count, setCount] = useState(0)
  const [left, setLeft] = useState(TRIAL_MS)
  const [restLeft, setRestLeft] = useState(REST_S)
  const [multi, setMulti] = useState(false)
  const [pressKey, setPressKey] = useState(0)
  const times = useRef<number[]>([])
  const start = useRef(0)
  const trials = useRef<TappingData['trials']>([])
  const input = useRef<TappingData['input']>('touch')
  const pointers = useRef(new Set<number>())
  const raf = useRef(0)

  const order: Side[] = dominant ? [dominant, dominant === 'right' ? 'left' : 'right', dominant, dominant === 'right' ? 'left' : 'right'] : []
  const hand = order[idx]

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const endTrial = () => {
    cancelAnimationFrame(raf.current)
    fx('done')
    vibrate(80)
    trials.current.push({ hand, times: times.current.map((x) => Math.round(x)) })
    if (idx + 1 >= order.length) {
      const data: TappingData = { dominant: dominant!, input: input.current, trials: trials.current }
      const sm = tappingSummary(data)
      onDone({ value: Math.round(sm.dom.taps * 10) / 10, level: sm.level }, data)
      return
    }
    setStage('rest')
    setRestLeft(REST_S)
    let r = REST_S
    const id = window.setInterval(() => {
      r--
      setRestLeft(r)
      if (r <= 0) {
        window.clearInterval(id)
        setIdx((i) => i + 1)
        setStage('ready')
      }
    }, 1000)
  }

  const tick = () => {
    const el = performance.now() - start.current
    setLeft(Math.max(0, TRIAL_MS - el))
    if (el >= TRIAL_MS) endTrial()
    else raf.current = requestAnimationFrame(tick)
  }

  const tap = (ts: number) => {
    if (stage === 'armed') {
      start.current = ts
      times.current = [0]
      setCount(1)
      setStage('tapping')
      raf.current = requestAnimationFrame(tick)
      return
    }
    if (stage !== 'tapping') return
    const rel = ts - start.current
    if (rel > TRIAL_MS) return
    times.current.push(rel)
    setCount(times.current.length)
  }

  useKey([' ', 'Space'], (e) => {
    e.preventDefault()
    input.current = 'key'
    setPressKey((k) => k + 1)
    tap(performance.now())
  }, stage === 'armed' || stage === 'tapping')

  if (!dominant) return <FocusShell title={s.info.name} onExit={onExit}><HandPicker onPick={setDominant} /></FocusShell>

  return (
    <FocusShell title={s.info.name} subtitle={`${s.trialN(idx + 1, order.length)} · ${handName(lang, hand)}`} progress={(idx + (stage === 'rest' ? 1 : 0)) / order.length} onExit={onExit}>
      {stage === 'ready' && (
        <UseHand
          side={hand}
          dominant={hand === dominant}
          extra={s.info.steps[2]}
          onGo={() => {
            times.current = []
            setCount(0)
            setLeft(TRIAL_MS)
            setMulti(false)
            setStage('armed')
          }}
        />
      )}
      {stage === 'rest' && (
        <Stage title={`${s.rest}… ${restLeft}`}>
          <p className="text-5xl font-black tabular text-[var(--accent)]">
            {trials.current[trials.current.length - 1]?.times.length ?? 0} <span className="text-lg font-semibold text-muted">{s.taps}</span>
          </p>
        </Stage>
      )}
      {(stage === 'armed' || stage === 'tapping') && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <Ring value={stage === 'tapping' ? left / TRIAL_MS : 1} size={120} stroke={9}>
            <span className="text-3xl font-black tabular text-ink">{count}</span>
            <span className="text-xs text-muted">{fmtNum('en', Math.ceil(left / 1000), 0)} {t.seconds}</span>
          </Ring>
          <p className={cx('h-6 text-center font-semibold', multi ? 'text-urgent' : 'text-ink-2')}>{multi ? s.oneFinger : stage === 'armed' ? s.startTapping : s.tapFast}</p>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault()
              input.current = e.pointerType === 'mouse' ? 'mouse' : 'touch'
              if (pointers.current.size > 0 && e.pointerType === 'touch') {
                setMulti(true)
                return
              }
              pointers.current.add(e.pointerId)
              setPressKey((k) => k + 1)
              tap(e.timeStamp || performance.now())
            }}
            onPointerUp={(e) => pointers.current.delete(e.pointerId)}
            onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
            onPointerLeave={(e) => pointers.current.delete(e.pointerId)}
            className={cx(
              'no-touch-scroll relative flex h-56 w-56 select-none items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-float transition-transform duration-75 active:scale-95 dark:text-[#0b1020]',
            )}
            data-press={pressKey}
          >
            <Pointer className={cx('h-16 w-16', hand === 'left' && '-scale-x-100')} />
          </button>
        </div>
      )}
    </FocusShell>
  )
}

function Details({ result }: { result: { data: TappingData; summary: { level: Level } } }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const lang = useLang()
  const d = result.data
  const sm = tappingSummary(d)
  const slowSide: Side = sm.h.right.taps < sm.h.left.taps ? 'right' : 'left'
  const dominantSlower = slowSide === d.dominant
  const unusual = sm.asym > (dominantSlower ? 10 : 20)
  return (
    <>
      <Card className="p-5">
        <SectionTitle>{s.per10}</SectionTitle>
        <CompareBars
          max={Math.max(80, sm.h.right.taps, sm.h.left.taps) * 1.05}
          format={(v) => fmtNum(lang, v, 1)}
          rows={(['right', 'left'] as Side[]).map((h) => ({
            label: `${handName(lang, h)}${h === d.dominant ? ` (${t.dominant})` : ''}`,
            value: sm.h[h].taps,
          }))}
        />
        <p className="mt-4 leading-relaxed text-ink-2">{s.meaning[result.summary.level]}</p>
      </Card>
      <Card className="p-5">
        <MetricGrid cols={3}>
          <Metric label={s.asym} value={fmtNum(lang, sm.asym, 0)} unit="%" emphasis />
          <Metric label={`${s.rhythm} · ${handName(lang, 'right')}`} value={fmtNum(lang, sm.h.right.cv, 0)} unit="%" />
          <Metric label={`${s.rhythm} · ${handName(lang, 'left')}`} value={fmtNum(lang, sm.h.left.cv, 0)} unit="%" />
          <Metric label={`${s.fatigue} · ${handName(lang, 'right')}`} value={fmtNum(lang, sm.h.right.fatigue, 0)} unit="%" />
          <Metric label={`${s.fatigue} · ${handName(lang, 'left')}`} value={fmtNum(lang, sm.h.left.fatigue, 0)} unit="%" />
        </MetricGrid>
      </Card>
      {unusual && <Callout tone="warn">{s.asymNote(handName(lang, slowSide), fmtNum(lang, sm.asym, 0))}</Callout>}
      {Math.max(sm.h.right.cv, sm.h.left.cv) > 20 && <Callout tone="info">{s.rhythmNote}</Callout>}
      {Math.min(sm.h.right.fatigue, sm.h.left.fatigue) < -25 && <Callout tone="info">{s.fatigueNote}</Callout>}
      <Card className="p-5">
        <SectionTitle>{t.recommendations}</SectionTitle>
        <Bullets items={s.rec} />
      </Card>
      <p className="text-xs text-muted">{s.deviceNote}</p>
    </>
  )
}

const tapping: TestModule<TappingData> = {
  kind: 'test',
  id: 'finger-tapping',
  field: 'hands',
  icon: Pointer,
  minutes: 2,
  requirements: ['touch', 'keyboard'],
  version: 1,
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  Details,
  headline: (r, lang) => {
    const sm = tappingSummary(r.data)
    return { value: `${fmtNum(lang, sm.h.right.taps, 0)} / ${fmtNum(lang, sm.h.left.taps, 0)}`, unit: `${S[lang].taps} (${S[lang].rl})`, label: common[lang].level[r.summary.level] }
  },
  trend: { higherIsBetter: true, unit: (lang) => `${S[lang].taps} / 10 ${common[lang].seconds}`, digits: 1 },
}

export default tapping
