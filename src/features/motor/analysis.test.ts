import { describe, expect, it } from 'vitest'
import { analyzeSpiral, analyzeTremor, fittsBlock, handAsymmetry, spiralError, spiralPoint, spiralSpacing, tapStats, type FittsTap, type SpiralGeom } from './analysis'
import { mulberry32 } from '../../lib/rng'
import { probit } from '../../lib/stats'

describe('tapping', () => {
  it('computes rate, rhythm and fatigue', () => {
    const times = Array.from({ length: 50 }, (_, i) => 100 + i * 196)
    const s = tapStats(times, 10000)
    expect(s.taps).toBe(50)
    expect(s.rate).toBe(5)
    expect(s.itiMean).toBeCloseTo(196)
    expect(s.itiCv).toBeCloseTo(0)
    expect(handAsymmetry(50, 40)).toBeCloseTo(20)
  })
  it('detects slowing', () => {
    const times = [...Array.from({ length: 20 }, (_, i) => i * 160), ...Array.from({ length: 12 }, (_, i) => 6700 + i * 270)]
    expect(tapStats(times, 10000).fatigue).toBeLessThan(-30)
  })
})

const g: SpiralGeom = { cx: 200, cy: 200, a: 10, b: 25 / (2 * Math.PI), turns: 3 }

function trace(ampPx: number, freq: number, seconds = 8) {
  const pts = []
  const n = seconds * 120
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * seconds
    const th = (i / n) * g.turns * 2 * Math.PI
    const p = spiralPoint(g, th)
    const r = Math.hypot(p.x - g.cx, p.y - g.cy)
    const k = (r + ampPx * Math.sin(2 * Math.PI * freq * t)) / r
    pts.push({ x: g.cx + (p.x - g.cx) * k, y: g.cy + (p.y - g.cy) * k, t: t * 1000 })
  }
  return pts
}

describe('spiral', () => {
  it('has zero error on the ideal curve, on any arm', () => {
    expect(spiralError(g, spiralPoint(g, 1))).toBeCloseTo(0, 9)
    expect(spiralError(g, spiralPoint(g, 1 + 4 * Math.PI))).toBeCloseTo(0, 9)
    expect(spiralSpacing(g)).toBeCloseTo(25)
  })
  it('scores a perfect trace as precise, complete and tremor-free', () => {
    const r = analyzeSpiral(g, trace(0, 0))
    expect(r.precision).toBeGreaterThan(99)
    expect(r.coverage).toBeGreaterThan(0.97)
    expect(r.tremorRmsPct).toBeLessThan(0.5)
  })
  it('measures a 6 Hz tremor', () => {
    const amp = 2
    const r = analyzeSpiral(g, trace(amp, 6))
    expect(r.tremorFreq).toBeGreaterThan(5.4)
    expect(r.tremorFreq).toBeLessThan(6.6)
    expect(r.tremorRmsPct).toBeGreaterThan(((amp / Math.SQRT2) / 25) * 100 * 0.8)
    expect(r.tremorRmsPct).toBeLessThan(((amp / Math.SQRT2) / 25) * 100 * 1.2)
    expect(r.maePct).toBeCloseTo(((2 * amp) / Math.PI / 25) * 100, 0)
  })
})

describe('fitts', () => {
  it('computes effective width and throughput', () => {
    const rng = mulberry32(3)
    const sigma = 6
    const A = 300
    const taps: FittsTap[] = []
    let px = 0
    let py = 0
    for (let i = 0; i < 400; i++) {
      const from = i % 2 ? { x: A, y: 0 } : { x: 0, y: 0 }
      const to = i % 2 ? { x: 0, y: 0 } : { x: A, y: 0 }
      const dx = sigma * probit(Math.min(0.999, Math.max(0.001, rng())))
      const dir = to.x > from.x ? 1 : -1
      const x = to.x + dir * dx
      taps.push({ from, to, x, y: 0, px, py, mt: 500, width: 40, hit: Math.abs(dx) <= 20 })
      px = x
      py = 0
    }
    const r = fittsBlock(taps)
    expect(r.We).toBeGreaterThan(4.133 * sigma * 0.9)
    expect(r.We).toBeLessThan(4.133 * sigma * 1.1)
    expect(r.Ae).toBeCloseTo(A, -1)
    expect(r.throughput).toBeCloseTo(Math.log2(r.Ae / r.We + 1) / 0.5, 6)
  })
})

describe('accelerometer tremor', () => {
  it('finds amplitude and frequency of a 5 Hz tremor', () => {
    const fs = 60
    const s = []
    for (let i = 0; i < fs * 15; i++) {
      const t = i / fs
      s.push({ t: t * 1000, x: 0.3 * Math.sin(2 * Math.PI * 5 * t) + 0.02 * Math.sin(2 * Math.PI * 0.3 * t), y: 0.05, z: 9.81 })
    }
    const r = analyzeTremor(s)!
    expect(r.peakFreq).toBeCloseTo(5, 0)
    expect(r.rms).toBeGreaterThan(0.3 / Math.SQRT2 * 0.9)
    expect(r.rms).toBeLessThan(0.3 / Math.SQRT2 * 1.1)
    expect(r.reliable).toBe(true)
    expect(r.displacementMm).toBeCloseTo(((0.3 / Math.SQRT2) / (2 * Math.PI * 5) ** 2) * 1000, 1)
  })
})
