import { useMemo } from 'react'
import { UserRound } from 'lucide-react'
import type { ExerciseModule } from '../../catalog/types'
import { RoutinePlayer, stepDuration, type RoutineStep } from '../../components/routine/RoutinePlayer'
import { defineStrings, useLang, useStrings, type Lang } from '../../lib/i18n'

type StepText = { name: string; cue: string }

const S = defineStrings({
  en: {
    info: {
      name: 'Neck & shoulder routine',
      short: 'For a stiff neck and better posture.',
      measures: 'Exercises that are proven to help with everyday neck pain: chin tucks to wake up the deep neck muscles, gentle movement, shoulder-blade work and stretches for the top of the shoulders and the side of the neck.',
      steps: ['Sit or stand tall with relaxed shoulders.', 'Follow the animation, the counter and the sound cues.', 'Move slowly, only as far as is comfortable.'],
      tips: ['Do it once or twice a day, and as a break when working at a computer.', 'A gentle stretch is good. Sharp pain means stop.', 'Breathe calmly while you stretch.'],
      caution: ['Stop and see a doctor if you feel dizzy, or have numbness or pain going into your arm.'],
    },
    steps: {
      tuck: { name: 'Chin tucks', cue: 'Keep your eyes level and slide your chin straight back, making a “double chin”. Hold 2 seconds, relax.' },
      flex: { name: 'Look down and up', cue: 'Slowly lower your chin towards your chest, then look up at the ceiling. Keep it gentle.' },
      rot: { name: 'Turn left and right', cue: 'Turn your head to look over one shoulder, then the other. Keep your shoulders still.' },
      side: { name: 'Ear to shoulder', cue: 'Bring your ear towards your shoulder without lifting the shoulder. Hold the gentle stretch.' },
      shrug: { name: 'Shoulder shrugs', cue: 'Lift both shoulders up to your ears, then let them drop and relax.' },
      roll: { name: 'Shoulder circles', cue: 'Roll your shoulders up, back and down in a smooth circle.' },
      blade: { name: 'Squeeze the shoulder blades', cue: 'Squeeze your shoulder blades together and down. Hold 2 seconds, relax.' },
      trap: { name: 'Stretch the top of the shoulder', cue: 'Tilt your head to the side and keep the other shoulder down. You can help gently with your hand.' },
      lev: { name: 'Stretch the back of the neck', cue: 'Turn your head halfway to the side and look down towards your armpit. Hold the stretch.' },
    } as Record<string, StepText>,
    exercises: 'Exercises',
  },
  uz: {
    info: {
      name: 'Bo‘yin va yelka mashqlari',
      short: 'Bo‘yin qotishi va qaddi-qomatni to‘g‘rilash uchun.',
      measures: 'Oddiy bo‘yin og‘rig‘ida foydasi isbotlangan mashqlar: bo‘yinning chuqur mushaklarini ishga soluvchi iyakni orqaga tortish, yengil harakatlar, kurak mashqlari va yelka usti hamda bo‘yin yon tomonini cho‘zish.',
      steps: ['Yelkalaringizni bo‘shashtirib, tik o‘tiring yoki turing.', 'Animatsiya, hisoblagich va ovozli signallarga amal qiling.', 'Sekin, faqat qulay darajagacha harakat qiling.'],
      tips: ['Kuniga 1–2 marta va kompyuterda ishlaganda tanaffus sifatida bajaring.', 'Yengil tortilish yaxshi. O‘tkir og‘riq — to‘xtash kerak degani.', 'Cho‘zilish paytida xotirjam nafas oling.'],
      caution: ['Boshingiz aylansa, qo‘lingiz uvishsa yoki og‘riq qo‘lga tarqalsa, to‘xtang va shifokorga murojaat qiling.'],
    },
    steps: {
      tuck: { name: 'Iyakni orqaga tortish', cue: 'Ko‘zingizni to‘g‘riga qaratib, iyagingizni to‘g‘ri orqaga suring (“ikki qavat iyak”). 2 soniya ushlang, bo‘shashing.' },
      flex: { name: 'Pastga va yuqoriga qarash', cue: 'Iyagingizni sekin ko‘kragingizga tushiring, keyin shiftga qarang. Yengil bajaring.' },
      rot: { name: 'Chapga va o‘ngga burilish', cue: 'Boshingizni burib, bir yelka, keyin ikkinchi yelka ustidan qarang. Yelkalarni qimirlatmang.' },
      side: { name: 'Quloqni yelkaga', cue: 'Yelkani ko‘tarmasdan qulog‘ingizni yelkangiz tomon egiltiring. Yengil tortilishni ushlab turing.' },
      shrug: { name: 'Yelkalarni qisish', cue: 'Ikkala yelkani quloqlarga qadar ko‘taring, keyin tushirib bo‘shashtiring.' },
      roll: { name: 'Yelkalarni aylantirish', cue: 'Yelkalarni yuqoriga, orqaga va pastga silliq aylana bo‘ylab aylantiring.' },
      blade: { name: 'Kuraklarni siqish', cue: 'Kuraklarni bir-biriga va pastga qarab siqing. 2 soniya ushlang, bo‘shashing.' },
      trap: { name: 'Yelka ustini cho‘zish', cue: 'Boshingizni yonga egib, qarama-qarshi yelkani pastda ushlang. Qo‘lingiz bilan yengil yordam berishingiz mumkin.' },
      lev: { name: 'Bo‘yin orqasini cho‘zish', cue: 'Boshingizni yarim yonga burib, qo‘ltiq tomonga pastga qarang. Cho‘zilishni ushlab turing.' },
    } as Record<string, StepText>,
    exercises: 'Mashqlar',
  },
  ru: {
    info: {
      name: 'Комплекс для шеи и плеч',
      short: 'При скованности шеи и для осанки.',
      measures: 'Упражнения с доказанной пользой при обычной боли в шее: втягивание подбородка для глубоких мышц шеи, мягкие движения, работа лопатками и растяжка верха плеч и боковой поверхности шеи.',
      steps: ['Сядьте или встаньте прямо, расслабив плечи.', 'Следуйте за анимацией, счётчиком и звуковыми сигналами.', 'Двигайтесь медленно, только в комфортных пределах.'],
      tips: ['Выполняйте 1–2 раза в день и как перерыв при работе за компьютером.', 'Лёгкое натяжение — хорошо. Резкая боль — сигнал остановиться.', 'Во время растяжки дышите спокойно.'],
      caution: ['Остановитесь и обратитесь к врачу, если закружилась голова, онемела рука или боль отдаёт в руку.'],
    },
    steps: {
      tuck: { name: 'Втягивание подбородка', cue: 'Смотрите прямо и отведите подбородок назад («двойной подбородок»). Задержитесь на 2 секунды, расслабьтесь.' },
      flex: { name: 'Вниз и вверх', cue: 'Медленно опустите подбородок к груди, затем посмотрите на потолок. Мягко.' },
      rot: { name: 'Повороты влево и вправо', cue: 'Поверните голову, чтобы посмотреть через одно плечо, затем через другое. Плечи неподвижны.' },
      side: { name: 'Ухо к плечу', cue: 'Наклоните ухо к плечу, не поднимая плечо. Удерживайте лёгкое натяжение.' },
      shrug: { name: 'Подъём плеч', cue: 'Поднимите оба плеча к ушам, затем опустите и расслабьте.' },
      roll: { name: 'Круги плечами', cue: 'Плавно вращайте плечи вверх, назад и вниз.' },
      blade: { name: 'Сведение лопаток', cue: 'Сведите лопатки вместе и вниз. Задержитесь на 2 секунды, расслабьтесь.' },
      trap: { name: 'Растяжка верха плеча', cue: 'Наклоните голову в сторону, удерживая другое плечо опущенным. Можно мягко помочь рукой.' },
      lev: { name: 'Растяжка задней поверхности шеи', cue: 'Поверните голову наполовину в сторону и посмотрите вниз, на подмышку. Удерживайте растяжку.' },
    } as Record<string, StepText>,
    exercises: 'Упражнения',
  },
})

export function neckSteps(lang: Lang): RoutineStep[] {
  const t = S[lang].steps
  return [
    { id: 'tuck', ...t.tuck, mode: 'reps', reps: 10, tempo: 4, figure: { kind: 'headSide', frames: [{ tuck: 0 }, { tuck: 1 }] } },
    { id: 'flex', ...t.flex, mode: 'reps', reps: 5, tempo: 8, figure: { kind: 'headSide', frames: [{ flex: 0 }, { flex: 30 }, { flex: 0 }, { flex: -24 }] } },
    { id: 'rot', ...t.rot, mode: 'reps', reps: 6, tempo: 6, figure: { kind: 'headFront', frames: [{ turn: 0 }, { turn: -1 }, { turn: 0 }, { turn: 1 }] } },
    { id: 'side', ...t.side, mode: 'hold', hold: 20, sides: true, figure: { kind: 'headFront', frames: [{ tilt: 0 }, { tilt: -26 }] } },
    { id: 'shrug', ...t.shrug, mode: 'reps', reps: 10, tempo: 3, figure: { kind: 'headFront', frames: [{ shrug: 0 }, { shrug: 1 }] } },
    { id: 'roll', ...t.roll, mode: 'reps', reps: 8, tempo: 3, figure: { kind: 'headFront', frames: [{ shrug: 0, roll: 0 }, { shrug: 0.8, roll: 0.25 }, { shrug: 0.4, roll: 0.5 }] } },
    { id: 'blade', ...t.blade, mode: 'reps', reps: 10, tempo: 4, figure: { kind: 'headFront', frames: [{ blade: 0 }, { blade: 1 }] } },
    { id: 'trap', ...t.trap, mode: 'hold', hold: 25, sides: true, figure: { kind: 'headFront', frames: [{ tilt: 0 }, { tilt: -32, nod: 0.2 }] } },
    { id: 'lev', ...t.lev, mode: 'hold', hold: 25, sides: true, figure: { kind: 'headFront', frames: [{ tilt: 0 }, { tilt: -16, turn: -0.6, nod: 1 }] } },
  ]
}

function Runner({ onDone, onExit }: { onDone: (l: { seconds: number; detail?: Record<string, number | string> }) => void; onExit: () => void }) {
  const lang = useLang()
  const s = useStrings(S)
  const steps = useMemo(() => neckSteps(lang), [lang])
  return <RoutinePlayer title={s.info.name} steps={steps} onDone={onDone} onExit={onExit} />
}

const neckRoutine: ExerciseModule = {
  kind: 'exercise',
  id: 'neck-routine',
  field: 'spine',
  icon: UserRound,
  minutes: Math.round(neckSteps('en').reduce((a, s) => a + stepDuration(s) + 10, 0) / 60),
  requirements: ['seated'],
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  describe: (log, lang) => [{ label: S[lang].exercises, value: String(log.detail?.exercises ?? neckSteps(lang).length) }],
}

export default neckRoutine
