/**
 * Tells the host app (TezMed) that something was saved, so it can send it to its server.
 * The page keeps working the same when the app doesn't listen.
 *
 *   Android:  AppBridge.onTestResult(json: String)            (JavascriptInterface)
 *   iOS:      webkit.messageHandlers.testResult.postMessage(obj)
 *   Web:      window event 'tezmed-tests:saved' (event.detail = obj)
 *
 * obj = { app: 'tezmed-tests', type: 'result' | 'exercise', user: string | null, item: StoredResult | ExerciseLog }
 * See README, "Saving results in the app".
 */

type HostWindow = Window & {
  AppBridge?: { onTestResult?: (json: string) => unknown }
  webkit?: { messageHandlers?: Record<string, { postMessage: (m: unknown) => void } | undefined> }
}

export interface HostMessage {
  app: 'tezmed-tests'
  type: 'result' | 'exercise'
  user: string | null
  item: unknown
}

let user: string | null = null
export const setHostUser = (u: string | null) => {
  user = u
}

export function notifyHost(type: HostMessage['type'], item: unknown) {
  if (typeof window === 'undefined') return
  const w = window as HostWindow
  const msg: HostMessage = { app: 'tezmed-tests', type, user, item }
  try {
    if (typeof w.AppBridge?.onTestResult === 'function') w.AppBridge.onTestResult(JSON.stringify(msg))
  } catch {
    /* ignore */
  }
  try {
    w.webkit?.messageHandlers?.testResult?.postMessage(msg)
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent('tezmed-tests:saved', { detail: msg }))
  } catch {
    /* ignore */
  }
}
