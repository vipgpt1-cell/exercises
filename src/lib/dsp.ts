/** Signal processing helpers used by tremor / tracing analysis. Pure, unit-tested. */

export function nextPow2(n: number) {
  let p = 1
  while (p < n) p <<= 1
  return p
}

/** In-place iterative radix-2 FFT. Length must be a power of two. */
export function fft(re: Float64Array, im: Float64Array) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wr = Math.cos(ang)
    const wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cr = 1
      let ci = 0
      for (let k = 0; k < len / 2; k++) {
        const a = i + k
        const b = a + len / 2
        const xr = re[b] * cr - im[b] * ci
        const xi = re[b] * ci + im[b] * cr
        re[b] = re[a] - xr
        im[b] = im[a] - xi
        re[a] += xr
        im[a] += xi
        const t = cr * wr - ci * wi
        ci = cr * wi + ci * wr
        cr = t
      }
    }
  }
}

export function hann(n: number): Float64Array {
  const w = new Float64Array(n)
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))
  return w
}

/** Remove the least-squares line. */
export function detrend(x: ArrayLike<number>): Float64Array {
  const n = x.length
  const out = new Float64Array(n)
  if (n < 2) return out
  const mx = (n - 1) / 2
  let my = 0
  for (let i = 0; i < n; i++) my += x[i]
  my /= n
  let sxy = 0
  let sxx = 0
  for (let i = 0; i < n; i++) {
    sxy += (i - mx) * (x[i] - my)
    sxx += (i - mx) ** 2
  }
  const b = sxy / sxx
  for (let i = 0; i < n; i++) out[i] = x[i] - (my + b * (i - mx))
  return out
}

/**
 * Resample irregular samples (t in ms) onto a uniform grid by linear interpolation.
 * Returns the uniform signal and its sample rate.
 */
export function resampleUniform(t: readonly number[], x: readonly number[], fs: number): Float64Array {
  if (t.length < 2) return new Float64Array(0)
  const t0 = t[0]
  const dur = (t[t.length - 1] - t0) / 1000
  const n = Math.max(0, Math.floor(dur * fs) + 1)
  const out = new Float64Array(n)
  let j = 0
  for (let i = 0; i < n; i++) {
    const ti = t0 + (i * 1000) / fs
    while (j < t.length - 2 && t[j + 1] < ti) j++
    const span = t[j + 1] - t[j]
    const f = span > 0 ? (ti - t[j]) / span : 0
    out[i] = x[j] + (x[j + 1] - x[j]) * Math.min(1, Math.max(0, f))
  }
  return out
}

export interface Biquad {
  b0: number
  b1: number
  b2: number
  a1: number
  a2: number
}

/** RBJ cookbook 2nd-order sections (Q = 1/√2 → Butterworth). */
export function biquad(type: 'lowpass' | 'highpass', fc: number, fs: number, q = Math.SQRT1_2): Biquad {
  const w0 = (2 * Math.PI * fc) / fs
  const cos = Math.cos(w0)
  const alpha = Math.sin(w0) / (2 * q)
  const a0 = 1 + alpha
  if (type === 'lowpass') {
    return { b0: (1 - cos) / 2 / a0, b1: (1 - cos) / a0, b2: (1 - cos) / 2 / a0, a1: (-2 * cos) / a0, a2: (1 - alpha) / a0 }
  }
  return { b0: (1 + cos) / 2 / a0, b1: -(1 + cos) / a0, b2: (1 + cos) / 2 / a0, a1: (-2 * cos) / a0, a2: (1 - alpha) / a0 }
}

export function applyBiquad(f: Biquad, x: ArrayLike<number>): Float64Array {
  const y = new Float64Array(x.length)
  let x1 = 0
  let x2 = 0
  let y1 = 0
  let y2 = 0
  for (let i = 0; i < x.length; i++) {
    const xi = x[i]
    const yi = f.b0 * xi + f.b1 * x1 + f.b2 * x2 - f.a1 * y1 - f.a2 * y2
    x2 = x1
    x1 = xi
    y2 = y1
    y1 = yi
    y[i] = yi
  }
  return y
}

/** Zero-phase filtering (forward, then backward). */
export function filtfilt(f: Biquad, x: ArrayLike<number>): Float64Array {
  const fwd = applyBiquad(f, x)
  fwd.reverse()
  const back = applyBiquad(f, fwd)
  back.reverse()
  return back
}

/** Zero-phase band-pass: cascaded Butterworth high-pass + low-pass (each run forward & backward). */
export function bandpass(x: ArrayLike<number>, lo: number, hi: number, fs: number): Float64Array {
  // Pad by reflection to limit edge transients.
  const pad = Math.min(x.length - 1, Math.round(fs))
  const ext = new Float64Array(x.length + 2 * pad)
  for (let i = 0; i < pad; i++) ext[i] = 2 * x[0] - x[pad - i]
  for (let i = 0; i < x.length; i++) ext[pad + i] = x[i]
  for (let i = 0; i < pad; i++) ext[pad + x.length + i] = 2 * x[x.length - 1] - x[x.length - 2 - i]
  let y = filtfilt(biquad('highpass', lo, fs), ext)
  y = filtfilt(biquad('lowpass', hi, fs), y)
  return y.slice(pad, pad + x.length)
}

export function rms(x: ArrayLike<number>): number {
  if (!x.length) return NaN
  let s = 0
  for (let i = 0; i < x.length; i++) s += x[i] * x[i]
  return Math.sqrt(s / x.length)
}

/**
 * Welch power spectral density (one-sided, units²/Hz), Hann window, 50 % overlap.
 * Integrating psd over frequency gives the signal's mean power (Parseval).
 */
export function welch(x: ArrayLike<number>, fs: number, nperseg = 256) {
  const n = Math.min(nperseg, nextPow2(x.length) === x.length ? x.length : 1 << Math.floor(Math.log2(Math.max(2, x.length))))
  const step = Math.max(1, Math.floor(n / 2))
  const w = hann(n)
  let wss = 0
  for (let i = 0; i < n; i++) wss += w[i] * w[i]
  const bins = n / 2 + 1
  const psd = new Float64Array(bins)
  let segs = 0
  for (let start = 0; start + n <= x.length; start += step) {
    const re = new Float64Array(n)
    const im = new Float64Array(n)
    // remove segment mean
    let m = 0
    for (let i = 0; i < n; i++) m += x[start + i]
    m /= n
    for (let i = 0; i < n; i++) re[i] = (x[start + i] - m) * w[i]
    fft(re, im)
    for (let k = 0; k < bins; k++) {
      let p = (re[k] * re[k] + im[k] * im[k]) / (fs * wss)
      if (k !== 0 && k !== n / 2) p *= 2
      psd[k] += p
    }
    segs++
  }
  if (segs) for (let k = 0; k < bins; k++) psd[k] /= segs
  const freqs = new Float64Array(bins)
  for (let k = 0; k < bins; k++) freqs[k] = (k * fs) / n
  return { freqs, psd, df: fs / n }
}

export function bandPower(freqs: Float64Array, psd: Float64Array, df: number, lo: number, hi: number) {
  let p = 0
  for (let k = 0; k < freqs.length; k++) if (freqs[k] >= lo && freqs[k] <= hi) p += psd[k] * df
  return p
}

/** Frequency of the largest PSD bin in [lo, hi], refined by parabolic interpolation. */
export function peakFrequency(freqs: Float64Array, psd: Float64Array, lo: number, hi: number) {
  let best = -1
  for (let k = 1; k < freqs.length - 1; k++) {
    if (freqs[k] < lo || freqs[k] > hi) continue
    if (best < 0 || psd[k] > psd[best]) best = k
  }
  if (best < 1) return NaN
  const a = psd[best - 1]
  const b = psd[best]
  const c = psd[best + 1]
  const denom = a - 2 * b + c
  const offset = denom ? (0.5 * (a - c)) / denom : 0
  return freqs[best] + offset * (freqs[1] - freqs[0])
}
