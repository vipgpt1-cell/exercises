/** Scoring for the neck/back/breathing checks (pure functions, unit-tested). */
import type { Level } from '../../lib/store'
import { mean, median, cv } from '../../lib/stats'

/* Pain -------------------------------------------------------------- */

export type Region = 'neck' | 'shoulderL' | 'shoulderR' | 'upperBack' | 'lowerBack' | 'hips' | 'armL' | 'armR' | 'legL' | 'legR'
export const NECK_REGIONS: Region[] = ['neck', 'shoulderL', 'shoulderR', 'armL', 'armR', 'upperBack']
export const BACK_REGIONS: Region[] = ['lowerBack', 'hips', 'legL', 'legR']

/** Red flags: 'emergency' = go now, 'urgent' = see a doctor within days. */
export const FLAGS = {
  general: [
    { id: 'fever', sev: 'urgent' },
    { id: 'weight', sev: 'urgent' },
    { id: 'cancer', sev: 'urgent' },
    { id: 'trauma', sev: 'urgent' },
    { id: 'night', sev: 'urgent' },
  ],
  back: [
    { id: 'saddle', sev: 'emergency' },
    { id: 'bladder', sev: 'emergency' },
    { id: 'legWeak', sev: 'emergency' },
  ],
  neck: [
    { id: 'headacheFever', sev: 'emergency' },
    { id: 'neuro', sev: 'emergency' },
    { id: 'clumsy', sev: 'urgent' },
    { id: 'armWeak', sev: 'urgent' },
  ],
} as const
export type FlagId = (typeof FLAGS)[keyof typeof FLAGS][number]['id']

export function flagSeverity(flags: Partial<Record<FlagId, boolean>>): 'emergency' | 'urgent' | null {
  const all = [...FLAGS.general, ...FLAGS.back, ...FLAGS.neck]
  const on = all.filter((f) => flags[f.id])
  if (on.some((f) => f.sev === 'emergency')) return 'emergency'
  if (on.length) return 'urgent'
  return null
}

export type PainCategory = 'none' | 'mild' | 'moderate' | 'severe'
/** Numeric Rating Scale categories (0 none, 1–3 mild, 4–6 moderate, 7–10 severe). */
export function nrsCategory(v: number): PainCategory {
  if (v <= 0) return 'none'
  if (v <= 3) return 'mild'
  if (v <= 6) return 'moderate'
  return 'severe'
}

export function painLevel(avg: number, severity: 'emergency' | 'urgent' | null): Level {
  if (severity) return 'urgent'
  const c = nrsCategory(avg)
  return c === 'none' ? 'great' : c === 'mild' ? 'normal' : c === 'moderate' ? 'borderline' : 'attention'
}

/* Function questionnaire -------------------------------------------- */

/** Disability % = sum of answered items (0–4 each) / (4 × answered) × 100. */
export function functionScore(answers: (number | null)[]) {
  const a = answers.filter((x): x is number => x !== null)
  if (!a.length) return NaN
  return (a.reduce((s, x) => s + x, 0) / (4 * a.length)) * 100
}
export function functionLevel(pct: number): Level {
  if (pct <= 10) return 'great'
  if (pct <= 30) return 'normal'
  if (pct <= 50) return 'borderline'
  return 'attention'
}

/* Mobility ----------------------------------------------------------- */

export interface MoveAnswer {
  id: string
  range: 0 | 1 | 2 // 2 full, 1 reduced, 0 very limited
  pain: 0 | 1 | 2 // 0 none, 1 some, 2 strong
}

export function mobilityScore(ans: MoveAnswer[]) {
  const pct = ans.length ? (ans.reduce((s, a) => s + a.range, 0) / (2 * ans.length)) * 100 : NaN
  const painful = ans.filter((a) => a.pain > 0).length
  const strong = ans.filter((a) => a.pain === 2).length
  // left/right pairs share an id prefix: "rotL"/"rotR"
  const asym: string[] = []
  const byBase = new Map<string, MoveAnswer[]>()
  for (const a of ans) {
    const m = a.id.match(/^(.*)[LR]$/)
    if (m) byBase.set(m[1], [...(byBase.get(m[1]) ?? []), a])
  }
  for (const [base, pair] of byBase) {
    if (pair.length === 2 && (pair[0].range !== pair[1].range || Math.abs(pair[0].pain - pair[1].pain) >= 1)) asym.push(base)
  }
  return { pct, painful, strong, asym }
}
export function mobilityLevel(pct: number, strong: number): Level {
  let l: Level = pct >= 90 ? 'great' : pct >= 75 ? 'normal' : pct >= 50 ? 'borderline' : 'attention'
  if (strong > 0 && (l === 'great' || l === 'normal')) l = 'borderline'
  return l
}

/* Breath-hold (BOLT) ------------------------------------------------ */

export function boltLevel(sec: number): Level {
  if (sec >= 30) return 'great'
  if (sec >= 20) return 'normal'
  if (sec >= 10) return 'borderline'
  return 'attention'
}
export const BOLT_BANDS = [
  { to: 10, level: 'attention' as const },
  { to: 20, level: 'borderline' as const },
  { to: 30, level: 'normal' as const },
  { to: 50, level: 'great' as const },
]

/* Breathing rate ----------------------------------------------------- */

/** Breaths per minute from tap times (ms): 60 / median interval; needs ≥ 3 intervals. */
export function breathRate(times: number[]) {
  const t = [...times].sort((a, b) => a - b)
  const iv = t.slice(1).map((x, i) => (x - t[i]) / 1000).filter((x) => x > 1 && x < 20)
  if (iv.length < 3) return { rate: NaN, intervals: iv.length, variability: NaN, meanInterval: NaN }
  return { rate: 60 / median(iv), intervals: iv.length, variability: cv(iv), meanInterval: mean(iv) }
}
export function breathLevel(rate: number): Level {
  if (!Number.isFinite(rate)) return 'info'
  if (rate < 8) return 'borderline'
  if (rate < 10) return 'normal'
  if (rate <= 16) return 'great'
  if (rate <= 20) return 'normal'
  if (rate <= 24) return 'borderline'
  return 'attention'
}
