import { useEffect, useRef, useState } from 'react'
import { Timer } from 'lucide-react'
import type { TestModule } from '../../catalog/types'
import { FocusShell, Stage } from '../../components/shell'
import { Bullets, Button, Card, Metric, MetricGrid, SectionTitle } from '../../components/ui'
import { Ring, ScaleBar } from '../../components/charts'
import { defineStrings, fmtNum, useLang, useStrings, type Lang } from '../../lib/i18n'
import { fx, vibrate } from '../../lib/audio'
import { useKey } from '../../lib/hooks'
import { mean } from '../../lib/stats'
import type { Level } from '../../lib/store'
import { common } from '../../i18n/common'
import { BOLT_BANDS, boltLevel } from './scoring'

const REST_S = 60
export interface BoltData {
  trials: number[]
}

const S = defineStrings({
  en: {
    info: {
      name: 'Breath-hold test (BOLT)',
      short: 'How long you can comfortably hold your breath after a normal breath out.',
      measures: 'Measures how long you can comfortably hold your breath after a normal breath out, until the FIRST urge to breathe. It shows how sensitive your breathing is: short times often go with breathing too much, getting out of breath easily and anxiety.',
      steps: ['Sit quietly and breathe normally through your nose for a minute.', 'After a normal (not deep) breath out, pinch your nose and tap Start.', 'Tap Stop at the FIRST clear urge to breathe, not when you can’t hold any longer.', 'Two measurements with a 1-minute rest.'],
      tips: ['Don’t take a big breath in or out before the test.', 'Your first breath afterwards should be calm. If you gasp, you held too long.', 'Best measured in the morning, before eating.'],
      caution: ['Don’t do this test if you are pregnant, have heart disease, high blood pressure that isn’t under control, epilepsy or panic attacks.'],
    },
    ready: 'Breathe out normally, pinch your nose, then tap Start',
    start: 'Start',
    stop: 'Stop — I want to breathe',
    holding: 'Holding… tap Stop at the first urge to breathe',
    rest: 'Breathe normally and relax',
    trial: (i: number) => `Measurement ${i} of 2`,
    skipRest: 'Skip the rest',
    result: 'Comfortable breath-hold',
    first: 'First',
    second: 'Second',
    labels: { great: 'Very good', normal: 'Good', borderline: 'Fair', attention: 'Low' } as Record<string, string>,
    meaning: {
      great: 'A very good breath-hold. Your breathing is calm and efficient.',
      normal: 'Good. Usual for healthy adults, and breathing exercises can improve it further.',
      borderline: 'Fair. You may breathe more than you need to, which goes with getting out of breath during exercise, tiredness and anxiety.',
      attention: 'Low. Short breath-holds are common with breathing problems, asthma, anxiety or low fitness.',
    } as Record<string, string>,
    rec: [
      'Practise slow, light breathing through the nose. Try the guided breathing exercise every day.',
      'An improvement of 3–5 seconds usually comes after 2–4 weeks of practice.',
      'If you’re short of breath at rest, have chest pain, or have a lung or heart condition, talk to a doctor about your breathing.',
    ],
  },
  uz: {
    info: {
      name: 'Nafasni ushlab turish (BOLT)',
      short: 'Oddiy nafas chiqargandan keyin nafasni qancha vaqt bemalol ushlab tura olasiz.',
      measures: 'Oddiy nafas chiqargandan keyin nafasni BIRINCHI nafas olish istagi paydo bo‘lguncha qancha vaqt bemalol ushlab tura olishingizni o‘lchaydi. Bu nafasingiz qanchalik sezgir ekanini ko‘rsatadi: qisqa vaqt ko‘pincha ortiqcha nafas olish, tez hansirash va xavotir bilan bog‘liq.',
      steps: ['Tinch o‘tiring va bir daqiqa burun orqali odatdagidek nafas oling.', 'Oddiy (chuqur emas) nafas chiqargandan keyin burningizni qisib, “Boshlash”ni bosing.', 'BIRINCHI aniq nafas olish istagida “To‘xtatish”ni bosing, chidab bo‘lmay qolganda emas.', 'Ikki marta o‘lchanadi, oralig‘ida 1 daqiqa dam.'],
      tips: ['Testdan oldin chuqur nafas olmang va chiqarmang.', 'Keyingi birinchi nafasingiz xotirjam bo‘lishi kerak. Agar havo yutib yuborsangiz, juda uzoq ushlab turgansiz.', 'Ertalab, nonushtadan oldin o‘lchash eng yaxshisi.'],
      caution: ['Homilador bo‘lsangiz, yurak kasalligi, nazorat qilinmayotgan yuqori qon bosimi, tutqanoq yoki vahima xurujlari bo‘lsa, bu testni bajarmang.'],
    },
    ready: 'Odatdagidek nafas chiqaring, burningizni qising va “Boshlash”ni bosing',
    start: 'Boshlash',
    stop: 'To‘xtatish — nafas olgim keldi',
    holding: 'Ushlab turibsiz… birinchi nafas olish istagida “To‘xtatish”ni bosing',
    rest: 'Odatdagidek nafas oling va bo‘shashing',
    trial: (i: number) => `${i}-o‘lchov, jami 2`,
    skipRest: 'Damni o‘tkazib yuborish',
    result: 'Bemalol ushlab turish vaqti',
    first: 'Birinchi',
    second: 'Ikkinchi',
    labels: { great: 'Juda yaxshi', normal: 'Yaxshi', borderline: 'O‘rtacha', attention: 'Past' } as Record<string, string>,
    meaning: {
      great: 'Nafasni juda yaxshi ushlab turasiz. Nafasingiz xotirjam va samarali.',
      normal: 'Yaxshi. Sog‘lom kattalar uchun odatiy, nafas mashqlari bilan yanada yaxshilash mumkin.',
      borderline: 'O‘rtacha. Ehtimol, kerakligidan ko‘proq nafas olasiz. Bu jismoniy yuklamada tez hansirash, charchoq va xavotir bilan bog‘liq.',
      attention: 'Past. Nafasni qisqa ushlab turish nafas muammolari, astma, xavotir yoki jismoniy tayyorgarlik pastligida ko‘p uchraydi.',
    } as Record<string, string>,
    rec: [
      'Burun orqali sekin va yengil nafas olishni mashq qiling. Har kuni “Nafas mashqi”ni bajarib ko‘ring.',
      '3–5 soniyalik yaxshilanish odatda 2–4 haftalik mashqdan keyin keladi.',
      'Agar tinch holatda ham hansirasangiz, ko‘kragingiz og‘risa yoki o‘pka yoki yurak kasalligingiz bo‘lsa, nafasingiz haqida shifokor bilan gaplashing.',
    ],
  },
  ru: {
    info: {
      name: 'Задержка дыхания (BOLT)',
      short: 'Сколько вы можете спокойно не дышать после обычного выдоха.',
      measures: 'Измеряет, сколько вы можете спокойно задерживать дыхание после обычного выдоха — до ПЕРВОГО желания вдохнуть. Это показывает чувствительность дыхания: короткое время часто связано с избыточным дыханием, быстрой одышкой и тревожностью.',
      steps: ['Посидите спокойно и минуту подышите носом как обычно.', 'После обычного (не глубокого) выдоха зажмите нос и нажмите «Начать».', 'Нажмите «Стоп» при ПЕРВОМ явном желании вдохнуть, а не когда терпеть уже нельзя.', 'Два измерения с отдыхом 1 минута.'],
      tips: ['Не делайте глубокий вдох или выдох перед тестом.', 'Первый вдох после теста должен быть спокойным. Если вы жадно хватаете воздух — задержали слишком долго.', 'Лучше измерять утром, до еды.'],
      caution: ['Не выполняйте тест при беременности, болезнях сердца, неконтролируемом высоком давлении, эпилепсии или панических атаках.'],
    },
    ready: 'Сделайте обычный выдох, зажмите нос и нажмите «Начать»',
    start: 'Начать',
    stop: 'Стоп — хочу вдохнуть',
    holding: 'Задерживаете… нажмите «Стоп» при первом желании вдохнуть',
    rest: 'Дышите как обычно и расслабьтесь',
    trial: (i: number) => `Измерение ${i} из 2`,
    skipRest: 'Пропустить отдых',
    result: 'Спокойная задержка дыхания',
    first: 'Первое',
    second: 'Второе',
    labels: { great: 'Очень хорошо', normal: 'Хорошо', borderline: 'Средне', attention: 'Низко' } as Record<string, string>,
    meaning: {
      great: 'Очень хорошая задержка. Ваше дыхание спокойное и экономное.',
      normal: 'Хорошо. Обычно для здоровых взрослых, а дыхательные упражнения помогут улучшить результат.',
      borderline: 'Средне. Возможно, вы дышите больше, чем нужно, — это связано с одышкой при нагрузке, усталостью и тревожностью.',
      attention: 'Низко. Короткая задержка часто бывает при нарушениях дыхания, астме, тревожности или низкой тренированности.',
    } as Record<string, string>,
    rec: [
      'Тренируйте медленное лёгкое дыхание через нос. Попробуйте каждый день упражнение «Дыхание с подсказками».',
      'Прибавка на 3–5 секунд обычно появляется через 2–4 недели занятий.',
      'Если одышка бывает в покое, болит в груди или есть болезни лёгких или сердца, обсудите дыхание с врачом.',
    ],
  },
})

function Runner({ onDone, onExit }: { onDone: (s: { value: number | null; level: Level }, d: BoltData) => void; onExit: () => void }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const lang = useLang()
  const [stage, setStage] = useState<'ready' | 'hold' | 'rest'>('ready')
  const [elapsed, setElapsed] = useState(0)
  const [restLeft, setRestLeft] = useState(REST_S)
  const trials = useRef<number[]>([])
  const t0 = useRef(0)
  const raf = useRef(0)
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const start = () => {
    t0.current = performance.now()
    setStage('hold')
    fx('go')
    const tick = () => {
      setElapsed((performance.now() - t0.current) / 1000)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }
  const stop = () => {
    cancelAnimationFrame(raf.current)
    const sec = Math.round(((performance.now() - t0.current) / 1000) * 10) / 10
    trials.current.push(sec)
    fx('done')
    vibrate(60)
    if (trials.current.length >= 2) {
      const m = Math.round(mean(trials.current) * 10) / 10
      onDone({ value: m, level: boltLevel(m) }, { trials: trials.current })
      return
    }
    setStage('rest')
    setRestLeft(REST_S)
  }
  useEffect(() => {
    if (stage !== 'rest') return
    const end = performance.now() + REST_S * 1000
    const id = window.setInterval(() => {
      const l = Math.max(0, Math.ceil((end - performance.now()) / 1000))
      setRestLeft(l)
      if (l <= 0) {
        clearInterval(id)
        fx('soft')
        setStage('ready')
      }
    }, 250)
    return () => clearInterval(id)
  }, [stage])

  useKey([' ', 'Space'], (e) => {
    e.preventDefault()
    if (stage === 'ready') start()
    else if (stage === 'hold') stop()
  })

  return (
    <FocusShell title={s.info.name} subtitle={s.trial(Math.min(2, trials.current.length + (stage === 'rest' ? 0 : 1)))} progress={trials.current.length / 2} onExit={onExit}>
      {stage === 'ready' && (
        <Stage
          icon={<Timer className="h-8 w-8" />}
          title={s.ready}
          footer={
            <Button variant="accent" size="xl" onClick={start}>
              {s.start}
            </Button>
          }
        />
      )}
      {stage === 'hold' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-8">
          <Ring value={Math.min(1, elapsed / 40)} size={220} stroke={14}>
            <span className="text-6xl font-black tabular text-ink">{fmtNum(lang, elapsed, 0)}</span>
            <span className="text-sm text-muted">{t.seconds}</span>
          </Ring>
          <p className="max-w-xs text-center text-ink-2">{s.holding}</p>
          <div className="pb-safe w-full max-w-md">
            <Button variant="accent" size="xl" block onPointerDown={(e) => { e.preventDefault(); stop() }}>
              {s.stop}
            </Button>
          </div>
        </div>
      )}
      {stage === 'rest' && (
        <Stage
          title={s.rest}
          footer={
            restLeft < REST_S - 20 ? (
              <Button variant="secondary" size="lg" onClick={() => setStage('ready')}>
                {s.skipRest}
              </Button>
            ) : undefined
          }
        >
          <div className="text-6xl font-black tabular text-[var(--accent)]">{restLeft}</div>
          <p className="mt-2 text-muted">
            {s.first}: {fmtNum(lang, trials.current[0], 1)} {t.seconds}
          </p>
        </Stage>
      )}
    </FocusShell>
  )
}

function Details({ result }: { result: { data: BoltData; summary: { level: Level; value: number | null } } }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const lang = useLang()
  const d = result.data
  const m = mean(d.trials)
  return (
    <>
      <Card className="p-5">
        <SectionTitle>{s.result}</SectionTitle>
        <ScaleBar
          min={0}
          max={50}
          value={m}
          valueLabel={`${fmtNum(lang, m, 1)} ${t.seconds}`}
          format={(v) => String(v)}
          segments={BOLT_BANDS.map((b) => ({ ...b, label: s.labels[b.level] }))}
        />
        <p className="mt-4 leading-relaxed text-ink-2">{s.meaning[result.summary.level]}</p>
      </Card>
      <Card className="p-5">
        <MetricGrid cols={3}>
          <Metric label={s.result} value={fmtNum(lang, m, 1)} unit={t.seconds} emphasis />
          <Metric label={s.first} value={fmtNum(lang, d.trials[0], 1)} unit={t.seconds} />
          <Metric label={s.second} value={fmtNum(lang, d.trials[1] ?? NaN, 1)} unit={t.seconds} />
        </MetricGrid>
      </Card>
      <Card className="p-5">
        <SectionTitle>{t.recommendations}</SectionTitle>
        <Bullets items={s.rec} />
      </Card>
    </>
  )
}

const bolt: TestModule<BoltData> = {
  kind: 'test',
  id: 'bolt',
  field: 'spine',
  icon: Timer,
  minutes: 3,
  requirements: ['seated', 'keyboard'],
  version: 1,
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  Details,
  headline: (r, lang: Lang) => ({ value: fmtNum(lang, r.summary.value ?? 0, 1), unit: common[lang].seconds, label: S[lang].labels[r.summary.level] }),
  trend: { higherIsBetter: true, unit: (lang) => common[lang].seconds, digits: 1 },
}

export default bolt
