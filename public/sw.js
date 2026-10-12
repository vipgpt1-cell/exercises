/*
 * Offline support for the hosted build.
 * - Pages (index.html): network first, so a new version shows up on the next open;
 *   the cached copy is used only when there is no connection.
 * - Other files (hashed JS/CSS, fonts, audio): cache first, they never change.
 */
const CACHE = 'tests-exercises-v2'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./'])).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return
  const isPage = req.mode === 'navigate' || req.destination === 'document'
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      if (isPage) {
        try {
          const res = await fetch(req)
          if (res && res.ok) cache.put('./', res.clone())
          return res
        } catch {
          return (await cache.match(req, { ignoreSearch: true })) || (await cache.match('./')) || Response.error()
        }
      }
      const cached = await cache.match(req)
      if (cached) return cached
      const res = await fetch(req)
      if (res && res.ok) cache.put(req, res.clone())
      return res
    }),
  )
})
