import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useSettings } from './store'

/** Always-current ref to a value (avoids stale closures in timers). */
export function useLatest<T>(value: T) {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  })
  return ref
}

/** Keep the screen awake while `active` (tests and exercise routines). */
export function useWakeLock(active = true) {
  useEffect(() => {
    if (!active) return
    type WL = { release: () => Promise<void> }
    let lock: WL | null = null
    let cancelled = false
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WL> } }
    const request = async () => {
      try {
        if (nav.wakeLock && document.visibilityState === 'visible') {
          lock = await nav.wakeLock.request('screen')
          if (cancelled) lock.release().catch(() => {})
        }
      } catch {
        /* not supported / denied */
      }
    }
    request()
    const onVis = () => document.visibilityState === 'visible' && request()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      lock?.release().catch(() => {})
    }
  }, [active])
}

/** Call `fn` every `ms` while ms is not null. */
export function useInterval(fn: () => void, ms: number | null) {
  const saved = useLatest(fn)
  useEffect(() => {
    if (ms === null) return
    const id = window.setInterval(() => saved.current(), ms)
    return () => window.clearInterval(id)
  }, [ms, saved])
}

/** requestAnimationFrame loop while `active`; receives elapsed ms since start. */
export function useRaf(fn: (elapsedMs: number, now: number) => void, active: boolean) {
  const saved = useLatest(fn)
  useEffect(() => {
    if (!active) return
    let id = 0
    const t0 = performance.now()
    const loop = (now: number) => {
      saved.current(now - t0, now)
      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [active, saved])
}

/** Keyboard shortcut (ignores key repeats and typing in inputs). */
export function useKey(keys: string[], handler: (e: KeyboardEvent) => void, enabled = true) {
  const saved = useLatest(handler)
  const keyStr = keys.join('|')
  useEffect(() => {
    if (!enabled) return
    const list = keyStr.split('|')
    const on = (e: KeyboardEvent) => {
      if (e.repeat) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (list.includes(e.key) || list.includes(e.code)) saved.current(e)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [keyStr, enabled, saved])
}

export function useReducedMotion(): boolean {
  const { reduceMotion } = useSettings()
  const [sys, setSys] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const m = matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setSys(m.matches)
    m.addEventListener?.('change', on)
    return () => m.removeEventListener?.('change', on)
  }, [])
  return reduceMotion || sys
}

/** Countdown in whole seconds; calls onDone at 0. */
export function useCountdown(seconds: number, running: boolean, onDone: () => void) {
  const [left, setLeft] = useState(seconds)
  const done = useLatest(onDone)
  useEffect(() => {
    setLeft(seconds)
  }, [seconds])
  useEffect(() => {
    if (!running) return
    const end = performance.now() + left * 1000
    const id = window.setInterval(() => {
      const l = Math.max(0, Math.ceil((end - performance.now()) / 1000))
      setLeft(l)
      if (l <= 0) {
        window.clearInterval(id)
        done.current()
      }
    }, 100)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])
  return left
}

/** Measured size of an element (for responsive SVG / canvas). Works for elements mounted later too. */
export function useElementSize<T extends HTMLElement>() {
  const [el, setEl] = useState<T | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    if (!el) return
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [el])
  return [setEl as (node: T | null) => void, size] as const
}

export const isTouchDevice = () =>
  typeof window !== 'undefined' && (('ontouchstart' in window) || navigator.maxTouchPoints > 0) && matchMedia('(pointer: coarse)').matches

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
