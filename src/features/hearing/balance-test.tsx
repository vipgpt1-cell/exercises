import { useEffect, useRef, useState } from 'react'
import { Scale } from 'lucide-react'
import type { TestModule } from '../../catalog/types'
import { FocusShell, Stage } from '../../components/shell'
import { Bullets, Button, Callout, Card, SectionTitle, cx } from '../../components/ui'
import { CompareBars, ScaleBar } from '../../components/charts'
import { defineStrings, fmtNum, useLang, useStrings, type Lang } from '../../lib/i18n'
import { getCtx, playTone, unlockAudio } from '../../lib/audio'
import { randInt, shuffle } from '../../lib/rng'
import { round } from '../../lib/stats'
import type { Level } from '../../lib/store'
import { common } from '../../i18n/common'
import { HeadphoneCheck } from './setup'
import { BALANCE_FREQS, BALANCE_RANGE, balanceLevel, balanceLevels, summarizeBalance, weakerEar, type BalanceRun } from './balance'

export interface BalanceData {
  runs: BalanceRun[]
  perFreq: { freq: number; match: number; spread: number }[]
  overall: number
  inconsistent: boolean
}

const BASE_DBFS = -30

const S = defineStrings({
  en: {
    info: {
      name: 'Ear balance test',
      short: 'Do both ears hear equally loud?',
      measures: 'Compares how loud the same beep sounds in your left and right ear, at four pitches. A difference of more than a few decibels can mean one ear hears worse.',
      steps: [
        'Check that the headphones are on the right ears.',
        'A beep jumps between ears: left, right, left, right.',
        'Move the slider until the beeps sound equally loud in both ears, then tap “Sounds equal”.',
        '8 short rounds, about 3 minutes.',
      ],
      tips: ['Use headphones in a quiet room.', 'Listen to a few beeps before you tap. Take your time.', 'If the result surprises you, repeat the test with the headphones swapped: one side of the headphones may be weaker.'],
    },
    instruction: 'Move the slider until left and right sound equally loud.',
    leftLouder: 'Left louder',
    rightLouder: 'Right louder',
    equal: 'Sounds equal',
    round: (i: number, n: number) => `Round ${i} of ${n}`,
    pitch: (f: string) => `${f} Hz`,
    diff: 'Difference between the ears',
    perPitch: 'By pitch',
    balanced: 'Equal',
    weaker: (ear: string) => `${ear} weaker`,
    meaning: {
      none: 'Both ears hear loudness about the same.',
      ear: (ear: string, d: string) => `Your ${ear} needed about ${d} dB more sound to seem as loud as the other ear.`,
    },
    inconsistent: 'Your answers at the same pitch were quite different. Take the test again when you’re rested, in a quiet room.',
    rec: {
      ok: ['No real difference between the ears. Repeat the test if you feel one ear hears worse.'],
      mild: ['A small difference between the ears. Take the tone hearing test, and repeat this test with the headphones swapped to rule out a headphone problem.'],
      bad: [
        'A clear difference between the ears. Take the tone hearing test for more detail.',
        'A difference in hearing on one side without a clear reason should be checked by an ENT doctor or a hearing specialist.',
      ],
    },
  },
  uz: {
    info: {
      name: 'Quloqlar muvozanati',
      short: 'Ikkala quloq bir xil baland eshitadimi?',
      measures: 'Bir xil signal chap va o‘ng quloqda qanchalik baland eshitilishini to‘rt xil tovushda solishtiradi. Bir necha desibeldan ortiq farq bir quloq yomonroq eshitishini bildirishi mumkin.',
      steps: [
        'Quloqchin to‘g‘ri taqilganini tekshiring.',
        'Signal navbat bilan eshitiladi: chap, o‘ng, chap, o‘ng.',
        'Surgichni ikkala quloqda signal bir xil baland eshitiladigan joyga suring va “Bir xil” tugmasini bosing.',
        '8 ta qisqa raund, taxminan 3 daqiqa.',
      ],
      tips: ['Tinch xonada quloqchin bilan bajaring.', 'Bosishdan oldin bir nechta signalni tinglang, shoshilmang.', 'Natija kutilmagan bo‘lsa, quloqchinni almashtirib taqib, testni takrorlang: quloqchinning bir tomoni zaifroq bo‘lishi mumkin.'],
    },
    instruction: 'Surgichni chap va o‘ng bir xil baland eshitiladigan joyga suring.',
    leftLouder: 'Chap balandroq',
    rightLouder: 'O‘ng balandroq',
    equal: 'Bir xil',
    round: (i: number, n: number) => `${i}-raund, jami ${n}`,
    pitch: (f: string) => `${f} Gs`,
    diff: 'Quloqlar orasidagi farq',
    perPitch: 'Tovushlar bo‘yicha',
    balanced: 'Bir xil',
    weaker: (ear: string) => `${ear} zaifroq`,
    meaning: {
      none: 'Ikkala quloq tovushni deyarli bir xil baland eshitadi.',
      ear: (ear: string, d: string) => `${ear} ikkinchisidek baland eshitishi uchun taxminan ${d} dB ko‘proq tovush kerak bo‘ldi.`,
    },
    inconsistent: 'Bir xil tovushdagi javoblaringiz ancha farq qildi. Testni dam olgandan keyin, tinch xonada qayta topshiring.',
    rec: {
      ok: ['Quloqlar orasida sezilarli farq yo‘q. Bir qulog‘ingiz yomonroq eshitayotganini sezsangiz, testni takrorlang.'],
      mild: ['Quloqlar orasida kichik farq bor. Tovush eshitish testini topshiring va quloqchin sababchi emasligini bilish uchun bu testni quloqchinni almashtirib takrorlang.'],
      bad: [
        'Quloqlar orasida aniq farq bor. Batafsil bilish uchun tovush eshitish testini topshiring.',
        'Bir tomonda sababsiz eshitish pasayishini LOR shifokori yoki surdolog tekshirishi kerak.',
      ],
    },
  },
  ru: {
    info: {
      name: 'Баланс ушей',
      short: 'Одинаково ли громко слышат оба уха?',
      measures: 'Сравнивает, насколько громко звучит один и тот же сигнал в левом и правом ухе на четырёх частотах. Разница больше нескольких децибел может означать, что одно ухо слышит хуже.',
      steps: [
        'Проверьте, что наушники надеты правильно.',
        'Сигнал звучит по очереди: слева, справа, слева, справа.',
        'Двигайте ползунок, пока сигналы в обоих ушах не станут одинаково громкими, и нажмите «Одинаково».',
        '8 коротких раундов, около 3 минут.',
      ],
      tips: ['Проходите в наушниках в тихой комнате.', 'Прослушайте несколько сигналов, прежде чем нажать. Не спешите.', 'Если результат удивил, повторите тест, поменяв наушники местами: одна сторона наушников может быть слабее.'],
    },
    instruction: 'Двигайте ползунок, пока слева и справа не станет одинаково громко.',
    leftLouder: 'Левое громче',
    rightLouder: 'Правое громче',
    equal: 'Одинаково',
    round: (i: number, n: number) => `Раунд ${i} из ${n}`,
    pitch: (f: string) => `${f} Гц`,
    diff: 'Разница между ушами',
    perPitch: 'По частотам',
    balanced: 'Одинаково',
    weaker: (ear: string) => `${ear} слабее`,
    meaning: {
      none: 'Оба уха слышат громкость примерно одинаково.',
      ear: (ear: string, d: string) => `${ear} понадобилось примерно на ${d} дБ больше звука, чтобы звучать так же громко, как другое.`,
    },
    inconsistent: 'Ответы на одной и той же частоте сильно различались. Пройдите тест ещё раз, когда отдохнёте, в тихой комнате.',
    rec: {
      ok: ['Заметной разницы между ушами нет. Повторите тест, если почувствуете, что одно ухо слышит хуже.'],
      mild: ['Небольшая разница между ушами. Пройдите тональный тест слуха и повторите этот тест, поменяв наушники местами, чтобы исключить проблему с наушниками.'],
      bad: [
        'Явная разница между ушами. Пройдите тональный тест слуха, чтобы узнать подробнее.',
        'Снижение слуха с одной стороны без понятной причины нужно показать ЛОР-врачу или сурдологу.',
      ],
    },
  },
})

function earName(lang: Lang, ear: 'left' | 'right', cap = true) {
  const n = ear === 'left' ? common[lang].leftEar : common[lang].rightEar
  return cap ? n : n.toLowerCase()
}

function Runner({ onDone, onExit }: { onDone: (s: { value: number | null; level: Level }, d: BalanceData) => void; onExit: () => void }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const [stage, setStage] = useState<'lr' | 'run'>('lr')
  const [plan] = useState(() =>
    BALANCE_FREQS.flatMap((f) => {
      const sign = Math.random() < 0.5 ? 1 : -1
      return shuffle([sign, -sign]).map((sg) => ({ freq: f, start: sg * randInt(8, 14) }))
    }),
  )
  const [i, setI] = useState(0)
  const [d, setD] = useState(plan[0].start)
  const [active, setActive] = useState<'left' | 'right' | null>(null)
  const dRef = useRef(d)
  const runs = useRef<BalanceRun[]>([])
  const cur = plan[i]

  useEffect(() => {
    dRef.current = d
  }, [d])

  useEffect(() => {
    if (stage !== 'run') return
    let stop = false
    const timers: number[] = []
    const ctx = getCtx()
    const cycle = () => {
      if (stop) return
      const lv = balanceLevels(BASE_DBFS, dRef.current)
      const t0 = ctx.currentTime + 0.05
      playTone({ freq: cur.freq, dbfs: lv.left, ear: 'left', duration: 0.35, when: t0, ramp: 0.03 })
      playTone({ freq: cur.freq, dbfs: lv.right, ear: 'right', duration: 0.35, when: t0 + 0.5, ramp: 0.03 })
      timers.push(window.setTimeout(() => !stop && setActive('left'), 50))
      timers.push(window.setTimeout(() => !stop && setActive(null), 400))
      timers.push(window.setTimeout(() => !stop && setActive('right'), 550))
      timers.push(window.setTimeout(() => !stop && setActive(null), 900))
      timers.push(window.setTimeout(cycle, 1150))
    }
    cycle()
    return () => {
      stop = true
      timers.forEach((x) => clearTimeout(x))
      setActive(null)
    }
  }, [stage, i, cur.freq])

  const commit = () => {
    runs.current.push({ freq: cur.freq, start: cur.start, match: dRef.current })
    if (i + 1 < plan.length) {
      setI(i + 1)
      setD(plan[i + 1].start)
      return
    }
    const sum = summarizeBalance(runs.current)
    onDone(
      { value: round(Math.abs(sum.overall), 1), level: balanceLevel(sum.overall, sum.perFreq) },
      { runs: runs.current, perFreq: sum.perFreq.map((x) => ({ ...x, match: round(x.match, 1) })), overall: round(sum.overall, 1), inconsistent: sum.inconsistent },
    )
  }

  return (
    <FocusShell title={s.info.name} subtitle={stage === 'run' ? `${s.round(i + 1, plan.length)} · ${s.pitch(String(cur.freq))}` : undefined} progress={stage === 'run' ? i / plan.length : null} onExit={onExit}>
      {stage === 'lr' && (
        <HeadphoneCheck
          onOk={async () => {
            await unlockAudio()
            setStage('run')
          }}
        />
      )}
      {stage === 'run' && (
        <Stage
          icon={<Scale className="h-8 w-8" />}
          title={s.instruction}
          footer={
            <Button variant="accent" size="lg" onClick={commit}>
              {s.equal}
            </Button>
          }
        >
          <div className="mt-6 flex items-center justify-between px-2">
            {(['left', 'right'] as const).map((ear) => (
              <div key={ear} className="flex flex-col items-center gap-2">
                <div
                  className={cx(
                    'flex h-20 w-20 items-center justify-center rounded-full border-4 text-lg font-black transition-all duration-150',
                    active === ear ? 'scale-110 border-[var(--accent)] bg-[var(--accent)] text-white dark:text-[#0b1020]' : 'border-line bg-surface text-muted',
                  )}
                >
                  {ear === 'left' ? 'L' : 'R'}
                </div>
                <span className="text-sm font-semibold text-ink-2">{ear === 'left' ? t.leftEar : t.rightEar}</span>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <input
              type="range"
              className="range"
              min={-BALANCE_RANGE}
              max={BALANCE_RANGE}
              step={1}
              value={d}
              onChange={(e) => setD(Number(e.target.value))}
              aria-label={s.instruction}
            />
            <div className="mt-1 flex justify-between text-xs font-semibold text-muted">
              <span>← {s.leftLouder}</span>
              <span>{s.rightLouder} →</span>
            </div>
          </div>
        </Stage>
      )}
    </FocusShell>
  )
}

function Details({ result }: { result: { data: BalanceData; summary: { level: Level } } }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const lang = useLang()
  const d = result.data
  const weak = weakerEar(d.overall)
  const lvl = result.summary.level
  const rec = lvl === 'great' || lvl === 'normal' ? s.rec.ok : lvl === 'borderline' ? s.rec.mild : s.rec.bad
  return (
    <>
      <Card className="p-5">
        <SectionTitle>{s.diff}</SectionTitle>
        <ScaleBar
          min={0}
          max={16}
          value={Math.abs(d.overall)}
          segments={[
            { to: 2, level: 'great' },
            { to: 4, level: 'normal' },
            { to: 8, level: 'borderline' },
            { to: 16, level: 'attention' },
          ]}
          format={(v) => fmtNum(lang, v)}
          valueLabel={`${fmtNum(lang, Math.abs(d.overall), 1)} dB`}
        />
        <p className="mt-4 leading-relaxed text-ink-2">{weak ? s.meaning.ear(earName(lang, weak, lang !== 'en'), fmtNum(lang, Math.abs(d.overall), 1)) : s.meaning.none}</p>
      </Card>
      <Card className="p-5">
        <SectionTitle>{s.perPitch}</SectionTitle>
        <CompareBars
          max={16}
          format={(v) => `${fmtNum(lang, v, 1)} dB`}
          rows={d.perFreq.map((x) => ({
            label: `${x.freq} Hz`,
            value: Math.abs(x.match),
            color: Math.abs(x.match) <= 2 ? 'var(--great)' : x.match > 0 ? 'var(--ear-right)' : 'var(--ear-left)',
            note: weakerEar(x.match) ? s.weaker(earName(lang, weakerEar(x.match)!)) : s.balanced,
          }))}
        />
        <p className="mt-3 text-xs text-muted">
          {t.leftEar}: <span className="font-semibold text-ear-left">■</span> · {t.rightEar}: <span className="font-semibold text-ear-right">■</span>
        </p>
      </Card>
      {d.inconsistent && <Callout tone="warn">{s.inconsistent}</Callout>}
      <Card className="p-5">
        <SectionTitle>{t.recommendations}</SectionTitle>
        <Bullets items={rec} />
      </Card>
    </>
  )
}

const balanceTest: TestModule<BalanceData> = {
  kind: 'test',
  id: 'ear-balance',
  field: 'hearing',
  icon: Scale,
  minutes: 3,
  requirements: ['headphones', 'quiet'],
  version: 1,
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  Details,
  headline: (r, lang) => {
    const w = weakerEar(r.data.overall)
    return { value: fmtNum(lang, Math.abs(r.data.overall), 1), unit: 'dB', label: w ? S[lang].weaker(earName(lang, w)) : S[lang].balanced }
  },
  trend: { higherIsBetter: false, unit: () => 'dB', digits: 1 },
}

export default balanceTest
