import type { Lang } from './i18n'
import { settingsStore } from './store'

/** Optional spoken guidance for exercise routines (browser text-to-speech). */

const BCP: Record<Lang, string[]> = { en: ['en-GB', 'en-US', 'en'], ru: ['ru-RU', 'ru'], uz: ['uz-UZ', 'uz'] }

function findVoice(lang: Lang): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null
  const voices = speechSynthesis.getVoices()
  for (const code of BCP[lang]) {
    const v = voices.find((x) => x.lang.toLowerCase().startsWith(code.toLowerCase()))
    if (v) return v
  }
  return null
}

export function voiceAvailable(lang: Lang): boolean {
  return !!findVoice(lang)
}

/** Voices load asynchronously in Chrome; call once early. */
export function warmUpVoices() {
  try {
    speechSynthesis.getVoices()
    speechSynthesis.addEventListener?.('voiceschanged', () => speechSynthesis.getVoices())
  } catch {
    /* ignore */
  }
}

export function speak(text: string, lang: Lang, opts: { interrupt?: boolean } = {}) {
  const s = settingsStore.get()
  if (!s.voice || typeof speechSynthesis === 'undefined') return
  const v = findVoice(lang)
  if (!v) return
  try {
    if (opts.interrupt !== false) speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.voice = v
    u.lang = v.lang
    u.rate = 0.95
    speechSynthesis.speak(u)
  } catch {
    /* ignore */
  }
}

export function stopSpeaking() {
  try {
    speechSynthesis.cancel()
  } catch {
    /* ignore */
  }
}
