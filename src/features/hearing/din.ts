/**
 * Digits-in-Noise (DIN) logic – Smits et al. (2013) style adaptive procedure.
 *
 * 24 digit triplets in speech-shaped noise. A triplet is correct only if all three
 * digits are correct. One-up one-down tracking converges on the 50 % point: the
 * speech reception threshold (SRT) in dB SNR. Steps: 4 dB for the first four
 * triplets (fast approach), then 2 dB. SRT = mean SNR of triplets 5–24.
 */

import type { Lang } from '../../lib/i18n'
import type { Level } from '../../lib/store'
import { mean, sd } from '../../lib/stats'
import { defaultRng, sample, type Rng } from '../../lib/rng'

export const DIN_TRIALS = 24
export const DIN_START_SNR = 0
export const DIN_MIN_SNR = -22
export const DIN_MAX_SNR = 10

/** Digits used per language (words that synthesise/understand poorly are left out, as in the English DIN which excludes 7). */
export const DIN_DIGITS: Record<Lang, number[]> = {
  en: [1, 2, 3, 4, 5, 6, 8, 9, 0],
  ru: [1, 2, 3, 4, 5, 6, 7, 8, 9, 0],
  uz: [1, 2, 4, 5, 6, 7, 8, 9, 0],
}

export function makeTriplet(digits: number[], prev: number[] | null, rng: Rng = defaultRng): number[] {
  for (let i = 0; i < 20; i++) {
    const t = sample(digits, 3, rng)
    if (!prev || t.join('') !== prev.join('')) return t
  }
  return sample(digits, 3, rng)
}

export interface DinTrial {
  snr: number
  target: number[]
  answer: number[]
  correct: boolean
}

export class DinStaircase {
  snr = DIN_START_SNR
  trials: DinTrial[] = []
  get done() {
    return this.trials.length >= DIN_TRIALS
  }
  respond(target: number[], answer: number[]) {
    const correct = target.length === answer.length && target.every((d, i) => d === answer[i])
    this.trials.push({ snr: this.snr, target, answer, correct })
    const step = this.trials.length <= 4 ? 4 : 2
    this.snr = Math.max(DIN_MIN_SNR, Math.min(DIN_MAX_SNR, this.snr + (correct ? -step : step)))
    return correct
  }
}

export function dinScore(trials: DinTrial[]) {
  const used = trials.slice(4, DIN_TRIALS)
  const snrs = used.map((t) => t.snr)
  let digitsRight = 0
  let digitsTotal = 0
  for (const t of trials) {
    t.target.forEach((d, i) => {
      digitsTotal++
      if (t.answer[i] === d) digitsRight++
    })
  }
  return {
    srt: mean(snrs),
    sd: sd(snrs),
    tripletCorrect: trials.filter((t) => t.correct).length,
    digitAccuracy: digitsTotal ? digitsRight / digitsTotal : NaN,
  }
}

/**
 * Interpretation bands for diotic DIN (after Smits et al. 2013 and the WHO hearWHO
 * screening criteria): SRT ≤ −9.5 dB pass; −9.5 … −7 borderline; > −7 refer.
 */
export function dinLevel(srt: number): Level {
  if (srt <= -12) return 'great'
  if (srt <= -9.5) return 'normal'
  if (srt <= -7) return 'borderline'
  return 'attention'
}

export const DIN_BANDS = [
  { to: -12, level: 'great' as const },
  { to: -9.5, level: 'normal' as const },
  { to: -7, level: 'borderline' as const },
  { to: 2, level: 'attention' as const },
]
