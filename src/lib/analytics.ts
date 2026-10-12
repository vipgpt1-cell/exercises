/**
 * Pure helpers for the analytics page, the report and the exports.
 * No React, no catalog: callers pass in what they need, so this is easy to unit-test.
 */
import type { ExerciseLog, Level, StoredResult } from './store'

export type Period = 7 | 30 | 90 | 'all'
const DAY = 86400000

/** Local midnight of a date. */
export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** Local calendar day key, e.g. 2026-10-01. */
export function dayKey(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

/** First moment included in a period (null = all time). */
export function periodStart(p: Period, now = new Date()): Date | null {
  if (p === 'all') return null
  const s = startOfDay(now)
  s.setDate(s.getDate() - (p - 1))
  return s
}

export function inPeriod<T extends { date: string }>(list: T[], start: Date | null): T[] {
  if (!start) return list
  const iso = start.toISOString()
  return list.filter((x) => x.date >= iso)
}

/** Monday 00:00 of the week that contains `d`. */
export function weekStart(d = new Date()): Date {
  const x = startOfDay(d)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}

/** Days in a row with at least one entry, counting back from today (or yesterday). */
export function streakOf(dates: string[], now = new Date()): number {
  const days = new Set(dates.map((d) => dayKey(d)))
  const cur = startOfDay(now)
  if (!days.has(dayKey(cur))) cur.setDate(cur.getDate() - 1)
  let n = 0
  while (days.has(dayKey(cur))) {
    n++
    cur.setDate(cur.getDate() - 1)
  }
  return n
}

export interface Bucket<K extends string> {
  start: Date
  key: string
  minutes: Record<K, number>
  total: number
  tests: number
}

/**
 * Exercise minutes (split by section) and number of tests, per day or per week.
 * Daily buckets for up to 31 days, weekly beyond that.
 */
export function activityBuckets<K extends string>(
  logs: ExerciseLog[],
  results: StoredResult[],
  keys: readonly K[],
  sectionOfExercise: (exerciseId: string) => K | undefined,
  period: Period,
  now = new Date(),
): { unit: 'day' | 'week'; buckets: Bucket<K>[] } {
  const start = periodStart(period, now)
  const earliest = [...logs, ...results].reduce<Date | null>((m, x) => {
    const d = new Date(x.date)
    return !m || d < m ? d : m
  }, null)
  const from = start ?? (earliest ? startOfDay(earliest) : startOfDay(now))
  const spanDays = Math.round((startOfDay(now).getTime() - from.getTime()) / DAY) + 1
  const unit: 'day' | 'week' = spanDays <= 31 ? 'day' : 'week'
  const buckets: Bucket<K>[] = []
  const empty = () => Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>
  if (unit === 'day') {
    for (let i = 0; i < spanDays; i++) {
      const d = new Date(from)
      d.setDate(from.getDate() + i)
      buckets.push({ start: d, key: dayKey(d), minutes: empty(), total: 0, tests: 0 })
    }
  } else {
    const w0 = weekStart(from)
    for (let d = new Date(w0); d <= now; d.setDate(d.getDate() + 7)) buckets.push({ start: new Date(d), key: dayKey(d), minutes: empty(), total: 0, tests: 0 })
  }
  const find = (iso: string) => {
    const k = dayKey(unit === 'day' ? new Date(iso) : weekStart(new Date(iso)))
    return buckets.find((b) => b.key === k)
  }
  for (const l of inPeriod(logs, start)) {
    const b = find(l.date)
    const sec = sectionOfExercise(l.exerciseId)
    if (!b || !sec) continue
    const m = l.seconds / 60
    b.minutes[sec] += m
    b.total += m
  }
  for (const r of inPeriod(results, start)) {
    const b = find(r.date)
    if (b) b.tests++
  }
  return { unit, buckets }
}

/** Newest and previous result of every test (results are stored newest first). */
export function latestByTest(results: StoredResult[]): Map<string, { last: StoredResult; prev: StoredResult | null; count: number }> {
  const map = new Map<string, { last: StoredResult; prev: StoredResult | null; count: number }>()
  for (const r of results) {
    const e = map.get(r.testId)
    if (!e) map.set(r.testId, { last: r, prev: null, count: 1 })
    else {
      if (!e.prev) e.prev = r
      e.count++
    }
  }
  return map
}

export const LEVEL_ORDER: Level[] = ['great', 'normal', 'borderline', 'attention', 'urgent', 'info']

/** How many tests of a section sit at each level (latest result), plus how many were not taken. */
export function levelCounts(testIds: string[], latest: Map<string, { last: StoredResult }>) {
  const counts = Object.fromEntries(LEVEL_ORDER.map((l) => [l, 0])) as Record<Level, number>
  let taken = 0
  for (const id of testIds) {
    const e = latest.get(id)
    if (!e) continue
    taken++
    counts[e.last.summary.level]++
  }
  return { counts, taken, total: testIds.length, notTaken: testIds.length - taken }
}

/** Change between two values, judged by whether higher is better. */
export function change(cur: number, prev: number, higherIsBetter: boolean, digits: number) {
  const d = cur - prev
  const eps = Math.pow(10, -digits) / 2
  return { d, better: Math.abs(d) < eps ? null : higherIsBetter ? d > 0 : d < 0 }
}

/** RFC 4180 CSV with a UTF-8 BOM so Excel shows Uzbek and Russian letters correctly. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n')
}

/** Round a chart maximum up to a clean tick value (5, 10, 20, 30, 60 …). */
export function niceMax(v: number): number {
  if (v <= 5) return 5
  const steps = [10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300, 600, 900, 1200]
  return steps.find((s) => s >= v) ?? Math.ceil(v / 600) * 600
}
