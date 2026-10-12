/**
 * Key-value storage for the larger data (results, exercise sessions).
 *
 * IndexedDB is used when it works: it holds far more than localStorage (whose ~5 MB per site is
 * shared with every other page on the same domain, e.g. the eye tests). Where IndexedDB is missing
 * or broken (some WebViews on file://, private modes), it falls back to localStorage, then memory.
 */

export interface KV {
  readonly kind: 'indexeddb' | 'localstorage' | 'memory'
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
}

const DB_NAME = 'tezmed-tests'
const STORE = 'kv'

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

function openDb(timeoutMs: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Some WebViews never answer an open request; don't wait forever.
    const timer = setTimeout(() => reject(new Error('indexedDB open timed out')), timeoutMs)
    try {
      const r = indexedDB.open(DB_NAME, 1)
      r.onupgradeneeded = () => {
        if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE)
      }
      r.onsuccess = () => {
        clearTimeout(timer)
        resolve(r.result)
      }
      r.onerror = () => {
        clearTimeout(timer)
        reject(r.error)
      }
      r.onblocked = () => {
        clearTimeout(timer)
        reject(new Error('indexedDB blocked'))
      }
    } catch (e) {
      clearTimeout(timer)
      reject(e)
    }
  })
}

function idbKV(db: IDBDatabase): KV {
  const tx = (mode: IDBTransactionMode) => db.transaction(STORE, mode).objectStore(STORE)
  const done = (t: IDBTransaction) =>
    new Promise<void>((resolve, reject) => {
      t.oncomplete = () => resolve()
      t.onerror = () => reject(t.error)
      t.onabort = () => reject(t.error ?? new Error('aborted'))
    })
  return {
    kind: 'indexeddb',
    async get(key) {
      const v = await req(tx('readonly').get(key))
      return typeof v === 'string' ? v : null
    },
    async set(key, value) {
      const s = tx('readwrite')
      s.put(value, key)
      await done(s.transaction)
    },
    async remove(key) {
      const s = tx('readwrite')
      s.delete(key)
      await done(s.transaction)
    },
  }
}

export function localKV(): KV {
  return {
    kind: 'localstorage',
    async get(key) {
      return localStorage.getItem(key)
    },
    async set(key, value) {
      localStorage.setItem(key, value)
    },
    async remove(key) {
      localStorage.removeItem(key)
    },
  }
}

export function memoryKV(): KV {
  const m = new Map<string, string>()
  return {
    kind: 'memory',
    async get(key) {
      return m.get(key) ?? null
    },
    async set(key, value) {
      m.set(key, value)
    },
    async remove(key) {
      m.delete(key)
    },
  }
}

function localStorageWorks() {
  try {
    const k = '__tezmed_probe__'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

/** Picks the best storage available here. */
export async function openKV(timeoutMs = 2500): Promise<KV> {
  if (typeof indexedDB !== 'undefined') {
    try {
      const kv = idbKV(await openDb(timeoutMs))
      // A real round trip: some browsers open the database but fail on first write.
      await kv.set('__probe__', '1')
      await kv.remove('__probe__')
      return kv
    } catch {
      /* fall through */
    }
  }
  return localStorageWorks() ? localKV() : memoryKV()
}

/** Asks the browser not to clear our data when the phone runs low on space. Best effort. */
export function requestPersistence() {
  try {
    void navigator.storage?.persist?.().catch(() => {})
  } catch {
    /* ignore */
  }
}
