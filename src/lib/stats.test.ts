import { describe, expect, it } from 'vitest'
import { cv, dPrime, linReg, mean, median, normCdf, probit, quantile, sd } from './stats'

describe('descriptive stats', () => {
  it('mean / median / sd', () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5)
    expect(median([5, 1, 3])).toBe(3)
    expect(median([4, 1, 3, 2])).toBe(2.5)
    expect(sd([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3)
    expect(cv([10, 10, 10])).toBe(0)
  })
  it('quantile uses linear interpolation (type 7)', () => {
    expect(quantile([1, 2, 3, 4, 5], 0.25)).toBe(2)
    expect(quantile([10, 20], 0.5)).toBe(15)
    expect(quantile([3, 1, 2, 4], 0.9)).toBeCloseTo(3.7, 10)
  })
  it('linear regression', () => {
    const r = linReg([0, 1, 2, 3], [1, 3, 5, 7])
    expect(r.slope).toBeCloseTo(2)
    expect(r.intercept).toBeCloseTo(1)
    expect(r.r2).toBeCloseTo(1)
  })
})

describe('normal distribution', () => {
  it('normCdf matches known values', () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 7)
    expect(normCdf(1.959964)).toBeCloseTo(0.975, 6)
    expect(normCdf(-1)).toBeCloseTo(0.158655, 5)
  })
  it('probit inverts normCdf', () => {
    for (const p of [0.001, 0.02, 0.1, 0.5, 0.8, 0.975, 0.999]) expect(normCdf(probit(p))).toBeCloseTo(p, 6)
    expect(probit(0.975)).toBeCloseTo(1.959964, 5)
  })
  it("d' with log-linear correction", () => {
    // 95 hits / 5 misses, 10 FA / 90 CR
    const r = dPrime(95, 5, 10, 90)
    const H = 95.5 / 101
    const F = 10.5 / 101
    expect(r.dPrime).toBeCloseTo(probit(H) - probit(F), 10)
    expect(r.dPrime).toBeGreaterThan(2.7)
    expect(r.dPrime).toBeLessThan(2.9)
    // perfect performance stays finite
    expect(Number.isFinite(dPrime(20, 0, 0, 20).dPrime)).toBe(true)
  })
})
