'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to console in dev — wire up Sentry here in production
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-paper text-graphite flex flex-col items-center justify-center px-5 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <img src="/basket_logo.png" alt="Basket" className="h-16 w-16 mb-8 mx-auto opacity-30" />
        <p className="font-mono text-xs text-graphite/30 uppercase tracking-[0.2em] mb-4">Une erreur est survenue</p>
        <h1 className="text-4xl font-extrabold tracking-tighter text-graphite mb-3">
          Oups, quelque chose s&apos;est mal passé
        </h1>
        <p className="text-graphite/50 text-sm max-w-xs leading-relaxed mb-10 mx-auto">
          Une erreur inattendue s&apos;est produite. Réessayez, ou contactez-nous si le problème persiste.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-graphite/25 mb-6">
            Réf : {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <motion.button
            onClick={reset}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="h-12 px-8 rounded-2xl font-semibold text-sm text-white"
            style={{ background: '#111111' }}
          >
            Réessayer
          </motion.button>
          <a
            href="/"
            className="h-12 px-8 rounded-2xl font-semibold text-sm flex items-center justify-center text-graphite"
            style={{ background: 'rgba(17,17,17,0.06)', border: '1px solid rgba(17,17,17,0.1)' }}
          >
            Retour à l&apos;accueil
          </a>
        </div>
      </motion.div>
    </div>
  )
}
