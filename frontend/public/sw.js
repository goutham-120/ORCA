/**
 * ORCA Progressive Web App (PWA) Service Worker
 * Manages caching, offline navigation fallback, and resource caching for coastal operations.
 */
const CACHE_NAME = 'orca-pwa-cache-v2'
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/icons.svg'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return

  // For API or WFS calls, let them pass through or rely on offlineSync / IndexedDB
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api') || url.hostname.includes('incois.gov.in') || url.hostname.includes('open-meteo.com')) {
    return
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }
      return fetch(event.request).catch(() => {
        // Fallback to index.html for SPA client-side routing
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html')
        }
      })
    })
  )
})
