'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, ShoppingBasket } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWASetup() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    // Check if already dismissed
    if (sessionStorage.getItem('pwa-banner-dismissed')) return

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
      // Show banner after a short delay so it doesn't feel jarring
      setTimeout(() => setShowBanner(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setShowBanner(false)
    setInstallPrompt(null)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    setDismissed(true)
    sessionStorage.setItem('pwa-banner-dismissed', '1')
  }

  if (dismissed) return null

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-24 left-4 right-4 z-[100] md:bottom-6 md:left-auto md:right-6 md:max-w-sm"
        >
          <div
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{
              background: 'rgba(26,26,26,0.95)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(224,122,95,0.3)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(224,122,95,0.15)' }}
            >
              <ShoppingBasket className="w-5 h-5 text-[#E07A5F]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Installer Basket</p>
              <p className="text-xs text-[#6B7280] mt-0.5">Accès rapide depuis votre écran d'accueil</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <motion.button
                onClick={handleInstall}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{ background: '#E07A5F' }}
              >
                <Download className="w-3 h-3" />
                Installer
              </motion.button>
              <motion.button
                onClick={handleDismiss}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#6B7280]"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
