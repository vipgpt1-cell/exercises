import type { Lang } from './i18n'
import { MAX_AGE, MIN_AGE, updatePerson, updateSettings, type Settings } from './store'

/**
 * Settings the host app can pass when it opens this page, e.g.
 *
 *   index.html?lang=uz&theme=dark&age=54#/field/hearing
 *
 * Parameters may also be written after the hash route: `#/field/hearing?lang=uz`.
 *
 *   lang       uz | ru | en
 *   theme      light | dark | system
 *   text       normal | large | xl          (text size)
 *   age        whole years, 7–100            or  birthYear=1972
 *   sex        male | female  (m | f)       (only the tone hearing test uses it)
 *   hand       right | left   (r | l)       (dominant hand)
 *   sound      1 | 0                        (sound effects)
 *   name       text                         (printed on the report)
 *   user       opaque id                    (keeps each account's data apart; read in lib/store.ts)
 *
 * Values are saved, so they stay in effect for the next visit too.
 */
export function launchParams(): URLSearchParams {
  const out = new URLSearchParams(window.location.search)
  const hashQuery = window.location.hash.split('?')[1]
  if (hashQuery) new URLSearchParams(hashQuery).forEach((v, k) => out.set(k, v))
  return out
}

const pick = <T extends string>(v: string | null, map: Record<string, T>): T | undefined => (v ? map[v.trim().toLowerCase()] : undefined)

export function applyLaunchParams(q: URLSearchParams = launchParams()) {
  const settings: Partial<Settings> = {}
  const code = q.get('lang')?.trim().toLowerCase().slice(0, 2)
  const lang = pick<Lang>(code ?? null, { uz: 'uz', ru: 'ru', en: 'en' })
  if (lang) settings.lang = lang
  const theme = pick<Settings['theme']>(q.get('theme'), { light: 'light', dark: 'dark', system: 'system', auto: 'system' })
  if (theme) settings.theme = theme
  const text = pick<Settings['textSize']>(q.get('text'), { normal: 'normal', large: 'large', xl: 'xl' })
  if (text) settings.textSize = text
  const sound = q.get('sound')
  if (sound === '0' || sound === '1') settings.sounds = sound === '1'
  if (Object.keys(settings).length) updateSettings(settings)

  const year = new Date().getFullYear()
  const age = Number(q.get('age'))
  const birth = Number(q.get('birthYear') ?? q.get('birth_year'))
  if (q.get('age') && Number.isFinite(age) && age >= MIN_AGE && age <= MAX_AGE) updatePerson({ birthYear: year - Math.round(age) })
  else if (Number.isInteger(birth) && year - birth >= MIN_AGE && year - birth <= MAX_AGE) updatePerson({ birthYear: birth })
  const sex = pick<'male' | 'female'>(q.get('sex') ?? q.get('gender'), { male: 'male', m: 'male', female: 'female', f: 'female' })
  if (sex) updatePerson({ sex })
  const hand = pick<'right' | 'left'>(q.get('hand'), { right: 'right', r: 'right', left: 'left', l: 'left' })
  if (hand) updatePerson({ hand })
  const name = q.get('name')?.trim()
  if (name) updatePerson({ name: name.slice(0, 80) })
}

/** Whether the host app fixed the language (then the in-page language switch is hidden). */
export const langFromHost = () => !!launchParams().get('lang')
