/**
 * Scoring and normative references for the memory & attention tests.
 * Pure functions (unit-tested). Reference values are summarised from published
 * norms; browser/touch latency is accounted for where it matters (reaction time).
 */
import type { Level } from '../../lib/store'
import { cv, dPrime, mean, median, quantile, sd, trimSd } from '../../lib/stats'

/** z-score → level, where positive z means WORSE than expected. */
export function levelFromZ(zWorse: number): Level {
  if (zWorse <= -1) return 'great'
  if (zWorse <= 1) return 'normal'
  if (zWorse <= 2) return 'borderline'
  return 'attention'
}

export const DEFAULT_AGE = 35

/* ------------------------------------------------------------------ */
/* Reaction time                                                       */
/* ------------------------------------------------------------------ */

export interface RtSummary {
  n: number
  median: number
  mean: number
  sd: number
  cv: number
  fastest10: number
  slowest10: number
}

export function summarizeRt(rts: number[]): RtSummary {
  const s = [...rts].sort((a, b) => a - b)
  const k = Math.max(1, Math.round(s.length * 0.1))
  return {
    n: s.length,
    median: median(s),
    mean: mean(s),
    sd: sd(s),
    cv: cv(s),
    fastest10: mean(s.slice(0, k)),
    slowest10: mean(s.slice(-k)),
  }
}

/**
 * Expected median RT (ms) measured in a browser (includes ≈30–60 ms display/input latency).
 * Age slopes after Der & Deary (2006).
 */
export function expectedSimpleRt(age: number) {
  return 265 + Math.max(0, age - 25) * 1.4
}
export function expectedChoiceRt(age: number) {
  return 365 + Math.max(0, age - 25) * 2.2
}
export const SIMPLE_RT_SD = 40
export const CHOICE_RT_SD = 55

export function rtLevel(simpleMedian: number, choiceMedian: number | null, age: number) {
  const zs = (simpleMedian - expectedSimpleRt(age)) / SIMPLE_RT_SD
  const zc = choiceMedian === null ? zs : (choiceMedian - expectedChoiceRt(age)) / CHOICE_RT_SD
  return { zSimple: zs, zChoice: zc, level: levelFromZ((zs + zc) / 2) }
}

/* ------------------------------------------------------------------ */
/* Span tasks (digit span, Corsi)                                      */
/* ------------------------------------------------------------------ */

export interface SpanTrial {
  length: number
  target: number[]
  answer: number[]
  correct: boolean
}

/** WAIS-style rule: two trials per length, continue while at least one is correct. */
export class SpanProcedure {
  length: number
  trials: SpanTrial[] = []
  done = false
  private atLength: boolean[] = []
  constructor(
    readonly start: number,
    readonly max: number,
  ) {
    this.length = start
  }
  respond(target: number[], answer: number[]) {
    const correct = target.length === answer.length && target.every((d, i) => d === answer[i])
    this.trials.push({ length: this.length, target, answer, correct })
    this.atLength.push(correct)
    if (this.atLength.length === 2) {
      const any = this.atLength.some(Boolean)
      this.atLength = []
      if (!any || this.length >= this.max) this.done = true
      else this.length++
    }
    return correct
  }
  /** Longest length with at least one correct trial (start − 1 if none). */
  get span() {
    const ok = this.trials.filter((t) => t.correct).map((t) => t.length)
    return ok.length ? Math.max(...ok) : this.start - 1
  }
  get totalCorrect() {
    return this.trials.filter((t) => t.correct).length
  }
}

/** Adult digit span means (WAIS-IV / Wechsler norms, approx.) with age decline after 60. */
export function expectedDigitSpan(age: number) {
  const decline = Math.max(0, age - 60) * 0.03
  return { forward: 6.6 - decline, backward: 4.9 - decline, sd: 1.2 }
}

/** Corsi block span means (Kessels et al. 2000, 2008). */
export function expectedCorsi(age: number) {
  const decline = Math.max(0, age - 50) * 0.035
  return { forward: 6.0 - decline, backward: 5.5 - decline, sd: 1.1 }
}

export function spanLevel(forward: number, backward: number, exp: { forward: number; backward: number; sd: number }) {
  const zf = (exp.forward - forward) / exp.sd
  const zb = (exp.backward - backward) / exp.sd
  return { zf, zb, level: levelFromZ((zf + zb) / 2) }
}

/* ------------------------------------------------------------------ */
/* Stroop                                                              */
/* ------------------------------------------------------------------ */

export interface StroopTrial {
  word: number
  ink: number
  congruent: boolean
  answer: number | null
  rt: number | null
}

export function stroopScore(trials: StroopTrial[]) {
  const valid = (c: boolean) =>
    trimSd(
      trials.filter((t) => t.congruent === c && t.answer === t.ink && t.rt !== null && t.rt >= 200 && t.rt <= 3000).map((t) => t.rt as number),
      2.5,
    )
  const cong = valid(true)
  const inc = valid(false)
  const acc = (c: boolean) => {
    const ts = trials.filter((t) => t.congruent === c)
    return ts.length ? ts.filter((t) => t.answer === t.ink).length / ts.length : NaN
  }
  const mc = mean(cong)
  const mi = mean(inc)
  return {
    congruentRt: mc,
    incongruentRt: mi,
    interference: mi - mc,
    interferencePct: ((mi - mc) / mc) * 100,
    accCongruent: acc(true),
    accIncongruent: acc(false),
  }
}

export function stroopLevel(interference: number, accIncongruent: number, age: number): Level {
  const shift = Math.max(0, age - 40) * 2
  let level: Level
  if (interference <= 100 + shift) level = 'great'
  else if (interference <= 200 + shift) level = 'normal'
  else if (interference <= 320 + shift) level = 'borderline'
  else level = 'attention'
  if (accIncongruent < 0.7) level = 'attention'
  else if (accIncongruent < 0.85 && (level === 'great' || level === 'normal')) level = 'borderline'
  return level
}

/* ------------------------------------------------------------------ */
/* Trail Making (Tombaugh 2004)                                        */
/* ------------------------------------------------------------------ */

/** [maxAge, meanA, sdA, meanB, sdB] – for 55+ the two education groups are averaged. */
const TMT: [number, number, number, number, number][] = [
  [24, 22.93, 6.87, 48.97, 12.69],
  [34, 24.4, 8.71, 50.68, 12.36],
  [44, 28.54, 10.09, 58.46, 16.41],
  [54, 31.78, 9.93, 63.76, 14.42],
  [59, 33.41, 10.54, 73.79, 20.06],
  [64, 32.27, 8.03, 69.57, 19.07],
  [69, 36.49, 9.27, 79.22, 19.1],
  [74, 41.3, 14.99, 98.11, 29.61],
  [79, 46.28, 16.38, 115.65, 44.95],
  [84, 56.76, 22.3, 142.45, 54.21],
  [120, 60.51, 25.38, 154.12, 76.94],
]

export function tmtNorm(age: number) {
  const row = TMT.find((r) => age <= r[0]) ?? TMT[TMT.length - 1]
  return { a: { mean: row[1], sd: row[2] }, b: { mean: row[3], sd: row[4] } }
}

export function tmtLevel(timeA: number, timeB: number, age: number) {
  const n = tmtNorm(age)
  const zA = (timeA - n.a.mean) / n.a.sd
  const zB = (timeB - n.b.mean) / n.b.sd
  const ratio = timeB / timeA
  const worst = Math.max(zA, zB)
  let level: Level = worst <= -0.5 ? 'great' : worst <= 1 ? 'normal' : worst <= 2 ? 'borderline' : 'attention'
  if (ratio >= 3 && (level === 'great' || level === 'normal')) level = 'borderline'
  return { zA, zB, ratio, level }
}

/* ------------------------------------------------------------------ */
/* Go / No-Go (SART)                                                   */
/* ------------------------------------------------------------------ */

export interface GoTrial {
  digit: number
  go: boolean
  responded: boolean
  rt: number | null
}

export function goNoGoScore(trials: GoTrial[]) {
  const go = trials.filter((t) => t.go)
  const nogo = trials.filter((t) => !t.go)
  const hits = go.filter((t) => t.responded).length
  const fa = nogo.filter((t) => t.responded).length
  const rts = go.filter((t) => t.responded && t.rt !== null && t.rt >= 100).map((t) => t.rt as number)
  const sdt = dPrime(hits, go.length - hits, fa, nogo.length - fa)
  return {
    commissions: fa,
    commissionRate: nogo.length ? fa / nogo.length : NaN,
    omissions: go.length - hits,
    omissionRate: go.length ? (go.length - hits) / go.length : NaN,
    goRt: mean(rts),
    goRtCv: cv(rts),
    dPrime: sdt.dPrime,
    criterion: sdt.criterion,
    goCount: go.length,
    nogoCount: nogo.length,
  }
}

export function goNoGoLevel(dp: number, omissionRate: number): Level {
  let l: Level = dp >= 3 ? 'great' : dp >= 2 ? 'normal' : dp >= 1.3 ? 'borderline' : 'attention'
  if (omissionRate > 0.15 && (l === 'great' || l === 'normal')) l = 'borderline'
  return l
}

/** 90th percentile helper re-exported for UI. */
export const p90 = (xs: number[]) => quantile(xs, 0.9)
