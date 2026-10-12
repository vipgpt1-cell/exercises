import { describe, expect, it } from 'vitest'
import {
  HWStaircase,
  ageMedian,
  asymmetry,
  defaultCalibration,
  hasNotch,
  hlToDbfs,
  maxHlFor,
  overallLevel,
  pta,
  whoGrade,
  type EarMap,
} from './audiometry'
import { mulberry32 } from '../../lib/rng'
import { normCdf } from '../../lib/stats'

const cal = defaultCalibration()

function run(trueThr: number, start = 30, max = 80, noisy = false, seed = 1) {
  const rng = mulberry32(seed)
  const s = new HWStaircase({ start, max })
  let guard = 0
  while (!s.done && guard++ < 100) {
    // psychometric function: 50 % point at the true threshold, slope ~ 1 SD = 2.5 dB
    const p = noisy ? normCdf((s.level - trueThr) / 2.5) : s.level >= trueThr ? 1 : 0
    s.respond(rng() < p)
  }
  return s
}

describe('level conversion', () => {
  it('maps dB HL to dBFS with RETSPL', () => {
    // 0 dB HL at 1 kHz = 7 dB SPL; reference: -30 dBFS = 60 dB SPL → 7 - 90 = -83 dBFS
    expect(hlToDbfs(0, 1000, cal)).toBeCloseTo(-83)
    expect(hlToDbfs(40, 250, cal)).toBeCloseTo(40 + 25.5 - 90)
  })
  it('limits the maximum level to keep headroom', () => {
    expect(maxHlFor(1000, cal)).toBe(80)
    expect(maxHlFor(250, cal)).toBe(60)
    expect(hlToDbfs(maxHlFor(8000, cal), 8000, cal)).toBeLessThanOrEqual(-3)
  })
})

describe('Hughson–Westlake staircase', () => {
  it('finds an exact threshold for a deterministic listener', () => {
    for (const thr of [-10, -5, 0, 15, 35, 55, 70]) {
      const s = run(thr)
      expect(s.done).toBe(true)
      expect(s.threshold).toBe(thr)
    }
  })
  it('rounds up to the next 5 dB step when the true threshold is in between', () => {
    expect(run(17).threshold).toBe(20)
  })
  it('reports no response when nothing is heard at maximum', () => {
    const s = run(200, 30, 60)
    expect(s.noResponse).toBe(true)
    expect(s.threshold).toBeNull()
  })
  it('follows the ASHA rule of ascending presentations', () => {
    const s = new HWStaircase({ start: 30, max: 80 })
    const seq: boolean[] = [true, true, false, true, false, false, true] // 30 H,20 H,10 N,15 H(asc),5 N,10 N(asc),15 H(asc)
    seq.forEach((h) => s.respond(h))
    expect(s.trials.map((t) => t.level)).toEqual([30, 20, 10, 15, 5, 10, 15])
    expect(s.threshold).toBe(15)
  })
  it('is close to the 50% point of a noisy listener on average', () => {
    const est: number[] = []
    for (let seed = 1; seed <= 300; seed++) {
      const s = run(22, 30, 80, true, seed)
      if (s.threshold !== null) est.push(s.threshold)
    }
    const m = est.reduce((a, b) => a + b, 0) / est.length
    expect(Math.abs(m - 22)).toBeLessThan(4)
  })
})

const ear = (vals: Record<number, number | null>, max = 80): EarMap =>
  Object.fromEntries(Object.entries(vals).map(([f, hl]) => [f, { hl, max, reliable: true }]))

describe('scoring', () => {
  it('computes PTA and WHO grade', () => {
    const e = ear({ 500: 10, 1000: 15, 2000: 20, 4000: 35 })
    expect(pta(e).value).toBe(20)
    expect(whoGrade(19.9)).toBe('normal')
    expect(whoGrade(20)).toBe('mild')
    expect(whoGrade(34.9)).toBe('mild')
    expect(whoGrade(35)).toBe('moderate')
    expect(whoGrade(50)).toBe('modsevere')
    expect(whoGrade(65)).toBe('severe')
    expect(whoGrade(80)).toBe('profound')
    expect(whoGrade(95)).toBe('complete')
  })
  it('treats no-response as max + 5 and marks the PTA as a lower bound', () => {
    const e = ear({ 500: 10, 1000: 10, 2000: 10, 4000: null }, 70)
    const p = pta(e)
    expect(p.value).toBe((10 + 10 + 10 + 75) / 4)
    expect(p.lowerBound).toBe(true)
  })
  it('detects asymmetry', () => {
    const r = ear({ 500: 10, 1000: 10, 2000: 10, 4000: 10 })
    const l = ear({ 500: 25, 1000: 30, 2000: 25, 4000: 30 })
    const a = asymmetry(r, l)
    expect(a.asymmetric).toBe(true)
    expect(a.worseEar).toBe('left')
    expect(asymmetry(r, ear({ 500: 15, 1000: 15, 2000: 10, 4000: 20 })).asymmetric).toBe(false)
  })
  it('detects a noise notch', () => {
    expect(hasNotch(ear({ 1000: 5, 2000: 10, 3000: 20, 4000: 35, 6000: 25, 8000: 15 }))).toBe(true)
    expect(hasNotch(ear({ 1000: 5, 2000: 10, 3000: 20, 4000: 35, 6000: 40, 8000: 45 }))).toBe(false)
  })
  it('classifies overall level', () => {
    expect(overallLevel(ear({ 500: 5, 1000: 5, 2000: 10, 4000: 10 }), ear({ 500: 5, 1000: 5, 2000: 5, 4000: 10 }))).toBe('great')
    expect(overallLevel(ear({ 500: 15, 1000: 15, 2000: 15, 4000: 15 }), ear({ 500: 10, 1000: 15, 2000: 15, 4000: 15 }))).toBe('normal')
    expect(overallLevel(ear({ 500: 20, 1000: 25, 2000: 25, 4000: 30 }), ear({ 500: 15, 1000: 20, 2000: 20, 4000: 25 }))).toBe('borderline')
    expect(overallLevel(ear({ 500: 40, 1000: 40, 2000: 45, 4000: 50 }), ear({ 500: 35, 1000: 40, 2000: 45, 4000: 50 }))).toBe('attention')
  })
  it('ISO 7029 medians grow with age and are larger at high frequencies', () => {
    expect(ageMedian(4000, 18, 'male')).toBe(0)
    expect(ageMedian(4000, 60, 'male')).toBeCloseTo(0.016 * 42 * 42)
    expect(ageMedian(4000, 60, 'female')).toBeLessThan(ageMedian(4000, 60, 'male'))
    expect(ageMedian(8000, 70, null)).toBeGreaterThan(ageMedian(1000, 70, null))
  })
})
