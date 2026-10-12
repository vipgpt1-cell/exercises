/**
 * Pure-tone audiometry logic (pure functions, unit-tested).
 *
 * - Level conversion dB HL ↔ dBFS using ISO 389-1 reference thresholds (RETSPL)
 *   and a calibration reference.
 * - Automated modified Hughson–Westlake procedure (ASHA 2005): 10 dB down after a
 *   response, 5 dB up after no response; threshold = lowest level with responses on
 *   at least half of the ascending presentations, minimum two.
 * - Scoring: four-frequency pure-tone average (0.5/1/2/4 kHz), WHO 2021 grades,
 *   asymmetry, noise-notch (Coles et al. 2000, simplified), test–retest reliability,
 *   and ISO 7029 age/sex medians.
 */

import type { HearingCalibration } from '../../lib/store'

export const FREQS_QUICK = [1000, 2000, 4000, 500] as const
export const FREQS_FULL = [1000, 2000, 3000, 4000, 6000, 8000, 500, 250] as const
export const AUDIOGRAM_FREQS = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000]

/** ISO 389-1 reference equivalent threshold SPL (supra-aural earphone), dB re 20 µPa. */
export const RETSPL: Record<number, number> = {
  125: 45.0,
  250: 25.5,
  500: 11.5,
  750: 8.0,
  1000: 7.0,
  1500: 6.5,
  2000: 9.0,
  3000: 10.0,
  4000: 9.5,
  6000: 15.5,
  8000: 13.0,
}

/** Level of the 1 kHz calibration tone. */
export const REF_DBFS = -30
/** Assumed SPL of the reference tone when set to "clear and comfortable" (≈ conversational level). */
export const DEFAULT_REF_SPL = 60
export const MIN_HL = -10
export const MAX_HL_CAP = 90
/** Keep 3 dB of digital headroom. */
export const MAX_DBFS = -3

export const defaultCalibration = (): HearingCalibration => ({
  refSpl: DEFAULT_REF_SPL,
  corrections: {},
  method: 'comfortable',
  date: new Date().toISOString(),
})

export function hlToDbfs(hl: number, freq: number, cal: HearingCalibration): number {
  const spl = hl + RETSPL[freq] + (cal.corrections[String(freq)] ?? 0)
  return spl - (cal.refSpl - REF_DBFS)
}

/** Highest presentable level in 5 dB steps. */
export function maxHlFor(freq: number, cal: HearingCalibration): number {
  const raw = MAX_DBFS - RETSPL[freq] - (cal.corrections[String(freq)] ?? 0) + (cal.refSpl - REF_DBFS)
  return Math.min(MAX_HL_CAP, Math.floor(raw / 5) * 5)
}

/* ------------------------------------------------------------------ */
/* Hughson–Westlake staircase                                          */
/* ------------------------------------------------------------------ */

export interface Presentation {
  level: number
  heard: boolean
  ascending: boolean
}

export class HWStaircase {
  readonly min: number
  readonly max: number
  readonly maxTrials: number
  level: number
  done = false
  /** dB HL, or null if no response at the maximum level. */
  threshold: number | null = null
  noResponse = false
  reliable = true
  trials: Presentation[] = []
  private phase: 'initial' | 'bracket' = 'initial'
  private asc = new Map<number, { n: number; heard: number }>()
  private maxMisses = 0
  private minHits = 0
  private lastHeard: boolean | null = null

  constructor(opts: { start: number; min?: number; max: number; maxTrials?: number }) {
    this.min = opts.min ?? MIN_HL
    this.max = opts.max
    this.maxTrials = opts.maxTrials ?? 26
    this.level = Math.max(this.min, Math.min(this.max, Math.round(opts.start / 5) * 5))
  }

  respond(heard: boolean) {
    if (this.done) return
    const L = this.level
    const ascending = this.phase === 'bracket' && this.lastHeard === false
    this.trials.push({ level: L, heard, ascending })

    if (ascending) {
      const s = this.asc.get(L) ?? { n: 0, heard: 0 }
      s.n++
      if (heard) s.heard++
      this.asc.set(L, s)
      if (s.heard >= 2 && s.heard * 2 >= s.n) return this.finish(L)
    }
    if (heard && L <= this.min) {
      this.minHits++
      if (this.minHits >= 2) return this.finish(this.min)
    }
    if (!heard && L >= this.max) {
      this.maxMisses++
      if (this.maxMisses >= 2) {
        this.noResponse = true
        this.threshold = null
        this.done = true
        return
      }
    }

    if (this.phase === 'initial') {
      if (heard) {
        this.phase = 'bracket'
        this.level = Math.max(this.min, L - 10)
      } else {
        this.level = Math.min(this.max, L + 10)
      }
    } else {
      this.level = heard ? Math.max(this.min, L - 10) : Math.min(this.max, L + 5)
    }
    this.lastHeard = heard

    if (this.trials.length >= this.maxTrials) this.fallback()
  }

  private finish(level: number) {
    this.threshold = level
    this.done = true
  }

  /** Too many presentations: take the best available estimate and flag it. */
  private fallback() {
    this.reliable = false
    const candidates = [...this.asc.entries()].filter(([, s]) => s.heard >= 1 && s.heard * 2 >= s.n).map(([l]) => l)
    if (candidates.length) {
      this.threshold = Math.min(...candidates)
    } else {
      const heardLevels = this.trials.filter((t) => t.heard).map((t) => t.level)
      if (heardLevels.length) this.threshold = Math.min(...heardLevels)
      else {
        this.threshold = null
        this.noResponse = true
      }
    }
    this.done = true
  }
}

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

export interface Threshold {
  /** dB HL; null = no response at `max`. */
  hl: number | null
  max: number
  reliable: boolean
}

export type EarMap = Record<string, Threshold>

export type WhoGrade = 'normal' | 'mild' | 'moderate' | 'modsevere' | 'severe' | 'profound' | 'complete'

/** WHO World Report on Hearing (2021) grades, based on the 0.5–4 kHz average. */
export function whoGrade(pta: number): WhoGrade {
  if (pta < 20) return 'normal'
  if (pta < 35) return 'mild'
  if (pta < 50) return 'moderate'
  if (pta < 65) return 'modsevere'
  if (pta < 80) return 'severe'
  if (pta < 95) return 'profound'
  return 'complete'
}

/** Threshold value used in averages: no-response counts as max + 5 dB (a lower bound). */
export const effectiveHl = (t: Threshold | undefined) => (t ? (t.hl ?? t.max + 5) : NaN)

export function pta(ear: EarMap, freqs: readonly number[] = [500, 1000, 2000, 4000]) {
  const vals = freqs.map((f) => effectiveHl(ear[String(f)]))
  if (vals.some((v) => !Number.isFinite(v))) return { value: NaN, lowerBound: false }
  const lowerBound = freqs.some((f) => ear[String(f)]?.hl === null)
  return { value: vals.reduce((a, b) => a + b, 0) / vals.length, lowerBound }
}

export function hasNotch(ear: EarMap): boolean {
  const g = (f: number) => effectiveHl(ear[String(f)])
  const need = [1000, 2000, 3000, 4000, 6000, 8000]
  if (need.some((f) => !Number.isFinite(g(f)))) return false
  const worst = Math.max(g(3000), g(4000), g(6000))
  const base = Math.min(g(1000), g(2000))
  return worst - base >= 10 && worst - g(8000) >= 10
}

export function asymmetry(right: EarMap, left: EarMap) {
  const pr = pta(right).value
  const pl = pta(left).value
  const diffs: { f: number; d: number }[] = []
  for (const f of AUDIOGRAM_FREQS) {
    const r = effectiveHl(right[String(f)])
    const l = effectiveHl(left[String(f)])
    if (Number.isFinite(r) && Number.isFinite(l)) diffs.push({ f, d: r - l })
  }
  const bigFreqs = diffs.filter((x) => Math.abs(x.d) >= 15)
  const ptaDiff = pr - pl
  const asymmetric = Math.abs(ptaDiff) >= 15 || bigFreqs.length >= 2
  /** Cross-hearing: the better ear may pick up loud tones sent to the worse ear (interaural attenuation ≈ 40 dB). */
  const crossHearingRisk = diffs.some((x) => Math.abs(x.d) >= 40)
  return { ptaDiff, asymmetric, worseEar: ptaDiff > 0 ? ('right' as const) : ('left' as const), bigFreqs, crossHearingRisk }
}

/** ISO 7029:2000 median age-related threshold shift coefficients (α, dB/year²). */
const ISO7029: Record<'male' | 'female', Record<number, number>> = {
  male: { 125: 0.003, 250: 0.003, 500: 0.0035, 1000: 0.004, 1500: 0.0055, 2000: 0.007, 3000: 0.0115, 4000: 0.016, 6000: 0.018, 8000: 0.022 },
  female: { 125: 0.003, 250: 0.003, 500: 0.0035, 1000: 0.004, 1500: 0.005, 2000: 0.006, 3000: 0.0075, 4000: 0.009, 6000: 0.012, 8000: 0.015 },
}

/** Median threshold (dB HL) expected for an otologically normal person of this age/sex. */
export function ageMedian(freq: number, age: number, sex: 'male' | 'female' | null): number {
  if (age <= 18) return 0
  const a = sex ? ISO7029[sex][freq] : (ISO7029.male[freq] + ISO7029.female[freq]) / 2
  return a * (age - 18) ** 2
}

export type ToneLevel = 'great' | 'normal' | 'borderline' | 'attention'

export function overallLevel(right: EarMap, left: EarMap): ToneLevel {
  const pr = pta(right).value
  const pl = pta(left).value
  const worse = Math.max(pr, pl)
  const asym = asymmetry(right, left).asymmetric
  if (worse >= 35) return 'attention'
  if (asym) return 'attention'
  if (worse >= 20) return 'borderline'
  if (worse <= 10) return 'great'
  return 'normal'
}
