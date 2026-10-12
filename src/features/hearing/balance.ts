/**
 * Alternate Binaural Loudness Balance (ABLB, Fowler).
 * The tone alternates between ears; the listener adjusts the balance until both
 * sound equally loud. The balance offset d (dB) means: right = base + d/2,
 * left = base − d/2. A positive match means the right ear needed more level,
 * i.e. the right ear is less sensitive.
 */
import type { Level } from '../../lib/store'
import { mean } from '../../lib/stats'

export const BALANCE_FREQS = [500, 1000, 2000, 4000]
export const BALANCE_RANGE = 24

export interface BalanceRun {
  freq: number
  start: number
  match: number
}

export function balanceLevels(base: number, d: number) {
  return { left: base - d / 2, right: base + d / 2 }
}

export function summarizeBalance(runs: BalanceRun[]) {
  const perFreq = BALANCE_FREQS.map((f) => {
    const r = runs.filter((x) => x.freq === f).map((x) => x.match)
    return { freq: f, match: r.length ? mean(r) : NaN, spread: r.length > 1 ? Math.max(...r) - Math.min(...r) : 0 }
  }).filter((x) => Number.isFinite(x.match))
  const overall = mean(perFreq.map((x) => x.match))
  const inconsistent = perFreq.some((x) => x.spread > 8)
  return { perFreq, overall, inconsistent }
}

export function balanceLevel(overall: number, perFreq: { match: number }[]): Level {
  const a = Math.abs(overall)
  const maxF = Math.max(...perFreq.map((x) => Math.abs(x.match)))
  if (a > 8 || maxF > 12) return 'attention'
  if (a > 4 || maxF > 8) return 'borderline'
  if (a <= 2) return 'great'
  return 'normal'
}

/** Which ear is weaker (needed more level), with a ±2 dB dead zone. */
export function weakerEar(overall: number): 'left' | 'right' | null {
  if (overall > 2) return 'right'
  if (overall < -2) return 'left'
  return null
}
