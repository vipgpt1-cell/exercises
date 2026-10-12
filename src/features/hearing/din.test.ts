import { describe, expect, it } from 'vitest'
import { DIN_DIGITS, DIN_TRIALS, DinStaircase, dinLevel, dinScore, makeTriplet } from './din'
import { mulberry32 } from '../../lib/rng'

function simulate(trueSrt: number, seed: number) {
  const rng = mulberry32(seed)
  const s = new DinStaircase()
  let prev: number[] | null = null
  while (!s.done) {
    const t = makeTriplet(DIN_DIGITS.en, prev, rng)
    prev = t
    const p = 1 / (1 + Math.exp(-0.64 * (s.snr - trueSrt)))
    const ok = rng() < p
    s.respond(t, ok ? t : [t[0], t[1], (t[2] + 1) % 10])
  }
  return dinScore(s.trials)
}

describe('digits in noise', () => {
  it('triplets have three distinct digits from the language set', () => {
    const rng = mulberry32(5)
    for (let i = 0; i < 200; i++) {
      const t = makeTriplet(DIN_DIGITS.uz, null, rng)
      expect(new Set(t).size).toBe(3)
      t.forEach((d) => expect(DIN_DIGITS.uz).toContain(d))
    }
    expect(DIN_DIGITS.en).not.toContain(7)
  })
  it('runs 24 triplets with 4 dB then 2 dB steps', () => {
    const s = new DinStaircase()
    for (let i = 0; i < DIN_TRIALS; i++) s.respond([1, 2, 3], [1, 2, 3])
    expect(s.done).toBe(true)
    expect(s.trials.slice(0, 5).map((t) => t.snr)).toEqual([0, -4, -8, -12, -16])
    expect(s.trials[5].snr).toBe(-18)
  })
  it('scores SRT as mean of triplets 5–24', () => {
    const s = new DinStaircase()
    const answers = [true, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true]
    answers.forEach((a) => s.respond([1, 2, 3], a ? [1, 2, 3] : [1, 2, 4]))
    const sc = dinScore(s.trials)
    const expected = s.trials.slice(4).reduce((a, t) => a + t.snr, 0) / 20
    expect(sc.srt).toBeCloseTo(expected, 10)
    expect(sc.tripletCorrect).toBe(13)
  })
  it('estimates the true SRT of a simulated listener without large bias', () => {
    for (const trueSrt of [-12, -9, -5]) {
      const est: number[] = []
      for (let seed = 1; seed <= 400; seed++) est.push(simulate(trueSrt, seed).srt)
      const m = est.reduce((a, b) => a + b, 0) / est.length
      expect(Math.abs(m - trueSrt)).toBeLessThan(0.8)
    }
  })
  it('classifies SRT', () => {
    expect(dinLevel(-13)).toBe('great')
    expect(dinLevel(-10)).toBe('normal')
    expect(dinLevel(-8)).toBe('borderline')
    expect(dinLevel(-5)).toBe('attention')
  })
})
