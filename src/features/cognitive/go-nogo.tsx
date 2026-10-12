import { useEffect, useRef, useState } from 'react'
import { Hand } from 'lucide-react'
import type { TestModule } from '../../catalog/types'
import { FocusShell, Stage } from '../../components/shell'
import { Bullets, Button, Card, Metric, MetricGrid, SectionTitle, cx } from '../../components/ui'
import { ScaleBar } from '../../components/charts'
import { defineStrings, fmtNum, useLang, useStrings } from '../../lib/i18n'
import { fx } from '../../lib/audio'
import { useKey } from '../../lib/hooks'
import { shuffle } from '../../lib/rng'
import type { Level } from '../../lib/store'
import { common } from '../../i18n/common'
import { goNoGoLevel, goNoGoScore, type GoTrial } from './norms'
import { eventTime, presentStimulus, wait } from './timing'

export interface GoNoGoData {
  trials: GoTrial[]
}

const NOGO = 3
const STIM_MS = 250
const MASK_MS = 900
const PER_DIGIT = 15 // 9 digits × 15 = 135 trials (11 % no-go, as in the SART)
const SIZES = [48, 72, 94, 110, 128]

const S = defineStrings({
  en: {
    info: {
      name: 'Go / No-Go',
      short: 'Tap for every digit except 3. Checks focus and self-control.',
      measures: 'Checks whether you can stay focused for a few minutes and hold yourself back in time. Digits flash quickly: you tap for all of them except 3. Tapping on a 3 means acting on impulse or a slip of attention; missing other digits means your attention drifted.',
      steps: ['Digits from 1 to 9 flash one by one.', 'Tap for EVERY digit, except 3.', 'When you see a 3, don’t tap.', 'A short practice, then about 2.5 minutes.'],
      tips: ['Being accurate matters as much as being fast.', 'The digits change size. That’s on purpose.', 'Stay focused until the end: in this task attention drifts easily.'],
    },
    rule: 'Tap for every digit, but NOT for 3',
    practice: 'Practice',
    tap: 'Tap',
    tapHint: 'Tap anywhere in the box',
    commissions: 'Taps on a 3',
    omissions: 'Missed digits',
    dprime: 'Attention score',
    dpUnit: 'score',
    goRt: 'Average reaction',
    variability: 'Variation',
    dpTitle: 'Attention score',
    dpNote: 'The score combines correct taps and taps on a 3. Higher is better: 2–3 is normal, above 3 is excellent.',
    meaning: {
      great: 'Excellent: you held back on almost every 3 and tapped for almost all other digits.',
      normal: 'Your focus and self-control are normal.',
      borderline: 'Holding back on the 3s was sometimes hard, or you missed several digits. Your attention may drift or you may act a little on impulse.',
      attention: 'Many taps on a 3 or many missed digits. This points to trouble staying focused or holding back.',
    } as Record<string, string>,
    rec: [
      'This task is boring on purpose, and slips are common when you’re tired or sleepy. Compare results taken in similar conditions.',
      'Train focus with the Schulte tables and N-back. Regular sleep and breaks from screens help attention.',
      'If attention problems keep getting in the way of work or daily life, talk to a doctor.',
    ],
  },
  uz: {
    info: {
      name: 'Bos / Bosma',
      short: '3 dan boshqa har bir raqamda bosing. Diqqat va o‘zini tutishni tekshiradi.',
      measures: 'Bir necha daqiqa diqqatni jamlab tura olishingizni va o‘zingizni o‘z vaqtida to‘xtata olishingizni tekshiradi. Raqamlar tez almashadi: 3 dan boshqa hammasida bosasiz. 3 da bosish — shoshqaloqlik yoki diqqat chalg‘ishi, boshqa raqamlarni o‘tkazib yuborish — diqqat tarqalganini bildiradi.',
      steps: ['1 dan 9 gacha raqamlar birin-ketin chiqadi.', 'HAR BIR raqamda bosing, faqat 3 dan tashqari.', '3 ni ko‘rganingizda bosmang.', 'Qisqa sinov, keyin taxminan 2,5 daqiqa.'],
      tips: ['Aniqlik tezlik kabi muhim.', 'Raqamlar o‘lchami o‘zgarib turadi, bu ataylab qilingan.', 'Oxirigacha diqqatli bo‘ling: bu topshiriqda diqqat oson chalg‘iydi.'],
    },
    rule: 'Har bir raqamda bosing, lekin 3 da BOSMANG',
    practice: 'Sinov',
    tap: 'Bosing',
    tapHint: 'Maydonning istalgan joyiga bosing',
    commissions: '3 da bosishlar',
    omissions: 'O‘tkazib yuborilgan raqamlar',
    dprime: 'Diqqat balli',
    dpUnit: 'ball',
    goRt: 'O‘rtacha reaksiya',
    variability: 'O‘zgaruvchanlik',
    dpTitle: 'Diqqat balli',
    dpNote: 'Ball to‘g‘ri bosishlar va 3 da bosishlarni birga hisobga oladi. Qancha yuqori bo‘lsa, shuncha yaxshi: 2–3 me’yor, 3 dan yuqorisi a’lo.',
    meaning: {
      great: 'A’lo: deyarli har bir 3 da o‘zingizni tiydingiz va boshqa deyarli barcha raqamlarda bosdingiz.',
      normal: 'Diqqatingiz va o‘zingizni tutishingiz me’yorida.',
      borderline: 'Ba’zan 3 da o‘zingizni tiyish qiyin bo‘ldi yoki bir nechta raqamni o‘tkazib yubordingiz. Diqqat chalg‘ishi yoki biroz shoshqaloqlik bo‘lishi mumkin.',
      attention: '3 da ko‘p bosdingiz yoki ko‘p raqamni o‘tkazib yubordingiz. Bu diqqatni jamlash yoki o‘zini tutishda qiyinchilik borligini ko‘rsatadi.',
    } as Record<string, string>,
    rec: [
      'Bu topshiriq ataylab zerikarli qilingan, charchaganda yoki uyqu kelganda xatolar ko‘payadi. Natijalarni o‘xshash sharoitda solishtiring.',
      'Diqqatni Shulte jadvallari va N-back bilan mashq qildiring. Muntazam uyqu va ekrandan tanaffuslar diqqatga yordam beradi.',
      'Agar diqqat muammolari ish yoki kundalik hayotga doim xalaqit bersa, shifokor bilan maslahatlashing.',
    ],
  },
  ru: {
    info: {
      name: 'Жми / Не жми',
      short: 'Нажимайте на каждую цифру, кроме 3. Проверяет внимание и самоконтроль.',
      measures: 'Проверяет, можете ли вы несколько минут удерживать внимание и вовремя себя останавливать. Цифры быстро сменяются: нажимайте на все, кроме 3. Нажатие на 3 — это импульсивность или сбой внимания, пропуск других цифр — рассеянность.',
      steps: ['Цифры от 1 до 9 появляются одна за другой.', 'Нажимайте на КАЖДУЮ цифру, кроме 3.', 'Когда видите 3, не нажимайте.', 'Короткая проба, затем около 2,5 минут.'],
      tips: ['Точность так же важна, как скорость.', 'Цифры меняют размер — так и задумано.', 'Сохраняйте внимание до конца: в этом задании оно легко рассеивается.'],
    },
    rule: 'Нажимайте на каждую цифру, но НЕ на 3',
    practice: 'Проба',
    tap: 'Нажмите',
    tapHint: 'Нажимайте в любом месте поля',
    commissions: 'Нажатия на 3',
    omissions: 'Пропущенные цифры',
    dprime: 'Балл внимания',
    dpUnit: 'балл',
    goRt: 'Средняя реакция',
    variability: 'Разброс',
    dpTitle: 'Балл внимания',
    dpNote: 'Балл учитывает и верные нажатия, и нажатия на 3. Чем выше, тем лучше: 2–3 — норма, выше 3 — отлично.',
    meaning: {
      great: 'Отлично: вы удержались почти на всех тройках и нажали почти на все остальные цифры.',
      normal: 'Внимание и самоконтроль в норме.',
      borderline: 'Иногда было трудно удержаться на тройках, или вы пропустили несколько цифр. Внимание может рассеиваться, или вы действуете немного импульсивно.',
      attention: 'Много нажатий на 3 или много пропусков. Это говорит о трудностях с концентрацией или самоконтролем.',
    } as Record<string, string>,
    rec: [
      'Задание специально сделано монотонным, и при усталости или сонливости ошибок больше. Сравнивайте результаты, полученные в похожих условиях.',
      'Тренируйте внимание с таблицами Шульте и N-back. Регулярный сон и перерывы от экранов помогают вниманию.',
      'Если проблемы с вниманием постоянно мешают работе или жизни, обсудите это с врачом.',
    ],
  },
})

function makeList(perDigit: number) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const l = shuffle(Array.from({ length: 9 * perDigit }, (_, i) => (i % 9) + 1))
    // no two 3s in a row, and none in the first two positions
    if (l[0] !== NOGO && l[1] !== NOGO && l.every((d, i) => i === 0 || !(d === NOGO && l[i - 1] === NOGO))) return l
  }
  return shuffle(Array.from({ length: 9 * perDigit }, (_, i) => (i % 9) + 1))
}

function Runner({ onDone, onExit }: { onDone: (s: { value: number | null; level: Level }, d: GoNoGoData) => void; onExit: () => void }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const [stage, setStage] = useState<'intro' | 'practiceDone' | 'run'>('intro')
  const [phase, setPhase] = useState<'practice' | 'main'>('practice')
  const [digit, setDigit] = useState<number | null>(null)
  const [size, setSize] = useState(96)
  const [fb, setFb] = useState<'ok' | 'bad' | null>(null)
  const [i, setI] = useState(0)
  const [len, setLen] = useState(18)
  const cur = useRef<{ digit: number; onset: number; responded: boolean; rt: number | null } | null>(null)
  const trials = useRef<GoTrial[]>([])
  const alive = useRef(true)
  const phaseRef = useRef<'practice' | 'main'>('practice')
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const runList = async (list: number[], practice: boolean) => {
    setLen(list.length)
    for (let k = 0; k < list.length; k++) {
      if (!alive.current) return
      setI(k)
      setFb(null)
      const d = list[k]
      const onset = await presentStimulus(() => {
        setDigit(d)
        setSize(SIZES[Math.floor(Math.random() * SIZES.length)])
      })
      cur.current = { digit: d, onset, responded: false, rt: null }
      await wait(STIM_MS)
      setDigit(-1) // mask
      await wait(MASK_MS)
      const c = cur.current
      if (!practice) trials.current.push({ digit: d, go: d !== NOGO, responded: c.responded, rt: c.rt })
      if (practice) {
        const ok = d === NOGO ? !c.responded : c.responded
        if (!ok) {
          setFb('bad')
          fx('bad')
          await wait(600)
        }
      }
    }
    setDigit(null)
    if (!alive.current) return
    if (practice) setStage('practiceDone')
    else {
      const sc = goNoGoScore(trials.current)
      onDone({ value: Math.round(sc.dPrime * 100) / 100, level: goNoGoLevel(sc.dPrime, sc.omissionRate) }, { trials: trials.current })
    }
  }

  const press = (e: { timeStamp: number }) => {
    const c = cur.current
    if (!c || c.responded || stage !== 'run') return
    c.responded = true
    c.rt = Math.round(eventTime(e) - c.onset)
    if (phaseRef.current === 'practice') {
      const ok = c.digit !== NOGO
      setFb(ok ? 'ok' : 'bad')
    } else setFb('ok')
  }
  useKey([' ', 'Space'], (e) => {
    e.preventDefault()
    press(e)
  })

  const start = (p: 'practice' | 'main') => {
    phaseRef.current = p
    setPhase(p)
    setStage('run')
    const list = p === 'practice' ? shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 4, 5, 6, 7, 8, 9, 3]) : makeList(PER_DIGIT)
    runList(list, p === 'practice')
  }

  return (
    <FocusShell title={s.info.name} subtitle={stage === 'run' ? (phase === 'practice' ? s.practice : `${i + 1} / ${len}`) : undefined} progress={stage === 'run' && phase === 'main' ? i / len : null} onExit={onExit}>
      {stage === 'intro' && (
        <Stage
          icon={<Hand className="h-8 w-8" />}
          title={s.rule}
          footer={
            <Button variant="accent" size="lg" onClick={() => start('practice')}>
              {s.practice}
            </Button>
          }
        >
          <p>{s.info.steps.join(' ')}</p>
        </Stage>
      )}
      {stage === 'practiceDone' && (
        <Stage
          icon={<Hand className="h-8 w-8" />}
          title={t.practiceDone}
          footer={
            <Button variant="accent" size="lg" onClick={() => start('main')}>
              {t.btn.startTest}
            </Button>
          }
        >
          <p>{s.rule}</p>
        </Stage>
      )}
      {stage === 'run' && (
        <div className="flex flex-1 flex-col gap-4">
          <div className="text-center text-sm font-semibold text-muted">{s.rule}</div>
          <div
            onPointerDown={(e) => {
              e.preventDefault()
              press(e)
            }}
            className={cx(
              'no-touch-scroll flex flex-1 cursor-pointer select-none items-center justify-center rounded-3xl bg-surface shadow-card transition-none',
              phase === 'practice' && fb === 'bad' && 'ring-4 ring-urgent',
              phase === 'practice' && fb === 'ok' && 'ring-4 ring-great',
            )}
            style={{ minHeight: '55vh' }}
          >
            {digit !== null && digit > 0 && (
              <span className="font-black tabular text-ink" style={{ fontSize: size, lineHeight: 1 }}>
                {digit}
              </span>
            )}
            {digit === -1 && (
              <svg width="110" height="110" viewBox="0 0 110 110" className="text-muted">
                <circle cx="55" cy="55" r="44" fill="none" stroke="currentColor" strokeWidth="6" />
                <path d="M24 24 86 86M86 24 24 86" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
              </svg>
            )}
          </div>
          <div className="pb-safe text-center text-xs text-muted">{s.tapHint}</div>
        </div>
      )}
    </FocusShell>
  )
}

function Details({ result }: { result: { data: GoNoGoData; summary: { level: Level } } }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const lang = useLang()
  const sc = goNoGoScore(result.data.trials)
  return (
    <>
      <Card className="p-5">
        <SectionTitle>{s.dpTitle}</SectionTitle>
        <ScaleBar
          min={0}
          max={4.5}
          value={sc.dPrime}
          valueLabel={fmtNum(lang, sc.dPrime, 1)}
          format={(v) => fmtNum(lang, v, v % 1 ? 1 : 0)}
          segments={[
            { to: 1.3, level: 'attention' },
            { to: 2, level: 'borderline' },
            { to: 3, level: 'normal' },
            { to: 4.5, level: 'great' },
          ]}
        />
        <p className="mt-4 leading-relaxed text-ink-2">{s.meaning[result.summary.level]}</p>
        <p className="mt-2 text-xs text-muted">{s.dpNote}</p>
      </Card>
      <Card className="p-5">
        <MetricGrid cols={3}>
          <Metric label={s.commissions} value={`${sc.commissions}/${sc.nogoCount}`} hint={`${Math.round(sc.commissionRate * 100)}%`} emphasis />
          <Metric label={s.omissions} value={`${sc.omissions}/${sc.goCount}`} hint={`${fmtNum(lang, sc.omissionRate * 100, 1)}%`} emphasis />
          <Metric label={s.dprime} value={fmtNum(lang, sc.dPrime, 1)} />
          <Metric label={s.goRt} value={Math.round(sc.goRt)} unit={t.ms} />
          <Metric label={s.variability} value={fmtNum(lang, sc.goRtCv, 0)} unit="%" />
        </MetricGrid>
      </Card>
      <Card className="p-5">
        <SectionTitle>{t.recommendations}</SectionTitle>
        <Bullets items={s.rec} />
      </Card>
    </>
  )
}

const goNoGo: TestModule<GoNoGoData> = {
  kind: 'test',
  id: 'go-nogo',
  field: 'memory',
  icon: Hand,
  minutes: 3,
  requirements: ['touch', 'keyboard'],
  version: 1,
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  Details,
  headline: (r, lang) => {
    const sc = goNoGoScore(r.data.trials)
    return { value: fmtNum(lang, sc.dPrime, 1), unit: S[lang].dpUnit, label: common[lang].level[r.summary.level] }
  },
  trend: { higherIsBetter: true, unit: (lang) => S[lang].dpUnit, digits: 1 },
}

export default goNoGo
