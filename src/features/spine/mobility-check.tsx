import { useState } from 'react'
import { Move } from 'lucide-react'
import type { TestModule } from '../../catalog/types'
import { FocusShell, Stage } from '../../components/shell'
import { Bullets, Button, Callout, Card, SectionTitle, Segmented, cx } from '../../components/ui'
import { ScaleBar } from '../../components/charts'
import { Animated } from '../../components/routine/figures'
import { Figure, type FigureSpec } from '../../components/routine/RoutinePlayer'
import { defineStrings, useStrings, type Lang } from '../../lib/i18n'
import type { Level } from '../../lib/store'
import { common } from '../../i18n/common'
import { ChoiceList } from './questionnaire-ui'
import { mobilityLevel, mobilityScore, type MoveAnswer } from './scoring'
import { STAND, STAND_EXTENSION } from './poses'

type Area = 'neck' | 'back' | 'both'
export interface MobilityData {
  area: Area
  answers: MoveAnswer[]
}

const FORWARD_BEND = { ...STAND, s1: -35, s2: 25, n: 70, h: 100, aN1: 95, aN2: 100, aF1: 92, aF2: 100 }

const MOVES: Record<'neck' | 'back', { id: string; figure: FigureSpec }[]> = {
  neck: [
    { id: 'nFlex', figure: { kind: 'headSide', frames: [{ flex: 0 }, { flex: 32 }] } },
    { id: 'nExt', figure: { kind: 'headSide', frames: [{ flex: 0 }, { flex: -28 }] } },
    { id: 'nRotL', figure: { kind: 'headFront', frames: [{ turn: 0 }, { turn: 1 }] } },
    { id: 'nRotR', figure: { kind: 'headFront', frames: [{ turn: 0 }, { turn: -1 }] } },
    { id: 'nSideL', figure: { kind: 'headFront', frames: [{ tilt: 0 }, { tilt: 30 }] } },
    { id: 'nSideR', figure: { kind: 'headFront', frames: [{ tilt: 0 }, { tilt: -30 }] } },
  ],
  back: [
    { id: 'bFlex', figure: { kind: 'body', frames: [STAND, FORWARD_BEND] } },
    { id: 'bExt', figure: { kind: 'body', frames: [STAND, STAND_EXTENSION] } },
    { id: 'bSideL', figure: { kind: 'bodyFront', frames: [{ bend: 0 }, { bend: -28, reach: 1 }] } },
    { id: 'bSideR', figure: { kind: 'bodyFront', frames: [{ bend: 0 }, { bend: 28, reach: 1 }] } },
    { id: 'bRotL', figure: { kind: 'bodyFront', frames: [{ twist: 0 }, { twist: -1 }] } },
    { id: 'bRotR', figure: { kind: 'bodyFront', frames: [{ twist: 0 }, { twist: 1 }] } },
  ],
}

type MoveText = { name: string; how: string; full: string }
const S = defineStrings({
  en: {
    info: {
      name: 'Neck & back mobility',
      short: 'Check how far and how comfortably you can move.',
      measures: 'You do the usual neck and/or lower back movements and rate each one: how far you could go, and whether it hurt. The result shows your overall mobility, which movements hurt, and differences between left and right.',
      steps: ['Choose the neck, the lower back or both.', 'Watch the animation and do the movement slowly, once or twice.', 'Say how far you could go and whether it hurt.'],
      tips: ['Move slowly and stop where it starts to hurt. Never force it.', 'A mirror helps you see how far you go.', 'When checking your back, hold on to a wall or a chair for balance.'],
      caution: ['Skip any movement that causes sharp pain going into an arm or a leg, dizziness or numbness.'],
    },
    which: 'What do you want to check?',
    neck: 'Neck',
    back: 'Lower back',
    both: 'Both',
    range: 'How far could you go?',
    full: 'All the way, as usual',
    reduced: 'Less than usual',
    limited: 'Very little',
    pain: 'Did it hurt?',
    none: 'No',
    some: 'A little',
    strong: 'A lot',
    painRes: ['No pain', 'Slight pain', 'Strong pain'],
    moves: {
      nFlex: { name: 'Head forward', how: 'Lower your chin towards your chest.', full: 'All the way: your chin touches or almost touches your chest.' },
      nExt: { name: 'Head back', how: 'Look up at the ceiling.', full: 'All the way: you can look straight up at the ceiling.' },
      nRotL: { name: 'Turn your head left', how: 'Turn to look over your left shoulder.', full: 'All the way: your chin is almost in line with your shoulder.' },
      nRotR: { name: 'Turn your head right', how: 'Turn to look over your right shoulder.', full: 'All the way: your chin is almost in line with your shoulder.' },
      nSideL: { name: 'Ear to left shoulder', how: 'Tilt your left ear towards your left shoulder.', full: 'All the way: about halfway to the shoulder.' },
      nSideR: { name: 'Ear to right shoulder', how: 'Tilt your right ear towards your right shoulder.', full: 'All the way: about halfway to the shoulder.' },
      bFlex: { name: 'Bend forward', how: 'Standing, knees straight, slide your hands down towards the floor.', full: 'All the way: your fingertips reach the middle of your shins or lower.' },
      bExt: { name: 'Bend backward', how: 'Hands on your lower back, lean back.', full: 'All the way: you can lean back a little, about 20–30°.' },
      bSideL: { name: 'Bend to the left', how: 'Slide your left hand down the side of your thigh.', full: 'All the way: your fingertips reach about your knee.' },
      bSideR: { name: 'Bend to the right', how: 'Slide your right hand down the side of your thigh.', full: 'All the way: your fingertips reach about your knee.' },
      bRotL: { name: 'Turn your body left', how: 'Sitting, arms crossed, turn your shoulders to the left.', full: 'All the way: about 45°, without moving your hips.' },
      bRotR: { name: 'Turn your body right', how: 'Sitting, arms crossed, turn your shoulders to the right.', full: 'All the way: about 45°, without moving your hips.' },
    } as Record<string, MoveText>,
    mobility: 'Mobility',
    pairs: { nRot: 'turning the head', nSide: 'tilting the head', bSide: 'bending to the side', bRot: 'turning the body' } as Record<string, string>,
    painful: 'Movements that hurt',
    asym: 'Left and right differ',
    asymText: (m: string) => `One side moves differently from the other: ${m}. This often happens with tight muscles or stiff joints.`,
    labels: { great: 'Moves freely', normal: 'Moves well', borderline: 'Somewhat stiff', attention: 'Very stiff' } as Record<string, string>,
    rec: {
      ok: ['Keep moving freely with the neck and back routines and regular movement breaks.'],
      reduced: [
        'Daily exercises (the neck or back routine) usually improve movement within 2–4 weeks.',
        'If movement stays painful or limited for more than 6 weeks, see a physiotherapist or a doctor.',
      ],
    },
  },
  uz: {
    info: {
      name: 'Bo‘yin va bel harakatchanligi',
      short: 'Qanchalik keng va qulay harakat qila olishingizni tekshiring.',
      measures: 'Bo‘yin va/yoki belning odatiy harakatlarini bajarib, har birini baholaysiz: qanchalik bora oldingiz va og‘ridimi. Natija umumiy harakatchanlikni, qaysi harakat og‘rishini va chap-o‘ng orasidagi farqni ko‘rsatadi.',
      steps: ['Bo‘yin, bel yoki ikkalasini tanlang.', 'Animatsiyaga qarang va harakatni sekin, bir-ikki marta bajaring.', 'Qanchalik bora olganingiz va og‘riganini belgilang.'],
      tips: ['Sekin harakat qiling va og‘riq boshlangan joyda to‘xtang. Hech qachon zo‘rlamang.', 'Ko‘zgu qanchalik bora olganingizni ko‘rishga yordam beradi.', 'Belni tekshirganda muvozanat uchun devor yoki stulga suyaning.'],
      caution: ['Qo‘l yoki oyoqqa tarqaladigan o‘tkir og‘riq, bosh aylanishi yoki uvishish beradigan harakatni bajarmang.'],
    },
    which: 'Nimani tekshirmoqchisiz?',
    neck: 'Bo‘yin',
    back: 'Bel',
    both: 'Ikkalasi',
    range: 'Qanchalik bora oldingiz?',
    full: 'Oxirigacha, odatdagidek',
    reduced: 'Odatdagidan kamroq',
    limited: 'Juda oz',
    pain: 'Og‘ridimi?',
    none: 'Yo‘q',
    some: 'Biroz',
    strong: 'Qattiq',
    painRes: ['Og‘riqsiz', 'Biroz og‘riq', 'Qattiq og‘riq'],
    moves: {
      nFlex: { name: 'Boshni oldinga egish', how: 'Iyagingizni ko‘kragingizga tushiring.', full: 'Oxirigacha: iyak ko‘krakka tegadi yoki deyarli tegadi.' },
      nExt: { name: 'Boshni orqaga tashlash', how: 'Shiftga qarang.', full: 'Oxirigacha: to‘ppa-to‘g‘ri shiftga qaray olasiz.' },
      nRotL: { name: 'Boshni chapga burish', how: 'Chap yelkangiz ustidan qarash uchun buriling.', full: 'Oxirigacha: iyak deyarli yelka bilan bir chiziqda.' },
      nRotR: { name: 'Boshni o‘ngga burish', how: 'O‘ng yelkangiz ustidan qarash uchun buriling.', full: 'Oxirigacha: iyak deyarli yelka bilan bir chiziqda.' },
      nSideL: { name: 'Quloqni chap yelkaga', how: 'Chap qulog‘ingizni chap yelkangiz tomon egiltiring.', full: 'Oxirigacha: yelkagacha taxminan yarim yo‘l.' },
      nSideR: { name: 'Quloqni o‘ng yelkaga', how: 'O‘ng qulog‘ingizni o‘ng yelkangiz tomon egiltiring.', full: 'Oxirigacha: yelkagacha taxminan yarim yo‘l.' },
      bFlex: { name: 'Oldinga egilish', how: 'Tik turib, tizzalarni bukmasdan, qo‘llaringizni polga tomon sirg‘anting.', full: 'Oxirigacha: barmoq uchlari boldirning o‘rtasiga yoki pastroqqa yetadi.' },
      bExt: { name: 'Orqaga egilish', how: 'Qo‘llaringizni belingizga qo‘yib, orqaga egiling.', full: 'Oxirigacha: orqaga biroz, taxminan 20–30° egila olasiz.' },
      bSideL: { name: 'Chapga egilish', how: 'Chap qo‘lingizni son yon tomoni bo‘ylab pastga sirg‘anting.', full: 'Oxirigacha: barmoq uchlari taxminan tizzagacha yetadi.' },
      bSideR: { name: 'O‘ngga egilish', how: 'O‘ng qo‘lingizni son yon tomoni bo‘ylab pastga sirg‘anting.', full: 'Oxirigacha: barmoq uchlari taxminan tizzagacha yetadi.' },
      bRotL: { name: 'Gavdani chapga burish', how: 'O‘tirgan holda, qo‘llarni ko‘krakda chalishtirib, yelkalarni chapga buring.', full: 'Oxirigacha: sonni qimirlatmasdan taxminan 45°.' },
      bRotR: { name: 'Gavdani o‘ngga burish', how: 'O‘tirgan holda, qo‘llarni ko‘krakda chalishtirib, yelkalarni o‘ngga buring.', full: 'Oxirigacha: sonni qimirlatmasdan taxminan 45°.' },
    } as Record<string, MoveText>,
    mobility: 'Harakatchanlik',
    pairs: { nRot: 'boshni burish', nSide: 'boshni yonga egish', bSide: 'yonga egilish', bRot: 'gavdani burish' } as Record<string, string>,
    painful: 'Og‘riydigan harakatlar',
    asym: 'Chap va o‘ng farqi',
    asymText: (m: string) => `Bir tomonga harakat ikkinchisidan farq qiladi: ${m}. Bu ko‘pincha mushaklar taranglashganda yoki bo‘g‘imlar qotganda bo‘ladi.`,
    labels: { great: 'Erkin harakatlanadi', normal: 'Yaxshi harakatlanadi', borderline: 'Biroz qotgan', attention: 'Ancha qotgan' } as Record<string, string>,
    rec: {
      ok: ['Bo‘yin va bel mashqlari hamda muntazam harakat tanaffuslari bilan harakatchanligingizni saqlang.'],
      reduced: [
        'Har kungi mashqlar (bo‘yin yoki bel mashqlari) odatda 2–4 hafta ichida harakatni yaxshilaydi.',
        'Agar harakat 6 haftadan ko‘proq og‘riqli yoki cheklangan bo‘lib qolsa, fizioterapevt yoki shifokorga murojaat qiling.',
      ],
    },
  },
  ru: {
    info: {
      name: 'Подвижность шеи и спины',
      short: 'Проверьте, насколько свободно и комфортно вы двигаетесь.',
      measures: 'Вы выполняете обычные движения шеи и/или поясницы и оцениваете каждое: насколько далеко получилось и было ли больно. Результат показывает общую подвижность, болезненные движения и разницу между левой и правой стороной.',
      steps: ['Выберите шею, поясницу или обе области.', 'Посмотрите анимацию и медленно выполните движение раз-два.', 'Отметьте, насколько далеко получилось и было ли больно.'],
      tips: ['Двигайтесь медленно и останавливайтесь там, где начинается боль. Никогда не форсируйте.', 'Зеркало поможет увидеть, насколько далеко вы двигаетесь.', 'Проверяя спину, держитесь за стену или стул для равновесия.'],
      caution: ['Пропустите движение, если оно вызывает резкую боль, отдающую в руку или ногу, головокружение или онемение.'],
    },
    which: 'Что хотите проверить?',
    neck: 'Шея',
    back: 'Поясница',
    both: 'Обе',
    range: 'Насколько далеко получилось?',
    full: 'Полностью, как обычно',
    reduced: 'Меньше обычного',
    limited: 'Совсем чуть-чуть',
    pain: 'Было больно?',
    none: 'Нет',
    some: 'Немного',
    strong: 'Сильно',
    painRes: ['Без боли', 'Немного больно', 'Сильная боль'],
    moves: {
      nFlex: { name: 'Наклон головы вперёд', how: 'Опустите подбородок к груди.', full: 'Полностью: подбородок касается груди или почти касается.' },
      nExt: { name: 'Наклон головы назад', how: 'Посмотрите на потолок.', full: 'Полностью: можете смотреть прямо в потолок.' },
      nRotL: { name: 'Поворот головы влево', how: 'Повернитесь, чтобы посмотреть через левое плечо.', full: 'Полностью: подбородок почти на одной линии с плечом.' },
      nRotR: { name: 'Поворот головы вправо', how: 'Повернитесь, чтобы посмотреть через правое плечо.', full: 'Полностью: подбородок почти на одной линии с плечом.' },
      nSideL: { name: 'Ухо к левому плечу', how: 'Наклоните левое ухо к левому плечу.', full: 'Полностью: примерно на полпути к плечу.' },
      nSideR: { name: 'Ухо к правому плечу', how: 'Наклоните правое ухо к правому плечу.', full: 'Полностью: примерно на полпути к плечу.' },
      bFlex: { name: 'Наклон вперёд', how: 'Стоя, не сгибая колен, скользите руками вниз к полу.', full: 'Полностью: кончики пальцев достают до середины голени или ниже.' },
      bExt: { name: 'Прогиб назад', how: 'Руки на пояснице, отклонитесь назад.', full: 'Полностью: можете отклониться назад примерно на 20–30°.' },
      bSideL: { name: 'Наклон влево', how: 'Скользите левой рукой вниз по боковой стороне бедра.', full: 'Полностью: кончики пальцев примерно у колена.' },
      bSideR: { name: 'Наклон вправо', how: 'Скользите правой рукой вниз по боковой стороне бедра.', full: 'Полностью: кончики пальцев примерно у колена.' },
      bRotL: { name: 'Поворот корпуса влево', how: 'Сидя, руки скрещены на груди, поверните плечи влево.', full: 'Полностью: примерно на 45°, не сдвигая таз.' },
      bRotR: { name: 'Поворот корпуса вправо', how: 'Сидя, руки скрещены на груди, поверните плечи вправо.', full: 'Полностью: примерно на 45°, не сдвигая таз.' },
    } as Record<string, MoveText>,
    mobility: 'Подвижность',
    pairs: { nRot: 'поворот головы', nSide: 'наклон головы в сторону', bSide: 'наклон в сторону', bRot: 'поворот корпуса' } as Record<string, string>,
    painful: 'Болезненные движения',
    asym: 'Разница слева и справа',
    asymText: (m: string) => `В одну сторону движение не такое, как в другую: ${m}. Так часто бывает при напряжённых мышцах или скованных суставах.`,
    labels: { great: 'Двигается свободно', normal: 'Хорошая подвижность', borderline: 'Небольшая скованность', attention: 'Сильная скованность' } as Record<string, string>,
    rec: {
      ok: ['Сохраняйте подвижность с помощью комплексов для шеи и спины и регулярных перерывов на движение.'],
      reduced: [
        'Ежедневные упражнения (комплекс для шеи или спины) обычно улучшают подвижность за 2–4 недели.',
        'Если движения остаются болезненными или ограниченными дольше 6 недель, обратитесь к физиотерапевту или врачу.',
      ],
    },
  },
})

function Runner({ onDone, onExit }: { onDone: (s: { value: number | null; level: Level }, d: MobilityData) => void; onExit: () => void }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const [area, setArea] = useState<Area>('neck')
  const [started, setStarted] = useState(false)
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<MoveAnswer[]>([])
  const [range, setRange] = useState<0 | 1 | 2 | null>(null)
  const [pain, setPain] = useState<0 | 1 | 2 | null>(null)
  const list = area === 'neck' ? MOVES.neck : area === 'back' ? MOVES.back : [...MOVES.neck, ...MOVES.back]
  const mv = list[i]

  const next = () => {
    const a = [...answers.slice(0, i), { id: mv.id, range: range!, pain: pain! }]
    setAnswers(a)
    setRange(null)
    setPain(null)
    if (i + 1 < list.length) {
      setI(i + 1)
      window.scrollTo({ top: 0 })
      return
    }
    const sc = mobilityScore(a)
    onDone({ value: Math.round(sc.pct), level: mobilityLevel(sc.pct, sc.strong) }, { area, answers: a })
  }

  if (!started)
    return (
      <FocusShell title={s.info.name} onExit={onExit}>
        <Stage
          icon={<Move className="h-8 w-8" />}
          title={s.which}
          footer={
            <Button variant="accent" size="lg" onClick={() => setStarted(true)}>
              {t.btn.start}
            </Button>
          }
        >
          <Segmented value={area} onChange={setArea} options={(['neck', 'back', 'both'] as Area[]).map((a) => ({ value: a, label: s[a] }))} />
        </Stage>
      </FocusShell>
    )

  const txt = s.moves[mv.id]
  return (
    <FocusShell title={s.info.name} subtitle={`${i + 1} / ${list.length}`} progress={i / list.length} onExit={onExit}>
      <div key={mv.id} className="animate-fade-up flex flex-1 flex-col gap-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-ink">{txt.name}</h2>
          <p className="mt-1 text-ink-2">{txt.how}</p>
        </div>
        <div className="mx-auto aspect-[200/170] w-full max-w-[260px] rounded-3xl bg-surface shadow-card">
          <Animated frames={mv.figure.frames} period={3.5} hold={0.35} render={(p) => <Figure spec={mv.figure} pose={p} mirror={false} />} />
        </div>
        <p className="text-center text-sm text-muted">{txt.full}</p>
        <div>
          <div className="mb-2 font-semibold text-ink">{s.range}</div>
          <ChoiceList
            value={range}
            onChange={setRange}
            options={[
              { value: 2 as const, label: s.full },
              { value: 1 as const, label: s.reduced },
              { value: 0 as const, label: s.limited },
            ]}
          />
        </div>
        <div>
          <div className="mb-2 font-semibold text-ink">{s.pain}</div>
          <Segmented
            value={pain ?? -1}
            onChange={(v) => setPain(v as 0 | 1 | 2)}
            options={[
              { value: 0, label: s.none },
              { value: 1, label: s.some },
              { value: 2, label: s.strong },
            ]}
          />
        </div>
        <div className="pb-safe mt-auto grid grid-cols-2 gap-3 pt-2">
          <Button variant="secondary" size="lg" onClick={() => (i === 0 ? setStarted(false) : setI(i - 1))}>
            {t.btn.back}
          </Button>
          <Button variant="accent" size="lg" disabled={range === null || pain === null} onClick={next}>
            {i + 1 < list.length ? t.btn.next : t.btn.finish}
          </Button>
        </div>
      </div>
    </FocusShell>
  )
}

function Details({ result }: { result: { data: MobilityData; summary: { level: Level } } }) {
  const s = useStrings(S)
  const t = useStrings(common)
  const d = result.data
  const sc = mobilityScore(d.answers)
  const rangeTxt = [s.limited, s.reduced, s.full]
  const painTxt = s.painRes
  const asymNames = sc.asym.map((b) => s.pairs[b] ?? b)
  return (
    <>
      <Card className="p-5">
        <SectionTitle>{s.mobility}</SectionTitle>
        <ScaleBar
          min={0}
          max={100}
          value={sc.pct}
          valueLabel={`${Math.round(sc.pct)}%`}
          format={(x) => `${x}`}
          segments={[
            { to: 50, level: 'attention' },
            { to: 75, level: 'borderline' },
            { to: 90, level: 'normal' },
            { to: 100, level: 'great' },
          ]}
        />
        <p className="mt-3 font-semibold text-ink">{s.labels[result.summary.level] ?? ''}</p>
      </Card>
      <Card className="p-5">
        <ul className="divide-y divide-line">
          {d.answers.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="font-medium text-ink">{s.moves[a.id].name}</span>
              <span className="flex shrink-0 gap-1.5">
                <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold', a.range === 2 ? 'bg-great-soft text-great' : a.range === 1 ? 'bg-borderline-soft text-borderline' : 'bg-urgent-soft text-urgent')}>{rangeTxt[a.range]}</span>
                {a.pain > 0 && <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold', a.pain === 1 ? 'bg-borderline-soft text-borderline' : 'bg-urgent-soft text-urgent')}>{painTxt[a.pain]}</span>}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">
          {s.painful}: {sc.painful} / {d.answers.length}
        </p>
      </Card>
      {sc.asym.length > 0 && <Callout tone="info" title={s.asym}>{s.asymText(asymNames.join(', '))}</Callout>}
      <Card className="p-5">
        <SectionTitle>{t.recommendations}</SectionTitle>
        <Bullets items={sc.pct >= 90 && sc.painful === 0 ? s.rec.ok : s.rec.reduced} />
      </Card>
    </>
  )
}

const mobilityCheck: TestModule<MobilityData> = {
  kind: 'test',
  id: 'mobility-check',
  field: 'spine',
  icon: Move,
  minutes: 4,
  requirements: ['space'],
  version: 1,
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  Details,
  headline: (r, lang: Lang) => ({ value: `${r.summary.value ?? '—'}`, unit: '%', label: S[lang].labels[r.summary.level] }),
  trend: { higherIsBetter: true, unit: () => '%', digits: 0 },
}

export default mobilityCheck
