/**
 * Motor analysis (pure functions, unit-tested):
 *  - finger tapping statistics
 *  - Archimedes spiral tracing: accuracy + tremor spectrum of the drawing error
 *  - ISO 9241-9 Fitts' law throughput with effective width
 *  - accelerometer postural tremor (band-limited RMS + dominant frequency)
 */
import type { Level } from '../../lib/store'
import { cv, mean, sd } from '../../lib/stats'
import { bandPower, detrend, peakFrequency, resampleUniform, welch } from '../../lib/dsp'

/* ------------------------------------------------------------------ */
/* Tapping                                                             */
/* ------------------------------------------------------------------ */

export interface TapStats {
  taps: number
  rate: number
  itiMean: number
  itiCv: number
  fatigue: number
}

/** `times` are tap timestamps (ms) from the start of a trial of `durationMs`. */
export function tapStats(times: number[], durationMs: number): TapStats {
  const t = times.filter((x) => x >= 0 && x <= durationMs).sort((a, b) => a - b)
  const iti = t.slice(1).map((x, i) => x - t[i])
  const third = durationMs / 3
  const first = t.filter((x) => x < third).length
  const last = t.filter((x) => x >= 2 * third).length
  return {
    taps: t.length,
    rate: t.length / (durationMs / 1000),
    itiMean: iti.length ? mean(iti) : NaN,
    itiCv: iti.length > 2 ? cv(iti) : NaN,
    fatigue: first ? ((last - first) / first) * 100 : 0,
  }
}

/** Asymmetry between hands, % of the faster hand. */
export const handAsymmetry = (a: number, b: number) => (Math.max(a, b) ? (Math.abs(a - b) / Math.max(a, b)) * 100 : 0)

export function tappingLevel(taps10s: number, asym: number, rhythmCv: number): Level {
  let l: Level = taps10s >= 60 ? 'great' : taps10s >= 45 ? 'normal' : taps10s >= 35 ? 'borderline' : 'attention'
  if (asym > 25 && (l === 'great' || l === 'normal')) l = 'borderline'
  if (rhythmCv > 25 && l === 'great') l = 'normal'
  return l
}

/* ------------------------------------------------------------------ */
/* Spiral                                                              */
/* ------------------------------------------------------------------ */

export interface SpiralGeom {
  cx: number
  cy: number
  /** Start radius. */
  a: number
  /** Radius growth per radian. */
  b: number
  turns: number
}

export const spiralSpacing = (g: SpiralGeom) => 2 * Math.PI * g.b

export function spiralPoint(g: SpiralGeom, theta: number) {
  const r = g.a + g.b * theta
  return { x: g.cx + r * Math.cos(theta), y: g.cy + r * Math.sin(theta) }
}

export interface TracePoint {
  x: number
  y: number
  t: number
}

/** Signed radial distance to the nearest arm of the spiral. */
export function spiralError(g: SpiralGeom, p: { x: number; y: number }) {
  const dx = p.x - g.cx
  const dy = p.y - g.cy
  const r = Math.hypot(dx, dy)
  let phi = Math.atan2(dy, dx)
  if (phi < 0) phi += 2 * Math.PI
  let best = Infinity
  for (let k = -1; k <= g.turns; k++) {
    const e = r - (g.a + g.b * (phi + 2 * Math.PI * k))
    if (Math.abs(e) < Math.abs(best)) best = e
  }
  return best
}

export interface SpiralResult {
  mae: number
  maePct: number
  precision: number
  coverage: number
  duration: number
  speed: number
  tremorRmsPct: number
  tremorFreq: number
  tremorShare: number
  n: number
}

export function analyzeSpiral(g: SpiralGeom, pts: TracePoint[]): SpiralResult {
  const spacing = spiralSpacing(g)
  const usable = pts.filter((p) => Math.hypot(p.x - g.cx, p.y - g.cy) >= g.a * 0.6)
  const errs = usable.map((p) => spiralError(g, p))
  const mae = errs.length ? mean(errs.map(Math.abs)) : NaN
  // coverage: unwrap the angle along the drawing
  let theta = 0
  let prev: number | null = null
  let maxTheta = 0
  for (const p of usable) {
    const a = Math.atan2(p.y - g.cy, p.x - g.cx)
    if (prev !== null) {
      let d = a - prev
      if (d > Math.PI) d -= 2 * Math.PI
      if (d < -Math.PI) d += 2 * Math.PI
      theta += d
    }
    prev = a
    maxTheta = Math.max(maxTheta, Math.abs(theta))
  }
  const coverage = Math.min(1, maxTheta / (g.turns * 2 * Math.PI))
  let len = 0
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  const duration = pts.length > 1 ? (pts[pts.length - 1].t - pts[0].t) / 1000 : 0
  // tremor: spectrum of the error signal
  const fs = 100
  let tremorRms = NaN
  let tremorFreq = NaN
  let tremorShare = NaN
  if (usable.length > 30 && duration > 1.5) {
    const u = resampleUniform(
      usable.map((p) => p.t),
      errs,
      fs,
    )
    if (u.length > 128) {
      // Band-limited RMS from the power spectrum (Parseval) – no filter roll-off inside the band.
      const w = welch(detrend(u), fs, 128)
      tremorRms = Math.sqrt(bandPower(w.freqs, w.psd, w.df, 3, 12))
      tremorFreq = peakFrequency(w.freqs, w.psd, 3, 12)
      const total = bandPower(w.freqs, w.psd, w.df, 0.5, 20)
      tremorShare = total > 0 ? bandPower(w.freqs, w.psd, w.df, 3, 12) / total : NaN
    }
  }
  const maePct = (mae / spacing) * 100
  return {
    mae,
    maePct,
    precision: Math.max(0, Math.min(100, 100 * (1 - mae / (0.5 * spacing)))),
    coverage,
    duration,
    speed: duration ? len / duration : 0,
    tremorRmsPct: (tremorRms / spacing) * 100,
    tremorFreq,
    tremorShare,
    n: usable.length,
  }
}

export function spiralLevel(precision: number, tremorPct: number): Level {
  let l: Level = precision >= 85 ? 'great' : precision >= 70 ? 'normal' : precision >= 55 ? 'borderline' : 'attention'
  if (Number.isFinite(tremorPct) && tremorPct > 4 && (l === 'great' || l === 'normal')) l = 'borderline'
  if (Number.isFinite(tremorPct) && tremorPct > 8) l = 'attention'
  return l
}

/* ------------------------------------------------------------------ */
/* Fitts (ISO 9241-9)                                                  */
/* ------------------------------------------------------------------ */

export interface FittsTap {
  /** target centre of the previous and current target */
  from: { x: number; y: number }
  to: { x: number; y: number }
  /** tap point */
  x: number
  y: number
  /** previous tap point */
  px: number
  py: number
  mt: number
  width: number
  hit: boolean
}

export function fittsBlock(taps: FittsTap[]) {
  const dxs: number[] = []
  const ae: number[] = []
  const mts: number[] = []
  let errors = 0
  for (const tp of taps) {
    const ax = tp.to.x - tp.from.x
    const ay = tp.to.y - tp.from.y
    const A = Math.hypot(ax, ay)
    if (!A) continue
    const ux = ax / A
    const uy = ay / A
    const dx = (tp.x - tp.to.x) * ux + (tp.y - tp.to.y) * uy
    if (Math.abs(dx) > A / 2) continue // slip / accidental tap
    dxs.push(dx)
    ae.push((tp.x - tp.px) * ux + (tp.y - tp.py) * uy)
    mts.push(tp.mt)
    if (!tp.hit) errors++
  }
  const We = 4.133 * sd(dxs)
  const Ae = mean(ae)
  const IDe = Math.log2(Ae / We + 1)
  const MT = mean(mts) / 1000
  const nominalW = taps[0]?.width ?? NaN
  const nominalA = taps.length ? mean(taps.map((t) => Math.hypot(t.to.x - t.from.x, t.to.y - t.from.y))) : NaN
  return {
    We,
    Ae,
    IDe,
    ID: Math.log2(nominalA / nominalW + 1),
    MT,
    throughput: IDe / MT,
    errorRate: dxs.length ? errors / dxs.length : NaN,
    n: dxs.length,
  }
}

export function fittsLevel(tp: number, input: 'touch' | 'mouse'): Level {
  const [g, n, b] = input === 'mouse' ? [4.6, 3.6, 2.8] : [6.5, 5, 3.8]
  return tp >= g ? 'great' : tp >= n ? 'normal' : tp >= b ? 'borderline' : 'attention'
}

/* ------------------------------------------------------------------ */
/* Accelerometer tremor                                                */
/* ------------------------------------------------------------------ */

export interface AccSample {
  t: number
  x: number
  y: number
  z: number
}

export function analyzeTremor(samples: AccSample[]) {
  if (samples.length < 50) return null
  const t = samples.map((s) => s.t)
  const dur = (t[t.length - 1] - t[0]) / 1000
  const rate = (samples.length - 1) / dur
  const fs = Math.min(100, Math.max(20, Math.round(rate)))
  const axes = (['x', 'y', 'z'] as const).map((k) =>
    detrend(
      resampleUniform(
        t,
        samples.map((s) => s[k]),
        fs,
      ),
    ),
  )
  const hi = Math.min(12, fs / 2 - 1)
  const trim = Math.round(fs * 0.5)
  const core = axes.map((a) => detrend(a.slice(trim, a.length - trim)))
  const nper = fs >= 50 ? 256 : 128
  const specs = core.map((a) => welch(a, fs, nper))
  const psd = specs[0].psd.map((v, i) => v + specs[1].psd[i] + specs[2].psd[i])
  const freqs = specs[0].freqs
  const df = specs[0].df
  // Vector RMS in the tremor band from the summed spectra (Parseval).
  const bandP = bandPower(freqs, psd, df, 3, hi)
  const vecRms = Math.sqrt(bandP)
  const peak = peakFrequency(freqs, psd, 3, hi)
  const totalP = bandPower(freqs, psd, df, 1, Math.min(20, fs / 2 - 0.5))
  return {
    rms: vecRms,
    peakFreq: peak,
    share: totalP ? bandP / totalP : NaN,
    sampleRate: rate,
    duration: dur,
    /** RMS displacement estimate at the dominant frequency, mm. */
    displacementMm: Number.isFinite(peak) ? (vecRms / (2 * Math.PI * peak) ** 2) * 1000 : NaN,
    reliable: rate >= 25 && dur >= 8,
  }
}

export function tremorLevel(rmsVal: number): Level {
  if (rmsVal < 0.12) return 'great'
  if (rmsVal < 0.3) return 'normal'
  if (rmsVal < 0.8) return 'borderline'
  return 'attention'
}

export const TREMOR_BANDS = [
  { to: 0.12, level: 'great' as const },
  { to: 0.3, level: 'normal' as const },
  { to: 0.8, level: 'borderline' as const },
  { to: 1.5, level: 'attention' as const },
]
