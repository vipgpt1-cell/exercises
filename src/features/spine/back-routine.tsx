import { useMemo } from 'react'
import { Activity } from 'lucide-react'
import type { ExerciseModule } from '../../catalog/types'
import { RoutinePlayer, stepDuration, type RoutineStep } from '../../components/routine/RoutinePlayer'
import { defineStrings, useLang, useStrings, type Lang } from '../../lib/i18n'
import { BIRD_DOG, BRIDGE, CAT, CHILD, COW, KNEE_TO_CHEST, PRESS_UP, PRONE, QUAD, STAND_EXTENSION, STAND_HANDS_HIPS, SUPINE_HOOK } from './poses'

type StepText = { name: string; cue: string }

const S = defineStrings({
  en: {
    info: {
      name: 'Lower back routine',
      short: 'Mat exercises for lower back pain and stiffness.',
      measures: 'A classic physiotherapy routine for everyday lower back pain: gentle movement (pelvic tilts, cat–cow, knee to chest, child’s pose), core strength (bird-dog, bridge) and a gentle back bend (press-up).',
      steps: ['Use a mat or a carpet. Most exercises are done lying down or on your hands and knees.', 'Follow the animation, the counter and the cues.', 'Move slowly, keep breathing, and stay within a pain-free range.'],
      tips: ['Staying active is one of the best treatments for back pain.', 'Do the routine every day. You’ll usually feel a difference after 2–4 weeks.', 'A mild pulling feeling is OK. Pain that increases or goes into a leg is not.'],
      caution: [
        'Don’t exercise, and get urgent medical help, if you have numbness around the groin or buttocks, new bladder or bowel problems, or leg weakness that is getting worse.',
        'Skip the press-up if bending backwards makes leg pain worse.',
      ],
    },
    steps: {
      tilt: { name: 'Pelvic tilts', cue: 'Lie on your back with your knees bent. Tighten your tummy to press your lower back into the floor, then relax.' },
      knee: { name: 'Knee to chest', cue: 'Pull one knee towards your chest with your hands and hold the gentle stretch in your lower back.' },
      cat: { name: 'Cat–cow', cue: 'On your hands and knees, round your back up like a cat, then let it sag gently as you look up.' },
      bird: { name: 'Bird-dog', cue: 'On your hands and knees, reach one arm forward and the opposite leg back. Keep your back flat. Hold 2 seconds.' },
      bridge: { name: 'Bridge', cue: 'Lying on your back, squeeze your buttocks and lift your hips until your body is in a straight line.' },
      child: { name: 'Child’s pose', cue: 'Sit back on your heels and stretch your arms forward on the floor. Breathe into your back.' },
      press: { name: 'Press-up', cue: 'Lying on your stomach, push your upper body up with your arms, keeping your hips on the floor. Let your back relax.' },
      stand: { name: 'Standing back bend', cue: 'Standing with your hands on your lower back, lean gently back and come up again.' },
    } as Record<string, StepText>,
    exercises: 'Exercises',
  },
  uz: {
    info: {
      name: 'Bel uchun mashqlar',
      short: 'Bel og‘rig‘i va qotishi uchun gilamchada bajariladigan mashqlar.',
      measures: 'Oddiy bel og‘rig‘ida fizioterapevtlar tavsiya qiladigan mashqlar: yengil harakatlar (chanoqni qimirlatish, “mushuk–sigir”, tizzani ko‘krakka tortish, “bola holati”), qorin va bel mushaklarini mustahkamlash (“qush-it”, “ko‘prik”) va belni yengil orqaga egish.',
      steps: ['Gilamcha yoki gilamdan foydalaning. Ko‘p mashqlar yotgan holda yoki to‘rt oyoqlab bajariladi.', 'Animatsiya, hisoblagich va ko‘rsatmalarga amal qiling.', 'Sekin harakat qiling, nafas olishni to‘xtatmang va og‘riqsiz doirada qoling.'],
      tips: ['Faol bo‘lish bel og‘rig‘ining eng yaxshi davolaridan biri.', 'Mashqlarni har kuni bajaring. Farq odatda 2–4 haftada seziladi.', 'Yengil tortilish normal. Kuchayib borayotgan yoki oyoqqa tarqalayotgan og‘riq esa yo‘q.'],
      caution: [
        'Chot yoki dumba atrofida uvishish, siydik yoki ichak bilan bog‘liq yangi muammo yoki kuchayib borayotgan oyoq holsizligi bo‘lsa, mashq qilmang va zudlik bilan shifokorga murojaat qiling.',
        'Orqaga egilganda oyoqdagi og‘riq kuchaysa, qo‘llarda ko‘tarilish mashqini tashlab keting.',
      ],
    },
    steps: {
      tilt: { name: 'Chanoqni qimirlatish', cue: 'Tizzalarni bukib chalqancha yoting. Qorin mushaklarini taranglab, belni polga bosing, keyin bo‘shashing.' },
      knee: { name: 'Tizzani ko‘krakka', cue: 'Bir tizzani qo‘llaringiz bilan ko‘kragingizga torting va beldagi yengil tortilishni ushlab turing.' },
      cat: { name: '“Mushuk–sigir”', cue: 'To‘rt oyoqlab turib, belingizni mushukdek yuqoriga egib, keyin yuqoriga qarab yengil pastga tushiring.' },
      bird: { name: '“Qush-it”', cue: 'To‘rt oyoqlab turib, bir qo‘lni oldinga, qarama-qarshi oyoqni orqaga cho‘zing. Belni tekis tuting. 2 soniya ushlang.' },
      bridge: { name: '“Ko‘prik”', cue: 'Chalqancha yotib, dumba mushaklarini qisib, tanangiz to‘g‘ri chiziq hosil qilguncha sonni ko‘taring.' },
      child: { name: '“Bola holati”', cue: 'Tovonlaringiz ustiga o‘tirib, qo‘llaringizni polda oldinga cho‘zing. Belingizga nafas yo‘llang.' },
      press: { name: 'Qo‘llarda ko‘tarilish', cue: 'Qorin bilan yotib, sonni poldan uzmasdan qo‘llaringiz bilan gavdaning yuqori qismini ko‘taring. Belni bo‘shashtiring.' },
      stand: { name: 'Tik turib orqaga egilish', cue: 'Tik turib, qo‘llarni belga qo‘ying, yengil orqaga egiling va qayting.' },
    } as Record<string, StepText>,
    exercises: 'Mashqlar',
  },
  ru: {
    info: {
      name: 'Комплекс для поясницы',
      short: 'Упражнения на коврике при боли и скованности в пояснице.',
      measures: 'Классический физиотерапевтический комплекс при обычной боли в пояснице: мягкие движения (наклоны таза, «кошка–корова», колено к груди, «поза ребёнка»), укрепление мышц корпуса («птица-собака», «мостик») и мягкий прогиб назад.',
      steps: ['Используйте коврик или ковёр. Большинство упражнений выполняется лёжа или на четвереньках.', 'Следуйте за анимацией, счётчиком и подсказками.', 'Двигайтесь медленно, не задерживайте дыхание и оставайтесь в безболезненных пределах.'],
      tips: ['Активность — одно из лучших средств при боли в спине.', 'Выполняйте комплекс каждый день. Разница обычно чувствуется через 2–4 недели.', 'Лёгкое натяжение — нормально. Нарастающая боль или боль, отдающая в ногу, — нет.'],
      caution: [
        'Не выполняйте упражнения и срочно обратитесь за помощью, если есть онемение в паху или ягодицах, новые проблемы с мочеиспусканием или кишечником или нарастающая слабость в ноге.',
        'Пропустите прогиб на руках, если при наклоне назад усиливается боль в ноге.',
      ],
    },
    steps: {
      tilt: { name: 'Наклоны таза', cue: 'Лёжа на спине с согнутыми коленями, напрягите живот и прижмите поясницу к полу, затем расслабьтесь.' },
      knee: { name: 'Колено к груди', cue: 'Подтяните руками одно колено к груди и удерживайте лёгкое натяжение в пояснице.' },
      cat: { name: '«Кошка–корова»', cue: 'На четвереньках выгните спину вверх, как кошка, затем мягко прогнитесь, глядя вверх.' },
      bird: { name: '«Птица-собака»', cue: 'На четвереньках вытяните одну руку вперёд, а противоположную ногу назад. Спина ровная. Задержитесь на 2 секунды.' },
      bridge: { name: '«Мостик»', cue: 'Лёжа на спине, напрягите ягодицы и поднимите таз, пока тело не вытянется в прямую линию.' },
      child: { name: '«Поза ребёнка»', cue: 'Сядьте на пятки и вытяните руки вперёд по полу. Дышите «в спину».' },
      press: { name: 'Прогиб на руках', cue: 'Лёжа на животе, поднимите верх тела на руках, не отрывая таз от пола. Расслабьте спину.' },
      stand: { name: 'Прогиб стоя', cue: 'Стоя, руки на пояснице, мягко отклонитесь назад и вернитесь.' },
    } as Record<string, StepText>,
    exercises: 'Упражнения',
  },
})

export function backSteps(lang: Lang): RoutineStep[] {
  const t = S[lang].steps
  const mat = { kind: 'body' as const, mat: true }
  return [
    { id: 'tilt', ...t.tilt, mode: 'reps', reps: 10, tempo: 4, figure: { ...mat, frames: [{ ...SUPINE_HOOK, s1: 187 }, { ...SUPINE_HOOK, s1: 176 }] } },
    { id: 'knee', ...t.knee, mode: 'hold', hold: 20, sides: true, figure: { ...mat, frames: [SUPINE_HOOK, KNEE_TO_CHEST] } },
    { id: 'cat', ...t.cat, mode: 'reps', reps: 8, tempo: 6, figure: { ...mat, frames: [CAT, COW] } },
    { id: 'bird', ...t.bird, mode: 'reps', reps: 6, tempo: 5, sides: true, figure: { ...mat, frames: [QUAD, BIRD_DOG] } },
    { id: 'bridge', ...t.bridge, mode: 'reps', reps: 10, tempo: 4, figure: { ...mat, frames: [SUPINE_HOOK, BRIDGE] } },
    { id: 'press', ...t.press, mode: 'reps', reps: 8, tempo: 5, figure: { ...mat, frames: [PRONE, PRESS_UP] } },
    { id: 'child', ...t.child, mode: 'hold', hold: 30, figure: { ...mat, frames: [QUAD, CHILD] } },
    { id: 'stand', ...t.stand, mode: 'reps', reps: 6, tempo: 4, figure: { kind: 'body', frames: [STAND_HANDS_HIPS, STAND_EXTENSION] } },
  ]
}

function Runner({ onDone, onExit }: { onDone: (l: { seconds: number; detail?: Record<string, number | string> }) => void; onExit: () => void }) {
  const lang = useLang()
  const s = useStrings(S)
  const steps = useMemo(() => backSteps(lang), [lang])
  return <RoutinePlayer title={s.info.name} steps={steps} onDone={onDone} onExit={onExit} />
}

const backRoutine: ExerciseModule = {
  kind: 'exercise',
  id: 'back-routine',
  field: 'spine',
  icon: Activity,
  minutes: Math.round(backSteps('en').reduce((a, s) => a + stepDuration(s) + 10, 0) / 60),
  requirements: ['space'],
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  describe: (log, lang) => [{ label: S[lang].exercises, value: String(log.detail?.exercises ?? backSteps(lang).length) }],
}

export default backRoutine
