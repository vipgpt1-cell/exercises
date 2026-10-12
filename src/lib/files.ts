/**
 * Getting a file (PDF report, CSV table, backup) out of the page.
 *
 * Inside a phone app's WebView a normal browser download often does nothing, so the
 * order is:
 *   1. a bridge provided by the host app (see README, "Saving files"),
 *   2. the phone's share sheet (Web Share with files),
 *   3. a regular browser download.
 */

type HostWindow = Window & {
  AppBridge?: { saveFile?: (name: string, mime: string, base64: string) => unknown }
  webkit?: { messageHandlers?: Record<string, { postMessage: (m: unknown) => void } | undefined> }
}

const host = () => window as HostWindow

/**
 * When the page is shown as a claude.ai preview, files are saved through the viewer's own
 * save dialog (`window.claude.use('downloads')`). Inside the TezMed app this does not exist.
 */
type ViewerDownloads = { save: (r: { filename: string; data: Blob }) => Promise<{ status: string }> }
let viewerPromise: Promise<ViewerDownloads | null> | null = null
export function viewerDownloads(): Promise<ViewerDownloads | null> {
  const c = (window as unknown as { claude?: { use?: (name: string) => Promise<unknown> } }).claude
  if (typeof c?.use !== 'function') return Promise.resolve(null)
  viewerPromise ??= c.use('downloads').then(
    (x) => (x as ViewerDownloads | null) ?? null,
    () => null,
  )
  return viewerPromise
}

/** True when the host app gave us a way to save files. */
export function hostCanSave(): boolean {
  const w = host()
  return typeof w.AppBridge?.saveFile === 'function' || !!w.webkit?.messageHandlers?.saveFile
}

/** Android System WebView (not Chrome). Downloads there only work through the host app. */
export const isAndroidWebView = () => /; wv\)/.test(navigator.userAgent)

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

export async function sendToHost(blob: Blob, name: string): Promise<boolean> {
  const w = host()
  const base64 = await blobToBase64(blob)
  try {
    if (typeof w.AppBridge?.saveFile === 'function') {
      w.AppBridge.saveFile(name, blob.type, base64)
      return true
    }
    const h = w.webkit?.messageHandlers?.saveFile
    if (h) {
      h.postMessage({ name, mime: blob.type, base64 })
      return true
    }
  } catch {
    /* fall through */
  }
  return false
}

export function canShareFile(blob: Blob, name: string): boolean {
  try {
    const file = new File([blob], name, { type: blob.type })
    return typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
  } catch {
    return false
  }
}

/** Opens the phone's share sheet. Must be called from a tap. */
export async function shareFile(blob: Blob, name: string, title?: string): Promise<'shared' | 'cancelled' | 'failed'> {
  try {
    await navigator.share({ files: [new File([blob], name, { type: blob.type })], title })
    return 'shared'
  } catch (e) {
    return (e as DOMException)?.name === 'AbortError' ? 'cancelled' : 'failed'
  }
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/** Copies text; falls back to a hidden textarea where the Clipboard API is not allowed. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

/** Shares plain text through the phone's share sheet when available. */
export async function shareText(text: string, title?: string): Promise<boolean> {
  if (typeof navigator.share !== 'function') return false
  try {
    await navigator.share({ text, title })
    return true
  } catch {
    return false
  }
}

export const isoDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
