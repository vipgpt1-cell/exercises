import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Eraser, PenLine, Star } from 'lucide-react'
import type { ExerciseModule } from '../../catalog/types'
import { FocusShell } from '../../components/shell'
import { Button, cx } from '../../components/ui'
import { defineStrings, useStrings, type Lang } from '../../lib/i18n'
import { fx } from '../../lib/audio'
import { useElementSize } from '../../lib/hooks'
import { common } from '../../i18n/common'

type P = [number, number]

function sample(fn: (t: number) => P, n = 160): P[] {
  return Array.from({ length: n + 1 }, (_, i) => fn(i / n))
}
const SHAPES: { id: string; pts: P[] }[] = [
  { id: 'line', pts: sample((t) => [0.1 + 0.8 * t, 0.5]) },
  { id: 'zigzag', pts: sample((t) => [0.1 + 0.8 * t, 0.5 + 0.28 * (Math.abs(((t * 4) % 2) - 1) * 2 - 1)]) },
  { id: 'wave', pts: sample((t) => [0.1 + 0.8 * t, 0.5 + 0.25 * Math.sin(t * Math.PI * 4)]) },
  { id: 'circle', pts: sample((t) => [0.5 + 0.36 * Math.cos(-Math.PI / 2 + t * 2 * Math.PI), 0.5 + 0.36 * Math.sin(-Math.PI / 2 + t * 2 * Math.PI)]) },
  { id: 'loops', pts: sample((t) => [0.12 + 0.76 * t + 0.07 * Math.cos(t * Math.PI * 8 + Math.PI), 0.5 + 0.16 * Math.sin(t * Math.PI * 8)], 240) },
  {
    id: 'star',
    pts: (() => {
      const v: P[] = []
      for (let i = 0; i <= 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        const r = i % 2 ? 0.17 : 0.4
        v.push([0.5 + r * Math.cos(a), 0.52 + r * Math.sin(a)])
      }
      const out: P[] = []
      for (let i = 0; i < 10; i++) for (let k = 0; k < 16; k++) out.push([v[i][0] + ((v[i + 1][0] - v[i][0]) * k) / 16, v[i][1] + ((v[i + 1][1] - v[i][1]) * k) / 16])
      out.push(v[10])
      return out
    })(),
  },
]
const TOL = 0.045

/** Score = share of the drawing inside the band × share of the shape covered. */
export function traceScore(shape: P[], user: P[]) {
  if (user.length < 5) return { score: 0, inside: 0, coverage: 0 }
  const dist = (p: P, q: P) => Math.hypot(p[0] - q[0], p[1] - q[1])
  const near = (p: P) => Math.min(...shape.map((q) => dist(p, q)))
  const inside = user.filter((p) => near(p) <= TOL).length / user.length
  const covered = shape.filter((q) => user.some((p) => dist(p, q) <= TOL * 1.2)).length / shape.length
  return { score: Math.round(100 * inside * covered), inside, coverage: covered }
}

const S = defineStrings({
  en: {
    info: {
      name: 'Tracing practice',
      short: 'Trace lines and shapes to train fine hand control.',
      measures: 'Trace six shapes inside the guide band. Each one gets a score for precision and for how much of it you traced. It trains finger and hand control, which helps with handwriting and after hand injuries or a stroke.',
      steps: ['Trace the grey shape from the green dot, without lifting your finger.', 'Stay inside the band. Precision matters more than speed.', 'Six shapes, about 3 minutes.'],
      tips: ['Use the hand you want to train.', 'A stylus makes it harder, and more precise.'],
    },
    trace: 'Trace the shape from the green dot',
    clear: 'Clear',
    check: 'Check',
    next: 'Next shape',
    score: 'Score',
    avg: 'Average score',
    tryAgain: 'Try again',
  },
  uz: {
    info: {
      name: 'Chizish mashqi',
      short: 'Qo‘l harakatini aniq boshqarishni mashq qilish uchun chiziq va shakllarni chizing.',
      measures: 'Oltita shaklni yo‘lak ichida qolib chizing. Har biriga aniqlik va qanchasini chizganingiz bo‘yicha ball qo‘yiladi. Bu barmoq va qo‘l harakatini boshqarishni mashq qildiradi: yozuvga, qo‘l jarohatidan yoki insultdan keyin tiklanishga yordam beradi.',
      steps: ['Kulrang shaklni yashil nuqtadan boshlab, barmog‘ingizni ko‘tarmasdan chizing.', 'Yo‘lakdan chiqmang. Aniqlik tezlikdan muhimroq.', 'Oltita shakl, taxminan 3 daqiqa.'],
      tips: ['Mashq qildirmoqchi bo‘lgan qo‘lingiz bilan bajaring.', 'Stilus bilan qiyinroq, lekin aniqroq bo‘ladi.'],
    },
    trace: 'Shaklni yashil nuqtadan boshlab chizing',
    clear: 'Tozalash',
    check: 'Tekshirish',
    next: 'Keyingi shakl',
    score: 'Ball',
    avg: 'O‘rtacha ball',
    tryAgain: 'Qayta urinish',
  },
  ru: {
    info: {
      name: 'Обводка',
      short: 'Обводите линии и фигуры, чтобы тренировать точность движений руки.',
      measures: 'Обведите шесть фигур, не выходя за полосу. За каждую ставится балл за точность и за то, какую часть вы обвели. Это тренирует точность движений пальцев и кисти — помогает с почерком и при восстановлении после травмы руки или инсульта.',
      steps: ['Обведите серую фигуру от зелёной точки, не отрывая палец.', 'Не выходите за полосу. Точность важнее скорости.', 'Шесть фигур, около 3 минут.'],
      tips: ['Работайте той рукой, которую хотите тренировать.', 'Со стилусом сложнее, но точнее.'],
    },
    trace: 'Обведите фигуру от зелёной точки',
    clear: 'Стереть',
    check: 'Проверить',
    next: 'Следующая фигура',
    score: 'Балл',
    avg: 'Средний балл',
    tryAgain: 'Ещё раз',
  },
})

function Runner({ onDone, onExit }: { onDone: (l: { seconds: number; score?: number; detail?: Record<string, number | string> }) => void; onExit: () => void }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const [ref, { width }] = useElementSize<HTMLDivElement>()
  const size = Math.min(width, 440)
  const [i, setI] = useState(0)
  const [result, setResult] = useState<number | null>(null)
  const [hasInk, setHasInk] = useState(false)
  const canvas = useRef<HTMLCanvasElement>(null)
  const pts = useRef<P[]>([])
  const drawing = useRef(false)
  const scores = useRef<number[]>([])
  const t0 = useRef(performance.now())
  const shape = SHAPES[i]
  const path = useMemo(() => shape.pts, [shape])

  const redraw = useCallback(() => {
    const c = canvas.current
    if (!c || size <= 0) return
    const dpr = window.devicePixelRatio || 1
    const ctx = c.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size, size)
    const css = getComputedStyle(c)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = css.getPropertyValue('--surface-3').trim()
    ctx.lineWidth = TOL * 2 * size
    ctx.beginPath()
    path.forEach((p, k) => (k ? ctx.lineTo(p[0] * size, p[1] * size) : ctx.moveTo(p[0] * size, p[1] * size)))
    ctx.stroke()
    ctx.fillStyle = css.getPropertyValue('--great').trim()
    ctx.beginPath()
    ctx.arc(path[0][0] * size, path[0][1] * size, 8, 0, Math.PI * 2)
    ctx.fill()
    if (pts.current.length > 1) {
      ctx.strokeStyle = css.getPropertyValue('--accent').trim()
      ctx.lineWidth = 3.5
      ctx.beginPath()
      pts.current.forEach((p, k) => (k ? ctx.lineTo(p[0] * size, p[1] * size) : ctx.moveTo(p[0] * size, p[1] * size)))
      ctx.stroke()
    }
  }, [size, path])

  useEffect(() => {
    const c = canvas.current
    if (!c || size <= 0) return
    const dpr = window.devicePixelRatio || 1
    c.width = size * dpr
    c.height = size * dpr
    redraw()
  }, [size, redraw])

  const pos = (e: { clientX: number; clientY: number }): P => {
    const r = canvas.current!.getBoundingClientRect()
    return [(e.clientX - r.left) / size, (e.clientY - r.top) / size]
  }
  const clear = () => {
    pts.current = []
    setHasInk(false)
    setResult(null)
    redraw()
  }
  const check = () => {
    const r = traceScore(path, pts.current)
    setResult(r.score)
    fx(r.score >= 75 ? 'good' : 'soft')
  }
  const next = () => {
    scores.current.push(result ?? 0)
    if (i + 1 >= SHAPES.length) {
      const avg = Math.round(scores.current.reduce((a, b) => a + b, 0) / scores.current.length)
      onDone({ seconds: Math.round((performance.now() - t0.current) / 1000), score: avg, detail: { avg, best: Math.max(...scores.current) } })
      return
    }
    pts.current = []
    setHasInk(false)
    setResult(null)
    setI(i + 1)
  }
  const stars = result === null ? 0 : result >= 90 ? 3 : result >= 75 ? 2 : result >= 50 ? 1 : 0

  return (
    <FocusShell title={s.info.name} subtitle={`${i + 1} / ${SHAPES.length}`} progress={i / SHAPES.length} onExit={onExit}>
      <div className="flex flex-1 flex-col items-center gap-4">
        <p className="text-center font-semibold text-ink">{s.trace}</p>
        <div ref={ref} className="flex w-full justify-center">
          {size > 0 && (
            <canvas
              ref={canvas}
              style={{ width: size, height: size }}
              className="no-touch-scroll rounded-3xl bg-surface shadow-card"
              onPointerDown={(e) => {
                if (result !== null) return
                e.preventDefault()
                ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
                pts.current = [pos(e)]
                drawing.current = true
                setHasInk(true)
              }}
              onPointerMove={(e) => {
                if (!drawing.current) return
                const evs = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? [e.nativeEvent]
                for (const ev of evs) pts.current.push(pos(ev))
                redraw()
              }}
              onPointerUp={() => (drawing.current = false)}
              onPointerCancel={() => (drawing.current = false)}
            />
          )}
        </div>
        {result !== null && (
          <div className="animate-pop flex items-center gap-3">
            <div className="flex">
              {[0, 1, 2].map((k) => (
                <Star key={k} className={cx('h-8 w-8', k < stars ? 'fill-[#facc15] text-[#eab308]' : 'text-line-strong')} />
              ))}
            </div>
            <div className="text-2xl font-black tabular text-ink">
              {result} <span className="text-sm font-semibold text-muted">/ 100</span>
            </div>
          </div>
        )}
        <div className="pb-safe mt-auto grid w-full max-w-md grid-cols-2 gap-3">
          <Button variant="secondary" size="lg" onClick={clear} icon={<Eraser className="h-5 w-5" />}>
            {result !== null ? s.tryAgain : s.clear}
          </Button>
          {result === null ? (
            <Button variant="accent" size="lg" onClick={check} disabled={!hasInk}>
              {s.check}
            </Button>
          ) : (
            <Button variant="accent" size="lg" onClick={next}>
              {i + 1 >= SHAPES.length ? t.btn.finish : s.next}
            </Button>
          )}
        </div>
      </div>
    </FocusShell>
  )
}

const tracing: ExerciseModule = {
  kind: 'exercise',
  id: 'tracing-practice',
  field: 'hands',
  icon: PenLine,
  minutes: 3,
  requirements: ['touch'],
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  describe: (log, lang: Lang) => [
    { label: S[lang].avg, value: `${log.detail?.avg ?? log.score ?? 0} / 100` },
    { label: common[lang].best, value: `${log.detail?.best ?? '—'} / 100` },
  ],
}

export default tracing
