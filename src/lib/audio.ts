/**
 * Web Audio engine used by all hearing tests and exercise cues.
 *
 * Levels are expressed in dBFS of the digital signal (0 dBFS = full scale sine peak 1.0).
 * Ear routing uses a ChannelMerger so a tone sent to one ear is digitally silent
 * in the other channel (no panning leakage).
 */
import { settingsStore } from './store'

export type Ear = 'left' | 'right' | 'both'

/** Development-only hooks used by automated end-to-end checks (stripped from production builds). */
export const devHooks: {
  timeScale: number
  lastTone: { freq: number; dbfs: number; ear: Ear; start: number; end: number } | null
  lastDigits: { digits: number[]; snr: number | null } | null
} = {
  timeScale: 1,
  lastTone: null,
  lastDigits: null,
}
if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __tests: typeof devHooks }).__tests = devHooks
/** Scale a waiting time (only ever ≠ 1 in development automation). */
export const scaled_ms = (ms: number) => (import.meta.env.DEV ? ms * devHooks.timeScale : ms)

let ctx: AudioContext | null = null
let merger: ChannelMergerNode | null = null

export const dbToGain = (db: number) => Math.pow(10, db / 20)
export const gainToDb = (g: number) => 20 * Math.log10(Math.max(1e-12, g))

export function audioSupported(): boolean {
  return typeof window !== 'undefined' && !!(window.AudioContext || (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext)
}

export function getCtx(): AudioContext {
  if (!ctx) {
    // iOS: route Web Audio as media playback so the silent switch does not mute tests.
    try {
      const nav = navigator as Navigator & { audioSession?: { type: string } }
      if (nav.audioSession) nav.audioSession.type = 'playback'
    } catch {
      /* ignore */
    }
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctor({ latencyHint: 'interactive' })
    merger = ctx.createChannelMerger(2)
    merger.connect(ctx.destination)
    try {
      ctx.destination.channelCount = Math.min(2, ctx.destination.maxChannelCount || 2)
      ctx.destination.channelInterpretation = 'speakers'
    } catch {
      /* ignore */
    }
  }
  return ctx
}

/** Must be called from a user gesture (tap/click) before the first sound. */
export async function unlockAudio(): Promise<AudioContext> {
  const c = getCtx()
  if (c.state !== 'running') {
    try {
      await c.resume()
    } catch {
      /* ignore */
    }
  }
  // Play one silent sample: required by some iOS versions to really start output.
  try {
    const b = c.createBuffer(1, 1, c.sampleRate)
    const s = c.createBufferSource()
    s.buffer = b
    s.connect(c.destination)
    s.start()
  } catch {
    /* ignore */
  }
  return c
}

/** Seconds between scheduling a sound and it leaving the speaker (best estimate). */
export function outputLatency(): number {
  const c = getCtx()
  return (c.outputLatency || 0) + (c.baseLatency || 0)
}

function route(node: AudioNode, ear: Ear) {
  getCtx()
  if (ear === 'left' || ear === 'both') node.connect(merger!, 0, 0)
  if (ear === 'right' || ear === 'both') node.connect(merger!, 0, 1)
}

/** Raised-cosine ramp shape (0 → 1). */
function cosRamp(points = 64): Float32Array {
  const a = new Float32Array(points)
  for (let i = 0; i < points; i++) a[i] = 0.5 - 0.5 * Math.cos((Math.PI * i) / (points - 1))
  return a
}
const RAMP = cosRamp()
const scaled = (peak: number, down = false) => {
  const out = new Float32Array(RAMP.length)
  for (let i = 0; i < RAMP.length; i++) out[i] = peak * RAMP[down ? RAMP.length - 1 - i : i]
  return out
}

export interface ToneOptions {
  freq: number
  /** Peak level in dBFS. */
  dbfs: number
  ear?: Ear
  /** Absolute AudioContext time; default = now + 50 ms. */
  when?: number
  /** Duration of one pulse (s). */
  duration: number
  /** Number of pulses (pulsed tones are easier to notice, e.g. with tinnitus). */
  pulses?: number
  /** Silence between pulses (s). */
  gap?: number
  ramp?: number
  type?: OscillatorType
}

export interface PlayHandle {
  start: number
  end: number
  stop: () => void
}

export function playTone(o: ToneOptions): PlayHandle {
  const c = getCtx()
  const start = o.when ?? c.currentTime + 0.05
  const pulses = Math.max(1, o.pulses ?? 1)
  const gap = o.gap ?? 0.2
  const ramp = Math.min(o.ramp ?? 0.02, o.duration / 3)
  const amp = Math.min(1, dbToGain(o.dbfs))
  const osc = c.createOscillator()
  osc.type = o.type ?? 'sine'
  osc.frequency.value = o.freq
  const g = c.createGain()
  // Curves must not share a timestamp with any other automation event (Chrome throws),
  // so the envelope is built from value curves only; values hold between curves.
  g.gain.value = 0
  let t = start
  for (let i = 0; i < pulses; i++) {
    g.gain.setValueCurveAtTime(scaled(amp), t, ramp)
    g.gain.setValueCurveAtTime(scaled(amp, true), t + o.duration - ramp, ramp)
    t += o.duration + (i < pulses - 1 ? gap : 0)
  }
  osc.connect(g)
  route(g, o.ear ?? 'both')
  osc.start(start)
  osc.stop(t + 0.05)
  if (import.meta.env.DEV) devHooks.lastTone = { freq: o.freq, dbfs: o.dbfs, ear: o.ear ?? 'both', start, end: t }
  let stopped = false
  osc.onended = () => {
    try {
      g.disconnect()
    } catch {
      /* ignore */
    }
  }
  return {
    start,
    end: t,
    stop: () => {
      if (stopped) return
      stopped = true
      try {
        const now = c.currentTime
        g.gain.cancelScheduledValues(now)
        g.gain.setValueAtTime(g.gain.value, now)
        g.gain.linearRampToValueAtTime(0, now + 0.015)
        osc.stop(now + 0.03)
      } catch {
        /* ignore */
      }
    },
  }
}

/**
 * Continuous tone whose frequency / level / ear balance can be changed live
 * (used by sweeps and loudness balance).
 */
export function createLiveTone(freq: number, dbfs: number, ear: Ear = 'both') {
  const c = getCtx()
  const osc = c.createOscillator()
  osc.frequency.value = freq
  const gL = c.createGain()
  const gR = c.createGain()
  gL.gain.value = 0
  gR.gain.value = 0
  osc.connect(gL)
  osc.connect(gR)
  gL.connect(merger!, 0, 0)
  gR.connect(merger!, 0, 1)
  const now = c.currentTime
  osc.start(now)
  const levels = { left: ear !== 'right' ? dbfs : -Infinity, right: ear !== 'left' ? dbfs : -Infinity }
  const apply = (fade = 0.03) => {
    const t = c.currentTime
    for (const [node, db] of [
      [gL, levels.left],
      [gR, levels.right],
    ] as const) {
      node.gain.cancelScheduledValues(t)
      node.gain.setValueAtTime(node.gain.value, t)
      node.gain.linearRampToValueAtTime(Number.isFinite(db) ? Math.min(1, dbToGain(db)) : 0, t + fade)
    }
  }
  apply(0.05)
  return {
    setFreq(f: number, glide = 0) {
      const t = c.currentTime
      osc.frequency.cancelScheduledValues(t)
      if (glide > 0) {
        osc.frequency.setValueAtTime(osc.frequency.value, t)
        osc.frequency.exponentialRampToValueAtTime(f, t + glide)
      } else osc.frequency.setValueAtTime(f, t)
    },
    /** Exponential sweep from current frequency to `f` over `seconds`. */
    sweepTo(f: number, seconds: number) {
      const t = c.currentTime
      osc.frequency.cancelScheduledValues(t)
      osc.frequency.setValueAtTime(osc.frequency.value, t)
      osc.frequency.exponentialRampToValueAtTime(f, t + seconds)
    },
    getFreq: () => osc.frequency.value,
    setLevels(left: number, right: number, fade = 0.03) {
      levels.left = left
      levels.right = right
      apply(fade)
    },
    stop() {
      const t = c.currentTime
      for (const node of [gL, gR]) {
        node.gain.cancelScheduledValues(t)
        node.gain.setValueAtTime(node.gain.value, t)
        node.gain.linearRampToValueAtTime(0, t + 0.04)
      }
      try {
        osc.stop(t + 0.06)
      } catch {
        /* ignore */
      }
    },
  }
}

/* ------------------------------------------------------------------ */
/* Buffers                                                             */
/* ------------------------------------------------------------------ */

const bufferCache = new Map<string, Promise<AudioBuffer>>()

export function loadBuffer(url: string): Promise<AudioBuffer> {
  let p = bufferCache.get(url)
  if (!p) {
    p = fetch(url)
      .then((r) => r.arrayBuffer())
      .then(
        (ab) =>
          new Promise<AudioBuffer>((resolve, reject) => {
            // callback form for older Safari
            getCtx().decodeAudioData(ab, resolve, reject)
          }),
      )
    p.catch(() => bufferCache.delete(url))
    bufferCache.set(url, p)
  }
  return p
}

export function playBufferSegment(
  buffer: AudioBuffer,
  opts: { offset: number; duration: number; when: number; gainDb: number; ear?: Ear },
) {
  const c = getCtx()
  const src = c.createBufferSource()
  src.buffer = buffer
  const g = c.createGain()
  g.gain.value = Math.min(4, dbToGain(opts.gainDb))
  src.connect(g)
  route(g, opts.ear ?? 'both')
  src.start(opts.when, opts.offset, opts.duration)
  src.onended = () => {
    try {
      g.disconnect()
    } catch {
      /* ignore */
    }
  }
  return src
}

/** Looping noise bed with smooth fades. */
export function playLoop(buffer: AudioBuffer, gainDb: number, when?: number, ear: Ear = 'both') {
  const c = getCtx()
  const t0 = when ?? c.currentTime + 0.02
  const src = c.createBufferSource()
  src.buffer = buffer
  src.loop = true
  const g = c.createGain()
  const target = dbToGain(gainDb)
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(target, t0 + 0.1)
  src.connect(g)
  route(g, ear)
  src.start(t0, Math.random() * buffer.duration)
  return {
    stop(at?: number) {
      const t = Math.max(c.currentTime, at ?? c.currentTime)
      g.gain.cancelScheduledValues(t)
      g.gain.setValueAtTime(target, t)
      g.gain.linearRampToValueAtTime(0, t + 0.1)
      try {
        src.stop(t + 0.12)
      } catch {
        /* ignore */
      }
    },
  }
}

/* ------------------------------------------------------------------ */
/* UI sound effects                                                    */
/* ------------------------------------------------------------------ */

export type Fx = 'tap' | 'good' | 'bad' | 'tick' | 'go' | 'done' | 'soft'

export function fx(kind: Fx) {
  if (!settingsStore.get().sounds || !audioSupported()) return
  const c = getCtx()
  if (c.state !== 'running') {
    c.resume().catch(() => {})
    return
  }
  const t = c.currentTime + 0.01
  const seq: [number, number, number][] = {
    tap: [[880, 0.04, -26]],
    tick: [[1200, 0.03, -30]],
    soft: [[523, 0.12, -28]],
    good: [
      [660, 0.07, -22],
      [990, 0.1, -22],
    ],
    bad: [
      [220, 0.12, -20],
      [180, 0.14, -20],
    ],
    go: [[880, 0.15, -20]],
    done: [
      [523, 0.1, -22],
      [659, 0.1, -22],
      [784, 0.18, -22],
    ],
  }[kind] as [number, number, number][]
  let at = t
  for (const [f, d, db] of seq) {
    playTone({ freq: f, dbfs: db, duration: d, when: at, ramp: 0.01, ear: 'both', type: 'sine' })
    at += d + 0.02
  }
}

/* ------------------------------------------------------------------ */
/* Haptics                                                             */
/* ------------------------------------------------------------------ */

export function vibrate(pattern: number | number[]) {
  if (!settingsStore.get().haptics) return
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* ignore */
  }
}
