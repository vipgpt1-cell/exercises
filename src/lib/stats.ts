/** Descriptive statistics and a few psychometric helpers. Pure functions, unit-tested. */

export const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0)

export function mean(xs: readonly number[]): number {
  return xs.length ? sum(xs) / xs.length : NaN
}

/** Geometric mean (for ratio-scale values such as step sizes). */
export function geoMean(xs: readonly number[]): number {
  return xs.length ? Math.exp(xs.reduce((a, x) => a + Math.log(x), 0) / xs.length) : NaN
}

export function median(xs: readonly number[]): number {
  return quantile(xs, 0.5)
}

/** Quantile with linear interpolation between order statistics (R type 7 / Excel PERCENTILE.INC). */
export function quantile(xs: readonly number[], q: number): number {
  if (!xs.length) return NaN
  const s = [...xs].sort((a, b) => a - b)
  const pos = (s.length - 1) * Math.min(1, Math.max(0, q))
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return s[lo] + (s[hi] - s[lo]) * (pos - lo)
}

/** Sample standard deviation (n − 1). */
export function sd(xs: readonly number[]): number {
  if (xs.length < 2) return NaN
  const m = mean(xs)
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1))
}

/** Coefficient of variation in percent. */
export function cv(xs: readonly number[]): number {
  const m = mean(xs)
  return m ? (sd(xs) / m) * 100 : NaN
}

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

export function round(x: number, digits = 0): number {
  const f = 10 ** digits
  return Math.round(x * f) / f
}

/** Standard normal cumulative distribution (Zelen & Severo / A&S 26.2.17, |error| < 7.5e-8). */
export function normCdf(z: number): number {
  if (!Number.isFinite(z)) return z > 0 ? 1 : 0
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2)
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  return z > 0 ? 1 - p : p
}

/** Inverse standard normal CDF (Acklam's algorithm, relative error < 1.15e-9). */
export function probit(p: number): number {
  if (p <= 0) return -Infinity
  if (p >= 1) return Infinity
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239]
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1]
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783]
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416]
  const pl = 0.02425
  let q: number
  if (p < pl) {
    q = Math.sqrt(-2 * Math.log(p))
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
  if (p > 1 - pl) {
    q = Math.sqrt(-2 * Math.log(1 - p))
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
  q = p - 0.5
  const r = q * q
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
}

/**
 * Signal-detection sensitivity with the log-linear correction (Hautus, 1995):
 * add 0.5 to hits and false alarms and 1 to both trial counts, so perfect
 * scores stay finite.
 */
export function dPrime(hits: number, misses: number, falseAlarms: number, correctRejections: number) {
  const H = (hits + 0.5) / (hits + misses + 1)
  const F = (falseAlarms + 0.5) / (falseAlarms + correctRejections + 1)
  const zH = probit(H)
  const zF = probit(F)
  return { dPrime: zH - zF, criterion: -(zH + zF) / 2, hitRate: H, faRate: F }
}

/** Ordinary least squares y = a + b·x. */
export function linReg(xs: readonly number[], ys: readonly number[]) {
  const n = Math.min(xs.length, ys.length)
  if (n < 2) return { slope: NaN, intercept: NaN, r2: NaN }
  const mx = mean(xs.slice(0, n))
  const my = mean(ys.slice(0, n))
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my)
    sxx += (xs[i] - mx) ** 2
    syy += (ys[i] - my) ** 2
  }
  const slope = sxx ? sxy / sxx : NaN
  return { slope, intercept: my - slope * mx, r2: sxx && syy ? (sxy * sxy) / (sxx * syy) : NaN }
}

/** Remove values outside mean ± k·SD (single pass). */
export function trimSd(xs: readonly number[], k = 2.5): number[] {
  if (xs.length < 4) return [...xs]
  const m = mean(xs)
  const s = sd(xs)
  return xs.filter((x) => Math.abs(x - m) <= k * s)
}

/** z-score → percentile (0–100). */
export const percentileOfZ = (z: number) => normCdf(z) * 100
