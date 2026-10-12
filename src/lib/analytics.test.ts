import { describe, expect, it } from 'vitest'
import { activityBuckets, change, dayKey, latestByTest, levelCounts, niceMax, periodStart, streakOf, toCsv } from './analytics'
import { mergeBackup, BACKUP_APP, type ExerciseLog, type StoredResult } from './store'

const now = new Date(2026, 9, 1, 15, 0) // 1 Oct 2026, local time
const at = (daysAgo: number, h = 10) => {
  const d = new Date(now)
  d.setDate(d.getDate() - daysAgo)
  d.setHours(h, 0, 0, 0)
  return d.toISOString()
}
const result = (id: string, testId: string, daysAgo: number, value: number, level: StoredResult['summary']['level'] = 'normal'): StoredResult => ({
  id,
  testId,
  date: at(daysAgo),
  v: 1,
  summary: { value, level },
  data: {},
})
const log = (id: string, exerciseId: string, daysAgo: number, seconds: number): ExerciseLog => ({ id, exerciseId, date: at(daysAgo), seconds })

describe('periods and streaks', () => {
  it('starts a 7-day period six days before today at midnight', () => {
    const s = periodStart(7, now)!
    expect(dayKey(s)).toBe('2026-09-25')
    expect(s.getHours()).toBe(0)
    expect(periodStart('all', now)).toBeNull()
  })
  it('counts consecutive days back from today, or from yesterday', () => {
    expect(streakOf([at(0), at(1), at(2), at(4)], now)).toBe(3)
    expect(streakOf([at(1), at(2)], now)).toBe(2)
    expect(streakOf([at(3)], now)).toBe(0)
  })
})

describe('activity buckets', () => {
  const field = (id: string) => (id === 'breathing' ? 'spine' : id === 'schulte' ? 'memory' : undefined)
  const logs = [log('a', 'breathing', 0, 300), log('b', 'breathing', 0, 120), log('c', 'schulte', 2, 90), log('d', 'unknown', 1, 600), log('e', 'breathing', 40, 600)]
  const results = [result('r1', 'stroop', 0, 30), result('r2', 'bolt', 2, 20)]
  it('splits minutes per day and section within the period', () => {
    const { unit, buckets } = activityBuckets(logs, results, ['memory', 'spine'] as const, field, 7, now)
    expect(unit).toBe('day')
    expect(buckets).toHaveLength(7)
    const today = buckets[6]
    expect(today.key).toBe('2026-10-01')
    expect(today.minutes.spine).toBeCloseTo(7)
    expect(today.tests).toBe(1)
    expect(buckets[4].minutes.memory).toBeCloseTo(1.5)
    expect(buckets.reduce((a, b) => a + b.total, 0)).toBeCloseTo(8.5) // the 40-day-old and unknown sessions are left out
  })
  it('switches to weeks for long periods', () => {
    const { unit, buckets } = activityBuckets(logs, results, ['memory', 'spine'] as const, field, 90, now)
    expect(unit).toBe('week')
    expect(buckets[0].start.getDay()).toBe(1) // Monday
    expect(buckets.reduce((a, b) => a + b.total, 0)).toBeCloseTo(18.5)
  })
})

describe('latest results and levels', () => {
  const list = [result('3', 'stroop', 0, 30, 'great'), result('2', 'stroop', 5, 60, 'normal'), result('1', 'bolt', 3, 20, 'attention')]
  it('keeps the newest and the previous result per test', () => {
    const m = latestByTest(list)
    expect(m.get('stroop')?.last.id).toBe('3')
    expect(m.get('stroop')?.prev?.id).toBe('2')
    expect(m.get('stroop')?.count).toBe(2)
    expect(m.get('bolt')?.prev).toBeNull()
  })
  it('counts levels and tests not taken', () => {
    const c = levelCounts(['stroop', 'bolt', 'corsi'], latestByTest(list))
    expect(c.taken).toBe(2)
    expect(c.notTaken).toBe(1)
    expect(c.counts.great).toBe(1)
    expect(c.counts.attention).toBe(1)
  })
  it('judges a change by the direction that is better', () => {
    expect(change(30, 60, false, 0)).toEqual({ d: -30, better: true })
    expect(change(30, 60, true, 0).better).toBe(false)
    expect(change(5.04, 5, true, 1).better).toBeNull()
  })
})

describe('csv and chart scale', () => {
  it('escapes commas, quotes and line breaks and starts with a BOM', () => {
    const csv = toCsv([
      ['a', 'b,c'],
      ['say "hi"', 'two\nlines'],
    ])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv.slice(1)).toBe('a,"b,c"\r\n"say ""hi""","two\nlines"')
  })
  it('rounds maxima up to clean values', () => {
    expect(niceMax(0)).toBe(5)
    expect(niceMax(7)).toBe(10)
    expect(niceMax(31)).toBe(45)
  })
})

describe('backup merge', () => {
  const cur = { results: [result('1', 'stroop', 2, 30)], logs: [log('l1', 'breathing', 1, 60)] }
  it('adds only entries that are not there yet, newest first', () => {
    const b = { app: BACKUP_APP, version: 1, results: [result('1', 'stroop', 2, 30), result('2', 'bolt', 0, 20)], logs: [log('l2', 'schulte', 3, 90)] }
    const m = mergeBackup(cur, b)
    expect(m.added).toBe(2)
    expect(m.results.map((r) => r.id)).toEqual(['2', '1'])
    expect(m.logs.map((l) => l.id)).toEqual(['l1', 'l2'])
  })
  it('rejects files from somewhere else and skips broken entries', () => {
    expect(() => mergeBackup(cur, { app: 'other', results: [] })).toThrow()
    expect(() => mergeBackup(cur, null)).toThrow()
    const m = mergeBackup(cur, { app: BACKUP_APP, results: [{ id: 'x' }, null], logs: [{ id: 'y', exerciseId: 'b', date: at(0) }] })
    expect(m.added).toBe(0)
  })
})
