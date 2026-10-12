/**
 * Upper frequency limit of hearing measured with the method of limits:
 * alternating descending ("first heard") and ascending ("disappeared")
 * exponential sweeps, corrected for reaction time, then averaged.
 */
import type { Level } from '../../lib/store'
import { mean } from '../../lib/stats'

export const SWEEP_LOW = 2000
export const SWEEP_OCT_PER_S = 0.4
export const REACTION_S = 0.35

export const sweepDuration = (top: number) => Math.log2(top / SWEEP_LOW) / SWEEP_OCT_PER_S

/** Frequency of an exponential sweep from f0 to f1 over `dur` seconds, at time t. */
export function sweepFreqAt(f0: number, f1: number, dur: number, t: number) {
  const x = Math.min(1, Math.max(0, t / dur))
  return f0 * Math.pow(f1 / f0, x)
}

export interface SweepResult {
  dir: 'down' | 'up'
  /** Frequency where the tone was first heard (down) or disappeared (up). */
  freq: number
  /** True if the listener never responded during the sweep. */
  censored: boolean
}

export function upperLimit(sweeps: SweepResult[]) {
  const d = sweeps.filter((s) => s.dir === 'down').map((s) => s.freq)
  const u = sweeps.filter((s) => s.dir === 'up').map((s) => s.freq)
  const parts = [d.length ? mean(d) : NaN, u.length ? mean(u) : NaN].filter(Number.isFinite)
  const limit = parts.length ? mean(parts) : NaN
  return Math.round(limit / 100) * 100
}

/**
 * Approximate typical (median) upper limit of hearing by age for moderately loud tones.
 * Synthesised from population studies of extended high-frequency hearing; device
 * playback limits (often 16–18 kHz) also matter, so this is indicative only.
 */
export const AGE_CURVE: [number, number][] = [
  [15, 19000],
  [20, 18000],
  [25, 17000],
  [30, 16000],
  [40, 14500],
  [50, 12500],
  [60, 10500],
  [70, 9000],
  [80, 8000],
]

export function expectedLimit(age: number) {
  const c = AGE_CURVE
  if (age <= c[0][0]) return c[0][1]
  for (let i = 1; i < c.length; i++) {
    if (age <= c[i][0]) {
      const [a0, f0] = c[i - 1]
      const [a1, f1] = c[i]
      return f0 + ((age - a0) / (a1 - a0)) * (f1 - f0)
    }
  }
  return c[c.length - 1][1]
}

/** Age whose typical upper limit equals `freq` ("hearing age"). */
export function typicalAge(freq: number) {
  const c = AGE_CURVE
  if (freq >= c[0][1]) return c[0][0]
  for (let i = 1; i < c.length; i++) {
    if (freq >= c[i][1]) {
      const [a0, f0] = c[i - 1]
      const [a1, f1] = c[i]
      return a0 + ((f0 - freq) / (f0 - f1)) * (a1 - a0)
    }
  }
  return c[c.length - 1][0]
}

export function rangeLevel(limit: number, age: number | null): Level {
  if (age === null) return 'info'
  const diff = limit - expectedLimit(age)
  if (diff >= 1000) return 'great'
  if (diff >= -1500) return 'normal'
  return 'borderline'
}
