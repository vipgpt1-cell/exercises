import { useMemo } from 'react'
import { HandMetal } from 'lucide-react'
import type { ExerciseModule } from '../../catalog/types'
import { RoutinePlayer, stepDuration, type RoutineStep } from '../../components/routine/RoutinePlayer'
import { defineStrings, useLang, useStrings, type Lang } from '../../lib/i18n'

const OPEN = { c1: 0, c2: 0, c3: 0, c4: 0, tc: 0, spread: 0.25, opp: 0 }
const FIST = { c1: 1, c2: 1, c3: 1, c4: 1, tc: 1, spread: 0, opp: 0 }

type StepText = { name: string; cue: string }
const S = defineStrings({
  en: {
    info: {
      name: 'Hand & finger exercises',
      short: 'A guided routine for moving, strong and nimble fingers.',
      measures: 'A short routine like the ones used in hand therapy: make a fist and open it, spread the fingers, touch the thumb to each finger, tendon glides, wrist bends and stretches. Good for stiff hands, arthritis, recovery after a cast or a stroke, and for people who work at a desk.',
      steps: ['Sit at a table and rest your forearm on it.', 'Follow the animation and the counter. Move slowly and smoothly.', 'Do both hands, or focus on the hand that needs it.'],
      tips: ['Movements should feel comfortable. A gentle stretch is fine, pain is not.', 'Warm hands move more easily. You can hold them in warm water first.', 'Best done once or twice a day.'],
      caution: ['After a recent fracture, surgery or tendon repair, follow your therapist’s advice instead.'],
    },
    steps: {
      fist: { name: 'Fist and open', cue: 'Close your hand into a soft fist, then open it and stretch all your fingers.' },
      spread: { name: 'Spread the fingers', cue: 'Spread your fingers as wide as is comfortable, then bring them together.' },
      opp: { name: 'Thumb to fingertips', cue: 'Touch your thumb to each fingertip in turn: index, middle, ring, little.' },
      glide: { name: 'Tendon glides', cue: 'Straight fingers → bend the top joints into a hook → full fist. Move slowly.' },
      thumb: { name: 'Thumb bends', cue: 'Bend your thumb across the palm towards the little finger, then straighten it.' },
      wrist: { name: 'Wrist bends', cue: 'Forearm on the table, hand over the edge. Bend the wrist down, then up.' },
      extStretch: { name: 'Stretch the back of the hand', cue: 'Bend your wrist down and gently press with the other hand until you feel a stretch.' },
      flexStretch: { name: 'Stretch the palm side', cue: 'Bend your wrist up and gently pull the fingers back with the other hand.' },
      relax: { name: 'Shake out', cue: 'Relax your hands and gently shake them loose.' },
    } as Record<string, StepText>,
    exercises: 'Exercises',
  },
  uz: {
    info: {
      name: 'Qo‘l va barmoq mashqlari',
      short: 'Barmoqlar harakatchan, kuchli va chaqqon bo‘lishi uchun ko‘rsatmali mashqlar.',
      measures: 'Qo‘l reabilitatsiyasida qo‘llanadigan qisqa mashqlar to‘plami: mushtni yumish va ochish, barmoqlarni yoyish, bosh barmoqni har bir barmoqqa tekkizish, pay mashqlari, bilakni bukish va cho‘zish. Qo‘l qotib qolganda, artritda, gipsdan yoki insultdan keyin tiklanishda va kompyuterda ishlaydiganlar uchun foydali.',
      steps: ['Stol yoniga o‘tiring va bilagingizni stolga qo‘ying.', 'Animatsiya va hisoblagichga qarab bajaring. Sekin va silliq harakat qiling.', 'Ikkala qo‘l bilan bajaring yoki ko‘proq kerak bo‘lgan qo‘lga e’tibor bering.'],
      tips: ['Harakatlar qulay bo‘lishi kerak. Yengil tortilish normal, og‘riq esa yo‘q.', 'Iliq qo‘llar osonroq harakatlanadi. Avval ularni iliq suvda ushlab tursangiz bo‘ladi.', 'Kuniga 1–2 marta bajarish eng yaxshisi.'],
      caution: ['Yaqinda singan, operatsiya qilingan yoki payi tiklangan bo‘lsa, buning o‘rniga shifokoringiz ko‘rsatmalariga amal qiling.'],
    },
    steps: {
      fist: { name: 'Musht va ochish', cue: 'Qo‘lingizni yumshoq musht qilib yuming, keyin oching va barcha barmoqlarni cho‘zing.' },
      spread: { name: 'Barmoqlarni yoyish', cue: 'Barmoqlarni qulay darajada keng yoying, keyin birlashtiring.' },
      opp: { name: 'Bosh barmoqni uchlarga tekkizish', cue: 'Bosh barmog‘ingizni navbat bilan har bir barmoq uchiga tekkizing: ko‘rsatkich, o‘rta, nomsiz, jimjiloq.' },
      glide: { name: 'Pay mashqi', cue: 'To‘g‘ri barmoqlar → uchki bo‘g‘imlarni ilmoq qilib bukish → to‘liq musht. Sekin bajaring.' },
      thumb: { name: 'Bosh barmoqni bukish', cue: 'Bosh barmog‘ingizni kaft bo‘ylab jimjiloq tomon buking, keyin to‘g‘rilang.' },
      wrist: { name: 'Bilakni bukish', cue: 'Bilak stolda, kaft stol chetidan chiqib turadi. Kaftni pastga, keyin yuqoriga buking.' },
      extStretch: { name: 'Kaft orqasini cho‘zish', cue: 'Kaftni pastga buking va ikkinchi qo‘l bilan tortilish sezilguncha yengil bosing.' },
      flexStretch: { name: 'Kaft ichini cho‘zish', cue: 'Kaftni yuqoriga buking va ikkinchi qo‘l bilan barmoqlarni yengil orqaga torting.' },
      relax: { name: 'Silkitish', cue: 'Qo‘llaringizni bo‘shashtiring va yengil silkiting.' },
    } as Record<string, StepText>,
    exercises: 'Mashqlar',
  },
  ru: {
    info: {
      name: 'Упражнения для рук и пальцев',
      short: 'Комплекс с подсказками для подвижных, сильных и ловких пальцев.',
      measures: 'Короткий комплекс, как в реабилитации кисти: сжать и разжать кулак, развести пальцы, коснуться большим пальцем каждого пальца, скольжение сухожилий, сгибание и растяжка запястья. Полезен при скованности, артрите, после гипса или инсульта и тем, кто много работает за столом.',
      steps: ['Сядьте за стол и положите на него предплечье.', 'Повторяйте за анимацией и следите за счётчиком. Двигайтесь медленно и плавно.', 'Работайте обеими руками или уделите больше внимания той, которой это нужнее.'],
      tips: ['Движения должны быть комфортными. Лёгкое натяжение — нормально, боль — нет.', 'Тёплые руки двигаются легче. Можно сначала подержать их в тёплой воде.', 'Лучше всего 1–2 раза в день.'],
      caution: ['После недавнего перелома, операции или шва сухожилия следуйте указаниям своего врача или реабилитолога.'],
    },
    steps: {
      fist: { name: 'Кулак и раскрыть', cue: 'Мягко сожмите кулак, затем раскройте ладонь и выпрямите все пальцы.' },
      spread: { name: 'Развести пальцы', cue: 'Разведите пальцы так широко, как удобно, затем сведите их.' },
      opp: { name: 'Большой палец к кончикам', cue: 'По очереди касайтесь большим пальцем кончика каждого пальца: указательного, среднего, безымянного, мизинца.' },
      glide: { name: 'Скольжение сухожилий', cue: 'Прямые пальцы → согнуть верхние суставы «крючком» → полный кулак. Медленно.' },
      thumb: { name: 'Сгибание большого пальца', cue: 'Согните большой палец поперёк ладони к мизинцу, затем выпрямите.' },
      wrist: { name: 'Сгибание запястья', cue: 'Предплечье на столе, кисть свисает с края. Согните запястье вниз, затем вверх.' },
      extStretch: { name: 'Растяжка тыльной стороны', cue: 'Согните запястье вниз и мягко надавите другой рукой, пока не почувствуете натяжение.' },
      flexStretch: { name: 'Растяжка ладонной стороны', cue: 'Согните запястье вверх и мягко потяните пальцы назад другой рукой.' },
      relax: { name: 'Встряхнуть', cue: 'Расслабьте руки и мягко встряхните их.' },
    } as Record<string, StepText>,
    exercises: 'Упражнения',
  },
})

export function handSteps(lang: Lang): RoutineStep[] {
  const t = S[lang].steps
  return [
    { id: 'fist', ...t.fist, mode: 'reps', reps: 10, tempo: 3, figure: { kind: 'hand', frames: [OPEN, FIST] } },
    { id: 'spread', ...t.spread, mode: 'reps', reps: 10, tempo: 3, figure: { kind: 'hand', frames: [{ ...OPEN, spread: 0 }, { ...OPEN, spread: 1 }] } },
    { id: 'opp', ...t.opp, mode: 'reps', reps: 3, tempo: 6, figure: { kind: 'hand', frames: [1, 2, 3, 4].map((o) => ({ ...OPEN, spread: 0.15, opp: o })) } },
    {
      id: 'glide',
      ...t.glide,
      mode: 'reps',
      reps: 6,
      tempo: 5,
      figure: { kind: 'hand', frames: [OPEN, { ...OPEN, c1: 0.55, c2: 0.55, c3: 0.55, c4: 0.55, spread: 0 }, FIST] },
    },
    { id: 'thumb', ...t.thumb, mode: 'reps', reps: 10, tempo: 3, figure: { kind: 'hand', frames: [OPEN, { ...OPEN, tc: 1 }] } },
    { id: 'wrist', ...t.wrist, mode: 'reps', reps: 10, tempo: 3, figure: { kind: 'wrist', frames: [{ wrist: -45 }, { wrist: 50 }] } },
    { id: 'ext', ...t.extStretch, mode: 'hold', hold: 20, sides: true, figure: { kind: 'wrist', frames: [{ wrist: 0 }, { wrist: 70, fist: 0.4 }] } },
    { id: 'flex', ...t.flexStretch, mode: 'hold', hold: 20, sides: true, figure: { kind: 'wrist', frames: [{ wrist: 0 }, { wrist: -60 }] } },
    { id: 'relax', ...t.relax, mode: 'timed', seconds: 15, tempo: 0.5, figure: { kind: 'wrist', frames: [{ wrist: -15 }, { wrist: 15 }] } },
  ]
}

function Runner({ onDone, onExit }: { onDone: (l: { seconds: number; detail?: Record<string, number | string> }) => void; onExit: () => void }) {
  const lang = useLang()
  const s = useStrings(S)
  const steps = useMemo(() => handSteps(lang), [lang])
  return <RoutinePlayer title={s.info.name} steps={steps} onDone={onDone} onExit={onExit} />
}

const handRoutine: ExerciseModule = {
  kind: 'exercise',
  id: 'hand-routine',
  field: 'hands',
  icon: HandMetal,
  minutes: Math.round(handSteps('en').reduce((a, s) => a + stepDuration(s) + 10, 0) / 60),
  requirements: ['seated'],
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  describe: (log, lang) => [{ label: S[lang].exercises, value: String(log.detail?.exercises ?? handSteps(lang).length) }],
}

export default handRoutine
