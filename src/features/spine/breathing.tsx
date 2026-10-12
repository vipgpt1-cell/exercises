import { useEffect, useRef, useState } from 'react'
import { Wind } from 'lucide-react'
import type { ExerciseModule } from '../../catalog/types'
import { FocusShell, Stage } from '../../components/shell'
import { Button, Segmented, cx } from '../../components/ui'
import { defineStrings, fmtDuration, useLang, useStrings, type Lang } from '../../lib/i18n'
import { playTone, getCtx, unlockAudio, vibrate } from '../../lib/audio'
import { speak, stopSpeaking } from '../../lib/speech'
import { useReducedMotion } from '../../lib/hooks'
import { settingsStore } from '../../lib/store'
import { common } from '../../i18n/common'

type PhaseKind = 'in' | 'hold' | 'out' | 'holdOut'
interface Pattern {
  id: string
  phases: { kind: PhaseKind; sec: number }[]
}

export const PATTERNS: Pattern[] = [
  { id: 'coherent', phases: [{ kind: 'in', sec: 5.5 }, { kind: 'out', sec: 5.5 }] },
  { id: 'calm', phases: [{ kind: 'in', sec: 4 }, { kind: 'out', sec: 6 }] },
  { id: 'box', phases: [{ kind: 'in', sec: 4 }, { kind: 'hold', sec: 4 }, { kind: 'out', sec: 4 }, { kind: 'holdOut', sec: 4 }] },
  { id: 'relax478', phases: [{ kind: 'in', sec: 4 }, { kind: 'hold', sec: 7 }, { kind: 'out', sec: 8 }] },
  { id: 'pursed', phases: [{ kind: 'in', sec: 2 }, { kind: 'out', sec: 4 }] },
]

const S = defineStrings({
  en: {
    info: {
      name: 'Guided breathing',
      short: 'Calm, slow breathing with a moving guide.',
      measures: 'Slow breathing exercises: even breathing at about 5–6 breaths a minute, breathing with a longer breath out, box breathing, 4-7-8 breathing for relaxation, and pursed-lip breathing for when you’re out of breath. Slow breathing calms the nervous system and can lower stress, heart rate and blood pressure.',
      steps: ['Choose a breathing pattern and how long.', 'Follow the circle: breathe in as it grows, out as it shrinks.', 'Breathe gently through your nose. For pursed-lip breathing, breathe out through your mouth.'],
      tips: ['Sit up straight with relaxed shoulders, or lie down.', 'Breathe low into your belly, not into your chest.', 'If you feel dizzy, stop and breathe normally.'],
    },
    pattern: 'Breathing pattern',
    duration: 'How long',
    names: { coherent: 'Even 5.5–5.5', calm: 'Calm 4–6', box: 'Box 4–4–4–4', relax478: 'Relax 4–7–8', pursed: 'Pursed lips 2–4' } as Record<string, string>,
    about: {
      coherent: 'Balances the heart rhythm. Great for everyday practice (5–10 min).',
      calm: 'A longer breath out calms you down. Good before sleep or when stressed.',
      box: 'Helps you stay calm and focused under pressure.',
      relax478: 'Deep relaxation, for example to fall asleep. Start with 4 rounds.',
      pursed: 'Eases shortness of breath (for example with COPD or after effort). Breathe out slowly through pursed lips.',
    } as Record<string, string>,
    begin: 'Begin',
    phase: { in: 'Breathe in', hold: 'Hold', out: 'Breathe out', holdOut: 'Hold' } as Record<PhaseKind, string>,
    cycles: 'Breaths',
    patternLabel: 'Pattern',
  },
  uz: {
    info: {
      name: 'Nafas mashqi',
      short: 'Harakatlanuvchi ko‘rsatkich bilan xotirjam, sekin nafas.',
      measures: 'Sekin nafas mashqlari: daqiqasiga 5–6 martalik bir tekis nafas, nafas chiqarish uzunroq bo‘lgan nafas, “kvadrat” nafas, bo‘shashish uchun 4-7-8 nafas va hansiraganda lablarni qisib nafas chiqarish. Sekin nafas asab tizimini tinchlantiradi, stress, yurak urishi va qon bosimini pasaytirishi mumkin.',
      steps: ['Nafas turini va davomiyligini tanlang.', 'Doiraga qarang: kattalashganda nafas oling, kichrayganda nafas chiqaring.', 'Burun orqali yengil nafas oling. Lablarni qisib nafas olishda og‘iz orqali chiqaring.'],
      tips: ['Yelkalaringizni bo‘shashtirib tik o‘tiring yoki yoting.', 'Ko‘krak bilan emas, qorin bilan chuqur nafas oling.', 'Boshingiz aylansa, to‘xtang va odatdagidek nafas oling.'],
    },
    pattern: 'Nafas turi',
    duration: 'Davomiyligi',
    names: { coherent: 'Bir tekis 5,5–5,5', calm: 'Xotirjam 4–6', box: 'Kvadrat 4–4–4–4', relax478: 'Bo‘shashish 4–7–8', pursed: 'Qisilgan lablar 2–4' } as Record<string, string>,
    about: {
      coherent: 'Yurak ritmini muvozanatlaydi. Har kungi mashq uchun juda yaxshi (5–10 daqiqa).',
      calm: 'Uzunroq nafas chiqarish tinchlantiradi. Uyqudan oldin yoki asabiylashganda foydali.',
      box: 'Qiyin vaziyatda xotirjam va diqqatli bo‘lishga yordam beradi.',
      relax478: 'Chuqur bo‘shashish, masalan, uxlab qolish uchun. 4 aylanishdan boshlang.',
      pursed: 'Hansirashni yengillashtiradi (masalan, surunkali o‘pka kasalligida yoki zo‘riqishdan keyin). Qisilgan lablar orqali sekin nafas chiqaring.',
    } as Record<string, string>,
    begin: 'Boshlash',
    phase: { in: 'Nafas oling', hold: 'Ushlab turing', out: 'Nafas chiqaring', holdOut: 'Ushlab turing' } as Record<PhaseKind, string>,
    cycles: 'Nafaslar',
    patternLabel: 'Nafas turi',
  },
  ru: {
    info: {
      name: 'Дыхание с подсказками',
      short: 'Спокойное медленное дыхание с подвижной подсказкой.',
      measures: 'Упражнения на медленное дыхание: ровное дыхание примерно 5–6 раз в минуту, дыхание с удлинённым выдохом, «квадратное» дыхание, дыхание 4-7-8 для расслабления и выдох через сомкнутые губы при одышке. Медленное дыхание успокаивает нервную систему и может снижать стресс, пульс и давление.',
      steps: ['Выберите вид дыхания и длительность.', 'Следите за кругом: вдох, когда он растёт, выдох, когда уменьшается.', 'Дышите мягко через нос. При дыхании через сомкнутые губы выдыхайте ртом.'],
      tips: ['Сядьте прямо, расслабив плечи, или лягте.', 'Дышите низко, животом, а не грудью.', 'Если закружится голова, остановитесь и дышите как обычно.'],
    },
    pattern: 'Вид дыхания',
    duration: 'Длительность',
    names: { coherent: 'Ровное 5,5–5,5', calm: 'Спокойное 4–6', box: 'Квадрат 4–4–4–4', relax478: 'Расслабление 4–7–8', pursed: 'Сомкнутые губы 2–4' } as Record<string, string>,
    about: {
      coherent: 'Уравновешивает сердечный ритм. Отлично подходит для ежедневной практики (5–10 мин).',
      calm: 'Удлинённый выдох успокаивает. Хорошо перед сном или при стрессе.',
      box: 'Помогает сохранять спокойствие и собранность в напряжённой ситуации.',
      relax478: 'Глубокое расслабление, например чтобы уснуть. Начните с 4 циклов.',
      pursed: 'Облегчает одышку (например, при ХОБЛ или после нагрузки). Медленно выдыхайте через сомкнутые губы.',
    } as Record<string, string>,
    begin: 'Начать',
    phase: { in: 'Вдох', hold: 'Задержка', out: 'Выдох', holdOut: 'Задержка' } as Record<PhaseKind, string>,
    cycles: 'Вдохов',
    patternLabel: 'Вид дыхания',
  },
})

function Runner({ onDone, onExit }: { onDone: (l: { seconds: number; score?: number; detail?: Record<string, number | string> }) => void; onExit: () => void }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const lang = useLang()
  const reduced = useReducedMotion()
  const [pid, setPid] = useState('coherent')
  const [minutes, setMinutes] = useState(3)
  const [running, setRunning] = useState(false)
  const [state, setState] = useState({ phase: 0, phaseLeft: 0, scale: 0.55, elapsed: 0 })
  const cycles = useRef(0)
  const raf = useRef(0)
  const pattern = PATTERNS.find((p) => p.id === pid)!
  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current)
      stopSpeaking()
    },
    [],
  )

  const cue = (k: PhaseKind) => {
    vibrate(k === 'in' ? 40 : k === 'out' ? [20, 40, 20] : 15)
    if (settingsStore.get().sounds) {
      const c = getCtx()
      if (k === 'in') playTone({ freq: 392, dbfs: -30, duration: 0.5, ramp: 0.15, when: c.currentTime + 0.02 })
      else if (k === 'out') playTone({ freq: 294, dbfs: -30, duration: 0.5, ramp: 0.15, when: c.currentTime + 0.02 })
    }
    speak(s.phase[k], lang)
  }

  const begin = async () => {
    await unlockAudio()
    setRunning(true)
    cycles.current = 0
    const total = minutes * 60
    const cycleLen = pattern.phases.reduce((a, p) => a + p.sec, 0)
    const t0 = performance.now()
    let lastPhase = -1
    const loop = () => {
      const el = (performance.now() - t0) / 1000
      const inCycle = el % cycleLen
      let acc = 0
      let pi = 0
      for (; pi < pattern.phases.length; pi++) {
        if (inCycle < acc + pattern.phases[pi].sec) break
        acc += pattern.phases[pi].sec
      }
      pi = Math.min(pi, pattern.phases.length - 1)
      const ph = pattern.phases[pi]
      const local = (inCycle - acc) / ph.sec
      const eased = 0.5 - 0.5 * Math.cos(Math.PI * local)
      const scale = ph.kind === 'in' ? 0.55 + 0.45 * eased : ph.kind === 'out' ? 1 - 0.45 * eased : ph.kind === 'hold' ? 1 : 0.55
      if (pi !== lastPhase) {
        if (pi === 0 && lastPhase !== -1) cycles.current++
        lastPhase = pi
        cue(ph.kind)
      }
      setState({ phase: pi, phaseLeft: ph.sec * (1 - local), scale, elapsed: el })
      if (el >= total && pi === 0 && local < 0.1 && el > 5) {
        cancelAnimationFrame(raf.current)
        stopSpeaking()
        onDone({ seconds: Math.round(el), score: cycles.current, detail: { pattern: pid, cycles: cycles.current } })
        return
      }
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
  }

  const ph = pattern.phases[state.phase]
  return (
    <FocusShell
      title={s.info.name}
      subtitle={running ? s.names[pid] : undefined}
      progress={running ? Math.min(1, state.elapsed / (minutes * 60)) : null}
      right={running ? <span className="tabular rounded-lg bg-surface-2 px-2.5 py-1 text-sm font-bold text-ink">{fmtDuration(Math.max(0, minutes * 60 - state.elapsed))}</span> : undefined}
      onExit={onExit}
    >
      {!running ? (
        <Stage
          icon={<Wind className="h-8 w-8" />}
          title={s.info.name}
          footer={
            <Button variant="accent" size="lg" onClick={begin}>
              {s.begin}
            </Button>
          }
        >
          <div className="space-y-4 text-left">
            <div>
              <div className="mb-2 text-sm font-semibold text-muted">{s.pattern}</div>
              <div className="grid gap-2">
                {PATTERNS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPid(p.id)}
                    className={cx('rounded-2xl border-2 p-3 text-left transition', pid === p.id ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-line bg-surface')}
                  >
                    <div className="font-bold text-ink">{s.names[p.id]}</div>
                    <div className="text-sm text-muted">{s.about[p.id]}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold text-muted">{s.duration}</div>
              <Segmented value={minutes} onChange={setMinutes} options={[1, 3, 5, 10].map((m) => ({ value: m, label: t.minutes(m) }))} />
            </div>
          </div>
        </Stage>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-8">
          <div className="relative flex h-72 w-72 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-line-strong" />
            <div
              className="absolute rounded-full bg-[var(--accent)]"
              style={{ inset: 0, transform: `scale(${reduced ? 1 : state.scale})`, opacity: 0.18 + state.scale * 0.35, transition: 'none' }}
            />
            <div className="absolute rounded-full bg-[var(--accent-soft)]" style={{ inset: '22%', transform: `scale(${reduced ? 1 : 0.7 + state.scale * 0.3})` }} />
            <div className="relative text-center">
              <div className="text-2xl font-extrabold text-ink">{s.phase[ph.kind]}</div>
              <div className="text-4xl font-black tabular text-[var(--accent)]">{Math.ceil(state.phaseLeft)}</div>
            </div>
          </div>
          <div className="text-sm text-muted">
            {s.cycles}: {cycles.current}
          </div>
        </div>
      )}
    </FocusShell>
  )
}

const breathing: ExerciseModule = {
  kind: 'exercise',
  id: 'breathing',
  field: 'spine',
  icon: Wind,
  minutes: 3,
  requirements: ['seated'],
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  describe: (log, lang: Lang) => [
    { label: S[lang].patternLabel, value: S[lang].names[String(log.detail?.pattern ?? 'coherent')] ?? '' },
    { label: S[lang].cycles, value: String(log.detail?.cycles ?? log.score ?? 0) },
  ],
}

export default breathing
