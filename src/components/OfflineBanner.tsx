'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff } from 'lucide-react'

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    setOffline(!navigator.onLine)
    const handleOffline = () => setOffline(true)
    const handleOnline  = () => setOffline(false)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online',  handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online',  handleOnline)
    }
  }, [])

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          initial={{ y: -48, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -48, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold"
          style={{ background: '#1A1A1A', color: 'rgba(255,255,255,0.7)' }}>
          <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
          Vous êtes hors ligne — certaines fonctionnalités sont limitées
        </motion.div>
      )}
    </AnimatePresence>
  )
}
