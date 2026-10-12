import { describe, expect, it } from 'vitest'
import { boltLevel, breathLevel, breathRate, flagSeverity, functionLevel, functionScore, mobilityLevel, mobilityScore, nrsCategory, painLevel } from './scoring'

describe('pain', () => {
  it('categorises NRS and flags', () => {
    expect(nrsCategory(0)).toBe('none')
    expect(nrsCategory(3)).toBe('mild')
    expect(nrsCategory(4)).toBe('moderate')
    expect(nrsCategory(7)).toBe('severe')
    expect(flagSeverity({})).toBeNull()
    expect(flagSeverity({ night: true })).toBe('urgent')
    expect(flagSeverity({ night: true, saddle: true })).toBe('emergency')
    expect(painLevel(2, null)).toBe('normal')
    expect(painLevel(8, null)).toBe('attention')
    expect(painLevel(1, 'urgent')).toBe('urgent')
  })
})

describe('function questionnaire', () => {
  it('scores % of maximum over answered items', () => {
    expect(functionScore([0, 0, 0, 0])).toBe(0)
    expect(functionScore([4, 4, 4, 4])).toBe(100)
    expect(functionScore([2, null, 1, 3])).toBeCloseTo((6 / 12) * 100)
    expect(functionLevel(10)).toBe('great')
    expect(functionLevel(25)).toBe('normal')
    expect(functionLevel(45)).toBe('borderline')
    expect(functionLevel(60)).toBe('attention')
  })
})

describe('mobility', () => {
  it('computes range %, painful moves and asymmetry', () => {
    const r = mobilityScore([
      { id: 'flex', range: 2, pain: 0 },
      { id: 'rotL', range: 2, pain: 0 },
      { id: 'rotR', range: 1, pain: 1 },
      { id: 'sideL', range: 2, pain: 0 },
      { id: 'sideR', range: 2, pain: 0 },
    ])
    expect(r.pct).toBe(90)
    expect(r.painful).toBe(1)
    expect(r.asym).toEqual(['rot'])
    expect(mobilityLevel(90, 0)).toBe('great')
    expect(mobilityLevel(90, 1)).toBe('borderline')
  })
})

describe('breathing', () => {
  it('BOLT bands', () => {
    expect(boltLevel(8)).toBe('attention')
    expect(boltLevel(15)).toBe('borderline')
    expect(boltLevel(25)).toBe('normal')
    expect(boltLevel(35)).toBe('great')
  })
  it('rate from taps uses the median interval', () => {
    const taps = [0, 4000, 8000, 12000, 16000, 20500, 24000]
    const r = breathRate(taps)
    expect(r.rate).toBeCloseTo(15, 0)
    expect(r.intervals).toBe(6)
    expect(breathLevel(15)).toBe('great')
    expect(breathLevel(18)).toBe('normal')
    expect(breathLevel(26)).toBe('attention')
    expect(Number.isNaN(breathRate([0, 4000]).rate)).toBe(true)
  })
})
