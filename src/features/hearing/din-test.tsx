import { useEffect, useRef, useState } from 'react'
import { MessagesSquare, Volume2 } from 'lucide-react'
import type { TestModule } from '../../catalog/types'
import { FocusShell, Stage } from '../../components/shell'
import { Bullets, Button, Callout, Card, Metric, MetricGrid, SectionTitle, Segmented, Spinner, cx } from '../../components/ui'
import { ScaleBar } from '../../components/charts'
import { DigitSlots, Keypad } from '../../components/Keypad'
import { LANGS, defineStrings, fmtNum, fmtSigned, useLang, useStrings, type Lang } from '../../lib/i18n'
import { fx, getCtx, unlockAudio } from '../../lib/audio'
import { updateSettings, useSettings, type Level } from '../../lib/store'
import { useElementSize } from '../../lib/hooks'
import { common } from '../../i18n/common'
import { round } from '../../lib/stats'
import { DIN_BANDS, DIN_DIGITS, DIN_TRIALS, DinStaircase, dinLevel, dinScore, makeTriplet, type DinTrial } from './din'
import { loadDigitPack, playDigits, type DigitPack } from './din-audio'

export interface DinData {
  digitLang: Lang
  trials: DinTrial[]
  srt: number
  sd: number
  digitAccuracy: number
  tripletCorrect: number
}

const S = defineStrings({
  en: {
    info: {
      name: 'Speech in noise',
      short: 'How well you understand speech when it’s noisy around you.',
      measures:
        'Checks how loud speech has to be, compared with background noise, for you to understand it. This is often the first thing to get worse as hearing ages or is damaged by noise, even when the tone test is still normal.',
      steps: [
        'You’ll hear three spoken numbers through a rushing noise.',
        'Type the three numbers you heard. If you’re not sure, guess.',
        'After a right answer the voice gets quieter, after a mistake it gets louder.',
        '24 rounds, about 4 minutes.',
      ],
      tips: ['Headphones give the most reliable result, but the phone speaker also works.', 'Don’t change the volume during the test.', 'Always enter three numbers, even if you have to guess.'],
    },
    setupTitle: 'Set a comfortable volume',
    setupText: 'Tap “Listen”: you’ll hear three numbers in noise. Adjust the phone’s volume so the sound is clear and comfortable, not loud.',
    playSample: 'Listen',
    digitsIn: 'Numbers are spoken in',
    uzNote: 'The Uzbek numbers are read by a computer voice. If they are hard to make out even without noise, choose Russian or English.',
    practiceTitle: 'Practice',
    practiceText: 'Two easy rounds to get used to it. After each one you’ll see the right answer.',
    startPractice: 'Start practice',
    listen: 'Listen…',
    typeWhat: 'Type the three numbers you heard',
    correct: 'Correct',
    wasIt: (d: string) => `It was ${d}`,
    round: (i: number, n: number) => `Round ${i} of ${n}`,
    loading: 'Loading sounds…',
    srt: 'Speech-to-noise level you need',
    srtShort: 'Result',
    db: 'dB',
    track: 'How the rounds went',
    trackNote: 'Each dot is one round: filled means correct, empty means a mistake. The dashed line is your result.',
    digitAcc: 'Numbers heard correctly',
    triplets: 'Rounds fully correct',
    labels: { great: 'Very good', normal: 'Good', borderline: 'Slightly reduced', attention: 'Reduced' } as Record<string, string>,
    meaning: {
      great: 'You understand speech in noise very well, better than most people.',
      normal: 'You understand speech in noise as well as most people.',
      borderline: 'You needed speech to be a bit louder than usual to understand it in noise. This can be an early sign of hearing loss.',
      attention: 'You needed speech to be much louder than usual to understand it in noise. This often means hearing loss.',
    } as Record<string, string>,
    rec: {
      ok: ['Repeat the test once a year, or sooner if conversations in noisy places get harder.'],
      border: [
        'Take the test again in a quiet room with headphones to confirm the result.',
        'Also take the tone hearing test to see which sounds are affected.',
        'If the result is confirmed, see a hearing specialist or an ENT doctor.',
      ],
      bad: ['Please see a hearing specialist or an ENT doctor for a full hearing check.', 'Take the tone hearing test to see which ear and which sounds are affected.'],
    },
    refNote: 'The result is in dB: the lower (more negative), the better. Up to −9.5 dB is considered normal in screening. The numbers here are read by a computer voice, so compare mostly with your own earlier results.',
  },
  uz: {
    info: {
      name: 'Shovqinda nutqni tushunish',
      short: 'Atrofda shovqin bo‘lganda gapni qanchalik yaxshi tushunishingiz.',
      measures:
        'Gapni tushunish uchun u shovqinga nisbatan qanchalik baland bo‘lishi kerakligini tekshiradi. Yosh o‘tishi yoki shovqin ta’sirida eshitish pasayganda aynan shu birinchi bo‘lib yomonlashadi, hatto tovush testi hali me’yorida bo‘lsa ham.',
      steps: [
        'Shovqin fonida uchta raqam aytiladi.',
        'Eshitgan uchta raqamingizni kiriting. Ishonchingiz komil bo‘lmasa, taxmin qiling.',
        'To‘g‘ri javobdan keyin ovoz pasayadi, xatodan keyin balandlashadi.',
        '24 ta raund, taxminan 4 daqiqa.',
      ],
      tips: ['Quloqchin eng ishonchli natija beradi, lekin telefon karnayi ham bo‘ladi.', 'Test davomida ovozni o‘zgartirmang.', 'Taxmin qilishga to‘g‘ri kelsa ham, doim uchta raqam kiriting.'],
    },
    setupTitle: 'Qulay ovozni sozlang',
    setupText: '“Tinglash”ni bosing: shovqin fonida uchta raqam eshitiladi. Telefon ovozini tovush aniq va yoqimli, lekin baland bo‘lmaydigan qilib sozlang.',
    playSample: 'Tinglash',
    digitsIn: 'Raqamlar tili',
    uzNote: 'O‘zbekcha raqamlarni kompyuter ovozi o‘qiydi. Agar ular shovqinsiz ham yaxshi tushunilmasa, rus yoki ingliz tilini tanlang.',
    practiceTitle: 'Sinov',
    practiceText: 'Ko‘nikish uchun ikkita oson raund. Har biridan keyin to‘g‘ri javob ko‘rsatiladi.',
    startPractice: 'Sinovni boshlash',
    listen: 'Tinglang…',
    typeWhat: 'Eshitgan uchta raqamni kiriting',
    correct: 'To‘g‘ri',
    wasIt: (d: string) => `To‘g‘ri javob: ${d}`,
    round: (i: number, n: number) => `${i}-raund, jami ${n}`,
    loading: 'Tovushlar yuklanmoqda…',
    srt: 'Sizga kerakli nutq va shovqin nisbati',
    srtShort: 'Natija',
    db: 'dB',
    track: 'Raundlar qanday o‘tdi',
    trackNote: 'Har bir nuqta — bitta raund: to‘liq nuqta to‘g‘ri, bo‘sh nuqta xato. Uzuq chiziq — natijangiz.',
    digitAcc: 'To‘g‘ri eshitilgan raqamlar',
    triplets: 'To‘liq to‘g‘ri raundlar',
    labels: { great: 'Juda yaxshi', normal: 'Yaxshi', borderline: 'Biroz pasaygan', attention: 'Pasaygan' } as Record<string, string>,
    meaning: {
      great: 'Shovqinda gapni juda yaxshi tushunasiz, ko‘pchilikdan ham yaxshiroq.',
      normal: 'Shovqinda gapni ko‘pchilik kabi yaxshi tushunasiz.',
      borderline: 'Shovqinda gapni tushunish uchun ovoz odatdagidan biroz balandroq bo‘lishi kerak bo‘ldi. Bu eshitish pasayishining dastlabki belgisi bo‘lishi mumkin.',
      attention: 'Shovqinda gapni tushunish uchun ovoz odatdagidan ancha baland bo‘lishi kerak bo‘ldi. Bu ko‘pincha eshitish pasayganini bildiradi.',
    } as Record<string, string>,
    rec: {
      ok: ['Testni yiliga bir marta yoki shovqinli joyda suhbatlashish qiyinlashsa, ertaroq takrorlang.'],
      border: [
        'Natijani tasdiqlash uchun testni tinch xonada, quloqchin bilan qayta topshiring.',
        'Qaysi tovushlar ta’sirlanganini bilish uchun tovush eshitish testini ham topshiring.',
        'Natija tasdiqlansa, surdolog yoki LOR shifokoriga uchrashing.',
      ],
      bad: ['Eshitishni to‘liq tekshirish uchun surdolog yoki LOR shifokoriga murojaat qiling.', 'Qaysi quloq va qaysi tovushlar ta’sirlanganini bilish uchun tovush eshitish testini topshiring.'],
    },
    refNote: 'Natija dB da: qanchalik past (manfiy) bo‘lsa, shuncha yaxshi. Tekshiruvlarda −9,5 dB gacha me’yor hisoblanadi. Bu yerda raqamlarni kompyuter ovozi o‘qiydi, shuning uchun asosan o‘zingizning oldingi natijalaringiz bilan solishtiring.',
  },
  ru: {
    info: {
      name: 'Речь в шуме',
      short: 'Насколько хорошо вы понимаете речь, когда вокруг шумно.',
      measures:
        'Проверяет, насколько громче шума должна звучать речь, чтобы вы её понимали. Именно это обычно ухудшается первым при возрастном снижении слуха или повреждении шумом — даже когда тональный тест ещё в норме.',
      steps: [
        'Вы услышите три цифры на фоне шума.',
        'Введите три услышанные цифры. Если не уверены — угадывайте.',
        'После верного ответа голос становится тише, после ошибки — громче.',
        '24 раунда, около 4 минут.',
      ],
      tips: ['Наушники дают самый надёжный результат, но подойдёт и динамик телефона.', 'Не меняйте громкость во время теста.', 'Всегда вводите три цифры, даже если приходится угадывать.'],
    },
    setupTitle: 'Настройте комфортную громкость',
    setupText: 'Нажмите «Слушать»: вы услышите три цифры в шуме. Настройте громкость телефона так, чтобы звук был чётким и комфортным, но не громким.',
    playSample: 'Слушать',
    digitsIn: 'Язык цифр',
    uzNote: 'Узбекские цифры читает компьютерный голос. Если их трудно разобрать даже без шума, выберите русский или английский.',
    practiceTitle: 'Пробный раунд',
    practiceText: 'Два лёгких раунда, чтобы привыкнуть. После каждого вы увидите правильный ответ.',
    startPractice: 'Начать пробу',
    listen: 'Слушайте…',
    typeWhat: 'Введите три услышанные цифры',
    correct: 'Верно',
    wasIt: (d: string) => `Правильно: ${d}`,
    round: (i: number, n: number) => `Раунд ${i} из ${n}`,
    loading: 'Загружаем звуки…',
    srt: 'Нужное вам соотношение речи и шума',
    srtShort: 'Результат',
    db: 'дБ',
    track: 'Как прошли раунды',
    trackNote: 'Каждая точка — один раунд: закрашенная — верно, пустая — ошибка. Пунктир — ваш результат.',
    digitAcc: 'Цифр услышано верно',
    triplets: 'Раундов без ошибок',
    labels: { great: 'Очень хорошо', normal: 'Хорошо', borderline: 'Немного снижено', attention: 'Снижено' } as Record<string, string>,
    meaning: {
      great: 'Вы очень хорошо понимаете речь в шуме — лучше большинства людей.',
      normal: 'Вы понимаете речь в шуме так же хорошо, как большинство людей.',
      borderline: 'Чтобы понимать речь в шуме, вам нужен голос чуть громче обычного. Это может быть ранним признаком снижения слуха.',
      attention: 'Чтобы понимать речь в шуме, вам нужен голос заметно громче обычного. Часто это говорит о снижении слуха.',
    } as Record<string, string>,
    rec: {
      ok: ['Повторяйте тест раз в год или раньше, если станет труднее разговаривать в шумных местах.'],
      border: [
        'Пройдите тест ещё раз в тихой комнате в наушниках, чтобы подтвердить результат.',
        'Пройдите также тональный тест слуха, чтобы увидеть, какие звуки затронуты.',
        'Если результат подтвердится, обратитесь к сурдологу или ЛОР-врачу.',
      ],
      bad: ['Пожалуйста, обратитесь к сурдологу или ЛОР-врачу для полного обследования слуха.', 'Пройдите тональный тест слуха, чтобы увидеть, какое ухо и какие звуки затронуты.'],
    },
    refNote: 'Результат в дБ: чем ниже (отрицательнее), тем лучше. При обследованиях нормой считается до −9,5 дБ. Здесь цифры читает компьютерный голос, поэтому сравнивайте прежде всего со своими прошлыми результатами.',
  },
})

/* ------------------------------------------------------------------ */

function Runner({ onDone, onExit }: { onDone: (s: { value: number | null; level: Level }, d: DinData) => void; onExit: () => void }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const appLang = useLang()
  const settings = useSettings()
  const dLang: Lang = settings.digitLang ?? appLang
  const digits = DIN_DIGITS[dLang]
  const [pack, setPack] = useState<DigitPack | null>(null)
  const [phase, setPhase] = useState<'setup' | 'practiceIntro' | 'practice' | 'test'>('setup')
  const [state, setState] = useState<'playing' | 'answer' | 'feedback'>('playing')
  const [answer, setAnswer] = useState<number[]>([])
  const [feedback, setFeedback] = useState<'ok' | 'bad' | null>(null)
  const [trialNo, setTrialNo] = useState(0)
  const [practiceNo, setPracticeNo] = useState(0)
  const [sampleBusy, setSampleBusy] = useState(false)
  const target = useRef<number[]>([])
  const prev = useRef<number[] | null>(null)
  const stair = useRef(new DinStaircase())
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    setPack(null)
    loadDigitPack(dLang).then((p) => alive.current && setPack(p))
    return () => {
      alive.current = false
    }
  }, [dLang])

  const waitUntil = async (ctxTime: number) => {
    const ctx = getCtx()
    while (alive.current && ctx.currentTime < ctxTime) await new Promise((r) => setTimeout(r, 40))
  }

  const present = async (snr: number) => {
    if (!pack) return
    const tri = makeTriplet(digits, prev.current)
    prev.current = tri
    target.current = tri
    setAnswer([])
    setFeedback(null)
    setState('playing')
    await new Promise((r) => setTimeout(r, 450))
    const { end } = playDigits(pack, tri, snr)
    await waitUntil(end)
    if (alive.current) setState('answer')
  }

  const playSample = async () => {
    if (!pack) return
    await unlockAudio()
    setSampleBusy(true)
    const { end } = playDigits(pack, makeTriplet(digits, null), 6)
    await waitUntil(end)
    setSampleBusy(false)
  }

  const startPractice = async () => {
    await unlockAudio()
    setPhase('practice')
    setPracticeNo(0)
    present(8)
  }

  const submit = async () => {
    if (state !== 'answer' || answer.length !== 3) return
    const ok = answer.every((d, i) => d === target.current[i])
    if (phase === 'practice') {
      setFeedback(ok ? 'ok' : 'bad')
      setState('feedback')
      fx(ok ? 'good' : 'bad')
      await new Promise((r) => setTimeout(r, 1600))
      if (!alive.current) return
      if (practiceNo + 1 < 2) {
        setPracticeNo(practiceNo + 1)
        present(8)
      } else {
        setPhase('test')
        stair.current = new DinStaircase()
        setTrialNo(0)
        present(stair.current.snr)
      }
      return
    }
    stair.current.respond(target.current, answer)
    const n = stair.current.trials.length
    setTrialNo(n)
    if (stair.current.done) {
      const sc = dinScore(stair.current.trials)
      onDone(
        { value: round(sc.srt, 1), level: dinLevel(sc.srt) },
        { digitLang: dLang, trials: stair.current.trials, srt: round(sc.srt, 2), sd: round(sc.sd, 2), digitAccuracy: sc.digitAccuracy, tripletCorrect: sc.tripletCorrect },
      )
      return
    }
    setState('playing')
    present(stair.current.snr)
  }

  const progress = phase === 'test' ? trialNo / DIN_TRIALS : null

  return (
    <FocusShell title={s.info.name} subtitle={phase === 'test' ? s.round(Math.min(DIN_TRIALS, trialNo + 1), DIN_TRIALS) : undefined} progress={progress} onExit={onExit}>
      {phase === 'setup' && (
        <Stage
          icon={<Volume2 className="h-8 w-8" />}
          title={s.setupTitle}
          footer={
            <>
              <Button variant="secondary" size="lg" onClick={playSample} disabled={!pack || sampleBusy} icon={sampleBusy ? <Spinner /> : <Volume2 className="h-5 w-5" />}>
                {s.playSample}
              </Button>
              <Button variant="accent" size="lg" onClick={() => setPhase('practiceIntro')} disabled={!pack}>
                {t.btn.continue}
              </Button>
            </>
          }
        >
          <p>{s.setupText}</p>
          <div className="mt-6 text-left">
            <div className="mb-2 text-sm font-semibold text-muted">{s.digitsIn}</div>
            <Segmented value={dLang} onChange={(v) => updateSettings({ digitLang: v })} options={LANGS.map((l) => ({ value: l.id, label: l.label }))} />
            {dLang === 'uz' && <p className="mt-2 text-xs text-muted">{s.uzNote}</p>}
          </div>
          {!pack && <p className="mt-4 text-sm text-muted">{s.loading}</p>}
        </Stage>
      )}
      {phase === 'practiceIntro' && (
        <Stage
          icon={<MessagesSquare className="h-8 w-8" />}
          title={s.practiceTitle}
          footer={
            <Button variant="accent" size="lg" onClick={startPractice}>
              {s.startPractice}
            </Button>
          }
        >
          <p>{s.practiceText}</p>
        </Stage>
      )}
      {(phase === 'practice' || phase === 'test') && (
        <div className="flex flex-1 flex-col items-center justify-between gap-6 py-2">
          <div className="text-center">
            {phase === 'practice' && <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">{t.practiceRound}</div>}
            <div className="flex h-16 items-center justify-center">
              {state === 'playing' ? <ListeningBars /> : <p className="text-lg font-semibold text-ink">{state === 'feedback' ? (feedback === 'ok' ? s.correct : s.wasIt(target.current.join(' '))) : s.typeWhat}</p>}
            </div>
            <div className="mt-4">
              <DigitSlots value={state === 'feedback' && feedback === 'bad' ? answer : answer} length={3} state={state === 'feedback' ? feedback : null} />
            </div>
          </div>
          <div className="pb-safe w-full">
            <Keypad digits={digits} value={answer} maxLength={3} onChange={setAnswer} onSubmit={submit} submitLabel={t.btn.ok} disabled={state !== 'answer'} />
          </div>
        </div>
      )}
    </FocusShell>
  )
}

function ListeningBars() {
  return (
    <div className="flex h-12 items-end gap-1.5" aria-label="listening">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="w-2 rounded-full bg-[var(--accent)]" style={{ height: '100%', animation: `pulse-soft 0.9s ease-in-out ${i * 0.12}s infinite`, transform: `scaleY(${0.4 + (i % 3) * 0.25})` }} />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function TrackChart({ trials, srt }: { trials: DinTrial[]; srt: number }) {
  const [ref, { width }] = useElementSize<HTMLDivElement>()
  const W = Math.max(260, width)
  const H = 190
  const pad = { l: 36, r: 10, t: 10, b: 22 }
  const snrs = trials.map((t) => t.snr)
  const lo = Math.min(...snrs, srt) - 2
  const hi = Math.max(...snrs, srt) + 2
  const X = (i: number) => pad.l + (i / (trials.length - 1)) * (W - pad.l - pad.r)
  const Y = (v: number) => pad.t + ((hi - v) / (hi - lo)) * (H - pad.t - pad.b)
  const ticks = [Math.ceil(lo / 4) * 4, Math.round((lo + hi) / 8) * 4, Math.floor(hi / 4) * 4].filter((v, i, a) => a.indexOf(v) === i)
  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg width={W} height={H} className="block">
          {ticks.map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={W - pad.r} y1={Y(v)} y2={Y(v)} stroke="var(--border)" />
              <text x={pad.l - 6} y={Y(v)} textAnchor="end" dominantBaseline="middle" fontSize="10.5" fill="var(--muted)">
                {v}
              </text>
            </g>
          ))}
          <rect x={X(4) - 4} y={pad.t} width={W - pad.r - X(4) + 4} height={H - pad.t - pad.b} fill="var(--accent-soft)" opacity={0.5} />
          <line x1={pad.l} x2={W - pad.r} y1={Y(srt)} y2={Y(srt)} stroke="var(--accent)" strokeDasharray="6 4" strokeWidth={1.8} />
          <path d={trials.map((t, i) => `${i ? 'L' : 'M'}${X(i)},${Y(t.snr)}`).join(' ')} fill="none" stroke="var(--muted)" strokeWidth={1.4} />
          {trials.map((t, i) => (
            <circle key={i} cx={X(i)} cy={Y(t.snr)} r={4.5} fill={t.correct ? 'var(--accent)' : 'var(--surface)'} stroke="var(--accent)" strokeWidth={2} />
          ))}
          {[1, 5, 10, 15, 20, 24].map((n) => (
            <text key={n} x={X(n - 1)} y={H - 5} textAnchor="middle" fontSize="10" fill="var(--muted)">
              {n}
            </text>
          ))}
        </svg>
      )}
    </div>
  )
}

function Details({ result }: { result: { data: DinData; summary: { level: Level } } }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const lang = useLang()
  const d = result.data
  const lvl = result.summary.level
  const rec = lvl === 'great' || lvl === 'normal' ? s.rec.ok : lvl === 'borderline' ? s.rec.border : s.rec.bad
  return (
    <>
      <Card className="p-5">
        <SectionTitle>{s.srt}</SectionTitle>
        <ScaleBar
          min={-16}
          max={2}
          value={d.srt}
          segments={DIN_BANDS.map((b) => ({ ...b, label: s.labels[b.level] }))}
          format={(v) => fmtNum(lang, v, v % 1 ? 1 : 0)}
          valueLabel={`${fmtSigned(lang, d.srt, 1)} ${s.db}`}
        />
        <p className="mt-4 leading-relaxed text-ink-2">{s.meaning[lvl]}</p>
      </Card>
      <Card className="p-5">
        <MetricGrid cols={3}>
          <Metric label={s.srtShort} value={fmtSigned(lang, d.srt, 1)} unit={s.db} emphasis />
          <Metric label={s.digitAcc} value={Math.round(d.digitAccuracy * 100)} unit="%" />
          <Metric label={s.triplets} value={`${d.tripletCorrect}/${d.trials.length}`} />
        </MetricGrid>
      </Card>
      <Card className="p-5">
        <SectionTitle>{s.track}</SectionTitle>
        <TrackChart trials={d.trials} srt={d.srt} />
        <p className="mt-2 text-xs text-muted">{s.trackNote}</p>
      </Card>
      <Card className="p-5">
        <SectionTitle>{t.recommendations}</SectionTitle>
        <Bullets items={rec} />
      </Card>
      <p className={cx('text-xs leading-relaxed text-muted')}>
        {s.refNote} ({s.digitsIn}: {LANGS.find((l) => l.id === d.digitLang)?.label})
      </p>
      {lvl === 'attention' && <Callout tone="warn">{t.urgentNote}</Callout>}
    </>
  )
}

const dinTest: TestModule<DinData> = {
  kind: 'test',
  id: 'digits-in-noise',
  field: 'hearing',
  icon: MessagesSquare,
  minutes: 4,
  requirements: ['headphones', 'quiet', 'keyboard'],
  version: 1,
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  Details,
  headline: (r, lang) => ({ value: fmtSigned(lang, r.data.srt, 1), unit: S[lang].db, label: S[lang].labels[r.summary.level] }),
  trend: { higherIsBetter: false, unit: (lang) => S[lang].db, digits: 1 },
}

export default dinTest
