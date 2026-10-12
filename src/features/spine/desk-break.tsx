import { useMemo } from 'react'
import { Armchair } from 'lucide-react'
import type { ExerciseModule } from '../../catalog/types'
import { RoutinePlayer, stepDuration, type RoutineStep } from '../../components/routine/RoutinePlayer'
import { defineStrings, useLang, useStrings, type Lang } from '../../lib/i18n'
import { STAND, STAND_EXTENSION, STAND_HANDS_HIPS, STAND_REACH_UP } from './poses'

type StepText = { name: string; cue: string }

const S = defineStrings({
  en: {
    info: {
      name: 'Desk break',
      short: 'A few minutes of movement for people who sit a lot.',
      measures: 'A short movement break against long sitting: neck, shoulders, back, wrists and a few calm breaths. Good to do every 45–60 minutes of work at a desk or on the phone.',
      steps: ['Stand up next to your desk (some moves can be done sitting).', 'Follow the animation and the cues.', 'Repeat several times a day.'],
      tips: ['Set a reminder for every hour.', 'Check how you sit, too: screen at eye level, feet flat on the floor, elbows bent at a right angle.'],
    },
    steps: {
      reach: { name: 'Reach up', cue: 'Stand tall and reach both arms up to the ceiling, stretching your whole body.' },
      tuck: { name: 'Chin tucks', cue: 'Slide your chin straight back, hold 2 seconds, relax.' },
      roll: { name: 'Shoulder circles', cue: 'Roll your shoulders up, back and down.' },
      rot: { name: 'Look over your shoulders', cue: 'Turn your head slowly left and right.' },
      blade: { name: 'Squeeze the shoulder blades', cue: 'Squeeze your shoulder blades together and down.' },
      ext: { name: 'Standing back bend', cue: 'Hands on your lower back, lean gently back.' },
      wrist: { name: 'Wrist bends', cue: 'Bend your wrists up and down to relax them after typing.' },
      breathe: { name: 'Calm breaths', cue: 'Breathe in slowly through your nose and out through your mouth. Let your shoulders drop.' },
    } as Record<string, StepText>,
    exercises: 'Exercises',
  },
  uz: {
    info: {
      name: 'Ish joyida tanaffus',
      short: 'Ko‘p o‘tiradiganlar uchun bir necha daqiqalik harakat.',
      measures: 'Uzoq o‘tirishga qarshi qisqa harakat tanaffusi: bo‘yin, yelkalar, bel, bilaklar va bir necha xotirjam nafas. Stol yoki telefon bilan ishlaganda har 45–60 daqiqada bajarish foydali.',
      steps: ['Stolingiz yonida turing (ba’zi harakatlarni o‘tirib ham bajarsa bo‘ladi).', 'Animatsiya va ko‘rsatmalarga amal qiling.', 'Kuniga bir necha marta takrorlang.'],
      tips: ['Har soatga eslatma qo‘yib qo‘ying.', 'Qanday o‘tirishingizga ham e’tibor bering: ekran ko‘z balandligida, oyoqlar polda, tirsaklar to‘g‘ri burchak ostida.'],
    },
    steps: {
      reach: { name: 'Yuqoriga cho‘zilish', cue: 'Tik turib, ikkala qo‘lni shiftga cho‘zing va butun tanangizni tortib cho‘zing.' },
      tuck: { name: 'Iyakni orqaga tortish', cue: 'Iyagingizni to‘g‘ri orqaga suring, 2 soniya ushlang, bo‘shashing.' },
      roll: { name: 'Yelkalarni aylantirish', cue: 'Yelkalarni yuqoriga, orqaga va pastga aylantiring.' },
      rot: { name: 'Yelka ustidan qarash', cue: 'Boshingizni sekin chapga va o‘ngga buring.' },
      blade: { name: 'Kuraklarni siqish', cue: 'Kuraklarni bir-biriga va pastga qarab siqing.' },
      ext: { name: 'Tik turib orqaga egilish', cue: 'Qo‘llarni belga qo‘yib, yengil orqaga egiling.' },
      wrist: { name: 'Bilaklarni bukish', cue: 'Yozishdan keyin bo‘shashtirish uchun bilaklarni yuqoriga va pastga buking.' },
      breathe: { name: 'Xotirjam nafas', cue: 'Burun orqali sekin nafas oling, og‘iz orqali chiqaring. Yelkalaringizni bo‘shashtiring.' },
    } as Record<string, StepText>,
    exercises: 'Mashqlar',
  },
  ru: {
    info: {
      name: 'Перерыв за столом',
      short: 'Несколько минут движения для тех, кто много сидит.',
      measures: 'Короткий перерыв на движение против долгого сидения: шея, плечи, спина, запястья и несколько спокойных вдохов. Полезно делать каждые 45–60 минут работы за столом или с телефоном.',
      steps: ['Встаньте рядом со столом (некоторые движения можно делать сидя).', 'Следуйте за анимацией и подсказками.', 'Повторяйте несколько раз в день.'],
      tips: ['Поставьте напоминание на каждый час.', 'Проверьте и то, как вы сидите: экран на уровне глаз, стопы на полу, локти согнуты под прямым углом.'],
    },
    steps: {
      reach: { name: 'Потянуться вверх', cue: 'Встаньте прямо, вытяните обе руки к потолку и потянитесь всем телом.' },
      tuck: { name: 'Втягивание подбородка', cue: 'Отведите подбородок прямо назад, задержитесь на 2 секунды, расслабьтесь.' },
      roll: { name: 'Круги плечами', cue: 'Вращайте плечи вверх, назад и вниз.' },
      rot: { name: 'Взгляд через плечо', cue: 'Медленно поворачивайте голову влево и вправо.' },
      blade: { name: 'Сведение лопаток', cue: 'Сведите лопатки вместе и вниз.' },
      ext: { name: 'Прогиб стоя', cue: 'Руки на пояснице, мягко отклонитесь назад.' },
      wrist: { name: 'Сгибание запястий', cue: 'Сгибайте запястья вверх и вниз, чтобы снять напряжение после набора текста.' },
      breathe: { name: 'Спокойное дыхание', cue: 'Медленно вдохните носом, выдохните ртом. Опустите плечи.' },
    } as Record<string, StepText>,
    exercises: 'Упражнения',
  },
})

export function deskSteps(lang: Lang): RoutineStep[] {
  const t = S[lang].steps
  return [
    { id: 'reach', ...t.reach, mode: 'reps', reps: 4, tempo: 5, figure: { kind: 'body', frames: [STAND, STAND_REACH_UP] } },
    { id: 'tuck', ...t.tuck, mode: 'reps', reps: 6, tempo: 4, figure: { kind: 'headSide', frames: [{ tuck: 0 }, { tuck: 1 }] } },
    { id: 'roll', ...t.roll, mode: 'reps', reps: 8, tempo: 3, figure: { kind: 'headFront', frames: [{ shrug: 0, roll: 0 }, { shrug: 0.8, roll: 0.25 }, { shrug: 0.4, roll: 0.5 }] } },
    { id: 'rot', ...t.rot, mode: 'reps', reps: 4, tempo: 6, figure: { kind: 'headFront', frames: [{ turn: 0 }, { turn: -1 }, { turn: 0 }, { turn: 1 }] } },
    { id: 'blade', ...t.blade, mode: 'reps', reps: 8, tempo: 4, figure: { kind: 'headFront', frames: [{ blade: 0 }, { blade: 1 }] } },
    { id: 'ext', ...t.ext, mode: 'reps', reps: 5, tempo: 4, figure: { kind: 'body', frames: [STAND_HANDS_HIPS, STAND_EXTENSION] } },
    { id: 'wrist', ...t.wrist, mode: 'reps', reps: 10, tempo: 2.5, figure: { kind: 'wrist', frames: [{ wrist: -45 }, { wrist: 50 }] } },
    { id: 'breathe', ...t.breathe, mode: 'timed', seconds: 40, tempo: 8, figure: { kind: 'pulse', frames: [{ s: 0 }, { s: 1 }] } },
  ]
}

function Runner({ onDone, onExit }: { onDone: (l: { seconds: number; detail?: Record<string, number | string> }) => void; onExit: () => void }) {
  const lang = useLang()
  const s = useStrings(S)
  const steps = useMemo(() => deskSteps(lang), [lang])
  return <RoutinePlayer title={s.info.name} steps={steps} onDone={onDone} onExit={onExit} />
}

const deskBreak: ExerciseModule = {
  kind: 'exercise',
  id: 'desk-break',
  field: 'spine',
  icon: Armchair,
  minutes: Math.round(deskSteps('en').reduce((a, s) => a + stepDuration(s) + 10, 0) / 60),
  requirements: ['space'],
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  describe: (log, lang) => [{ label: S[lang].exercises, value: String(log.detail?.exercises ?? deskSteps(lang).length) }],
}

export default deskBreak
