import { useSettings } from './store'

export type Lang = 'uz' | 'ru' | 'en'
export const LANGS: { id: Lang; label: string; short: string }[] = [
  { id: 'uz', label: 'O‘zbekcha', short: 'UZ' },
  { id: 'ru', label: 'Русский', short: 'RU' },
  { id: 'en', label: 'English', short: 'EN' },
]

/**
 * Strings live next to the feature that uses them. The English object defines
 * the shape; Uzbek and Russian must provide exactly the same keys (enforced by TS).
 */
export type Strings<T> = { en: T; uz: NoInfer<T>; ru: NoInfer<T> }
export function defineStrings<T>(s: Strings<T>): Strings<T> {
  return s
}

export function useLang(): Lang {
  return useSettings().lang
}

export function useStrings<T>(s: Strings<T>): T {
  const lang = useLang()
  return s[lang]
}

/** Russian noun form for a number: 1 тест, 2 теста, 5 тестов. */
export function ruPlural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(Math.round(n)) % 100
  const b = a % 10
  if (a > 10 && a < 20) return many
  if (b === 1) return one
  if (b > 1 && b < 5) return few
  return many
}

/** English noun form: 1 test, 2 tests. */
export const enPlural = (n: number, one: string, many = one + 's') => (Math.abs(n) === 1 ? one : many)

const LOCALE: Record<Lang, string> = { en: 'en-GB', uz: 'uz-Latn-UZ', ru: 'ru-RU' }
export const localeOf = (lang: Lang) => LOCALE[lang]

/** Uzbek writes numbers like Russian (4,5 and 1 200); browsers often lack Uzbek number data. */
const NUMBER_LOCALE: Record<Lang, string> = { en: 'en-GB', uz: 'ru-RU', ru: 'ru-RU' }

export function fmtNum(lang: Lang, v: number, digits = 0): string {
  if (!Number.isFinite(v)) return '—'
  try {
    return new Intl.NumberFormat(NUMBER_LOCALE[lang], { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v)
  } catch {
    return v.toFixed(digits)
  }
}

/** Signed number, using a real minus sign. */
export function fmtSigned(lang: Lang, v: number, digits = 0): string {
  const s = fmtNum(lang, Math.abs(v), digits)
  if (Math.abs(v) < Math.pow(10, -digits) / 2) return fmtNum(lang, 0, digits)
  return (v < 0 ? '−' : '+') + s
}

const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr']

export function fmtDate(lang: Lang, iso: string, withTime = false): string {
  const d = new Date(iso)
  if (lang === 'uz') {
    // Intl support for uz is inconsistent across browsers; format manually.
    const base = `${d.getDate()}-${UZ_MONTHS[d.getMonth()]}, ${d.getFullYear()}`
    return withTime ? `${base}, ${pad(d.getHours())}:${pad(d.getMinutes())}` : base
  }
  try {
    return new Intl.DateTimeFormat(LOCALE[lang], {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    }).format(d)
  } catch {
    return d.toLocaleString()
  }
}

export function fmtShortDate(lang: Lang, iso: string): string {
  const d = new Date(iso)
  if (lang === 'uz') return `${d.getDate()}.${pad(d.getMonth() + 1)}`
  try {
    return new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'short' }).format(d)
  } catch {
    return `${d.getDate()}.${d.getMonth() + 1}`
  }
}

export function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  const m = Math.floor(s / 60)
  return `${m}:${pad(s % 60)}`
}

function pad(n: number) {
  return n < 10 ? '0' + n : String(n)
}

/** Russian-style plural picker; English/Uzbek use one/other. */
export function plural(lang: Lang, n: number, forms: { one: string; few?: string; many: string }): string {
  if (lang === 'ru') {
    const n10 = n % 10
    const n100 = n % 100
    if (n10 === 1 && n100 !== 11) return forms.one
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return forms.few ?? forms.many
    return forms.many
  }
  if (lang === 'uz') return forms.one
  return n === 1 ? forms.one : forms.many
}
