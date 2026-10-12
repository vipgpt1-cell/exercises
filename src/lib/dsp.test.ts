import { describe, expect, it } from 'vitest'
import { bandPower, bandpass, detrend, fft, peakFrequency, resampleUniform, rms, welch } from './dsp'

const sine = (f: number, fs: number, n: number, a = 1, phase = 0) =>
  Float64Array.from({ length: n }, (_, i) => a * Math.sin((2 * Math.PI * f * i) / fs + phase))

describe('fft', () => {
  it('finds the bin of a pure tone', () => {
    const n = 64
    const re = sine(8, 64, n)
    const im = new Float64Array(n)
    fft(re, im)
    const mags = Array.from(re, (r, i) => Math.hypot(r, im[i]))
    const k = mags.indexOf(Math.max(...mags.slice(0, n / 2)))
    expect(k).toBe(8)
    expect(mags[8]).toBeCloseTo(n / 2, 6)
  })
})

describe('welch psd', () => {
  it('integrates to the signal power (Parseval) and finds the peak', () => {
    const fs = 100
    const x = sine(6.3, fs, 2000, 0.5)
    const { freqs, psd, df } = welch(x, fs, 256)
    const p = bandPower(freqs, psd, df, 3, 12)
    expect(Math.sqrt(p)).toBeCloseTo(0.5 / Math.SQRT2, 2)
    expect(peakFrequency(freqs, psd, 3, 12)).toBeCloseTo(6.3, 1)
  })
})

describe('filters', () => {
  it('band-pass keeps in-band tone and removes drift and high noise', () => {
    const fs = 100
    const n = 1500
    const tone = sine(6, fs, n, 1)
    const drift = Float64Array.from({ length: n }, (_, i) => 5 * Math.sin((2 * Math.PI * 0.2 * i) / fs))
    const hi = sine(30, fs, n, 1)
    const y = bandpass(tone.map((v, i) => v + drift[i] + hi[i]), 3, 12, fs)
    const core = y.slice(200, n - 200)
    expect(rms(core)).toBeGreaterThan(0.62)
    expect(rms(core)).toBeLessThan(0.76)
  })
  it('detrend removes a line', () => {
    const y = detrend([1, 2, 3, 4, 5])
    for (const v of y) expect(Math.abs(v)).toBeLessThan(1e-12)
  })
})

describe('resampling', () => {
  it('linearly interpolates irregular timestamps', () => {
    const t = [0, 10, 30, 40]
    const x = [0, 1, 3, 4]
    const y = resampleUniform(t, x, 100) // every 10 ms
    expect(Array.from(y)).toEqual([0, 1, 2, 3, 4])
  })
})
