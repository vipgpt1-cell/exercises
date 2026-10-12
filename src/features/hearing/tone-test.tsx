import { useEffect, useRef, useState } from 'react'
import { AudioLines, Ear, Pause, Play } from 'lucide-react'
import type { TestModule } from '../../catalog/types'
import { FocusShell, ResponseButton, Stage } from '../../components/shell'
import { Bullets, Button, Callout, Card, Metric, MetricGrid, SectionTitle, cx } from '../../components/ui'
import { defineStrings, fmtNum, ruPlural, useLang, useStrings, type Lang } from '../../lib/i18n'
import { getCtx, outputLatency, playTone, scaled_ms, unlockAudio } from '../../lib/audio'
import { useKey } from '../../lib/hooks'
import { ageOf, usePerson, type HearingCalibration, type Level } from '../../lib/store'
import { common } from '../../i18n/common'
import { round } from '../../lib/stats'
import { Audiogram } from './Audiogram'
import { HeadphoneCheck, VolumeCalibration } from './setup'
import {
  AUDIOGRAM_FREQS,
  FREQS_FULL,
  FREQS_QUICK,
  HWStaircase,
  ageMedian,
  asymmetry,
  hasNotch,
  hlToDbfs,
  maxHlFor,
  overallLevel,
  pta,
  whoGrade,
  type EarMap,
  type WhoGrade,
} from './audiometry'

type EarSide = 'right' | 'left'

export interface ToneData {
  mode: 'quick' | 'full'
  right: EarMap
  left: EarMap
  retest: Partial<Record<EarSide, [number | null, number | null]>>
  falseAlarms: number
  presentations: number
  seconds: number
  cal: { method: HearingCalibration['method']; refSpl: number }
  age: number | null
  sex: 'male' | 'female' | null
}

const S = defineStrings({
  en: {
    info: {
      name: 'Tone hearing test',
      short: 'How quiet a sound each ear can hear, from low to high pitch.',
      measures: 'Finds the quietest beep each ear can hear at different pitches, from low to high. You get a hearing chart (audiogram) for each ear.',
      steps: [
        'Check that the headphones are on the right ears.',
        'Set a comfortable volume.',
        'Tap the button every time you hear a beep, even a very faint one.',
        'Each ear is checked separately. The beeps get quieter until you can only just hear them.',
      ],
      tips: [
        'Find the quietest room you can. Turn off the TV, fans and phone notifications.',
        'Use the same headphones and volume each time so results can be compared.',
        'Tap only when you really hear a beep. Guessing spoils the result.',
        'Take off earrings or glasses if they press on the headphones.',
      ],
      caution: [
        'If your ear hurts, has discharge, feels blocked, or your hearing dropped suddenly, don’t test at home. See a doctor: sudden hearing loss needs treatment within days.',
      ],
    },
    modeTitle: 'Choose the test length',
    quick: 'Quick',
    quickText: '4 pitches per ear · about 4 min',
    full: 'Full',
    fullText: '8 pitches per ear · about 8 min',
    practiceTitle: 'Let’s try it first',
    practiceText: 'You’ll hear a clear beep. Tap the button as soon as you hear it.',
    practiceHeard: 'Good! Now the real test. The beeps will get very quiet, so tap even if you can barely hear them.',
    practiceMissed: 'There was no tap. Did you hear the beep? If not, turn the volume up a little and try again.',
    practiceGo: 'Play a beep',
    recalibrate: 'Set the volume again',
    hear: 'I hear it',
    hearSub: 'Tap even if it’s very quiet',
    listening: 'Listen carefully…',
    rightEarNow: 'Right ear',
    leftEarNow: 'Left ear',
    retest: 'checking again',
    paused: 'Paused. Take a short break if you need one.',
    remaining: (m: number) => `about ${m} min left`,
    grade: {
      normal: 'Normal hearing',
      mild: 'Mild hearing loss',
      moderate: 'Moderate hearing loss',
      modsevere: 'Moderately severe hearing loss',
      severe: 'Severe hearing loss',
      profound: 'Profound hearing loss',
      complete: 'Complete hearing loss',
    } as Record<WhoGrade, string>,
    audiogram: 'Hearing chart',
    rl: 'right / left',
    audiogramLabels: { right: 'Right ear', left: 'Left ear', age: 'Typical for your age', normal: 'Normal range', freq: 'not heard even at the loudest level' },
    pta: 'Average hearing level (0.5–4 kHz)',
    thresholds: 'Quietest sound heard, dB HL',
    freq: 'Pitch, Hz',
    hz: 'Hz',
    db: 'dB',
    dbhl: 'dB HL',
    asym: (ear: string, d: number) => `One ear hears about ${d} dB worse than the other (${ear}). A difference between the ears should be checked by an ENT doctor or a hearing specialist.`,
    crossHearing: 'Because the difference is big, loud beeps meant for the weaker ear may have been picked up by the better ear. The weaker ear may actually hear worse than shown.',
    notch: 'Your chart has a dip around 3–6 kHz, with better hearing again at 8 kHz. This pattern is typical of damage from loud noise. Protect your ears: wear earplugs at concerts, at noisy work and with power tools.',
    reliability: 'How reliable',
    retestDiff: 'Repeat check difference (1 kHz)',
    falseAlarms: 'Taps without a beep',
    reliableGood: 'Your answers were consistent.',
    reliablePoor: 'Your answers weren’t very consistent. Take the test again somewhere quieter, and tap only when you’re sure you heard a beep.',
    estimateNote:
      'These are estimates. Ordinary headphones aren’t a calibrated clinic device, so values can be off by about 10 dB. The most reliable parts are the difference between your ears and changes over time on the same phone and headphones.',
    meterNote: 'Calibrated with a sound level meter.',
    ageNote: (age: number) => `The dashed line shows typical hearing at age ${age}.`,
    rec: {
      normal: [
        'Your hearing is in the normal range. Check again once a year, or sooner if you notice a change.',
        'Look after your hearing: keep headphone volume below 60% and avoid long exposure to loud noise.',
      ],
      mild: [
        'Mild hearing loss can make it harder to follow conversations in noise, the TV and phone calls.',
        'See a hearing specialist or an ENT doctor to confirm the result and find the cause.',
        'Repeat this test in 3–6 months to see whether it changes.',
      ],
      moderate: [
        'Please see an ENT doctor or a hearing specialist for a full hearing check.',
        'Hearing aids can make conversations much easier and improve everyday life.',
      ],
      urgent: 'If your hearing got worse suddenly (within a few hours to 3 days), it’s an emergency. See an ENT doctor today.',
    },
  },
  uz: {
    info: {
      name: 'Tovush eshitish testi',
      short: 'Har bir quloq yo‘g‘on va ingichka tovushlarni qanchalik yaxshi eshitishi.',
      measures: 'Har bir quloq yo‘g‘ondan ingichkagacha bo‘lgan tovushlarning eng pastini eshita oladimi — shuni aniqlaydi. Natijada har bir quloq uchun eshitish grafigi (audiogramma) tuziladi.',
      steps: [
        'Quloqchin to‘g‘ri taqilganini tekshiring.',
        'Qulay ovoz balandligini sozlang.',
        'Har safar signal eshitganingizda, hatto juda past bo‘lsa ham, tugmani bosing.',
        'Har bir quloq alohida tekshiriladi. Signallar zo‘rg‘a eshitiladigan darajagacha pasayib boradi.',
      ],
      tips: [
        'Iloji boricha eng tinch xonani tanlang. Televizor, ventilyator va telefon bildirishnomalarini o‘chiring.',
        'Natijalarni solishtirish uchun har safar o‘sha quloqchin va ovoz balandligidan foydalaning.',
        'Faqat signalni rostdan eshitganingizda bosing. Taxmin qilib bosish natijani buzadi.',
        'Quloqchinga tegib turgan sirg‘a yoki ko‘zoynakni yechib qo‘ying.',
      ],
      caution: [
        'Agar qulog‘ingiz og‘risa, undan suyuqlik oqsa, bitib qolgan bo‘lsa yoki eshitish to‘satdan pasaygan bo‘lsa, uyda tekshirmang, shifokorga boring. To‘satdan eshitish pasayishi bir necha kun ichida davolanishi kerak.',
      ],
    },
    modeTitle: 'Test uzunligini tanlang',
    quick: 'Qisqa',
    quickText: 'Har bir quloqqa 4 ta tovush · taxminan 4 daqiqa',
    full: 'To‘liq',
    fullText: 'Har bir quloqqa 8 ta tovush · taxminan 8 daqiqa',
    practiceTitle: 'Avval sinab ko‘ramiz',
    practiceText: 'Aniq signal eshitiladi. Eshitishingiz bilan tugmani bosing.',
    practiceHeard: 'Yaxshi! Endi asosiy test. Signallar juda past bo‘lib boradi, zo‘rg‘a eshitsangiz ham bosing.',
    practiceMissed: 'Tugma bosilmadi. Signalni eshitdingizmi? Eshitmagan bo‘lsangiz, ovozni biroz oshirib, qaytadan urinib ko‘ring.',
    practiceGo: 'Signalni eshitish',
    recalibrate: 'Ovozni qaytadan sozlash',
    hear: 'Eshitdim',
    hearSub: 'Juda past bo‘lsa ham bosing',
    listening: 'Diqqat bilan tinglang…',
    rightEarNow: 'O‘ng quloq',
    leftEarNow: 'Chap quloq',
    retest: 'qayta tekshiruv',
    paused: 'Pauza. Kerak bo‘lsa, biroz dam oling.',
    remaining: (m: number) => `taxminan ${m} daqiqa qoldi`,
    grade: {
      normal: 'Eshitish me’yorida',
      mild: 'Eshitish biroz pasaygan',
      moderate: 'Eshitish o‘rtacha pasaygan',
      modsevere: 'Eshitish sezilarli pasaygan',
      severe: 'Eshitish kuchli pasaygan',
      profound: 'Eshitish juda kuchli pasaygan',
      complete: 'To‘liq karlik',
    } as Record<WhoGrade, string>,
    audiogram: 'Eshitish grafigi',
    rl: 'o‘ng / chap',
    audiogramLabels: { right: 'O‘ng quloq', left: 'Chap quloq', age: 'Yoshingizda odatiy', normal: 'Me’yor', freq: 'eng baland ovozda ham eshitilmadi' },
    pta: 'O‘rtacha eshitish darajasi (0,5–4 kGs)',
    thresholds: 'Eshitilgan eng past ovoz, dB HL',
    freq: 'Tovush, Gs',
    hz: 'Gs',
    db: 'dB',
    dbhl: 'dB HL',
    asym: (ear: string, d: number) => `Bir quloq ikkinchisidan taxminan ${d} dB yomonroq eshitadi (${ear}). Quloqlar orasidagi farqni LOR shifokori yoki surdolog ko‘rishi kerak.`,
    crossHearing: 'Farq katta bo‘lgani uchun zaif quloqqa berilgan baland signalni yaxshi quloq eshitib qolgan bo‘lishi mumkin. Zaif quloq aslida ko‘rsatilganidan ham yomonroq eshitishi mumkin.',
    notch: 'Grafikda 3–6 kGs atrofida chuqurcha bor, 8 kGs da esa eshitish yana yaxshiroq. Bu kuchli shovqindan zararlanishga xos belgi. Quloqlaringizni asrang: konsertda, shovqinli ishda va elektr asboblar bilan ishlaganda quloq tiqinlarini taqing.',
    reliability: 'Natija qanchalik ishonchli',
    retestDiff: 'Qayta tekshiruvdagi farq (1 kGs)',
    falseAlarms: 'Signalsiz bosishlar',
    reliableGood: 'Javoblaringiz bir-biriga mos keldi.',
    reliablePoor: 'Javoblaringiz unchalik bir xil emas. Testni tinchroq joyda qayta topshiring va faqat signalni aniq eshitganingizda bosing.',
    estimateNote:
      'Bu taxminiy qiymatlar. Oddiy quloqchin klinikadagi sozlangan asbob emas, shuning uchun xato taxminan 10 dB gacha bo‘lishi mumkin. Eng ishonchlisi — quloqlar orasidagi farq va o‘sha telefon hamda quloqchinda vaqt o‘tishi bilan bo‘ladigan o‘zgarishlar.',
    meterNote: 'Shovqin o‘lchagich bilan sozlangan.',
    ageNote: (age: number) => `Uzuq chiziq ${age} yoshdagilarning odatiy eshitishini ko‘rsatadi.`,
    rec: {
      normal: [
        'Eshitishingiz me’yorida. Yiliga bir marta yoki biror o‘zgarish sezsangiz, qayta tekshiring.',
        'Eshitishingizni asrang: quloqchin ovozini 60% dan oshirmang va uzoq vaqt kuchli shovqinda bo‘lmang.',
      ],
      mild: [
        'Eshitish biroz pasaysa, shovqinli joyda suhbatni, televizorni va telefondagi gapni tushunish qiyinlashadi.',
        'Natijani tasdiqlash va sababini bilish uchun LOR shifokori yoki surdologga uchrashing.',
        'O‘zgarishni kuzatish uchun bu testni 3–6 oydan keyin takrorlang.',
      ],
      moderate: [
        'Eshitishni to‘liq tekshirish uchun LOR shifokori yoki surdologga murojaat qiling.',
        'Eshitish apparati suhbatlashishni ancha osonlashtiradi va kundalik hayotni yaxshilaydi.',
      ],
      urgent: 'Agar eshitish to‘satdan (bir necha soatdan 3 kungacha) yomonlashgan bo‘lsa, bu shoshilinch holat. Bugunoq LOR shifokoriga boring.',
    },
  },
  ru: {
    info: {
      name: 'Тональный тест слуха',
      short: 'Насколько тихие звуки слышит каждое ухо — от низких до высоких.',
      measures: 'Определяет самый тихий сигнал, который слышит каждое ухо на разных частотах — от низких до высоких. В итоге вы получите график слуха (аудиограмму) для каждого уха.',
      steps: [
        'Проверьте, что наушники надеты правильно.',
        'Настройте комфортную громкость.',
        'Нажимайте кнопку каждый раз, когда слышите сигнал, даже очень тихий.',
        'Каждое ухо проверяется отдельно. Сигналы становятся тише, пока вы не будете слышать их едва-едва.',
      ],
      tips: [
        'Выберите самую тихую комнату. Выключите телевизор, вентилятор и уведомления на телефоне.',
        'Каждый раз используйте те же наушники и громкость, чтобы сравнивать результаты.',
        'Нажимайте, только когда действительно слышите сигнал. Угадывание портит результат.',
        'Снимите серьги или очки, если они давят на наушники.',
      ],
      caution: [
        'Если ухо болит, из него есть выделения, оно заложено или слух резко упал, не проверяйте его дома — обратитесь к врачу. Внезапную потерю слуха нужно лечить в первые дни.',
      ],
    },
    modeTitle: 'Выберите длительность',
    quick: 'Короткий',
    quickText: '4 тона на ухо · около 4 мин',
    full: 'Полный',
    fullText: '8 тонов на ухо · около 8 мин',
    practiceTitle: 'Сначала попробуем',
    practiceText: 'Прозвучит чёткий сигнал. Нажмите кнопку, как только его услышите.',
    practiceHeard: 'Хорошо! Теперь основной тест. Сигналы станут очень тихими — нажимайте, даже если едва их слышите.',
    practiceMissed: 'Нажатия не было. Вы слышали сигнал? Если нет, немного прибавьте громкость и попробуйте ещё раз.',
    practiceGo: 'Включить сигнал',
    recalibrate: 'Настроить громкость заново',
    hear: 'Слышу',
    hearSub: 'Нажимайте, даже если очень тихо',
    listening: 'Внимательно слушайте…',
    rightEarNow: 'Правое ухо',
    leftEarNow: 'Левое ухо',
    retest: 'повторная проверка',
    paused: 'Пауза. Если нужно, немного отдохните.',
    remaining: (m: number) => `осталось около ${m} мин`,
    grade: {
      normal: 'Слух в норме',
      mild: 'Лёгкое снижение слуха',
      moderate: 'Умеренное снижение слуха',
      modsevere: 'Выраженное снижение слуха',
      severe: 'Тяжёлое снижение слуха',
      profound: 'Глубокое снижение слуха',
      complete: 'Полная потеря слуха',
    } as Record<WhoGrade, string>,
    audiogram: 'График слуха',
    rl: 'пр. / лев.',
    audiogramLabels: { right: 'Правое ухо', left: 'Левое ухо', age: 'Обычно в вашем возрасте', normal: 'Норма', freq: 'не слышно даже на максимуме' },
    pta: 'Средний порог слуха (0,5–4 кГц)',
    thresholds: 'Самый тихий услышанный звук, дБ HL',
    freq: 'Частота, Гц',
    hz: 'Гц',
    db: 'дБ',
    dbhl: 'дБ HL',
    asym: (ear: string, d: number) => `Одно ухо слышит примерно на ${d} дБ хуже другого (${ear}). Такую разницу стоит показать ЛОР-врачу или сурдологу.`,
    crossHearing: 'Из-за большой разницы громкие сигналы для слабого уха могло услышать другое, более здоровое ухо. На самом деле слабое ухо может слышать хуже, чем показано.',
    notch: 'На графике есть провал в районе 3–6 кГц, а на 8 кГц слух снова лучше. Такая картина типична для повреждения громким шумом. Берегите уши: надевайте беруши на концертах, на шумной работе и при работе с электроинструментом.',
    reliability: 'Надёжность',
    retestDiff: 'Разница при повторе (1 кГц)',
    falseAlarms: 'Нажатия без сигнала',
    reliableGood: 'Ответы были последовательными.',
    reliablePoor: 'Ответы не очень последовательные. Пройдите тест ещё раз в более тихом месте и нажимайте, только когда уверены, что слышите сигнал.',
    estimateNote:
      'Это приблизительные значения. Обычные наушники — не откалиброванный медицинский прибор, поэтому погрешность около 10 дБ. Надёжнее всего разница между ушами и изменения со временем на том же телефоне и наушниках.',
    meterNote: 'Откалибровано шумомером.',
    ageNote: (age: number) => `Пунктир показывает обычный слух в ${age} ${ruPlural(age, 'год', 'года', 'лет')}.`,
    rec: {
      normal: [
        'Слух в норме. Проверяйте его раз в год или раньше, если заметите изменения.',
        'Берегите слух: держите громкость наушников ниже 60% и избегайте долгого громкого шума.',
      ],
      mild: [
        'При лёгком снижении слуха труднее понимать разговор в шуме, телевизор и собеседника по телефону.',
        'Обратитесь к сурдологу или ЛОР-врачу, чтобы подтвердить результат и найти причину.',
        'Повторите этот тест через 3–6 месяцев, чтобы увидеть динамику.',
      ],
      moderate: [
        'Пожалуйста, обратитесь к ЛОР-врачу или сурдологу для полного обследования слуха.',
        'Слуховой аппарат заметно облегчает общение и повседневную жизнь.',
      ],
      urgent: 'Если слух ухудшился внезапно (за несколько часов или дней), это неотложное состояние. Обратитесь к ЛОР-врачу сегодня.',
    },
  },
})

/* ------------------------------------------------------------------ */
/* Runner                                                              */
/* ------------------------------------------------------------------ */

interface SeqItem {
  ear: EarSide
  freq: number
  retest?: boolean
}

function buildSeq(mode: 'quick' | 'full'): SeqItem[] {
  const freqs = mode === 'quick' ? FREQS_QUICK : FREQS_FULL
  const out: SeqItem[] = []
  for (const ear of ['right', 'left'] as EarSide[]) {
    for (const f of freqs) out.push({ ear, freq: f })
    out.push({ ear, freq: 1000, retest: true })
  }
  return out
}

function Runner({ onDone, onExit }: { onDone: (s: { value: number | null; level: Level }, d: ToneData) => void; onExit: () => void }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const person = usePerson()
  const [stage, setStage] = useState<'mode' | 'lr' | 'cal' | 'practice' | 'test'>('mode')
  const [mode, setMode] = useState<'quick' | 'full'>('quick')
  const [cal, setCal] = useState<HearingCalibration | null>(null)
  const [practice, setPractice] = useState<'idle' | 'playing' | 'heard' | 'missed'>('idle')
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [pressKey, setPressKey] = useState(0)
  const pausedRef = useRef(false)
  const windowRef = useRef<{ start: number; end: number; heard: boolean } | null>(null)
  const falseAlarms = useRef(0)
  const t0 = useRef(0)
  const seq = useRef<SeqItem[]>([])

  const press = () => {
    setPressKey((k) => k + 1)
    const w = windowRef.current
    const now = getCtx().currentTime
    if (w && now >= w.start - 0.05 && now <= w.end) w.heard = true
    else if (stage === 'test' && !pausedRef.current) falseAlarms.current++
  }
  useKey([' ', 'Space', 'Enter'], (e) => {
    if (stage === 'test' || practice === 'playing') {
      e.preventDefault()
      press()
    }
  })

  const setPause = (p: boolean) => {
    pausedRef.current = p
    setPaused(p)
  }
  useEffect(() => {
    const onVis = () => document.visibilityState === 'hidden' && stage === 'test' && setPause(true)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [stage])

  /* Practice: two clear beeps (right, then left) at 40 dB HL. */
  const runPractice = async () => {
    if (!cal) return
    await unlockAudio()
    setPractice('playing')
    let ok = true
    for (const ear of ['right', 'left'] as EarSide[]) {
      await new Promise((r) => setTimeout(r, 700 + Math.random() * 600))
      const h = playTone({ freq: 1000, dbfs: hlToDbfs(40, 1000, cal), ear, duration: 0.24, pulses: 3, gap: 0.2 })
      windowRef.current = { start: h.start, end: h.end + 1.8 + outputLatency(), heard: false }
      const ctx = getCtx()
      while (ctx.currentTime < windowRef.current.end && !windowRef.current.heard) await new Promise((r) => setTimeout(r, 30))
      if (!windowRef.current.heard) ok = false
      windowRef.current = null
      if (!ok) break
    }
    setPractice(ok ? 'heard' : 'missed')
  }

  /* Main test loop */
  useEffect(() => {
    if (stage !== 'test' || !cal) return
    let cancelled = false
    const ctx = getCtx()
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
    const whilePaused = async () => {
      while (pausedRef.current && !cancelled) await wait(150)
    }
    const results: Record<EarSide, EarMap> = { right: {}, left: {} }
    const retest: ToneData['retest'] = {}
    let presentations = 0
    seq.current = buildSeq(mode)
    t0.current = performance.now()
    falseAlarms.current = 0

    ;(async () => {
      let lastThr: Record<EarSide, number | null> = { right: null, left: null }
      for (let i = 0; i < seq.current.length; i++) {
        if (cancelled) return
        setIdx(i)
        const item = seq.current[i]
        const max = maxHlFor(item.freq, cal)
        const prev = lastThr[item.ear]
        const start = item.retest ? 30 : prev === null ? 30 : Math.min(max, Math.max(20, prev + 15))
        const st = new HWStaircase({ start, max })
        while (!st.done) {
          await whilePaused()
          await wait(scaled_ms(1200 + Math.random() * 1800))
          await whilePaused()
          if (cancelled) return
          const h = playTone({ freq: item.freq, dbfs: hlToDbfs(st.level, item.freq, cal), ear: item.ear, duration: 0.24, pulses: 3, gap: 0.2, ramp: 0.025 })
          windowRef.current = { start: h.start, end: h.end + 1.3 + outputLatency(), heard: false }
          while (!cancelled && ctx.currentTime < windowRef.current.end && !windowRef.current.heard) await wait(25)
          if (cancelled) return
          const heard = windowRef.current.heard
          windowRef.current = null
          if (heard) await wait(Math.max(0, (h.end - ctx.currentTime) * 1000))
          st.respond(heard)
          presentations++
        }
        if (item.retest) {
          const first = results[item.ear]['1000']?.hl ?? null
          retest[item.ear] = [first, st.threshold]
        } else {
          results[item.ear][String(item.freq)] = { hl: st.threshold, max, reliable: st.reliable }
          lastThr = { ...lastThr, [item.ear]: st.threshold ?? max }
        }
      }
      if (cancelled) return
      const pr = pta(results.right).value
      const pl = pta(results.left).value
      const data: ToneData = {
        mode,
        right: results.right,
        left: results.left,
        retest,
        falseAlarms: falseAlarms.current,
        presentations,
        seconds: Math.round((performance.now() - t0.current) / 1000),
        cal: { method: cal.method, refSpl: cal.refSpl },
        age: ageOf(person),
        sex: person.sex,
      }
      onDone({ value: round((pr + pl) / 2, 1), level: overallLevel(results.right, results.left) }, data)
    })()
    return () => {
      cancelled = true
      windowRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])

  const title = s.info.name
  const total = mode === 'quick' ? 10 : 18
  const cur = seq.current[idx]
  const progress = stage === 'test' ? idx / total : null
  const minsLeft = Math.max(1, Math.round(((total - idx) * 26) / 60))

  return (
    <FocusShell title={title} subtitle={stage === 'test' && cur ? `${cur.ear === 'right' ? s.rightEarNow : s.leftEarNow} · ${cur.freq} ${s.hz}${cur.retest ? ' · ' + s.retest : ''}` : undefined} progress={progress} onExit={onExit}
      right={
        stage === 'test' ? (
          <Button variant="ghost" size="sm" onClick={() => setPause(!paused)} icon={paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}>
            {paused ? t.btn.resume : t.btn.pause}
          </Button>
        ) : undefined
      }
    >
      {stage === 'mode' && (
        <Stage
          icon={<AudioLines className="h-8 w-8" />}
          title={s.modeTitle}
          footer={
            <Button variant="accent" size="lg" onClick={() => setStage('lr')}>
              {t.btn.continue}
            </Button>
          }
        >
          <div className="mt-2 grid gap-3 text-left">
            {(['quick', 'full'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cx(
                  'rounded-2xl border-2 p-4 transition',
                  mode === m ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-line bg-surface hover:border-line-strong',
                )}
              >
                <div className="font-bold text-ink">{m === 'quick' ? s.quick : s.full}</div>
                <div className="text-sm text-muted">{m === 'quick' ? s.quickText : s.fullText}</div>
              </button>
            ))}
          </div>
        </Stage>
      )}
      {stage === 'lr' && <HeadphoneCheck onOk={() => setStage('cal')} />}
      {stage === 'cal' && (
        <VolumeCalibration
          onDone={(c) => {
            setCal(c)
            setPractice('idle')
            setStage('practice')
          }}
        />
      )}
      {stage === 'practice' && (
        <Stage
          icon={<Ear className="h-8 w-8" />}
          title={s.practiceTitle}
          footer={
            practice === 'heard' ? (
              <Button variant="accent" size="lg" onClick={() => setStage('test')}>
                {t.btn.startTest}
              </Button>
            ) : practice === 'playing' ? null : (
              <>
                <Button variant="accent" size="lg" onClick={runPractice}>
                  {s.practiceGo}
                </Button>
                {practice === 'missed' && (
                  <Button variant="secondary" size="lg" onClick={() => setStage('cal')}>
                    {s.recalibrate}
                  </Button>
                )}
              </>
            )
          }
        >
          {practice === 'idle' && <p>{s.practiceText}</p>}
          {practice === 'heard' && <Callout tone="success">{s.practiceHeard}</Callout>}
          {practice === 'missed' && <Callout tone="warn">{s.practiceMissed}</Callout>}
          {practice === 'playing' && (
            <div className="mt-4 flex justify-center">
              <ResponseButton onPress={press} label={s.hear} sub={s.hearSub} size={180} pressedKey={pressKey} />
            </div>
          )}
        </Stage>
      )}
      {stage === 'test' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 py-6">
          <div className="text-center">
            <div className={cx('mx-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold', cur?.ear === 'right' ? 'bg-urgent-soft text-ear-right' : 'bg-primary-soft text-ear-left')}>
              <Ear className={cx('h-4 w-4', cur?.ear === 'left' && '-scale-x-100')} />
              {cur?.ear === 'right' ? s.rightEarNow : s.leftEarNow}
            </div>
            <p className="mt-3 text-muted">{paused ? s.paused : s.listening}</p>
          </div>
          <ResponseButton onPress={press} label={s.hear} sub={s.hearSub} size={Math.min(240, window.innerWidth - 80)} pressedKey={pressKey} disabled={paused} />
          <p className="text-xs text-muted">{s.remaining(minsLeft)}</p>
        </div>
      )}
    </FocusShell>
  )
}

/* ------------------------------------------------------------------ */
/* Details                                                             */
/* ------------------------------------------------------------------ */

function Details({ result }: { result: { data: ToneData; summary: { level: Level } } }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const lang = useLang()
  const d = result.data
  const pr = pta(d.right)
  const pl = pta(d.left)
  const gr = whoGrade(pr.value)
  const gl = whoGrade(pl.value)
  const asym = asymmetry(d.right, d.left)
  const notchR = d.mode === 'full' && hasNotch(d.right)
  const notchL = d.mode === 'full' && hasNotch(d.left)
  const retestDiffs = (['right', 'left'] as EarSide[])
    .map((e) => d.retest[e])
    .filter((x): x is [number, number] => !!x && x[0] !== null && x[1] !== null)
    .map(([a, b]) => Math.abs(a - b))
  const maxRetest = retestDiffs.length ? Math.max(...retestDiffs) : null
  const faRate = d.presentations ? d.falseAlarms / d.presentations : 0
  const poorReliability = (maxRetest !== null && maxRetest > 10) || faRate > 0.25
  const freqs = AUDIOGRAM_FREQS.filter((f) => d.right[String(f)] || d.left[String(f)])
  const ageLine = d.age !== null && d.age > 18 ? freqs.map((f) => ({ freq: f, hl: round(ageMedian(f, d.age!, d.sex), 1) })) : undefined
  const worst = Math.max(pr.value, pl.value)
  const recs = worst >= 35 ? s.rec.moderate : worst >= 20 || asym.asymmetric ? s.rec.mild : s.rec.normal
  const cell = (ear: EarMap, f: number) => {
    const th = ear[String(f)]
    if (!th) return '—'
    return th.hl === null ? `>${th.max}` : String(th.hl)
  }

  return (
    <>
      <Card className="p-5">
        <SectionTitle>{s.audiogram}</SectionTitle>
        <Audiogram right={d.right} left={d.left} ageLine={ageLine} labels={s.audiogramLabels} />
        {ageLine && <p className="mt-2 text-xs text-muted">{s.ageNote(d.age!)}</p>}
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ['right', pr, gr],
            ['left', pl, gl],
          ] as const
        ).map(([ear, p, g]) => (
          <Card key={ear} className="p-4">
            <div className={cx('text-sm font-bold', ear === 'right' ? 'text-ear-right' : 'text-ear-left')}>{ear === 'right' ? t.rightEar : t.leftEar}</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="tabular text-3xl font-black text-ink">
                {p.lowerBound ? '≥' : ''}
                {fmtNum(lang, p.value, 0)}
              </span>
              <span className="text-sm font-semibold text-muted">{s.dbhl}</span>
            </div>
            <div className="text-xs text-muted">{s.pta}</div>
            <div className={cx('mt-2 text-sm font-semibold', g === 'normal' ? 'text-great' : g === 'mild' ? 'text-borderline' : 'text-attention')}>{s.grade[g]}</div>
          </Card>
        ))}
      </div>

      {asym.asymmetric && (
        <Callout tone="warn">
          {s.asym(asym.worseEar === 'right' ? t.rightEar.toLowerCase() : t.leftEar.toLowerCase(), Math.round(Math.abs(asym.ptaDiff)))}
          {asym.crossHearingRisk && <p className="mt-1.5">{s.crossHearing}</p>}
        </Callout>
      )}
      {(notchR || notchL) && <Callout tone="warn">{s.notch}</Callout>}

      <Card className="p-5">
        <SectionTitle>{s.thresholds}</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-center text-sm tabular">
            <thead>
              <tr className="text-xs text-muted">
                <th className="py-1.5 text-left font-semibold">{s.freq}</th>
                {freqs.map((f) => (
                  <th key={f} className="py-1.5 font-semibold">
                    {f >= 1000 ? `${f / 1000}k` : f}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-line">
                <td className="py-2 text-left font-semibold text-ear-right">{t.rightEar}</td>
                {freqs.map((f) => (
                  <td key={f} className="py-2 font-semibold text-ink">
                    {cell(d.right, f)}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-line">
                <td className="py-2 text-left font-semibold text-ear-left">{t.leftEar}</td>
                {freqs.map((f) => (
                  <td key={f} className="py-2 font-semibold text-ink">
                    {cell(d.left, f)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle>{s.reliability}</SectionTitle>
        <MetricGrid cols={3}>
          <Metric label={s.retestDiff} value={maxRetest === null ? '—' : maxRetest} unit={s.db} />
          <Metric label={s.falseAlarms} value={d.falseAlarms} hint={`${Math.round(faRate * 100)}%`} />
          <Metric label={t.time} value={Math.round(d.seconds / 60)} unit={t.minUnit} />
        </MetricGrid>
        <p className={cx('mt-3 text-sm', poorReliability ? 'text-borderline' : 'text-great')}>{poorReliability ? s.reliablePoor : s.reliableGood}</p>
      </Card>

      <Card className="p-5">
        <SectionTitle>{t.recommendations}</SectionTitle>
        <Bullets items={recs} />
        <Callout tone="danger" className="mt-4">
          {s.rec.urgent}
        </Callout>
      </Card>
      <p className="text-xs leading-relaxed text-muted">
        {s.estimateNote} {d.cal.method === 'meter' ? s.meterNote : ''}
      </p>
    </>
  )
}

/* ------------------------------------------------------------------ */

const headline = (r: { data: ToneData }, lang: Lang) => {
  const s = S[lang]
  const pr = pta(r.data.right)
  const pl = pta(r.data.left)
  const worseIsRight = pr.value >= pl.value
  const g = whoGrade(Math.max(pr.value, pl.value))
  const earTag = g === 'normal' ? '' : ` (${(worseIsRight ? common[lang].rightEar : common[lang].leftEar).toLowerCase()})`
  return {
    value: `${Math.round(pr.value)} / ${Math.round(pl.value)}`,
    unit: `${s.dbhl} (${s.rl})`,
    label: s.grade[g] + earTag,
  }
}

const toneTest: TestModule<ToneData> = {
  kind: 'test',
  usesAge: true,
  id: 'tone-audiometry',
  field: 'hearing',
  icon: AudioLines,
  minutes: 5,
  requirements: ['headphones', 'quiet'],
  version: 1,
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  Details,
  headline,
  trend: { higherIsBetter: false, unit: (lang) => S[lang].dbhl, digits: 0 },
}

export default toneTest
