import { FIELDS, fieldStrings } from '../../catalog/fields'
import { exerciseById, exercisesOf, testById, testsOf, TESTS } from '../../catalog'
import type { FieldId } from '../../catalog/types'
import { ageOf, type ExerciseLog, type Level, type Person, type StoredResult } from '../../lib/store'
import { change, inPeriod, latestByTest, periodStart, toCsv } from '../../lib/analytics'
import { fmtDate, fmtNum, fmtSigned, type Lang } from '../../lib/i18n'
import { common } from '../../i18n/common'
import { reportStrings } from '../../i18n/report'

export interface ReportRow {
  testId: string
  name: string
  taken: boolean
  date: string
  /** dd.mm.yyyy, for narrow table columns. */
  dateShort: string
  value: string
  unit: string
  label: string
  level: Level | null
  /** Compared with the previous result of the same test. */
  change: { text: string; better: boolean | null } | null
  /** Numeric results, oldest → newest (last 10), for a small trend line. */
  series: number[]
}

export interface ReportSection {
  field: FieldId
  name: string
  rows: ReportRow[]
  exercises: { name: string; times: number; minutes: number }[]
}

export interface ReportModel {
  lang: Lang
  title: string
  generated: string
  person: { label: string; value: string }[]
  sections: ReportSection[]
  taken: number
  total: number
  exTimes: number
  exMinutes: number
}

const numericDate = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

export function buildReport(results: StoredResult[], logs: ExerciseLog[], person: Person, lang: Lang, now = new Date()): ReportModel {
  const s = reportStrings[lang]
  const c = common[lang]
  const fs = fieldStrings[lang]
  const latest = latestByTest(results)
  const recentLogs = inPeriod(logs, periodStart(30, now))
  const age = ageOf(person)
  const personRows: { label: string; value: string }[] = []
  if (person.name?.trim()) personRows.push({ label: s.nameLabel.replace(/\s*\(.*\)$/, ''), value: person.name.trim() })
  if (age !== null) personRows.push({ label: s.age, value: String(age) })
  if (person.sex) personRows.push({ label: s.sex, value: person.sex === 'male' ? s.male : s.female })
  if (person.hand) personRows.push({ label: s.hand, value: person.hand === 'right' ? s.rightHand : s.leftHand })

  const sections: ReportSection[] = FIELDS.map((f) => {
    const rows: ReportRow[] = testsOf(f.id).map((m) => {
      const e = latest.get(m.id)
      if (!e) return { testId: m.id, name: m.info[lang].name, taken: false, date: '', dateShort: '', value: '', unit: '', label: s.notTaken, level: null, change: null, series: [] }
      const h = m.headline(e.last, lang)
      let ch: ReportRow['change'] = null
      if (m.trend && e.prev && e.last.summary.value !== null && e.prev.summary.value !== null) {
        const x = change(e.last.summary.value, e.prev.summary.value, m.trend.higherIsBetter, m.trend.digits)
        ch = { text: `${fmtSigned(lang, x.d, m.trend.digits)} ${m.trend.unit(lang)}`.trim(), better: x.better }
      }
      const series = results
        .filter((r) => r.testId === m.id && r.summary.value !== null && Number.isFinite(r.summary.value))
        .slice(0, 10)
        .map((r) => r.summary.value as number)
        .reverse()
      return {
        testId: m.id,
        name: m.info[lang].name,
        taken: true,
        date: fmtDate(lang, e.last.date),
        dateShort: numericDate(e.last.date),
        value: h.value,
        unit: h.unit ?? '',
        label: h.label ?? c.level[e.last.summary.level],
        level: e.last.summary.level,
        change: ch,
        series,
      }
    })
    const exercises = exercisesOf(f.id)
      .map((ex) => {
        const ls = recentLogs.filter((l) => l.exerciseId === ex.id)
        return { name: ex.info[lang].name, times: ls.length, minutes: Math.round(ls.reduce((a, l) => a + l.seconds, 0) / 60) }
      })
      .filter((x) => x.times > 0)
    return { field: f.id, name: fs[f.id].name, rows, exercises }
  })

  return {
    lang,
    title: s.docTitle,
    generated: fmtDate(lang, now.toISOString(), true),
    person: personRows,
    sections,
    taken: TESTS.filter((m) => latest.has(m.id)).length,
    total: TESTS.length,
    exTimes: recentLogs.length,
    exMinutes: Math.round(recentLogs.reduce((a, l) => a + l.seconds, 0) / 60),
  }
}

/** Plain-text version for pasting into Telegram or another chat. */
export function reportText(model: ReportModel): string {
  const s = reportStrings[model.lang]
  const out: string[] = [`${model.title} — ${model.generated}`]
  if (model.person.length) out.push(model.person.map((p) => `${p.label}: ${p.value}`).join(' · '))
  for (const sec of model.sections) {
    const taken = sec.rows.filter((r) => r.taken)
    if (!taken.length && !sec.exercises.length) continue
    out.push('', sec.name.toUpperCase())
    for (const r of taken) {
      const ch = r.change ? ` (${s.colChange.toLowerCase()}: ${r.change.text})` : ''
      out.push(`• ${r.name}: ${r.value}${r.unit ? ' ' + r.unit : ''} — ${r.label}, ${r.date}${ch}`)
    }
    if (sec.exercises.length) out.push(`  ${s.exercises30}: ${sec.exercises.map((e) => `${e.name} ${s.exSummary(e.times, e.minutes)}`).join('; ')}`)
  }
  out.push('', s.footer)
  return out.join('\n')
}

/** Every result and exercise session as one table. */
export function resultsCsv(results: StoredResult[], logs: ExerciseLog[], lang: Lang): string {
  const s = reportStrings[lang]
  const c = common[lang]
  const fs = fieldStrings[lang]
  const local = (iso: string) => {
    const d = new Date(iso)
    const p2 = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`
  }
  const rows: (string | number)[][] = [[s.colType, s.colDate, s.colSection, s.colTest, s.colResult, s.colUnit, s.colAssessment]]
  for (const r of results) {
    const m = testById(r.testId)
    if (!m) continue
    const h = m.headline(r, lang)
    rows.push([s.typeTest, local(r.date), fs[m.field].name, m.info[lang].name, h.value, h.unit ?? '', h.label ?? c.level[r.summary.level]])
  }
  for (const l of logs) {
    const e = exerciseById(l.exerciseId)
    if (!e) continue
    rows.push([s.typeExercise, local(l.date), fs[e.field].name, e.info[lang].name, fmtNum('en', l.seconds / 60, 1), c.minUnit, ''])
  }
  return toCsv(rows)
}
