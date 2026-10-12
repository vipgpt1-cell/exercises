import { useEffect, useRef, useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react'

/**
 * Minimal hash router. Hash routing works everywhere: on any static host
 * (no rewrite rules needed), inside an app WebView, and when index.html is
 * opened from disk.
 *
 * Every in-app page change stores its depth in history.state, so the in-page
 * back button and the phone's back button always agree, and "back" on the
 * first page opened never leaves the module.
 *
 * While a test or exercise runs, a "guard" history entry catches the phone's
 * back button so it asks before throwing the test away (see useBackGuard).
 */

const inBrowser = typeof window !== 'undefined'

function currentPath(): string {
  if (!inBrowser) return '/'
  const h = window.location.hash.replace(/^#/, '')
  return h.startsWith('/') ? h : '/' + h
}

const listeners = new Set<() => void>()
let snapshot = currentPath()
function update() {
  const next = currentPath()
  if (next === snapshot) return
  snapshot = next
  listeners.forEach((l) => l())
}

type NavState = { depth?: unknown; guard?: unknown } | null
const depth = (): number => {
  const d = (history.state as NavState)?.depth
  return typeof d === 'number' ? d : 0
}
const onGuardEntry = () => (history.state as NavState)?.guard === true
const pushGuard = () => history.pushState({ depth: depth() + 1, guard: true }, '', window.location.href)

let guard: { onBack: () => void } | null = null
let leaving = false

if (inBrowser) {
  window.addEventListener('popstate', () => {
    if (guard && !leaving && !onGuardEntry()) {
      // The phone's back button left the guard entry (same URL): put it back and ask.
      pushGuard()
      guard.onBack()
      return
    }
    update()
  })
  window.addEventListener('hashchange', update)
}

/** While mounted, the phone's back button calls `onBack` instead of leaving the page. */
export function useBackGuard(onBack: () => void) {
  const ref = useRef(onBack)
  useEffect(() => {
    ref.current = onBack
  })
  useEffect(() => {
    if (!onGuardEntry()) pushGuard()
    const g = { onBack: () => ref.current() }
    guard = g
    return () => {
      if (guard === g) guard = null
    }
  }, [])
}

/** Remove the guard entry (if any), then run `then` – call before leaving a running test. */
export function leaveGuard(then: () => void) {
  guard = null
  if (!onGuardEntry()) {
    then()
    return
  }
  leaving = true
  let done = false
  const finish = () => {
    if (done) return
    done = true
    leaving = false
    window.removeEventListener('popstate', finish)
    then()
  }
  window.addEventListener('popstate', finish)
  window.setTimeout(finish, 600)
  history.back()
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const url = '#' + to
  if (opts.replace) history.replaceState({ depth: depth() }, '', url)
  else history.pushState({ depth: depth() + 1 }, '', url)
  update()
  window.scrollTo({ top: 0 })
}

/** Go back inside the module, or to a fallback page when this is the first page opened. */
export function goBack(fallback = '/') {
  if (depth() > 0) history.back()
  else navigate(fallback, { replace: true })
}

export function useRoute() {
  const path = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => snapshot,
  )
  const [p, q = ''] = path.split('?')
  return { path: p, parts: p.split('/').filter(Boolean), query: new URLSearchParams(q) }
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }

export function Link({ to, onClick, ...rest }: LinkProps) {
  return (
    <a
      href={'#' + to}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e)
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()
        navigate(to)
      }}
      {...rest}
    />
  )
}
