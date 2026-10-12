import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import type { TestModule } from "../../catalog/types";
import { FocusShell } from "../../components/shell";
import {
  Bullets,
  Button,
  Callout,
  Card,
  SectionTitle,
  cx,
} from "../../components/ui";
import { CompareBars } from "../../components/charts";
import { defineStrings, useStrings, type Lang } from "../../lib/i18n";
import type { Level } from "../../lib/store";
import { common } from "../../i18n/common";
import { ChoiceList, NrsScale, YesNo } from "./questionnaire-ui";
import { BODY_BACK, BODY_BACK_VIEWBOX } from "./body-back";
import {
  BACK_REGIONS,
  FLAGS,
  NECK_REGIONS,
  flagSeverity,
  nrsCategory,
  painLevel,
  type FlagId,
  type Region,
} from "./scoring";

export interface PainData {
  regions: Region[];
  now: number;
  avg: number;
  worst: number;
  duration: "acute" | "subacute" | "chronic";
  radiating: boolean;
  numbness: boolean;
  flags: Partial<Record<FlagId, boolean>>;
}

type Flags = Record<FlagId, string>;
const S = defineStrings({
  en: {
    info: {
      name: "Neck & back pain check",
      short: "Where it hurts, how much and for how long, plus warning signs.",
      measures:
        "The questions doctors and physiotherapists ask about neck and back pain: where it hurts, how strong the pain is (0 to 10), how long you’ve had it, whether it spreads to an arm or a leg, and warning signs that need a doctor soon.",
      steps: [
        "Mark where it hurts.",
        "Rate your pain now, on average and at its worst over the past week.",
        "Answer a few questions about how long it has lasted and about warning signs.",
      ],
      tips: [
        "Answer for the past 7 days.",
        "Even if nothing hurts right now, you can still save a result to follow your recovery.",
      ],
    },
    where: "Where does it hurt?",
    whereHint: "Tap where it hurts. The body is shown from behind.",
    sideL: "Left",
    sideR: "Right",
    noPain: "Nothing hurts",
    intensity: "How strong is the pain?",
    now: "Right now",
    avg: "On average, past 7 days",
    worst: "At its worst, past 7 days",
    noneLabel: "No pain",
    worstLabel: "Worst imaginable",
    howLong: "How long have you had this pain?",
    acute: "Less than 6 weeks",
    subacute: "6 to 12 weeks",
    chronic: "More than 3 months",
    radiating:
      "Does the pain go down into an arm or a leg (below the elbow or knee)?",
    numbness:
      "Do you have numbness, tingling or pins and needles in an arm or a leg?",
    flagsTitle: "Important safety questions",
    flagsHint: "They help spot rare but serious causes.",
    yes: "Yes",
    no: "No",
    flags: {
      fever: "Fever, chills or feeling generally unwell along with the pain",
      weight: "Weight loss in recent months without a clear reason",
      cancer: "You have had cancer",
      trauma: "The pain started after a fall, an accident or a serious injury",
      night:
        "Constant, strong pain at night that doesn’t ease with rest or changing position",
      saddle: "Numbness around the groin, genitals or buttocks",
      bladder: "New trouble passing urine, or loss of bladder or bowel control",
      legWeak: "Weakness in one or both legs that is getting worse",
      headacheFever:
        "A sudden, very strong headache, or a stiff neck together with fever",
      neuro:
        "Dizziness, double vision, trouble speaking or swallowing, or sudden falls",
      clumsy: "Clumsy hands (buttons, writing) or unsteady walking",
      armWeak: "Weakness in an arm or a hand",
    } as Flags,
    see: "See the result",
    regions: {
      neck: "Neck",
      shoulderL: "Left shoulder",
      shoulderR: "Right shoulder",
      upperBack: "Upper back",
      lowerBack: "Lower back",
      hips: "Hips / buttocks",
      armL: "Left arm",
      armR: "Right arm",
      legL: "Left leg",
      legR: "Right leg",
    } as Record<Region, string>,
    cat: {
      none: "No pain",
      mild: "Mild pain",
      moderate: "Moderate pain",
      severe: "Strong pain",
    } as Record<string, string>,
    location: "Where it hurts",
    painNrs: "Pain (0–10)",
    durationLabel: "How long",
    emergencyTitle: "Get medical help now",
    emergencyText:
      "Some of your answers can be signs of a serious problem, such as a trapped nerve or something that needs emergency treatment. Please go to an emergency department or call an ambulance now. Don’t do the exercises.",
    urgentTitle: "Please see a doctor soon",
    urgentShort: "See a doctor soon",
    emergencyShort: "Get help now",
    urgentText:
      "You have one of the warning signs. Usually the cause is not serious, but a doctor should examine you in the next few days, before you start exercising.",
    flagged: "Warning signs you marked",
    radiatingNote:
      "Pain that goes into an arm or a leg, or numbness, suggests an irritated nerve (for example, sciatica). It usually gets better within 6–12 weeks, but see a doctor if it doesn’t improve, gets worse or causes weakness.",
    chronicNote:
      "Pain that lasts more than 3 months is called chronic. What helps most is regular exercise and staying active. A physiotherapist can put together a plan just for you.",
    rec: {
      ok: [
        "Stay active: keep up your usual activities as much as the pain allows. Lying in bed slows recovery.",
        "Try the neck or back routine every day. Warmth and short walks often help.",
        "Most neck and back pain gets better within a few weeks. Repeat this check to follow your progress.",
      ],
      severe: [
        "If the pain is strong, ask a doctor about pain relief so you can keep moving.",
        "Gentle movement (walking, the routines) is still better than lying in bed.",
      ],
    },
  },
  uz: {
    info: {
      name: "Bo‘yin va bel og‘rig‘i",
      short:
        "Qayer, qanchalik kuchli va qancha vaqtdan beri og‘riydi, hamda xavfli belgilar.",
      measures:
        "Shifokor va fizioterapevtlar bo‘yin-bel og‘rig‘ida beradigan savollar: qayer og‘riydi, og‘riq qanchalik kuchli (0 dan 10 gacha), qancha vaqtdan beri, qo‘l yoki oyoqqa tarqaladimi va tez orada shifokorga ko‘rinishni talab qiladigan xavfli belgilar.",
      steps: [
        "Qayer og‘rishini belgilang.",
        "Og‘riqni hozir, o‘tgan haftada o‘rtacha va eng kuchli paytida baholang.",
        "Og‘riq qancha davom etayotgani va xavfli belgilar haqidagi bir nechta savolga javob bering.",
      ],
      tips: [
        "Oxirgi 7 kun bo‘yicha javob bering.",
        "Hozir hech narsa og‘rimasa ham, tiklanishni kuzatish uchun natijani saqlashingiz mumkin.",
      ],
    },
    where: "Qayeringiz og‘riydi?",
    whereHint: "Og‘riyotgan joyni bosing. Tana orqa tomondan ko‘rsatilgan.",
    sideL: "Chap",
    sideR: "O‘ng",
    noPain: "Hech narsa og‘rimaydi",
    intensity: "Og‘riq qanchalik kuchli?",
    now: "Hozir",
    avg: "O‘tgan 7 kunda o‘rtacha",
    worst: "O‘tgan 7 kundagi eng kuchlisi",
    noneLabel: "Og‘riq yo‘q",
    worstLabel: "Chidab bo‘lmas",
    howLong: "Bu og‘riq qachondan beri bor?",
    acute: "6 haftadan kam",
    subacute: "6–12 hafta",
    chronic: "3 oydan ko‘p",
    radiating:
      "Og‘riq qo‘l yoki oyoqqa (tirsak yoki tizzadan pastga) tarqaladimi?",
    numbness: "Qo‘l yoki oyoqda uvishish yoki “chumoli yurgandek” his bormi?",
    flagsTitle: "Muhim xavfsizlik savollari",
    flagsHint:
      "Ular kam uchraydigan, lekin jiddiy sabablarni aniqlashga yordam beradi.",
    yes: "Ha",
    no: "Yo‘q",
    flags: {
      fever: "Og‘riq bilan birga isitma, qaltirash yoki umumiy holsizlik",
      weight: "So‘nggi oylarda sababsiz ozish",
      cancer: "Ilgari saraton kasalligi bo‘lgan",
      trauma:
        "Og‘riq yiqilish, avariya yoki jiddiy jarohatdan keyin boshlangan",
      night:
        "Dam olganda yoki holatni o‘zgartirganda ham qolmaydigan doimiy, kuchli tungi og‘riq",
      saddle: "Chot, jinsiy a’zolar yoki dumba atrofida uvishish",
      bladder:
        "Siyishda yangi paydo bo‘lgan qiyinchilik yoki siydik yoxud axlatni tuta olmaslik",
      legWeak: "Bir yoki ikkala oyoqda kuchayib borayotgan holsizlik",
      headacheFever:
        "To‘satdan juda kuchli bosh og‘rig‘i yoki isitma bilan birga bo‘yin qotishi",
      neuro:
        "Bosh aylanishi, ko‘zda ikkita ko‘rinish, gapirish yoki yutishda qiyinchilik yoki to‘satdan yiqilish",
      clumsy:
        "Qo‘llarda noaniqlik (tugma qadash, yozish qiyin) yoki gandiraklab yurish",
      armWeak: "Qo‘l yoki kaftda holsizlik",
    } as Flags,
    see: "Natijani ko‘rish",
    regions: {
      neck: "Bo‘yin",
      shoulderL: "Chap yelka",
      shoulderR: "O‘ng yelka",
      upperBack: "Kurak sohasi",
      lowerBack: "Bel",
      hips: "Son / dumba",
      armL: "Chap qo‘l",
      armR: "O‘ng qo‘l",
      legL: "Chap oyoq",
      legR: "O‘ng oyoq",
    } as Record<Region, string>,
    cat: {
      none: "Og‘riq yo‘q",
      mild: "Yengil og‘riq",
      moderate: "O‘rtacha og‘riq",
      severe: "Kuchli og‘riq",
    } as Record<string, string>,
    location: "Og‘riydigan joy",
    painNrs: "Og‘riq (0–10)",
    durationLabel: "Qachondan beri",
    emergencyTitle: "Hoziroq tibbiy yordamga murojaat qiling",
    emergencyText:
      "Ba’zi javoblaringiz jiddiy muammo belgisi bo‘lishi mumkin, masalan, nerv qisilishi yoki shoshilinch davolashni talab qiladigan holat. Iltimos, hoziroq shoshilinch yordam bo‘limiga boring yoki tez yordam chaqiring. Mashqlarni bajarmang.",
    urgentTitle: "Tez orada shifokorga ko‘rining",
    urgentShort: "Tez orada shifokorga",
    emergencyShort: "Hoziroq yordam oling",
    urgentText:
      "Sizda xavfli belgilardan biri bor. Ko‘pincha sababi jiddiy emas, lekin mashqlarni boshlashdan oldin, yaqin kunlarda shifokor sizni ko‘rishi kerak.",
    flagged: "Siz belgilagan xavfli belgilar",
    radiatingNote:
      "Qo‘l yoki oyoqqa tarqaladigan og‘riq yoki uvishish nerv tirnalishidan dalolat beradi (masalan, ishias). Odatda 6–12 hafta ichida yaxshilanadi, lekin yaxshilanmasa, kuchaysa yoki holsizlik paydo bo‘lsa, shifokorga murojaat qiling.",
    chronicNote:
      "3 oydan ortiq davom etgan og‘riq surunkali deyiladi. Eng ko‘p yordam beradigani — muntazam mashq va faol turmush. Fizioterapevt sizga alohida reja tuzib berishi mumkin.",
    rec: {
      ok: [
        "Faol bo‘ling: og‘riq imkon bergancha odatiy ishlaringizni davom ettiring. Yotib olish tiklanishni sekinlashtiradi.",
        "Har kuni bo‘yin yoki bel mashqlarini bajarib ko‘ring. Issiqlik va qisqa sayrlar ko‘pincha yordam beradi.",
        "Bo‘yin va bel og‘rig‘ining ko‘pi bir necha hafta ichida o‘tib ketadi. O‘zgarishni kuzatish uchun bu tekshiruvni takrorlang.",
      ],
      severe: [
        "Og‘riq kuchli bo‘lsa, harakatda davom etishingiz uchun shifokordan og‘riq qoldiruvchi haqida so‘rang.",
        "Yengil harakat (yurish, mashqlar) baribir yotib olishdan yaxshiroq.",
      ],
    },
  },
  ru: {
    info: {
      name: "Боль в шее и спине",
      short:
        "Где болит, насколько сильно и как долго, плюс тревожные признаки.",
      measures:
        "Вопросы, которые задают врачи и физиотерапевты при боли в шее и спине: где болит, насколько сильная боль (от 0 до 10), как давно, отдаёт ли в руку или ногу, и тревожные признаки, при которых нужно скорее к врачу.",
      steps: [
        "Отметьте, где болит.",
        "Оцените боль сейчас, в среднем и в самый сильный момент за последнюю неделю.",
        "Ответьте на несколько вопросов о длительности и тревожных признаках.",
      ],
      tips: [
        "Отвечайте за последние 7 дней.",
        "Даже если сейчас ничего не болит, можно сохранить результат, чтобы следить за восстановлением.",
      ],
    },
    where: "Где болит?",
    whereHint: "Нажмите там, где болит. Тело показано со спины.",
    sideL: "Слева",
    sideR: "Справа",
    noPain: "Ничего не болит",
    intensity: "Насколько сильная боль?",
    now: "Сейчас",
    avg: "В среднем за 7 дней",
    worst: "Самая сильная за 7 дней",
    noneLabel: "Нет боли",
    worstLabel: "Невыносимая",
    howLong: "Как давно у вас эта боль?",
    acute: "Меньше 6 недель",
    subacute: "6–12 недель",
    chronic: "Больше 3 месяцев",
    radiating: "Отдаёт ли боль в руку или ногу (ниже локтя или колена)?",
    numbness: "Есть ли онемение, покалывание или «мурашки» в руке или ноге?",
    flagsTitle: "Важные вопросы о безопасности",
    flagsHint: "Они помогают не пропустить редкие, но серьёзные причины.",
    yes: "Да",
    no: "Нет",
    flags: {
      fever: "Температура, озноб или общее недомогание вместе с болью",
      weight: "Похудение за последние месяцы без понятной причины",
      cancer: "У вас было онкологическое заболевание",
      trauma: "Боль началась после падения, аварии или серьёзной травмы",
      night:
        "Постоянная сильная боль ночью, которая не проходит в покое и при смене позы",
      saddle: "Онемение в паху, в области половых органов или ягодиц",
      bladder: "Новые трудности с мочеиспусканием или недержание мочи или кала",
      legWeak: "Нарастающая слабость в одной или обеих ногах",
      headacheFever:
        "Внезапная очень сильная головная боль или скованность шеи вместе с температурой",
      neuro:
        "Головокружение, двоение в глазах, нарушение речи или глотания, внезапные падения",
      clumsy: "Неловкость в руках (пуговицы, письмо) или шаткая походка",
      armWeak: "Слабость в руке или кисти",
    } as Flags,
    see: "Посмотреть результат",
    regions: {
      neck: "Шея",
      shoulderL: "Левое плечо",
      shoulderR: "Правое плечо",
      upperBack: "Верх спины",
      lowerBack: "Поясница",
      hips: "Бёдра / ягодицы",
      armL: "Левая рука",
      armR: "Правая рука",
      legL: "Левая нога",
      legR: "Правая нога",
    } as Record<Region, string>,
    cat: {
      none: "Нет боли",
      mild: "Слабая боль",
      moderate: "Умеренная боль",
      severe: "Сильная боль",
    } as Record<string, string>,
    location: "Где болит",
    painNrs: "Боль (0–10)",
    durationLabel: "Как давно",
    emergencyTitle: "Срочно обратитесь за помощью",
    emergencyText:
      "Некоторые ответы могут говорить о серьёзной проблеме — например, о сдавлении нерва или состоянии, которое нужно лечить срочно. Пожалуйста, прямо сейчас обратитесь в приёмное отделение или вызовите скорую. Не выполняйте упражнения.",
    urgentTitle: "Покажитесь врачу в ближайшее время",
    urgentShort: "Скоро к врачу",
    emergencyShort: "Срочно за помощью",
    urgentText:
      "У вас есть один из тревожных признаков. Чаще всего причина несерьёзная, но врач должен осмотреть вас в ближайшие дни, прежде чем вы начнёте упражнения.",
    flagged: "Отмеченные тревожные признаки",
    radiatingNote:
      "Боль, отдающая в руку или ногу, или онемение говорят о раздражении нерва (например, при ишиасе). Обычно становится лучше за 6–12 недель, но обратитесь к врачу, если улучшения нет, стало хуже или появилась слабость.",
    chronicNote:
      "Боль дольше 3 месяцев называют хронической. Больше всего помогают регулярные упражнения и активный образ жизни. Физиотерапевт может составить программу лично для вас.",
    rec: {
      ok: [
        "Оставайтесь активными: насколько позволяет боль, занимайтесь обычными делами. Постельный режим замедляет восстановление.",
        "Попробуйте каждый день комплекс для шеи или спины. Часто помогают тепло и короткие прогулки.",
        "Большинство болей в шее и спине проходят за несколько недель. Повторяйте эту проверку, чтобы следить за динамикой.",
      ],
      severe: [
        "Если боль сильная, спросите врача об обезболивании, чтобы продолжать двигаться.",
        "Мягкие движения (ходьба, комплексы упражнений) всё равно лучше постельного режима.",
      ],
    },
  },
});

const REGION_ORDER: Region[] = [
  "neck",
  "shoulderL",
  "shoulderR",
  "upperBack",
  "lowerBack",
  "hips",
  "armL",
  "armR",
  "legL",
  "legR",
];
const PARTS = REGION_ORDER.map((id) => ({
  id,
  paths: BODY_BACK.filter((p) => p.r === id).map((p) => p.d),
}));
const HEAD = BODY_BACK.filter((p) => p.r === null).map((p) => p.d);

/** Body seen from behind; each muscle group belongs to one region, and tapping any of it toggles the whole region. */
function BodyMap({
  selected,
  onToggle,
  labels,
  sides,
}: {
  selected: Region[];
  onToggle: (r: Region) => void;
  labels: Record<Region, string>;
  sides: [string, string];
}) {
  return (
    <div className="mx-auto w-fit">
      <svg
        viewBox={BODY_BACK_VIEWBOX}
        className="mx-auto block h-[min(54vh,440px)] w-auto touch-manipulation"
        role="group"
      >
        {HEAD.map((d, i) => (
          <path key={i} d={d} fill="var(--body-head)" />
        ))}
        {PARTS.map((r) => {
          const on = selected.includes(r.id);
          return (
            <g
              key={r.id}
              role="checkbox"
              aria-checked={on}
              aria-label={labels[r.id]}
              tabIndex={0}
              onClick={() => onToggle(r.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggle(r.id);
                }
              }}
              className={cx(
                "cursor-pointer outline-none transition-colors [&:focus-visible>path]:stroke-[var(--primary)]",
                on
                  ? "fill-[var(--urgent)]"
                  : "fill-[var(--body-part)] hover:fill-[var(--body-part-hover)]",
              )}
            >
              {/* The neck is two thin strips; a larger invisible area makes it easy to tap. */}
              {r.id === 'neck' && <rect x={1012} y={212} width={144} height={86} fill="transparent" />}
              {r.paths.map((d, i) => (
                // The wide transparent stroke closes the thin gaps between muscles, so taps there still count.
                <path
                  key={i}
                  d={d}
                  stroke="transparent"
                  strokeWidth={20}
                  strokeLinejoin="round"
                />
              ))}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between px-1 text-xs font-semibold text-muted">
        <span>{sides[0]}</span>
        <span>{sides[1]}</span>
      </div>
    </div>
  );
}

function Runner({
  onDone,
  onExit,
}: {
  onDone: (s: { value: number | null; level: Level }, d: PainData) => void;
  onExit: () => void;
}) {
  const s = useStrings(S);
  const t = useStrings(common);
  const [page, setPage] = useState(0);
  const [regions, setRegions] = useState<Region[]>([]);
  const [none, setNone] = useState(false);
  const [nrs, setNrs] = useState<{
    now: number | null;
    avg: number | null;
    worst: number | null;
  }>({ now: null, avg: null, worst: null });
  const [duration, setDuration] = useState<PainData["duration"] | null>(null);
  const [radiating, setRadiating] = useState<boolean | null>(null);
  const [numbness, setNumbness] = useState<boolean | null>(null);
  const [flags, setFlags] = useState<Partial<Record<FlagId, boolean>>>({});

  const neckAsked = regions.some((r) => NECK_REGIONS.includes(r));
  const backAsked = regions.some((r) => BACK_REGIONS.includes(r));
  const flagList = [
    ...FLAGS.general,
    ...(backAsked ? FLAGS.back : []),
    ...(neckAsked ? FLAGS.neck : []),
  ];

  const finish = () => {
    const data: PainData = {
      regions,
      now: none ? 0 : (nrs.now ?? 0),
      avg: none ? 0 : (nrs.avg ?? 0),
      worst: none ? 0 : (nrs.worst ?? 0),
      duration: duration ?? "acute",
      radiating: !!radiating,
      numbness: !!numbness,
      flags,
    };
    onDone(
      { value: data.avg, level: painLevel(data.avg, flagSeverity(flags)) },
      data,
    );
  };

  const pages = none ? 1 : 4;
  const canNext =
    page === 0
      ? none || regions.length > 0
      : page === 1
        ? nrs.now !== null && nrs.avg !== null && nrs.worst !== null
        : page === 2
          ? duration !== null && radiating !== null && numbness !== null
          : flagList.every((f) => flags[f.id] !== undefined);

  return (
    <FocusShell
      title={s.info.name}
      progress={(page + 1) / (pages + 0.001)}
      onExit={onExit}
    >
      <div className="animate-fade-up flex flex-1 flex-col gap-4" key={page}>
        {page === 0 && (
          <>
            <div>
              <h2 className="text-xl font-bold text-ink">{s.where}</h2>
              <p className="text-sm text-muted">{s.whereHint}</p>
            </div>
            {!none && (
              <BodyMap
                selected={regions}
                labels={s.regions}
                sides={[s.sideL, s.sideR]}
                onToggle={(r) =>
                  setRegions((x) =>
                    x.includes(r) ? x.filter((y) => y !== r) : [...x, r],
                  )
                }
              />
            )}
            <div className="flex flex-wrap justify-center gap-1.5">
              {regions.map((r) => (
                <span
                  key={r}
                  className="rounded-full bg-urgent-soft px-2.5 py-1 text-xs font-semibold text-urgent"
                >
                  {s.regions[r]}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setNone(!none);
                setRegions([]);
              }}
              className={cx(
                "rounded-2xl border-2 p-3 text-sm font-semibold",
                none
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-ink"
                  : "border-line text-ink-2",
              )}
            >
              {s.noPain}
            </button>
          </>
        )}
        {page === 1 && (
          <>
            <h2 className="text-xl font-bold text-ink">{s.intensity}</h2>
            {(["now", "avg", "worst"] as const).map((k) => (
              <Card key={k} className="p-4">
                <div className="mb-3 font-semibold text-ink">{s[k]}</div>
                <NrsScale
                  value={nrs[k]}
                  onChange={(v) => setNrs((x) => ({ ...x, [k]: v }))}
                  low={s.noneLabel}
                  high={s.worstLabel}
                />
              </Card>
            ))}
          </>
        )}
        {page === 2 && (
          <>
            <h2 className="text-xl font-bold text-ink">{s.howLong}</h2>
            <ChoiceList
              value={duration}
              onChange={setDuration}
              options={[
                { value: "acute", label: s.acute },
                { value: "subacute", label: s.subacute },
                { value: "chronic", label: s.chronic },
              ]}
            />
            <YesNo
              label={s.radiating}
              value={radiating}
              onChange={setRadiating}
              yes={s.yes}
              no={s.no}
            />
            <YesNo
              label={s.numbness}
              value={numbness}
              onChange={setNumbness}
              yes={s.yes}
              no={s.no}
            />
          </>
        )}
        {page === 3 && (
          <>
            <div>
              <h2 className="text-xl font-bold text-ink">{s.flagsTitle}</h2>
              <p className="text-sm text-muted">{s.flagsHint}</p>
            </div>
            {flagList.map((f) => (
              <YesNo
                key={f.id}
                label={s.flags[f.id]}
                value={flags[f.id] ?? null}
                onChange={(v) => setFlags((x) => ({ ...x, [f.id]: v }))}
                yes={s.yes}
                no={s.no}
                danger
              />
            ))}
          </>
        )}
        <div className="pb-safe mt-auto grid grid-cols-2 gap-3 pt-2">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => (page === 0 ? onExit() : setPage(page - 1))}
          >
            {t.btn.back}
          </Button>
          <Button
            variant="accent"
            size="lg"
            disabled={!canNext}
            onClick={() => (none || page === 3 ? finish() : setPage(page + 1))}
          >
            {none || page === 3 ? s.see : t.btn.next}
          </Button>
        </div>
      </div>
    </FocusShell>
  );
}

function Details({
  result,
}: {
  result: { data: PainData; summary: { level: Level } };
}) {
  const s = useStrings(S);
  const t = useStrings(common);
  const d = result.data;
  const sev = flagSeverity(d.flags);
  const flagged = (Object.keys(d.flags) as FlagId[]).filter((k) => d.flags[k]);
  const colorFor = (v: number) =>
    v <= 3 ? "var(--normal)" : v <= 6 ? "var(--borderline)" : "var(--urgent)";
  return (
    <>
      {sev === "emergency" && (
        <Callout tone="danger" title={s.emergencyTitle}>
          {s.emergencyText}
        </Callout>
      )}
      {sev === "urgent" && (
        <Callout tone="warn" title={s.urgentTitle}>
          {s.urgentText}
        </Callout>
      )}
      <Card className="p-5">
        <SectionTitle>{s.painNrs}</SectionTitle>
        <CompareBars
          max={10}
          format={(v) => `${v}/10`}
          rows={[
            { label: s.now, value: d.now, color: colorFor(d.now) },
            { label: s.avg, value: d.avg, color: colorFor(d.avg) },
            { label: s.worst, value: d.worst, color: colorFor(d.worst) },
          ]}
        />
        <p className="mt-3 font-semibold text-ink">
          {s.cat[nrsCategory(d.avg)]}
        </p>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <div className="text-xs font-medium text-muted">{s.location}</div>
          <div className="mt-1 font-semibold text-ink">
            {d.regions.length
              ? d.regions
                  .map((r, i) =>
                    i ? s.regions[r].toLowerCase() : s.regions[r],
                  )
                  .join(", ")
              : "—"}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium text-muted">
            {s.durationLabel}
          </div>
          <div className="mt-1 font-semibold text-ink">{s[d.duration]}</div>
        </Card>
      </div>
      {flagged.length > 0 && (
        <Card className="p-5">
          <SectionTitle>{s.flagged}</SectionTitle>
          <Bullets items={flagged.map((f) => s.flags[f])} />
        </Card>
      )}
      {(d.radiating || d.numbness) && (
        <Callout tone="info">{s.radiatingNote}</Callout>
      )}
      {d.duration === "chronic" && d.avg > 0 && (
        <Callout tone="info">{s.chronicNote}</Callout>
      )}
      {sev !== "emergency" && (
        <Card className="p-5">
          <SectionTitle>{t.recommendations}</SectionTitle>
          <Bullets
            items={
              d.avg >= 7 ? [...s.rec.severe, ...s.rec.ok.slice(1)] : s.rec.ok
            }
          />
        </Card>
      )}
    </>
  );
}

const painCheck: TestModule<PainData> = {
  kind: "test",
  id: "pain-check",
  field: "spine",
  icon: ShieldAlert,
  minutes: 3,
  requirements: [],
  version: 1,
  info: { en: S.en.info, uz: S.uz.info, ru: S.ru.info },
  Runner,
  Details,
  headline: (r, lang: Lang) => {
    const sev = flagSeverity(r.data.flags);
    return {
      value: `${r.data.avg}`,
      unit: "/10",
      label:
        sev === "emergency"
          ? S[lang].emergencyShort
          : sev === "urgent"
            ? S[lang].urgentShort
            : S[lang].cat[nrsCategory(r.data.avg)],
    };
  },
  trend: { higherIsBetter: false, unit: () => "/10", digits: 0 },
};

export default painCheck;
