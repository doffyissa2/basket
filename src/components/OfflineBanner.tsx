'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, X, RefreshCw } from 'lucide-react'

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false)
  const [queueCount, setQueueCount] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const staleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastUpdate = useRef(0)

  const refreshCount = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker?.controller) return
    navigator.serviceWorker.controller.postMessage('getOfflineQueueCount')
  }, [])

  const triggerReplay = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker?.controller) return
    navigator.serviceWorker.controller.postMessage('replayReceipts')
  }, [])

  useEffect(() => {
    setOffline(!navigator.onLine)

    const handleOffline = () => {
      setOffline(true)
      setDismissed(false)
      refreshCount()
    }

    const handleOnline = () => {
      setOffline(false)
      triggerReplay()
      setTimeout(refreshCount, 3000)
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    const swHandler = (event: MessageEvent) => {
      if (event.data?.type === 'offline-queue-count') {
        const count = event.data.count ?? 0
        setQueueCount(count)
        lastUpdate.current = Date.now()

        if (count === 0) setDismissed(false)
      }
      if (event.data?.type === 'receipt-synced') {
        setDismissed(false)
        refreshCount()
      }
    }
    navigator.serviceWorker?.addEventListener('message', swHandler)

    refreshCount()

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
      navigator.serviceWorker?.removeEventListener('message', swHandler)
    }
  }, [refreshCount, triggerReplay])

  // Auto-dismiss stale sync banners when online
  useEffect(() => {
    if (staleTimer.current) clearTimeout(staleTimer.current)

    if (!offline && queueCount > 0 && !dismissed) {
      staleTimer.current = setTimeout(() => {
        refreshCount()
        // If count hasn't changed after re-check, auto-dismiss
        setTimeout(() => {
          if (Date.now() - lastUpdate.current > 12000) {
            setDismissed(true)
          }
        }, 3000)
      }, 10000)
    }

    return () => {
      if (staleTimer.current) clearTimeout(staleTimer.current)
    }
  }, [offline, queueCount, dismissed, refreshCount])

  const show = !dismissed && (offline || queueCount > 0)

  const message = offline
    ? queueCount > 0
      ? `Hors ligne — ${queueCount} ticket${queueCount > 1 ? 's' : ''} en attente`
      : 'Hors ligne — fonctionnalités limitées'
    : queueCount > 0
      ? `${queueCount} ticket${queueCount > 1 ? 's' : ''} en cours de synchronisation…`
      : ''

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -48, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -48, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold"
          style={{ background: '#1A1A1A', color: 'rgba(255,255,255,0.7)' }}>
          {offline ? (
            <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 flex-shrink-0 animate-spin" />
          )}
          <span className="flex-1 text-center">{message}</span>
          {!offline && queueCount > 0 && (
            <button
              onClick={() => setDismissed(true)}
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.15)' }}>
              <X className="w-3 h-3" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
