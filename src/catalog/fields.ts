import { Brain, Ear, Hand, PersonStanding, type LucideIcon } from 'lucide-react'
import { defineStrings } from '../lib/i18n'
import type { FieldId } from './types'

export interface FieldDef {
  id: FieldId
  icon: LucideIcon
  accent: string
}

export const FIELDS: FieldDef[] = [
  { id: 'hearing', icon: Ear, accent: 'accent-hearing' },
  { id: 'memory', icon: Brain, accent: 'accent-memory' },
  { id: 'hands', icon: Hand, accent: 'accent-hands' },
  { id: 'spine', icon: PersonStanding, accent: 'accent-spine' },
]

export const fieldById = (id: string) => FIELDS.find((f) => f.id === id)

export const fieldStrings = defineStrings<Record<FieldId, { name: string; tagline: string; about: string }>>({
  en: {
    hearing: {
      name: 'Hearing',
      tagline: 'Each ear, speech in noise, high sounds',
      about: 'Find out how well each ear hears and how easily you follow speech in a noisy place. Use headphones in a quiet room.',
    },
    memory: {
      name: 'Memory & attention',
      tagline: 'Reaction, memory, focus',
      about: 'Short tasks that check your reaction speed, memory and attention. The exercises help keep your mind sharp.',
    },
    hands: {
      name: 'Hands & fingers',
      tagline: 'Speed, precision, shaking',
      about: 'Check how fast and precisely your hands move and whether they shake. The exercises help with recovery after a stroke or an injury.',
    },
    spine: {
      name: 'Neck, back & breathing',
      tagline: 'Pain, mobility, breathing, exercises',
      about: 'Check pain and mobility in your neck and back, measure your breathing and follow guided exercises.',
    },
  },
  uz: {
    hearing: {
      name: 'Eshitish',
      tagline: 'Har bir quloq, shovqinda nutqni tushunish',
      about: 'Har bir qulog‘ingiz qanchalik yaxshi eshitishini va shovqinli joyda gapni qanchalik oson tushunishingizni bilib oling. Tinch xonada, quloqchin bilan bajaring.',
    },
    memory: {
      name: 'Xotira va diqqat',
      tagline: 'Reaksiya, xotira, diqqat',
      about: 'Reaksiya tezligi, xotira va diqqatni tekshiradigan qisqa topshiriqlar. Mashqlar zehnni charxlashga yordam beradi.',
    },
    hands: {
      name: 'Qo‘l va barmoqlar',
      tagline: 'Tezlik, aniqlik, qo‘l titrashi',
      about: 'Qo‘llaringiz qanchalik tez va aniq harakat qilishini, titrash bor-yo‘qligini tekshiring. Mashqlar insult yoki jarohatdan keyin tiklanishga yordam beradi.',
    },
    spine: {
      name: 'Bo‘yin, bel va nafas',
      tagline: 'Og‘riq, harakatchanlik, nafas, mashqlar',
      about: 'Bo‘yin va beldagi og‘riq hamda harakatchanlikni tekshiring, nafasingizni o‘lchang va ko‘rsatmalar asosida mashq qiling.',
    },
  },
  ru: {
    hearing: {
      name: 'Слух',
      tagline: 'Каждое ухо, речь в шуме, высокие звуки',
      about: 'Узнайте, как слышит каждое ухо и насколько легко вы понимаете речь в шумном месте. Проходите в наушниках в тихой комнате.',
    },
    memory: {
      name: 'Память и внимание',
      tagline: 'Реакция, память, внимание',
      about: 'Короткие задания на скорость реакции, память и внимание. Упражнения помогают сохранить ясность ума.',
    },
    hands: {
      name: 'Руки и пальцы',
      tagline: 'Скорость, точность, дрожание',
      about: 'Проверьте, насколько быстро и точно двигаются руки и нет ли дрожания. Упражнения помогают восстановиться после инсульта или травмы.',
    },
    spine: {
      name: 'Шея, спина и дыхание',
      tagline: 'Боль, подвижность, дыхание, упражнения',
      about: 'Проверьте боль и подвижность шеи и спины, измерьте дыхание и выполняйте упражнения с подсказками.',
    },
  },
})
