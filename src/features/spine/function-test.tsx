import { useState } from 'react'
import { ClipboardCheck } from 'lucide-react'
import type { TestModule } from '../../catalog/types'
import { FocusShell, Stage } from '../../components/shell'
import { Bullets, Button, Card, SectionTitle } from '../../components/ui'
import { ScaleBar } from '../../components/charts'
import { defineStrings, fmtNum, useLang, useStrings, type Lang } from '../../lib/i18n'
import type { Level } from '../../lib/store'
import { common } from '../../i18n/common'
import { ChoiceList } from './questionnaire-ui'
import { functionLevel, functionScore } from './scoring'

type Area = 'neck' | 'back' | 'both'
export interface FunctionData {
  area: Area
  neck?: (number | null)[]
  back?: (number | null)[]
}

const S = defineStrings({
  en: {
    info: {
      name: 'Neck & back in daily life',
      short: 'How much your neck or back gets in the way of everyday life.',
      measures: 'You answer how your neck and/or lower back affect everyday things: sitting, sleeping, work, driving, lifting. The result is a percentage of how limited you are, which is handy for following recovery week by week.',
      steps: ['Choose the neck, the lower back or both.', 'For each activity, pick how hard it has been over the past week.', 'About 10 questions per area, 2–3 minutes.'],
      tips: ['Answer for a typical day in the past week.', 'If you don’t do an activity, answer how hard you think it would be.'],
    },
    which: 'What bothers you?',
    neck: 'Neck',
    back: 'Lower back',
    both: 'Both',
    q: 'Over the past week, how hard was it…',
    opts: ['Not hard', 'A little hard', 'Quite hard', 'Very hard', 'Couldn’t do it'],
    neckItems: [
      'to read, or look down at a phone for 20 minutes',
      'to turn your head, for example to look behind you when driving or crossing the road',
      'to work at a desk or computer',
      'to sleep, because of your neck',
      'to lift or carry a bag (5 kg)',
      'to cope with headaches coming from your neck',
      'to concentrate, because of neck pain',
      'to wash and dress yourself',
      'to do sports, hobbies or meet people',
      'to look up, for example at a high shelf',
    ],
    backItems: [
      'to sit for 30 minutes',
      'to stand for 30 minutes',
      'to walk 1 km (about 15 minutes)',
      'to bend forward, for example to put on socks or shoes',
      'to lift something light from the floor',
      'to sleep, because of your back',
      'to get up from a bed or a chair',
      'to do housework',
      'to travel for 30 minutes by car or bus',
      'to go out, meet people and do things you enjoy',
    ],
    score: 'How much it limits you',
    neckScore: 'Neck',
    backScore: 'Lower back',
    labels: { great: 'Hardly at all', normal: 'A little', borderline: 'Moderately', attention: 'A lot' } as Record<string, string>,
    meaning: {
      great: 'Your neck or back hardly gets in the way of daily life.',
      normal: 'It gets in the way a little. Regular exercise usually helps quickly.',
      borderline: 'It gets in the way of daily life quite a bit. A regular exercise plan is recommended, ideally with a physiotherapist.',
      attention: 'It gets in the way of daily life a lot. Please see a doctor or a physiotherapist for a check-up and a treatment plan.',
    } as Record<string, string>,
    hardest: 'Hardest for you',
    rec: [
      'Repeat every 2–4 weeks. A drop of 10 points or more is a real improvement.',
      'Daily neck and back exercises, walking and good sleep make everyday life easier.',
      'Also take the pain check to look for warning signs.',
    ],
    note: 'This questionnaire is our own, built like well-known clinical questionnaires (0–4 points per question, shown as % of the maximum).',
  },
  uz: {
    info: {
      name: 'Bo‘yin va bel kundalik hayotda',
      short: 'Bo‘yin yoki bel kundalik ishlaringizga qanchalik xalaqit beradi.',
      measures: 'Bo‘yin va/yoki belingiz kundalik ishlarga — o‘tirish, uxlash, ish, mashina haydash, yuk ko‘tarishga — qanday ta’sir qilishini javob berasiz. Natija sizni qanchalik cheklayotgani foizda ko‘rsatiladi, bu tiklanishni haftama-hafta kuzatish uchun qulay.',
      steps: ['Bo‘yin, bel yoki ikkalasini tanlang.', 'Har bir ish uchun o‘tgan haftada qanchalik qiyin bo‘lganini tanlang.', 'Har bir soha uchun 10 tacha savol, 2–3 daqiqa.'],
      tips: ['O‘tgan haftaning odatiy kuni bo‘yicha javob bering.', 'Biror ishni qilmasangiz, qanchalik qiyin bo‘lishi mumkinligini taxmin qilib javob bering.'],
    },
    which: 'Sizni nima bezovta qiladi?',
    neck: 'Bo‘yin',
    back: 'Bel',
    both: 'Ikkalasi',
    q: 'O‘tgan hafta quyidagisi qanchalik qiyin bo‘ldi:',
    opts: ['Qiyin emas', 'Biroz qiyin', 'Ancha qiyin', 'Juda qiyin', 'Umuman qila olmadim'],
    neckItems: [
      'o‘qish yoki 20 daqiqa telefonga pastga qarab turish',
      'boshni burish, masalan, mashina haydaganda yoki yo‘ldan o‘tayotganda orqaga qarash',
      'stol yoki kompyuter oldida ishlash',
      'bo‘yin tufayli uxlash',
      'sumka ko‘tarish yoki olib yurish (5 kg)',
      'bo‘yindan keladigan bosh og‘rig‘iga chidash',
      'bo‘yin og‘rig‘i tufayli diqqatni jamlash',
      'yuvinish va kiyinish',
      'sport, sevimli mashg‘ulot yoki odamlar bilan uchrashish',
      'yuqoriga qarash, masalan, baland javonga',
    ],
    backItems: [
      '30 daqiqa o‘tirish',
      '30 daqiqa tik turish',
      '1 km yurish (taxminan 15 daqiqa)',
      'oldinga egilish, masalan, paypoq yoki poyabzal kiyish uchun',
      'poldan yengil narsa ko‘tarish',
      'bel tufayli uxlash',
      'karavot yoki stuldan turish',
      'uy ishlari',
      'mashina yoki avtobusda 30 daqiqa yurish',
      'tashqariga chiqish, odamlar bilan ko‘rishish va yoqqan ishlar bilan shug‘ullanish',
    ],
    score: 'Sizni qanchalik cheklaydi',
    neckScore: 'Bo‘yin',
    backScore: 'Bel',
    labels: { great: 'Deyarli cheklamaydi', normal: 'Biroz', borderline: 'Ancha', attention: 'Juda kuchli' } as Record<string, string>,
    meaning: {
      great: 'Bo‘yin yoki belingiz kundalik hayotga deyarli xalaqit bermaydi.',
      normal: 'Biroz xalaqit beradi. Muntazam mashqlar odatda tez yordam beradi.',
      borderline: 'Kundalik hayotga ancha xalaqit beradi. Muntazam mashqlar rejasi tavsiya etiladi, iloji bo‘lsa, fizioterapevt bilan.',
      attention: 'Kundalik hayotga juda xalaqit beradi. Iltimos, tekshiruv va davolash rejasi uchun shifokor yoki fizioterapevtga murojaat qiling.',
    } as Record<string, string>,
    hardest: 'Siz uchun eng qiyini',
    rec: [
      'Har 2–4 haftada takrorlang. 10 ball va undan ko‘proq kamayish — haqiqiy yaxshilanish.',
      'Har kungi bo‘yin va bel mashqlari, sayr va yaxshi uyqu kundalik hayotni yengillashtiradi.',
      'Xavfli belgilarni tekshirish uchun og‘riq testini ham topshiring.',
    ],
    note: 'Bu so‘rovnoma bizniki, u mashhur klinik so‘rovnomalar asosida tuzilgan (har bir savolga 0–4 ball, maksimaldan foizda).',
  },
  ru: {
    info: {
      name: 'Шея и спина в повседневной жизни',
      short: 'Насколько шея или спина мешают вам в обычной жизни.',
      measures: 'Вы отвечаете, как шея и/или поясница влияют на обычные дела: сидеть, спать, работать, водить машину, поднимать вещи. Результат показывает в процентах, насколько вы ограничены, — это удобно, чтобы следить за восстановлением неделя за неделей.',
      steps: ['Выберите шею, поясницу или обе области.', 'Для каждого дела выберите, насколько трудно было за последнюю неделю.', 'Около 10 вопросов на область, 2–3 минуты.'],
      tips: ['Отвечайте про обычный день за последнюю неделю.', 'Если вы чем-то не занимаетесь, ответьте, насколько трудно, по-вашему, это было бы.'],
    },
    which: 'Что вас беспокоит?',
    neck: 'Шея',
    back: 'Поясница',
    both: 'Обе',
    q: 'Насколько трудно за последнюю неделю было…',
    opts: ['Не трудно', 'Немного трудно', 'Довольно трудно', 'Очень трудно', 'Не смог(ла)'],
    neckItems: [
      'читать или смотреть вниз в телефон 20 минут',
      'поворачивать голову, например оглядываться за рулём или при переходе дороги',
      'работать за столом или компьютером',
      'спать из-за шеи',
      'поднимать или носить сумку (5 кг)',
      'справляться с головной болью, идущей от шеи',
      'сосредоточиться из-за боли в шее',
      'умываться и одеваться',
      'заниматься спортом, хобби или встречаться с людьми',
      'смотреть вверх, например на высокую полку',
    ],
    backItems: [
      'сидеть 30 минут',
      'стоять 30 минут',
      'пройти 1 км (около 15 минут)',
      'наклоняться вперёд, например чтобы надеть носки или обувь',
      'поднять лёгкую вещь с пола',
      'спать из-за спины',
      'вставать с кровати или стула',
      'делать домашние дела',
      'ехать 30 минут в машине или автобусе',
      'выходить из дома, встречаться с людьми и заниматься любимыми делами',
    ],
    score: 'Насколько это вас ограничивает',
    neckScore: 'Шея',
    backScore: 'Поясница',
    labels: { great: 'Почти не мешает', normal: 'Немного', borderline: 'Заметно', attention: 'Сильно' } as Record<string, string>,
    meaning: {
      great: 'Шея или спина почти не мешают вам в обычной жизни.',
      normal: 'Немного мешают. Регулярные упражнения обычно быстро помогают.',
      borderline: 'Заметно мешают в обычной жизни. Рекомендуется регулярная программа упражнений, лучше вместе с физиотерапевтом.',
      attention: 'Сильно мешают в обычной жизни. Пожалуйста, обратитесь к врачу или физиотерапевту для осмотра и плана лечения.',
    } as Record<string, string>,
    hardest: 'Труднее всего',
    rec: [
      'Повторяйте каждые 2–4 недели. Снижение на 10 пунктов и больше — это настоящее улучшение.',
      'Ежедневные упражнения для шеи и спины, прогулки и хороший сон облегчают повседневную жизнь.',
      'Пройдите также проверку боли, чтобы не пропустить тревожные признаки.',
    ],
    note: 'Это наш собственный опросник, построенный по образцу известных клинических опросников (0–4 балла за вопрос, в % от максимума).',
  },
})

export function functionSummary(d: FunctionData) {
  const parts = [d.neck ? functionScore(d.neck) : NaN, d.back ? functionScore(d.back) : NaN].filter(Number.isFinite)
  const overall = parts.length ? Math.max(...parts) : NaN
  return { neck: d.neck ? functionScore(d.neck) : NaN, back: d.back ? functionScore(d.back) : NaN, overall }
}

function Runner({ onDone, onExit }: { onDone: (s: { value: number | null; level: Level }, d: FunctionData) => void; onExit: () => void }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const [area, setArea] = useState<Area | null>(null)
  const [started, setStarted] = useState(false)
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const items = area === 'neck' ? s.neckItems : area === 'back' ? s.backItems : [...s.neckItems, ...s.backItems]

  const choose = (v: number) => {
    const a = [...answers]
    a[i] = v
    setAnswers(a)
    setTimeout(() => {
      if (i + 1 < items.length) setI(i + 1)
      else {
        const nN = s.neckItems.length
        const d: FunctionData = { area: area! }
        if (area === 'neck') d.neck = a
        else if (area === 'back') d.back = a
        else {
          d.neck = a.slice(0, nN)
          d.back = a.slice(nN)
        }
        const sm = functionSummary(d)
        onDone({ value: Math.round(sm.overall), level: functionLevel(sm.overall) }, d)
      }
    }, 220)
  }

  if (!started)
    return (
      <FocusShell title={s.info.name} onExit={onExit}>
        <Stage
          icon={<ClipboardCheck className="h-8 w-8" />}
          title={s.which}
          footer={
            <Button variant="accent" size="lg" disabled={!area} onClick={() => setStarted(true)}>
              {t.btn.start}
            </Button>
          }
        >
          <div className="mt-2 text-left">
            <ChoiceList value={area} onChange={setArea} options={(['neck', 'back', 'both'] as Area[]).map((a) => ({ value: a, label: s[a] }))} />
          </div>
        </Stage>
      </FocusShell>
    )

  const section = area === 'both' ? (i < s.neckItems.length ? s.neck : s.back) : area === 'neck' ? s.neck : s.back
  return (
    <FocusShell title={s.info.name} subtitle={`${section} · ${i + 1} / ${items.length}`} progress={i / items.length} onExit={onExit}>
      <div key={i} className="animate-fade-up flex flex-1 flex-col gap-4">
        <div>
          <div className="text-sm font-medium text-muted">{s.q}</div>
          <h2 className="mt-1 text-xl font-bold leading-snug text-ink">{items[i]}</h2>
        </div>
        <ChoiceList value={answers[i] ?? null} onChange={choose} options={s.opts.map((o, k) => ({ value: k, label: o }))} />
        <div className="pb-safe mt-auto">
          <Button variant="ghost" onClick={() => (i === 0 ? setStarted(false) : setI(i - 1))}>
            {t.btn.back}
          </Button>
        </div>
      </div>
    </FocusShell>
  )
}

function Details({ result }: { result: { data: FunctionData; summary: { level: Level } } }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const lang = useLang()
  const d = result.data
  const sm = functionSummary(d)
  const scale = (v: number, title: string) => (
    <div className="mb-5 last:mb-0">
      <div className="mb-1 text-sm font-semibold text-ink-2">{title}</div>
      <ScaleBar
        min={0}
        max={100}
        value={v}
        valueLabel={`${Math.round(v)}%`}
        format={(x) => `${x}`}
        segments={[
          { to: 10, level: 'great', label: s.labels.great },
          { to: 30, level: 'normal', label: s.labels.normal },
          { to: 50, level: 'borderline', label: s.labels.borderline },
          { to: 100, level: 'attention', label: s.labels.attention },
        ]}
      />
    </div>
  )
  const hardest: string[] = []
  if (d.neck) d.neck.forEach((v, k) => v !== null && v >= 3 && hardest.push(`${s.neckScore}: ${s.neckItems[k]}`))
  if (d.back) d.back.forEach((v, k) => v !== null && v >= 3 && hardest.push(`${s.backScore}: ${s.backItems[k]}`))
  return (
    <>
      <Card className="p-5">
        <SectionTitle>{s.score}</SectionTitle>
        {Number.isFinite(sm.neck) && scale(sm.neck, `${s.neckScore} — ${fmtNum(lang, sm.neck, 0)}%`)}
        {Number.isFinite(sm.back) && scale(sm.back, `${s.backScore} — ${fmtNum(lang, sm.back, 0)}%`)}
        <p className="mt-2 leading-relaxed text-ink-2">{s.meaning[result.summary.level]}</p>
      </Card>
      {hardest.length > 0 && (
        <Card className="p-5">
          <SectionTitle>{s.hardest}</SectionTitle>
          <Bullets items={hardest} />
        </Card>
      )}
      <Card className="p-5">
        <SectionTitle>{t.recommendations}</SectionTitle>
        <Bullets items={s.rec} />
      </Card>
      <p className="text-xs text-muted">{s.note}</p>
    </>
  )
}

const functionTest: TestModule<FunctionData> = {
  kind: 'test',
  id: 'neck-back-function',
  field: 'spine',
  icon: ClipboardCheck,
  minutes: 3,
  requirements: [],
  version: 1,
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  Details,
  headline: (r, lang: Lang) => ({ value: `${r.summary.value ?? '—'}`, unit: '%', label: S[lang].labels[r.summary.level] }),
  trend: { higherIsBetter: false, unit: () => '%', digits: 0 },
}

export default functionTest
