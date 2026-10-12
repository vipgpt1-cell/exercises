import { flushSync } from 'react-dom'

/**
 * Show a stimulus and resolve with the best estimate of when it appeared on screen.
 * The state update is flushed synchronously inside an animation frame, so it is part of
 * that frame; the timestamp of the following frame marks when it was presented.
 * All times share the performance.now() clock, like pointer/keyboard event.timeStamp.
 */
export function presentStimulus(update: () => void): Promise<number> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      flushSync(update)
      requestAnimationFrame((t) => resolve(t))
    })
  })
}

/** Event timestamp on the performance.now() clock (falls back to now()). */
export function eventTime(e: { timeStamp: number }): number {
  const ts = e.timeStamp
  // Older browsers used epoch milliseconds for timeStamp.
  if (!ts || ts > 1e12) return performance.now()
  return ts
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
