import { clearAllData, currentUser, flushStorage, makeBackup, restoreBackup, storageBackend, type Backup } from './store'
import { setHostUser } from './host'

/**
 * A small API on `window.TezMedTests` for the host app (call it with evaluateJavascript /
 * evaluateJavaScript). It lets the app read everything to upload it, put data back on a new
 * phone, and wipe the data when the user logs out.
 *
 *   TezMedTests.getData()          -> Backup object (same format as the backup file)
 *   TezMedTests.importData(backup) -> number of entries added (existing ones are skipped)
 *   TezMedTests.clearData()        -> removes results, sessions and personal details for this user
 *   TezMedTests.storage            -> 'indexeddb' | 'localstorage' | 'memory'
 *   TezMedTests.user               -> the `user` URL parameter, or null
 */
export interface TezMedTestsApi {
  version: 1
  readonly storage: string | null
  readonly user: string | null
  getData(): Backup
  importData(data: unknown): Promise<number>
  clearData(): Promise<void>
}

export function installHostApi() {
  setHostUser(currentUser())
  const api: TezMedTestsApi = {
    version: 1,
    get storage() {
      return storageBackend()
    },
    get user() {
      return currentUser()
    },
    getData: () => makeBackup(),
    async importData(data) {
      const n = restoreBackup(typeof data === 'string' ? JSON.parse(data) : data)
      await flushStorage()
      return n
    },
    async clearData() {
      clearAllData()
      await flushStorage()
    },
  }
  ;(window as unknown as { TezMedTests: TezMedTestsApi }).TezMedTests = api
  window.dispatchEvent(new CustomEvent('tezmed-tests:ready'))
}
