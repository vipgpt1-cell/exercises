import { useEffect, useRef, useState } from 'react'
import { Waves } from 'lucide-react'
import type { ExerciseModule } from '../../catalog/types'
import { FocusShell, Stage } from '../../components/shell'
import { Button, Segmented, cx } from '../../components/ui'
import { DigitSlots, Keypad } from '../../components/Keypad'
import { defineStrings, fmtSigned, useLang, useStrings, type Lang } from '../../lib/i18n'
import { fx, getCtx, unlockAudio } from '../../lib/audio'
import { useSettings } from '../../lib/store'
import { common } from '../../i18n/common'
import { DIN_DIGITS, makeTriplet } from './din'
import { loadDigitPack, playDigits, type DigitPack } from './din-audio'

const ROUNDS = 20

const S = defineStrings({
  en: {
    info: {
      name: 'Listening in noise',
      short: 'Practise understanding speech when it’s noisy.',
      measures: 'Catch three spoken numbers through background noise. After each answer you see the right numbers, and the noise gets louder as you improve. Regular practice helps the brain pick out speech from noise.',
      steps: ['Choose how hard to start.', 'Listen to three numbers in noise and type them.', 'Check the right answer. The difficulty adjusts as you go. 20 rounds.'],
      tips: ['Practise 3–5 times a week for the best effect.', 'Use headphones or a good speaker in a quiet room.'],
    },
    start: 'How hard to start?',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    begin: 'Begin',
    listen: 'Listen…',
    type: 'Type the three numbers',
    correct: 'Correct!',
    was: (d: string) => `It was ${d}`,
    noise: 'Noise',
    hardest: 'Hardest level you managed',
    right: 'Rounds correct',
  },
  uz: {
    info: {
      name: 'Shovqinda tinglash',
      short: 'Shovqinli joyda gapni tushunishni mashq qiling.',
      measures: 'Shovqin fonida aytilgan uchta raqamni ilg‘ab oling. Har javobdan keyin to‘g‘ri raqamlar ko‘rsatiladi, yaxshilangan sari shovqin kuchayib boradi. Muntazam mashq miyaga gapni shovqindan ajratishni o‘rgatadi.',
      steps: ['Qaysi darajadan boshlashni tanlang.', 'Shovqin ichidagi uchta raqamni tinglab, kiriting.', 'To‘g‘ri javobni ko‘ring. Qiyinlik o‘zingizga moslashadi. 20 ta raund.'],
      tips: ['Yaxshi natija uchun haftasiga 3–5 marta mashq qiling.', 'Tinch xonada quloqchin yoki yaxshi karnaydan foydalaning.'],
    },
    start: 'Qaysi darajadan boshlaysiz?',
    easy: 'Oson',
    medium: 'O‘rtacha',
    hard: 'Qiyin',
    begin: 'Boshlash',
    listen: 'Tinglang…',
    type: 'Uchta raqamni kiriting',
    correct: 'To‘g‘ri!',
    was: (d: string) => `To‘g‘ri javob: ${d}`,
    noise: 'Shovqin',
    hardest: 'Uddalagan eng qiyin darajangiz',
    right: 'To‘g‘ri raundlar',
  },
  ru: {
    info: {
      name: 'Слушаем в шуме',
      short: 'Тренируйтесь понимать речь, когда вокруг шумно.',
      measures: 'Разберите три цифры, произнесённые на фоне шума. После каждого ответа вы увидите правильные цифры, а шум будет усиливаться по мере успехов. Регулярные занятия учат мозг отделять речь от шума.',
      steps: ['Выберите, с какой сложности начать.', 'Послушайте три цифры в шуме и введите их.', 'Посмотрите правильный ответ. Сложность подстраивается под вас. 20 раундов.'],
      tips: ['Для лучшего эффекта занимайтесь 3–5 раз в неделю.', 'Используйте наушники или хорошую колонку в тихой комнате.'],
    },
    start: 'С какой сложности начать?',
    easy: 'Легко',
    medium: 'Средне',
    hard: 'Сложно',
    begin: 'Начать',
    listen: 'Слушайте…',
    type: 'Введите три цифры',
    correct: 'Верно!',
    was: (d: string) => `Правильно: ${d}`,
    noise: 'Шум',
    hardest: 'Самый сложный уровень, который удался',
    right: 'Верных раундов',
  },
})

function Runner({ onDone, onExit }: { onDone: (l: { seconds: number; score?: number; detail?: Record<string, number | string> }) => void; onExit: () => void }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const appLang = useLang()
  const dLang: Lang = useSettings().digitLang ?? appLang
  const digits = DIN_DIGITS[dLang]
  const [pack, setPack] = useState<DigitPack | null>(null)
  const [start, setStart] = useState<number>(4)
  const [running, setRunning] = useState(false)
  const [state, setState] = useState<'playing' | 'answer' | 'feedback'>('playing')
  const [answer, setAnswer] = useState<number[]>([])
  const [ok, setOk] = useState<boolean | null>(null)
  const [round, setRound] = useState(0)
  const [snr, setSnr] = useState(4)
  const target = useRef<number[]>([])
  const prev = useRef<number[] | null>(null)
  const correct = useRef(0)
  const best = useRef<number | null>(null)
  const t0 = useRef(0)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    loadDigitPack(dLang).then((p) => alive.current && setPack(p))
    return () => {
      alive.current = false
    }
  }, [dLang])

  const present = async (level: number) => {
    if (!pack) return
    const tri = makeTriplet(digits, prev.current)
    prev.current = tri
    target.current = tri
    setAnswer([])
    setOk(null)
    setState('playing')
    await new Promise((r) => setTimeout(r, 400))
    const { end } = playDigits(pack, tri, level)
    const ctx = getCtx()
    while (alive.current && ctx.currentTime < end) await new Promise((r) => setTimeout(r, 40))
    if (alive.current) setState('answer')
  }

  const begin = async () => {
    await unlockAudio()
    t0.current = performance.now()
    setSnr(start)
    setRunning(true)
    present(start)
  }

  const submit = async () => {
    if (state !== 'answer') return
    const good = answer.every((d, i) => d === target.current[i])
    setOk(good)
    setState('feedback')
    fx(good ? 'good' : 'bad')
    if (good) {
      correct.current++
      best.current = best.current === null ? snr : Math.min(best.current, snr)
    }
    const next = Math.max(-18, Math.min(10, snr + (good ? -2 : 2)))
    const n = round + 1
    setRound(n)
    await new Promise((r) => setTimeout(r, 1500))
    if (!alive.current) return
    if (n >= ROUNDS) {
      onDone({
        seconds: Math.round((performance.now() - t0.current) / 1000),
        score: best.current ?? undefined,
        detail: { bestSnr: best.current ?? '—', correct: correct.current, rounds: ROUNDS },
      })
      return
    }
    setSnr(next)
    present(next)
  }

  const noisePct = Math.round(((10 - snr) / 28) * 100)

  return (
    <FocusShell title={s.info.name} progress={running ? round / ROUNDS : null} subtitle={running ? `${round + 1} / ${ROUNDS}` : undefined} onExit={onExit}>
      {!running ? (
        <Stage
          icon={<Waves className="h-8 w-8" />}
          title={s.start}
          footer={
            <Button variant="accent" size="lg" onClick={begin} disabled={!pack}>
              {s.begin}
            </Button>
          }
        >
          <Segmented
            className="mt-2"
            value={start}
            onChange={setStart}
            options={[
              { value: 6, label: s.easy },
              { value: 0, label: s.medium },
              { value: -6, label: s.hard },
            ]}
          />
        </Stage>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-between gap-5">
          <div className="w-full max-w-xs text-center">
            <div className="flex items-center gap-3 text-xs font-semibold text-muted">
              <span>{s.noise}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500" style={{ width: `${Math.max(4, noisePct)}%` }} />
              </div>
            </div>
            <p className={cx('mt-6 h-7 text-lg font-semibold', state === 'feedback' ? (ok ? 'text-great' : 'text-urgent') : 'text-ink')}>
              {state === 'playing' ? s.listen : state === 'answer' ? s.type : ok ? s.correct : s.was(target.current.join(' '))}
            </p>
            <div className="mt-4">
              <DigitSlots value={answer} length={3} state={state === 'feedback' ? (ok ? 'ok' : 'bad') : null} />
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

const noiseTraining: ExerciseModule = {
  kind: 'exercise',
  id: 'noise-training',
  field: 'hearing',
  icon: Waves,
  minutes: 4,
  requirements: ['headphones', 'keyboard'],
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  describe: (log, lang) => [
    { label: S[lang].right, value: `${log.detail?.correct ?? 0}/${log.detail?.rounds ?? ROUNDS}` },
    { label: S[lang].hardest, value: typeof log.detail?.bestSnr === 'number' ? `${fmtSigned(lang, log.detail.bestSnr as number, 0)} ${lang === 'ru' ? 'дБ' : 'dB'}` : '—' },
  ],
}

export default noiseTraining
