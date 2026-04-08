'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react'

export default function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || status === 'loading') return
    setStatus('loading')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('success')
        setMessage(data.message || 'Inscription réussie !')
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Une erreur est survenue.')
        setTimeout(() => setStatus('idle'), 3000)
      }
    } catch {
      setStatus('error')
      setMessage('Une erreur est survenue.')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  return (
    <section className="py-12 md:py-[15vh] px-5 md:px-[5vw] relative z-10 overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full opacity-10 blur-[100px]"
          style={{ background: '#7ed957' }}
        />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="font-mono text-xs text-graphite/40 uppercase tracking-[0.2em] mb-5">
            Restez dans la boucle
          </p>
          <h2 className="font-sans text-4xl md:text-[4.5vw] leading-[0.92] tracking-tighter text-graphite font-extrabold mb-5">
            L&apos;application mobile<br />
            <span className="text-signal">arrive bientôt.</span>
          </h2>
          <p className="font-mono text-sm text-graphite/50 mb-10 max-w-md mx-auto leading-relaxed">
            Soyez parmi les premiers à découvrir l&apos;app native, les nouvelles fonctionnalités
            et nos offres de lancement exclusives. Aucun spam, promis.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <AnimatePresence mode="wait">
            {status === 'success' ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center gap-3"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(126,217,87,0.15)', border: '1px solid rgba(126,217,87,0.3)' }}
                >
                  <CheckCircle2 className="w-7 h-7 text-signal" />
                </div>
                <p className="font-sans font-bold text-graphite text-lg">{message}</p>
                <p className="font-mono text-xs text-graphite/40">On vous tient au courant dès le lancement.</p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
              >
                <input
                  type="email"
                  required
                  placeholder="votre@email.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 h-14 rounded-2xl px-5 font-mono text-sm text-graphite placeholder-graphite/30 outline-none transition-all"
                  style={{
                    background: 'rgba(17,17,17,0.05)',
                    border: status === 'error'
                      ? '1px solid rgba(239,68,68,0.5)'
                      : '1px solid rgba(17,17,17,0.1)',
                  }}
                />
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={status === 'loading'}
                  className="h-14 px-7 rounded-2xl font-sans font-bold text-sm flex items-center justify-center gap-2 flex-shrink-0 disabled:opacity-70"
                  style={{ background: '#111111', color: '#F5F3EE' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  {status === 'loading' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      M&apos;inscrire
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>

          {status === 'error' && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-mono text-xs text-red-500 mt-3"
            >
              {message}
            </motion.p>
          )}

          <p className="font-mono text-[10px] text-graphite/30 mt-5">
            En vous inscrivant, vous acceptez de recevoir des emails de la part de Basket. Désabonnement possible à tout moment.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
