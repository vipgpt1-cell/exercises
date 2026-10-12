import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { Eraser, Hand, Waypoints } from 'lucide-react'
import type { TestModule } from '../../catalog/types'
import { FocusShell } from '../../components/shell'
import { Bullets, Button, Callout, Card, Metric, MetricGrid, SectionTitle, cx } from '../../components/ui'
import { ScaleBar } from '../../components/charts'
import { defineStrings, fmtNum, useLang, useStrings } from '../../lib/i18n'
import { fx } from '../../lib/audio'
import { useElementSize } from '../../lib/hooks'
import { usePerson, type Level } from '../../lib/store'
import { mean } from '../../lib/stats'
import { common } from '../../i18n/common'
import { HandPicker, UseHand, handName, type Side } from './hand-shared'
import { analyzeSpiral, spiralError, spiralLevel, spiralPoint, spiralSpacing, type SpiralGeom, type SpiralResult, type TracePoint } from './analysis'

const TURNS = 3

export interface SpiralData {
  dominant: Side
  hands: { hand: Side; result: SpiralResult; trace: [number, number][] }[]
}

/** Spiral geometry for a square canvas of size `size`. */
export function geomFor(size: number): SpiralGeom {
  const a = size * 0.035
  const rMax = size * 0.45
  return { cx: size / 2, cy: size / 2, a, b: (rMax - a) / (TURNS * 2 * Math.PI), turns: TURNS }
}

const S = defineStrings({
  en: {
    info: {
      name: 'Spiral drawing',
      short: 'Trace a spiral to check how precise and steady each hand is.',
      measures: 'Doctors ask people to draw a spiral to check for hand tremor and fine control. The app measures how far your line strays from the guide and looks for small, rhythmic wobbles in it, which are a sign of tremor.',
      steps: ['Start in the centre and trace the grey spiral outwards without lifting your finger.', 'Draw at a comfortable, steady speed, not too fast.', 'First with your main hand, then with the other one.'],
      tips: ['A stylus gives the most accurate result, but a finger works too.', 'Rest your forearm on the table, but don’t lean your wrist on the screen.'],
    },
    instruction: 'Start at the centre dot and trace the spiral outwards',
    incomplete: 'Please trace the whole spiral, from the centre to the end, in one line.',
    clear: 'Clear',
    done: 'Done',
    precision: 'How precise',
    precisionShort: 'Precision',
    deviation: 'Average stray from the line',
    ofSpacing: 'of the gap between turns',
    tremor: 'Wobble in the line',
    tremorFreq: 'Wobble frequency',
    time: 'Drawing time',
    none: 'none found',
    hz: 'Hz',
    meaning: {
      great: 'Very precise, smooth drawing with both hands.',
      normal: 'Your drawing precision is normal.',
      borderline: 'The line strays noticeably or has a slight rhythmic wobble (tremor).',
      attention: 'The drawing is imprecise or has a clear tremor.',
    } as Record<string, string>,
    tremorNote: (f: string) => `Your line has a rhythmic wobble of about ${f} Hz. Tremor at 4–6 Hz is typical of tremor at rest; 6–12 Hz is more typical of tremor when holding a position, which coffee, worry and tiredness can also cause.`,
    rec: [
      'Repeat the test at the same time of day. Coffee, stress and tiredness make tremor stronger.',
      'Tracing practice and hand exercises help improve fine control.',
      'A tremor that is new, getting worse or gets in the way of daily life should be checked by a neurologist.',
    ],
  },
  uz: {
    info: {
      name: 'Spiral chizish',
      short: 'Spiral chizib, har bir qo‘l qanchalik aniq va titramasdan ishlashini tekshiring.',
      measures: 'Shifokorlar qo‘l titrashi va nozik harakatlarni tekshirish uchun spiral chizdirishadi. Ilova chizig‘ingiz namunadan qanchalik chetga chiqishini o‘lchaydi va undagi mayda, bir maromli tebranishlarni — titrash belgisini — qidiradi.',
      steps: ['Markazdan boshlab, barmog‘ingizni ko‘tarmasdan kulrang spiral bo‘ylab tashqariga chizing.', 'Qulay, bir tekis tezlikda chizing, juda tez emas.', 'Avval asosiy qo‘lingiz bilan, keyin ikkinchisi bilan.'],
      tips: ['Stilus eng aniq natija beradi, lekin barmoq ham bo‘ladi.', 'Bilagingizni stolga qo‘ying, lekin kaftingizni ekranga tiramang.'],
    },
    instruction: 'Markazdagi nuqtadan boshlab spiral bo‘ylab tashqariga chizing',
    incomplete: 'Iltimos, butun spiralni markazdan oxirigacha bitta chiziq bilan chizing.',
    clear: 'Tozalash',
    done: 'Tayyor',
    precision: 'Chizish aniqligi',
    precisionShort: 'Aniqlik',
    deviation: 'Chiziqdan o‘rtacha chetga chiqish',
    ofSpacing: 'aylanalar orasidagi masofadan',
    tremor: 'Chiziqdagi titrash',
    tremorFreq: 'Titrash chastotasi',
    time: 'Chizish vaqti',
    none: 'topilmadi',
    hz: 'Gs',
    meaning: {
      great: 'Ikkala qo‘l bilan ham juda aniq va silliq chizdingiz.',
      normal: 'Chizish aniqligingiz me’yorida.',
      borderline: 'Chiziq sezilarli chetga chiqadi yoki unda yengil bir maromli tebranish (titrash) bor.',
      attention: 'Chizma noaniq yoki unda aniq titrash bor.',
    } as Record<string, string>,
    tremorNote: (f: string) => `Chizig‘ingizda taxminan ${f} Gs li bir maromli tebranish bor. 4–6 Gs titrash tinch holatdagi titrashga xos; 6–12 Gs esa qo‘lni ushlab turgandagi titrashga ko‘proq xos, uni kofe, hayajon va charchoq ham keltirib chiqarishi mumkin.`,
    rec: [
      'Testni kunning o‘sha vaqtida takrorlang. Kofe, stress va charchoq titrashni kuchaytiradi.',
      'Chizish mashqi va qo‘l mashqlari nozik harakatlarni yaxshilashga yordam beradi.',
      'Yangi paydo bo‘lgan, kuchayib borayotgan yoki kundalik ishlarga xalaqit berayotgan titrashni nevrolog ko‘rishi kerak.',
    ],
  },
  ru: {
    info: {
      name: 'Рисование спирали',
      short: 'Обведите спираль, чтобы проверить точность и дрожание каждой руки.',
      measures: 'Врачи просят нарисовать спираль, чтобы проверить дрожание рук и точность движений. Приложение измеряет, насколько линия отклоняется от образца, и ищет в ней мелкие ритмичные колебания — признак тремора.',
      steps: ['Начните в центре и ведите по серой спирали наружу, не отрывая палец.', 'Рисуйте в удобном ровном темпе, не слишком быстро.', 'Сначала ведущей рукой, затем другой.'],
      tips: ['Самый точный результат даёт стилус, но можно и пальцем.', 'Положите предплечье на стол, но не опирайтесь запястьем на экран.'],
    },
    instruction: 'Начните с точки в центре и ведите по спирали наружу',
    incomplete: 'Пожалуйста, обведите всю спираль от центра до конца одной линией.',
    clear: 'Стереть',
    done: 'Готово',
    precision: 'Точность рисования',
    precisionShort: 'Точность',
    deviation: 'Среднее отклонение от линии',
    ofSpacing: 'от расстояния между витками',
    tremor: 'Дрожание линии',
    tremorFreq: 'Частота дрожания',
    time: 'Время рисования',
    none: 'не найдено',
    hz: 'Гц',
    meaning: {
      great: 'Очень точное и плавное рисование обеими руками.',
      normal: 'Точность рисования в норме.',
      borderline: 'Линия заметно отклоняется или слегка ритмично дрожит (тремор).',
      attention: 'Рисунок неточный или есть явное дрожание.',
    } as Record<string, string>,
    tremorNote: (f: string) => `В линии есть ритмичное дрожание около ${f} Гц. Дрожание 4–6 Гц типично для тремора покоя; 6–12 Гц — скорее для тремора при удержании позы, который могут вызывать и кофе, волнение, усталость.`,
    rec: [
      'Повторяйте тест в одно и то же время дня. Кофе, стресс и усталость усиливают дрожание.',
      'Упражнение «Обводка» и упражнения для рук помогают улучшить точность движений.',
      'Дрожание, которое появилось недавно, усиливается или мешает в жизни, нужно показать неврологу.',
    ],
  },
})

function spiralPath(g: SpiralGeom, scale = 1) {
  const pts: string[] = []
  const N = 600
  for (let i = 0; i <= N; i++) {
    const p = spiralPoint(g, (i / N) * g.turns * 2 * Math.PI)
    pts.push(`${i ? 'L' : 'M'}${(p.x * scale).toFixed(1)},${(p.y * scale).toFixed(1)}`)
  }
  return pts.join(' ')
}

function DrawPad({ onComplete, hand }: { onComplete: (r: SpiralResult, trace: [number, number][]) => void; hand: Side }) {
  const s = useStrings(S)
  const [ref, { width }] = useElementSize<HTMLDivElement>()
  const size = Math.min(width, 440, typeof window !== 'undefined' ? window.innerHeight - 260 : 440)
  const g = useMemo(() => geomFor(size), [size])
  const canvas = useRef<HTMLCanvasElement>(null)
  const pts = useRef<TracePoint[]>([])
  const drawing = useRef(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [hasInk, setHasInk] = useState(false)

  const redraw = useCallback(() => {
    const c = canvas.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    const ctx = c.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size, size)
    const css = getComputedStyle(c)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = css.getPropertyValue('--surface-3').trim() || '#e5e7eb'
    ctx.lineWidth = Math.max(8, spiralSpacing(g) * 0.42)
    ctx.stroke(new Path2D(spiralPath(g)))
    ctx.strokeStyle = css.getPropertyValue('--border-strong').trim() || '#cbd5e1'
    ctx.lineWidth = 1.5
    ctx.stroke(new Path2D(spiralPath(g)))
    ctx.fillStyle = css.getPropertyValue('--accent').trim() || '#059669'
    ctx.beginPath()
    ctx.arc(g.cx + g.a, g.cy, 6, 0, Math.PI * 2)
    ctx.fill()
    if (pts.current.length > 1) {
      ctx.strokeStyle = css.getPropertyValue('--accent').trim() || '#059669'
      ctx.lineWidth = 3
      ctx.beginPath()
      pts.current.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
      ctx.stroke()
    }
  }, [size, g])

  useEffect(() => {
    const c = canvas.current
    if (!c || size <= 0) return
    const dpr = window.devicePixelRatio || 1
    c.width = size * dpr
    c.height = size * dpr
    redraw()
  }, [size, redraw])

  const pos = (e: PointerEvent | RPointerEvent) => {
    const r = canvas.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top, t: e.timeStamp || performance.now() }
  }

  const clear = () => {
    pts.current = []
    setHasInk(false)
    setMsg(null)
    redraw()
  }

  const finish = () => {
    const r = analyzeSpiral(g, pts.current)
    if (r.coverage < 0.85 || r.n < 30) {
      setMsg(s.incomplete)
      fx('bad')
      return
    }
    // normalised, down-sampled trace for storage
    const step = Math.max(1, Math.floor(pts.current.length / 350))
    const trace: [number, number][] = pts.current.filter((_, i) => i % step === 0).map((p) => [Math.round((p.x / size) * 1000) / 1000, Math.round((p.y / size) * 1000) / 1000])
    onComplete(r, trace)
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-4">
      <p className="text-center font-semibold text-ink">{s.instruction}</p>
      <div ref={ref} className="flex w-full justify-center">
        {size > 0 && (
          <canvas
            ref={canvas}
            style={{ width: size, height: size }}
            className="no-touch-scroll rounded-3xl bg-surface shadow-card"
            onPointerDown={(e) => {
              e.preventDefault()
              ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
              pts.current = [pos(e)]
              drawing.current = true
              setMsg(null)
              setHasInk(true)
            }}
            onPointerMove={(e) => {
              if (!drawing.current) return
              const evs = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? [e.nativeEvent]
              for (const ev of evs) pts.current.push(pos(ev))
              redraw()
            }}
            onPointerUp={() => {
              drawing.current = false
              redraw()
            }}
            onPointerCancel={() => (drawing.current = false)}
          />
        )}
      </div>
      {msg && <Callout tone="warn">{msg}</Callout>}
      <div className="pb-safe mt-auto grid w-full max-w-md grid-cols-2 gap-3">
        <Button variant="secondary" size="lg" onClick={clear} icon={<Eraser className="h-5 w-5" />}>
          {s.clear}
        </Button>
        <Button variant="accent" size="lg" onClick={finish} disabled={!hasInk} icon={<Hand className={cx('h-5 w-5', hand === 'left' && '-scale-x-100')} />}>
          {s.done}
        </Button>
      </div>
    </div>
  )
}

export function spiralSummary(d: SpiralData) {
  const precision = mean(d.hands.map((h) => h.result.precision))
  const tremor = Math.max(...d.hands.map((h) => (Number.isFinite(h.result.tremorRmsPct) ? h.result.tremorRmsPct : 0)))
  const levels = d.hands.map((h) => spiralLevel(h.result.precision, h.result.tremorRmsPct))
  const order: Level[] = ['great', 'normal', 'borderline', 'attention']
  const worst = levels.reduce((a, b) => (order.indexOf(b) > order.indexOf(a) ? b : a), 'great' as Level)
  return { precision, tremor, level: worst }
}

function Runner({ onDone, onExit }: { onDone: (s: { value: number | null; level: Level }, d: SpiralData) => void; onExit: () => void }) {
  const s = useStrings(S)
  const lang = useLang()
  const person = usePerson()
  const [dominant, setDominant] = useState<Side | null>(person.hand)
  const [idx, setIdx] = useState(0)
  const [stage, setStage] = useState<'ready' | 'draw'>('ready')
  const hands = useRef<SpiralData['hands']>([])
  if (!dominant)
    return (
      <FocusShell title={s.info.name} onExit={onExit}>
        <HandPicker onPick={setDominant} />
      </FocusShell>
    )
  const order: Side[] = [dominant, dominant === 'right' ? 'left' : 'right']
  const hand = order[idx]
  return (
    <FocusShell title={s.info.name} subtitle={handName(lang, hand)} progress={idx / 2} onExit={onExit}>
      {stage === 'ready' ? (
        <UseHand side={hand} dominant={hand === dominant} extra={s.info.steps[0]} onGo={() => setStage('draw')} />
      ) : (
        <DrawPad
          key={hand}
          hand={hand}
          onComplete={(result, trace) => {
            fx('done')
            hands.current.push({ hand, result, trace })
            if (idx + 1 < order.length) {
              setIdx(idx + 1)
              setStage('ready')
              return
            }
            const data: SpiralData = { dominant, hands: hands.current }
            const sm = spiralSummary(data)
            onDone({ value: Math.round(sm.precision), level: sm.level }, data)
          }}
        />
      )}
    </FocusShell>
  )
}

function TraceView({ trace }: { trace: [number, number][] }) {
  const V = 300
  const g = geomFor(V)
  return (
    <svg viewBox={`0 0 ${V} ${V}`} className="w-full rounded-2xl bg-surface-2">
      <path d={spiralPath(g)} fill="none" stroke="var(--surface-3)" strokeWidth={spiralSpacing(g) * 0.42} strokeLinecap="round" />
      <path d={spiralPath(g)} fill="none" stroke="var(--border-strong)" strokeWidth={1} />
      {trace.slice(1).map((p, i) => {
        const a = trace[i]
        const x = p[0] * V
        const y = p[1] * V
        const e = Math.abs(spiralError(g, { x, y })) / spiralSpacing(g)
        const color = e < 0.12 ? 'var(--great)' : e < 0.25 ? 'var(--borderline)' : 'var(--urgent)'
        return <line key={i} x1={a[0] * V} y1={a[1] * V} x2={x} y2={y} stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      })}
    </svg>
  )
}

function Details({ result }: { result: { data: SpiralData; summary: { level: Level } } }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const lang = useLang()
  const d = result.data
  const sm = spiralSummary(d)
  const tremorHands = d.hands.filter((h) => Number.isFinite(h.result.tremorRmsPct) && h.result.tremorRmsPct > 4)
  return (
    <>
      <Card className="p-5">
        <SectionTitle>{s.precision}</SectionTitle>
        <ScaleBar
          min={0}
          max={100}
          value={sm.precision}
          valueLabel={`${Math.round(sm.precision)}`}
          segments={[
            { to: 55, level: 'attention' },
            { to: 70, level: 'borderline' },
            { to: 85, level: 'normal' },
            { to: 100, level: 'great' },
          ]}
        />
        <p className="mt-4 leading-relaxed text-ink-2">{s.meaning[result.summary.level]}</p>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {d.hands.map((h) => (
          <Card key={h.hand} className="p-4">
            <div className="mb-2 text-sm font-bold text-ink">
              {handName(lang, h.hand)}
              {h.hand === d.dominant && <span className="font-medium text-muted"> ({t.dominant})</span>}
            </div>
            <TraceView trace={h.trace} />
            <div className="mt-3">
              <MetricGrid>
                <Metric label={s.precisionShort} value={Math.round(h.result.precision)} unit="/100" emphasis />
                <Metric label={s.deviation} value={fmtNum(lang, h.result.maePct, 0)} unit="%" hint={s.ofSpacing} />
                <Metric
                  label={s.tremor}
                  value={Number.isFinite(h.result.tremorRmsPct) ? fmtNum(lang, h.result.tremorRmsPct, 1) : '—'}
                  unit="%"
                  hint={Number.isFinite(h.result.tremorFreq) && h.result.tremorRmsPct > 2 ? `${fmtNum(lang, h.result.tremorFreq, 1)} ${s.hz}` : s.none}
                />
                <Metric label={s.time} value={fmtNum(lang, h.result.duration, 1)} unit={t.seconds} />
              </MetricGrid>
            </div>
          </Card>
        ))}
      </div>
      {tremorHands.map((h) => (
        <Callout key={h.hand} tone="warn" title={handName(lang, h.hand)}>
          {s.tremorNote(fmtNum(lang, h.result.tremorFreq, 1))}
        </Callout>
      ))}
      <Card className="p-5">
        <SectionTitle>{t.recommendations}</SectionTitle>
        <Bullets items={s.rec} />
      </Card>
    </>
  )
}

const spiral: TestModule<SpiralData> = {
  kind: 'test',
  id: 'spiral-drawing',
  field: 'hands',
  icon: Waypoints,
  minutes: 2,
  requirements: ['touch'],
  version: 1,
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  Details,
  headline: (r, lang) => ({ value: String(Math.round(spiralSummary(r.data).precision)), unit: '/100', label: common[lang].level[r.summary.level] }),
  trend: { higherIsBetter: true, unit: () => '/100', digits: 0 },
}

export default spiral
