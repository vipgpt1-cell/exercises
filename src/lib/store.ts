import { useSyncExternalStore } from 'react'
import type { Lang } from './i18n'

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

/** Interpretation level shared by every test. Order = severity. */
export type Level = 'great' | 'normal' | 'borderline' | 'attention' | 'urgent' | 'info'

export interface Settings {
  lang: Lang
  theme: 'system' | 'light' | 'dark'
  textSize: 'normal' | 'large' | 'xl'
  sounds: boolean
  voice: boolean
  haptics: boolean
  reduceMotion: boolean
  /** Language of the spoken digits (hearing-in-noise, digit span audio). */
  digitLang: Lang | null
  /** Headphone calibration used by the tone hearing test. */
  hearingCal: HearingCalibration | null
}

export interface HearingCalibration {
  /** dB SPL that a 1 kHz tone at -30 dBFS produces (assumed or measured). */
  refSpl: number
  /** Optional per-frequency corrections in dB (measured with a sound level meter). */
  corrections: Record<string, number>
  method: 'comfortable' | 'meter'
  date: string
}

/**
 * The few personal details some tests need for scoring (age norms, dominant hand).
 * There is no profile screen: the host app can pass them in the URL
 * (see lib/launch.ts), otherwise a test asks for them when it needs them.
 */
export interface Person {
  birthYear: number | null
  sex: 'male' | 'female' | null
  hand: 'right' | 'left' | null
  /** Optional, only printed on the report for a specialist. */
  name: string
}

export interface Summary {
  /** Primary numeric value used for trends (null when not applicable). */
  value: number | null
  level: Level
}

export interface StoredResult<D = unknown> {
  id: string
  testId: string
  date: string
  /** Scoring version – lets future updates re-interpret old data safely. */
  v: number
  summary: Summary
  data: D
}

export interface ExerciseLog {
  id: string
  exerciseId: string
  date: string
  seconds: number
  score?: number
  detail?: Record<string, number | string>
}

/* ------------------------------------------------------------------ */
/* Safe storage (private mode / quota / file:// quirks)                 */
/* ------------------------------------------------------------------ */

const PREFIX = 'tezmed.tests.v1.'
const memory = new Map<string, string>()

function read(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key)
  } catch {
    return memory.get(key) ?? null
  }
}

let storageWarning = false
export const storageHadError = () => storageWarning

function write(key: string, value: string) {
  try {
    localStorage.setItem(PREFIX + key, value)
  } catch {
    storageWarning = true
    memory.set(key, value)
  }
}

/* ------------------------------------------------------------------ */
/* Tiny persisted store                                                */
/* ------------------------------------------------------------------ */

type Listener = () => void

function createPersisted<T>(key: string, initial: () => T, merge?: (stored: T) => T) {
  let state: T
  const raw = read(key)
  try {
    state = raw ? (merge ? merge(JSON.parse(raw)) : JSON.parse(raw)) : initial()
  } catch {
    state = initial()
  }
  const listeners = new Set<Listener>()
  const emit = () => listeners.forEach((l) => l())
  return {
    get: () => state,
    set(next: T | ((prev: T) => T)) {
      state = typeof next === 'function' ? (next as (p: T) => T)(state) : next
      write(key, JSON.stringify(state))
      emit()
    },
    subscribe(l: Listener) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    /** Re-read from storage (another tab changed it). */
    reload() {
      const r = read(key)
      if (!r) return
      try {
        state = merge ? merge(JSON.parse(r)) : JSON.parse(r)
        emit()
      } catch {
        /* ignore */
      }
    },
    key,
  }
}

function detectLang(): Lang {
  try {
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language]
    for (const l of langs) {
      const c = l.toLowerCase().slice(0, 2)
      if (c === 'uz') return 'uz'
      if (c === 'ru' || c === 'kk' || c === 'ky' || c === 'tg' || c === 'be' || c === 'uk') return 'ru'
      if (c === 'en') return 'en'
    }
  } catch {
    /* ignore */
  }
  return 'uz'
}

function prefersReducedMotion() {
  try {
    return matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

const defaultSettings = (): Settings => ({
  lang: detectLang(),
  theme: 'system',
  textSize: 'normal',
  sounds: true,
  voice: false,
  haptics: true,
  reduceMotion: prefersReducedMotion(),
  digitLang: null,
  hearingCal: null,
})

const defaultPerson = (): Person => ({ birthYear: null, sex: null, hand: null, name: '' })

export const settingsStore = createPersisted<Settings>('settings', defaultSettings, (s) => ({ ...defaultSettings(), ...s }))
export const personStore = createPersisted<Person>('person', defaultPerson, (p) => ({ ...defaultPerson(), ...p }))
export const resultsStore = createPersisted<StoredResult[]>('results', () => [], (r) => (Array.isArray(r) ? r : []))
export const logsStore = createPersisted<ExerciseLog[]>('exercise-logs', () => [], (r) => (Array.isArray(r) ? r : []))

const all = [settingsStore, personStore, resultsStore, logsStore]
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    for (const s of all) if (e.key === PREFIX + s.key) s.reload()
  })
}

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

export const useSettings = () => useSyncExternalStore(settingsStore.subscribe, settingsStore.get, settingsStore.get)
export const usePerson = () => useSyncExternalStore(personStore.subscribe, personStore.get, personStore.get)
export const useResults = () => useSyncExternalStore(resultsStore.subscribe, resultsStore.get, resultsStore.get)
export const useLogs = () => useSyncExternalStore(logsStore.subscribe, logsStore.get, logsStore.get)

export const updateSettings = (patch: Partial<Settings>) => settingsStore.set((s) => ({ ...s, ...patch }))
export const updatePerson = (patch: Partial<Person>) => personStore.set((p) => ({ ...p, ...patch }))

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

const MAX_RESULTS = 800
const MAX_LOGS = 1500

export function uid(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  }
}

export function saveResult<D>(testId: string, v: number, summary: Summary, data: D): StoredResult<D> {
  const r: StoredResult<D> = { id: uid(), testId, date: new Date().toISOString(), v, summary, data }
  resultsStore.set((list) => [r as StoredResult, ...list].slice(0, MAX_RESULTS))
  return r
}

export function deleteResult(id: string) {
  resultsStore.set((list) => list.filter((r) => r.id !== id))
}

export function saveLog(log: Omit<ExerciseLog, 'id' | 'date'>) {
  const l: ExerciseLog = { ...log, id: uid(), date: new Date().toISOString() }
  logsStore.set((list) => [l, ...list].slice(0, MAX_LOGS))
  return l
}

export function resultsFor(list: StoredResult[], testId: string) {
  return list.filter((r) => r.testId === testId)
}

/** Previous result for the same test (older than `current`). */
export function previousOf(list: StoredResult[], current: StoredResult) {
  return list.find((r) => r.testId === current.testId && r.date < current.date) ?? null
}

/* ------------------------------------------------------------------ */
/* Person helpers                                                      */
/* ------------------------------------------------------------------ */

export const MIN_AGE = 7
export const MAX_AGE = 100

export function ageOf(p: Person): number | null {
  if (!p.birthYear) return null
  const a = new Date().getFullYear() - p.birthYear
  return a >= MIN_AGE && a <= MAX_AGE ? a : null
}

export function setAge(age: number) {
  if (age >= MIN_AGE && age <= MAX_AGE) updatePerson({ birthYear: new Date().getFullYear() - Math.round(age) })
}

/* ------------------------------------------------------------------ */
/* Backup file (export / import)                                       */
/* ------------------------------------------------------------------ */

export const BACKUP_APP = 'tezmed-tests'

export interface Backup {
  app: typeof BACKUP_APP
  version: 1
  exportedAt: string
  person: Person
  results: StoredResult[]
  logs: ExerciseLog[]
}

export function makeBackup(): Backup {
  return { app: BACKUP_APP, version: 1, exportedAt: new Date().toISOString(), person: personStore.get(), results: resultsStore.get(), logs: logsStore.get() }
}

const byDateDesc = (a: { date: string }, b: { date: string }) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)

/** Pure merge used by restoreBackup: adds entries that are not there yet (by id), newest first. */
export function mergeBackup(cur: { results: StoredResult[]; logs: ExerciseLog[] }, b: unknown) {
  if (!b || typeof b !== 'object' || (b as Backup).app !== BACKUP_APP) throw new Error('invalid')
  const bk = b as Backup
  const haveR = new Set(cur.results.map((r) => r.id))
  const newR = (Array.isArray(bk.results) ? bk.results : []).filter(
    (r) => r && typeof r.id === 'string' && typeof r.testId === 'string' && typeof r.date === 'string' && r.summary && typeof r.summary.level === 'string' && !haveR.has(r.id),
  )
  const haveL = new Set(cur.logs.map((l) => l.id))
  const newL = (Array.isArray(bk.logs) ? bk.logs : []).filter(
    (l) => l && typeof l.id === 'string' && typeof l.exerciseId === 'string' && typeof l.date === 'string' && typeof l.seconds === 'number' && !haveL.has(l.id),
  )
  return {
    results: [...cur.results, ...newR].sort(byDateDesc).slice(0, MAX_RESULTS),
    logs: [...cur.logs, ...newL].sort(byDateDesc).slice(0, MAX_LOGS),
    added: newR.length + newL.length,
    person: bk.person && typeof bk.person === 'object' ? bk.person : null,
  }
}

/** Adds what is missing from a backup file. Returns how many results/sessions were added. */
export function restoreBackup(b: unknown): number {
  const m = mergeBackup({ results: resultsStore.get(), logs: logsStore.get() }, b)
  resultsStore.set(m.results)
  logsStore.set(m.logs)
  const cur = personStore.get()
  if (m.person) {
    const p = m.person as Partial<Person>
    personStore.set({
      birthYear: cur.birthYear ?? (typeof p.birthYear === 'number' ? p.birthYear : null),
      sex: cur.sex ?? (p.sex === 'male' || p.sex === 'female' ? p.sex : null),
      hand: cur.hand ?? (p.hand === 'right' || p.hand === 'left' ? p.hand : null),
      name: cur.name || (typeof p.name === 'string' ? p.name : ''),
    })
  }
  return m.added
}

/** Removes results, exercise sessions and personal details. Settings are kept. */
export function clearAllData() {
  resultsStore.set([])
  logsStore.set([])
  personStore.set(defaultPerson())
}
