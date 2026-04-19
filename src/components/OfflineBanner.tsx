'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff } from 'lucide-react'

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false)
  const [queueCount, setQueueCount] = useState(0)

  const refreshCount = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker?.controller) return
    navigator.serviceWorker.controller.postMessage('getOfflineQueueCount')
  }, [])

  useEffect(() => {
    setOffline(!navigator.onLine)
    const handleOffline = () => { setOffline(true); refreshCount() }
    const handleOnline  = () => { setOffline(false); refreshCount() }
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online',  handleOnline)

    // Listen for queue count updates from service worker
    const swHandler = (event: MessageEvent) => {
      if (event.data?.type === 'offline-queue-count') {
        setQueueCount(event.data.count ?? 0)
      }
    }
    navigator.serviceWorker?.addEventListener('message', swHandler)

    // Ask for initial count
    refreshCount()

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online',  handleOnline)
      navigator.serviceWorker?.removeEventListener('message', swHandler)
    }
  }, [refreshCount])

  const show = offline || queueCount > 0

  const message = offline
    ? queueCount > 0
      ? `Vous êtes hors ligne — ${queueCount} ticket${queueCount > 1 ? 's' : ''} en attente`
      : 'Vous êtes hors ligne — certaines fonctionnalités sont limitées'
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
          <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
