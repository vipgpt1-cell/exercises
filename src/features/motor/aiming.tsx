import { useRef, useState } from 'react'
import { Crosshair } from 'lucide-react'
import type { TestModule } from '../../catalog/types'
import { FocusShell, Stage } from '../../components/shell'
import { Bullets, Button, Card, Metric, MetricGrid, SectionTitle } from '../../components/ui'
import { ScaleBar } from '../../components/charts'
import { defineStrings, fmtNum, useLang, useStrings } from '../../lib/i18n'
import { fx } from '../../lib/audio'
import { useElementSize } from '../../lib/hooks'
import { usePerson, type Level } from '../../lib/store'
import { mean } from '../../lib/stats'
import { common } from '../../i18n/common'
import { handName, type Side } from './hand-shared'
import { fittsBlock, fittsLevel, type FittsTap } from './analysis'

const N_TARGETS = 13
/** Radius of the target circle and target diameter, as fractions of the arena size. */
const BLOCKS = [
  { R: 0.4, W: 0.13 },
  { R: 0.4, W: 0.07 },
  { R: 0.24, W: 0.07 },
]
const PRACTICE = { R: 0.3, W: 0.13 }

export interface AimingData {
  input: 'touch' | 'mouse'
  hand: Side | null
  blocks: { R: number; W: number; taps: FittsTap[] }[]
}

const S = defineStrings({
  en: {
    info: {
      name: 'Target tapping',
      short: 'Hand–eye coordination: tap targets quickly and accurately.',
      measures: 'Checks how quickly and accurately you can hit targets. The result is one score that combines speed and accuracy, so it doesn’t matter much whether you play it safe or go fast.',
      steps: ['Circles are arranged in a ring. Tap the highlighted one.', 'The next target is always on the other side of the ring.', '3 rounds with different sizes and distances, about 2 minutes.'],
      tips: ['Use your main hand, or the hand you are training after an injury.', 'Be quick but accurate. Hitting near the centre counts.', 'Hold the phone firmly or put it on a table.'],
    },
    practice: 'Practice',
    tapTarget: 'Tap the highlighted circle',
    round: (i: number, n: number) => `Round ${i} of ${n}`,
    nextRound: 'Next round',
    roundDone: 'Round done',
    throughput: 'Coordination score',
    bits: 'points',
    mt: 'Time per target',
    errors: 'Misses',
    idTitle: 'By round',
    id: 'Difficulty',
    meaning: {
      great: 'Fast and accurate: excellent hand–eye coordination.',
      normal: 'Your hand–eye coordination is normal.',
      borderline: 'Your movements are a bit slow or inaccurate.',
      attention: 'Your movements are slow or inaccurate. Coordination may be reduced.',
    } as Record<string, string>,
    rec: [
      'The score depends on the phone and the hand you use. Compare results made the same way.',
      'The target practice exercise trains the speed and accuracy of hand movements.',
      'If coordination gets worse over several weeks, or one hand becomes clumsy, see a doctor.',
    ],
  },
  uz: {
    info: {
      name: 'Nishonga bosish',
      short: 'Qo‘l va ko‘z muvofiqligi: nishonlarni tez va aniq bosing.',
      measures: 'Nishonlarni qanchalik tez va aniq bosa olishingizni tekshiradi. Natija tezlik va aniqlikni birlashtirgan bitta ball, shuning uchun ehtiyotkor yoki shoshqaloq bo‘lishingiz unchalik ahamiyatga ega emas.',
      steps: ['Doiralar halqa shaklida joylashgan. Belgilanganini bosing.', 'Keyingi nishon doim halqaning qarama-qarshi tomonida bo‘ladi.', 'Turli o‘lcham va masofali 3 ta raund, taxminan 2 daqiqa.'],
      tips: ['Asosiy qo‘lingiz bilan yoki jarohatdan keyin tiklayotgan qo‘lingiz bilan bajaring.', 'Tez, lekin aniq bosing. Markazga yaqin tegish hisobga olinadi.', 'Telefonni mahkam ushlang yoki stolga qo‘ying.'],
    },
    practice: 'Sinov',
    tapTarget: 'Belgilangan doirani bosing',
    round: (i: number, n: number) => `${i}-raund, jami ${n}`,
    nextRound: 'Keyingi raund',
    roundDone: 'Raund tugadi',
    throughput: 'Muvofiqlik balli',
    bits: 'ball',
    mt: 'Bir nishonga vaqt',
    errors: 'Tegmaganlar',
    idTitle: 'Raundlar bo‘yicha',
    id: 'Qiyinlik',
    meaning: {
      great: 'Tez va aniq: qo‘l va ko‘z muvofiqligingiz a’lo.',
      normal: 'Qo‘l va ko‘z muvofiqligingiz me’yorida.',
      borderline: 'Harakatlaringiz biroz sekin yoki noaniq.',
      attention: 'Harakatlaringiz sekin yoki noaniq. Muvofiqlik pasaygan bo‘lishi mumkin.',
    } as Record<string, string>,
    rec: [
      'Ball telefon va qaysi qo‘l bilan bajarganingizga bog‘liq. Bir xil usulda olingan natijalarni solishtiring.',
      '“Nishon mashqi” qo‘l harakatlarining tezligi va aniqligini mashq qildiradi.',
      'Agar muvofiqlik bir necha hafta ichida yomonlashsa yoki bir qo‘l qo‘pol bo‘lib qolsa, shifokorga murojaat qiling.',
    ],
  },
  ru: {
    info: {
      name: 'Попадание в цель',
      short: 'Координация «рука — глаз»: быстро и точно нажимайте на цели.',
      measures: 'Проверяет, насколько быстро и точно вы попадаете по целям. Результат — один балл, который учитывает и скорость, и точность, поэтому не так важно, действуете вы осторожно или быстро.',
      steps: ['Кружки расположены по кругу. Нажмите на выделенный.', 'Следующая цель всегда на другой стороне круга.', '3 раунда с разным размером и расстоянием, около 2 минут.'],
      tips: ['Используйте ведущую руку или руку, которую восстанавливаете после травмы.', 'Действуйте быстро, но точно. Засчитывается попадание рядом с центром.', 'Крепко держите телефон или положите его на стол.'],
    },
    practice: 'Проба',
    tapTarget: 'Нажмите на выделенный кружок',
    round: (i: number, n: number) => `Раунд ${i} из ${n}`,
    nextRound: 'Следующий раунд',
    roundDone: 'Раунд окончен',
    throughput: 'Балл координации',
    bits: 'балла',
    mt: 'Время на цель',
    errors: 'Промахи',
    idTitle: 'По раундам',
    id: 'Сложность',
    meaning: {
      great: 'Быстро и точно: отличная координация «рука — глаз».',
      normal: 'Координация «рука — глаз» в норме.',
      borderline: 'Движения немного медленные или неточные.',
      attention: 'Движения медленные или неточные. Координация может быть снижена.',
    } as Record<string, string>,
    rec: [
      'Балл зависит от телефона и руки, которой вы выполняли тест. Сравнивайте результаты, полученные одинаково.',
      'Упражнение «Цели» тренирует скорость и точность движений рук.',
      'Если координация ухудшается несколько недель или одна рука стала неловкой, обратитесь к врачу.',
    ],
  },
})

const order = Array.from({ length: N_TARGETS + 1 }, (_, k) => (k * 7) % N_TARGETS)

function Arena({ cond, onDone }: { cond: { R: number; W: number }; onDone: (taps: FittsTap[], input: 'touch' | 'mouse') => void }) {
  const s = useStrings(S)
  const [ref, { width }] = useElementSize<HTMLDivElement>()
  const size = Math.min(width, 520, typeof window !== 'undefined' ? window.innerHeight - 200 : 520)
  const [k, setK] = useState(0)
  const [miss, setMiss] = useState(false)
  const taps = useRef<FittsTap[]>([])
  const last = useRef<{ x: number; y: number; t: number } | null>(null)
  const input = useRef<'touch' | 'mouse'>('touch')
  const centre = (i: number) => {
    const a = (2 * Math.PI * i) / N_TARGETS - Math.PI / 2
    return { x: size / 2 + cond.R * size * Math.cos(a), y: size / 2 + cond.R * size * Math.sin(a) }
  }
  const w = cond.W * size
  return (
    <div className="flex flex-1 flex-col items-center gap-3">
      <p className="text-center font-semibold text-ink">{s.tapTarget}</p>
      <div ref={ref} className="flex w-full justify-center">
        {size > 0 && (
          <svg
            width={size}
            height={size}
            className="no-touch-scroll rounded-3xl bg-surface shadow-card"
            onPointerDown={(e) => {
              e.preventDefault()
              input.current = e.pointerType === 'mouse' ? 'mouse' : 'touch'
              const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
              const x = e.clientX - r.left
              const y = e.clientY - r.top
              const t = e.timeStamp || performance.now()
              const target = centre(order[k])
              const hit = Math.hypot(x - target.x, y - target.y) <= w / 2
              if (k > 0 && last.current) {
                taps.current.push({ from: centre(order[k - 1]), to: target, x, y, px: last.current.x, py: last.current.y, mt: t - last.current.t, width: w, hit })
              } else if (!hit) {
                // first tap must hit to start the round
                fx('bad')
                return
              }
              fx(hit ? 'tap' : 'bad')
              setMiss(!hit)
              last.current = { x, y, t }
              if (k + 1 >= order.length) {
                onDone(taps.current, input.current)
                return
              }
              setK(k + 1)
            }}
          >
            {Array.from({ length: N_TARGETS }, (_, i) => {
              const c = centre(i)
              const active = order[k] === i
              return <circle key={i} cx={c.x} cy={c.y} r={w / 2} fill={active ? 'var(--accent)' : 'transparent'} stroke={active ? 'var(--accent)' : 'var(--border-strong)'} strokeWidth={2} />
            })}
            {miss && <circle cx={last.current?.x} cy={last.current?.y} r={5} fill="var(--urgent)" />}
          </svg>
        )}
      </div>
    </div>
  )
}

export function aimingSummary(d: AimingData) {
  const bl = d.blocks.map((b) => fittsBlock(b.taps))
  const tp = mean(bl.map((b) => b.throughput).filter(Number.isFinite))
  return { blocks: bl, throughput: tp, errorRate: mean(bl.map((b) => b.errorRate)), mt: mean(bl.map((b) => b.MT)) }
}

function Runner({ onDone, onExit }: { onDone: (s: { value: number | null; level: Level }, d: AimingData) => void; onExit: () => void }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const lang = useLang()
  const person = usePerson()
  const [stage, setStage] = useState<'intro' | 'practice' | 'between' | 'block'>('intro')
  const [bi, setBi] = useState(0)
  const blocks = useRef<AimingData['blocks']>([])
  const input = useRef<'touch' | 'mouse'>('touch')
  return (
    <FocusShell title={s.info.name} subtitle={stage === 'block' ? s.round(bi + 1, BLOCKS.length) : stage === 'practice' ? s.practice : undefined} progress={stage === 'intro' || stage === 'practice' ? null : (bi + (stage === 'between' ? 1 : 0)) / BLOCKS.length} onExit={onExit}>
      {stage === 'intro' && (
        <Stage
          icon={<Crosshair className="h-8 w-8" />}
          title={s.tapTarget}
          footer={
            <Button variant="accent" size="lg" onClick={() => setStage('practice')}>
              {s.practice}
            </Button>
          }
        >
          <p>{s.info.steps.join(' ')}</p>
          {person.hand && <p className="mt-3 font-semibold text-ink">{handName(lang, person.hand)} ({t.dominant})</p>}
        </Stage>
      )}
      {stage === 'practice' && <Arena key="p" cond={PRACTICE} onDone={() => setStage('between')} />}
      {stage === 'between' && (
        <Stage
          icon={<Crosshair className="h-8 w-8" />}
          title={bi === 0 && blocks.current.length === 0 ? t.practiceDone : s.roundDone}
          footer={
            <Button variant="accent" size="lg" onClick={() => setStage('block')}>
              {blocks.current.length === 0 ? t.btn.startTest : s.nextRound}
            </Button>
          }
        />
      )}
      {stage === 'block' && (
        <Arena
          key={bi}
          cond={BLOCKS[bi]}
          onDone={(taps, inp) => {
            input.current = inp
            blocks.current.push({ ...BLOCKS[bi], taps })
            if (bi + 1 >= BLOCKS.length) {
              fx('done')
              const data: AimingData = { input: input.current, hand: person.hand, blocks: blocks.current }
              const sm = aimingSummary(data)
              onDone({ value: Math.round(sm.throughput * 100) / 100, level: fittsLevel(sm.throughput, data.input) }, data)
              return
            }
            setBi(bi + 1)
            setStage('between')
          }}
        />
      )}
    </FocusShell>
  )
}

function Details({ result }: { result: { data: AimingData; summary: { level: Level } } }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const lang = useLang()
  const d = result.data
  const sm = aimingSummary(d)
  const bands = d.input === 'mouse' ? [2.8, 3.6, 4.6, 7] : [3.8, 5, 6.5, 10]
  return (
    <>
      <Card className="p-5">
        <SectionTitle>{s.throughput}</SectionTitle>
        <ScaleBar
          min={0}
          max={bands[3]}
          value={sm.throughput}
          valueLabel={`${fmtNum(lang, sm.throughput, 1)} ${s.bits}`}
          format={(v) => fmtNum(lang, v, v % 1 ? 1 : 0)}
          segments={[
            { to: bands[0], level: 'attention' },
            { to: bands[1], level: 'borderline' },
            { to: bands[2], level: 'normal' },
            { to: bands[3], level: 'great' },
          ]}
        />
        <p className="mt-4 leading-relaxed text-ink-2">{s.meaning[result.summary.level]}</p>
      </Card>
      <Card className="p-5">
        <MetricGrid cols={3}>
          <Metric label={s.throughput} value={fmtNum(lang, sm.throughput, 1)} unit={s.bits} emphasis />
          <Metric label={s.mt} value={Math.round(sm.mt * 1000)} unit={t.ms} />
          <Metric label={s.errors} value={Math.round(sm.errorRate * 100)} unit="%" />
        </MetricGrid>
      </Card>
      <Card className="p-5">
        <SectionTitle>{s.idTitle}</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="py-1.5">#</th>
                <th className="py-1.5">{s.id}</th>
                <th className="py-1.5">{s.mt}</th>
                <th className="py-1.5">{s.throughput}</th>
              </tr>
            </thead>
            <tbody>
              {sm.blocks.map((b, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="py-2 font-semibold text-ink">{i + 1}</td>
                  <td className="py-2">{fmtNum(lang, b.ID, 1)}</td>
                  <td className="py-2">
                    {Math.round(b.MT * 1000)} {t.ms}
                  </td>
                  <td className="py-2 font-semibold text-ink">{fmtNum(lang, b.throughput, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="p-5">
        <SectionTitle>{t.recommendations}</SectionTitle>
        <Bullets items={s.rec} />
      </Card>
    </>
  )
}

const aiming: TestModule<AimingData> = {
  kind: 'test',
  id: 'target-tapping',
  field: 'hands',
  icon: Crosshair,
  minutes: 2,
  requirements: ['touch'],
  version: 1,
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  Details,
  headline: (r, lang) => ({ value: fmtNum(lang, aimingSummary(r.data).throughput, 1), unit: S[lang].bits, label: common[lang].level[r.summary.level] }),
  trend: { higherIsBetter: true, unit: (lang) => S[lang].bits, digits: 1 },
}

export default aiming
