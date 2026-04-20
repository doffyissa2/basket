const CACHE = 'basket-v4'
const STATIC = [
  '/',
  '/dashboard',
  '/login',
  '/offline.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]

// ── IndexedDB helpers (raw API — no library dependency) ─────────────────────

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('basket-offline-queue', 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('pending-receipts')) {
        db.createObjectStore('pending-receipts', { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function addPendingReceipt(db, entry) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending-receipts', 'readwrite')
    tx.objectStore('pending-receipts').put(entry)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function getAllPending(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending-receipts', 'readonly')
    const req = tx.objectStore('pending-receipts').getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function deletePending(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending-receipts', 'readwrite')
    tx.objectStore('pending-receipts').delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function countPending(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending-receipts', 'readonly')
    const req = tx.objectStore('pending-receipts').count()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// ── Install & activate ──────────────────────────────────────────────────────

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// ── Fetch handler ───────────────────────────────────────────────────────────

self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  // ── Offline queue: intercept POST /api/parse-receipt ──────────────────
  if (request.method === 'POST' && url.pathname === '/api/scan' && url.origin === self.location.origin) {
    // Clone request body BEFORE fetch consumes it (can only read body once)
    const bodyClone = request.clone()
    e.respondWith(
      fetch(request).catch(async () => {
        // Network failed — queue the receipt for later
        try {
          const body = await bodyClone.json()
          const headers = {}
          for (const [k, v] of bodyClone.headers.entries()) {
            if (k.toLowerCase() === 'authorization' || k.toLowerCase() === 'content-type') {
              headers[k] = v
            }
          }
          const offlineId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
          const db = await openOfflineDB()
          await addPendingReceipt(db, {
            id: offlineId,
            body,
            headers,
            timestamp: Date.now(),
          })
          db.close()

          // Notify all clients about the new queue count
          const clients = await self.clients.matchAll({ type: 'window' })
          let count = 0
          try {
            const db2 = await openOfflineDB()
            try { count = await countPending(db2) } finally { db2.close() }
          } catch { /* ignore count failure */ }
          clients.forEach((client) => client.postMessage({ type: 'offline-queue-count', count }))

          // Register background sync if supported
          if (self.registration.sync) {
            try { await self.registration.sync.register('replay-receipts') } catch { /* ignore */ }
          }

          return new Response(JSON.stringify({ queued: true, offline_id: offlineId }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (err) {
          return new Response(JSON.stringify({ error: 'Offline queue failed' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      })
    )
    return
  }

  // Skip non-GET and cross-origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // Skip API routes — always go to network
  if (url.pathname.startsWith('/api/')) return

  // Cache-first for Next.js static chunks (they have content hashes)
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((res) => {
          const clone = res.clone()
          caches.open(CACHE).then((c) => c.put(request, clone))
          return res
        })
      })
    )
    return
  }

  // Network-first for pages, fallback to cache then offline
  e.respondWith(
    fetch(request)
      .then((res) => {
        const clone = res.clone()
        caches.open(CACHE).then((c) => c.put(request, clone))
        return res
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match('/offline.html'))
      )
  )
})

// ── Background Sync: replay queued receipts ─────────────────────────────────

async function replayPendingReceipts() {
  let db
  try {
    db = await openOfflineDB()
    const pending = await getAllPending(db)
    if (!pending.length) { db.close(); return }

    for (const entry of pending) {
      try {
        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: entry.headers,
          body: JSON.stringify(entry.body),
        })
        if (res.ok) {
          const result = await res.json()
          try { await deletePending(db, entry.id) } catch { /* DB error — entry will retry */ }

          // Notify clients of successful sync
          const clients = await self.clients.matchAll({ type: 'window' })
          clients.forEach((client) => client.postMessage({
            type: 'receipt-synced',
            offline_id: entry.id,
            result,
          }))
        } else if (res.status === 401) {
          // Auth expired — stop trying, wait for user to refresh
          break
        }
        // On 429, 500: leave in queue, try next entry
      } catch {
        // Network error — still offline, stop trying remaining entries
        break
      }
    }

    // Update queue count for all clients
    const count = await countPending(db)
    const clients = await self.clients.matchAll({ type: 'window' })
    clients.forEach((client) => client.postMessage({ type: 'offline-queue-count', count }))
    db.close()
  } catch {
    if (db) db.close()
  }
}

// Background Sync API (Chrome, Edge)
self.addEventListener('sync', (e) => {
  if (e.tag === 'replay-receipts') {
    e.waitUntil(replayPendingReceipts())
  }
})

// ── Messages ────────────────────────────────────────────────────────────────

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting()

  // Client asks for current queue count
  if (e.data === 'getOfflineQueueCount') {
    openOfflineDB().then(async (db) => {
      const count = await countPending(db)
      db.close()
      e.source.postMessage({ type: 'offline-queue-count', count })
    }).catch(() => {
      e.source.postMessage({ type: 'offline-queue-count', count: 0 })
    })
  }

  // Safari/iOS fallback: client tells us it's back online
  if (e.data === 'replayReceipts') {
    replayPendingReceipts()
  }
})
