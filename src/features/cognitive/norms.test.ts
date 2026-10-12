import { describe, expect, it } from 'vitest'
import {
  SpanProcedure,
  expectedSimpleRt,
  goNoGoLevel,
  goNoGoScore,
  levelFromZ,
  rtLevel,
  stroopLevel,
  stroopScore,
  summarizeRt,
  tmtLevel,
  tmtNorm,
  type GoTrial,
  type StroopTrial,
} from './norms'

describe('reaction time', () => {
  it('summarises RTs', () => {
    const s = summarizeRt([300, 250, 280, 260, 270, 290, 310, 240, 400, 265])
    expect(s.median).toBe(275)
    expect(s.fastest10).toBe(240)
    expect(s.slowest10).toBe(400)
    expect(s.n).toBe(10)
  })
  it('expected RT grows with age', () => {
    expect(expectedSimpleRt(25)).toBe(265)
    expect(expectedSimpleRt(65)).toBeCloseTo(265 + 40 * 1.4)
  })
  it('classifies by z-score', () => {
    expect(rtLevel(220, 320, 30).level).toBe('great')
    expect(rtLevel(275, 380, 30).level).toBe('normal')
    expect(rtLevel(400, 520, 30).level).toBe('attention')
    expect(levelFromZ(1.5)).toBe('borderline')
  })
})

describe('span procedure (WAIS rule)', () => {
  it('advances while at least one of two trials is correct and stops after two failures', () => {
    const p = new SpanProcedure(3, 9)
    const ok = (n: number) => Array.from({ length: n }, (_, i) => i)
    const bad = (n: number) => Array.from({ length: n }, () => 9)
    p.respond(ok(3), ok(3))
    p.respond(ok(3), bad(3)) // length 3: 1/2 → advance
    expect(p.length).toBe(4)
    p.respond(ok(4), bad(4))
    p.respond(ok(4), ok(4)) // length 4: 1/2 → advance
    p.respond(ok(5), bad(5))
    p.respond(ok(5), bad(5)) // length 5: 0/2 → stop
    expect(p.done).toBe(true)
    expect(p.span).toBe(4)
    expect(p.totalCorrect).toBe(2)
  })
  it('span is start − 1 when nothing is correct', () => {
    const p = new SpanProcedure(2, 9)
    p.respond([1, 2], [2, 1])
    p.respond([3, 4], [4, 3])
    expect(p.done).toBe(true)
    expect(p.span).toBe(1)
  })
})

describe('stroop', () => {
  it('computes interference from correct trials only', () => {
    const trials: StroopTrial[] = []
    for (let i = 0; i < 10; i++) trials.push({ word: 0, ink: 0, congruent: true, answer: 0, rt: 700 })
    for (let i = 0; i < 10; i++) trials.push({ word: 1, ink: 0, congruent: false, answer: 0, rt: 850 })
    trials.push({ word: 1, ink: 0, congruent: false, answer: 2, rt: 300 }) // error, excluded from RT
    const s = stroopScore(trials)
    expect(s.congruentRt).toBe(700)
    expect(s.incongruentRt).toBe(850)
    expect(s.interference).toBe(150)
    expect(s.accIncongruent).toBeCloseTo(10 / 11)
    expect(stroopLevel(150, 0.95, 30)).toBe('normal')
    expect(stroopLevel(150, 0.8, 30)).toBe('borderline')
    expect(stroopLevel(80, 0.98, 30)).toBe('great')
  })
})

describe('trail making', () => {
  it('uses Tombaugh age norms', () => {
    expect(tmtNorm(30).b.mean).toBeCloseTo(50.68)
    expect(tmtNorm(72).a.mean).toBeCloseTo(41.3)
    expect(tmtLevel(24, 50, 30).level).toBe('normal')
    expect(tmtLevel(15, 35, 30).level).toBe('great')
    expect(tmtLevel(30, 95, 30).level).toBe('attention')
  })
  it('flags a high B/A ratio', () => {
    const r = tmtLevel(18, 58, 30)
    expect(r.ratio).toBeGreaterThan(3)
    expect(r.level).toBe('borderline')
  })
})

describe('go / no-go', () => {
  it("computes errors and d'", () => {
    const trials: GoTrial[] = []
    for (let i = 0; i < 120; i++) trials.push({ digit: 1, go: true, responded: i >= 4, rt: 350 })
    for (let i = 0; i < 15; i++) trials.push({ digit: 3, go: false, responded: i < 5, rt: i < 5 ? 300 : null })
    const s = goNoGoScore(trials)
    expect(s.omissions).toBe(4)
    expect(s.commissions).toBe(5)
    expect(s.commissionRate).toBeCloseTo(1 / 3)
    expect(s.dPrime).toBeGreaterThan(2)
    expect(s.dPrime).toBeLessThan(2.6)
    expect(goNoGoLevel(s.dPrime, s.omissionRate)).toBe('normal')
  })
})

import { makeTrials } from './stroop'
describe('stroop trial list', () => {
  it('is balanced and never repeats the ink colour back-to-back', () => {
    for (let k = 0; k < 20; k++) {
      const l = makeTrials(48)
      expect(l.length).toBe(48)
      expect(l.filter((x) => x.congruent).length).toBe(24)
      expect(l.filter((x) => !x.congruent && x.word === x.ink).length).toBe(0)
      for (let i = 1; i < l.length; i++) expect(l[i].ink).not.toBe(l[i - 1].ink)
      for (let c = 0; c < 4; c++) expect(l.filter((x) => x.ink === c).length).toBe(12)
    }
  })
})

import { pathLength, trailLabels, trailLayout, TRAIL_ASPECT } from './trail-layout'
describe('trail making layout', () => {
  it('is deterministic, inside the box and non-overlapping', () => {
    for (const seed of [101, 202, 303, 404]) {
      const a = trailLayout(25, seed)
      const b = trailLayout(25, seed)
      expect(a).toEqual(b)
      expect(a.length).toBe(25)
      for (const p of a) {
        expect(p.x).toBeGreaterThan(0)
        expect(p.x).toBeLessThan(1)
        expect(p.y).toBeGreaterThan(0)
        expect(p.y).toBeLessThan(TRAIL_ASPECT)
      }
      for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) expect(Math.hypot(a[i].x - a[j].x, a[i].y - a[j].y)).toBeGreaterThanOrEqual(0.155)
      expect(pathLength(a)).toBeGreaterThan(4)
    }
  })
  it('builds alternating labels for part B', () => {
    const l = trailLabels('B', 25, 'latin')
    expect(l.slice(0, 5)).toEqual(['1', 'A', '2', 'B', '3'])
    expect(l[24]).toBe('13')
    expect(trailLabels('B', 25, 'cyrillic')[23]).toBe('М')
    expect(trailLabels('B', 6, 'uzbek')).toEqual(['1', 'A', '2', 'B', '3', 'D'])
  })
})
