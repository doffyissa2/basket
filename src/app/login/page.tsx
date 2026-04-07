'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Loader2, ArrowLeft, Mail, Lock, MapPin } from 'lucide-react'

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [postcode, setPostcode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (isSignup) {
      const { data, error: signupError } = await supabase.auth.signUp({ email, password })
      if (signupError) {
        setError(signupError.message)
      } else if (data.user) {
        if (postcode) {
          await supabase.from('profiles').update({ postcode }).eq('id', data.user.id)
        }
        window.location.href = '/dashboard'
      }
    } else {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
      if (loginError) {
        setError(loginError.message)
      } else {
        window.location.href = '/dashboard'
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-paper text-graphite flex">
      {/* Background orb */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #7ed957 0%, transparent 70%)', top: '-150px', left: '50%', transform: 'translateX(-50%)' }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Desktop left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden bg-offwhite">
        <div className="flex items-center gap-2">
          <img src="/basket_logo.png" alt="Basket" className="h-7 w-7" />
          <span className="text-lg font-bold text-graphite">Basket</span>
        </div>
        <div>
          <h2 className="text-5xl font-extrabold leading-tight mb-6 text-graphite">
            Payez moins<br />
            pour vos<br />
            <span className="gradient-text">courses.</span>
          </h2>
          <p className="text-graphite/50 text-lg leading-relaxed max-w-sm">
            Scannez vos tickets, comparez les prix, économisez chaque semaine.
          </p>
        </div>
        <p className="text-graphite/30 text-sm">© 2026 Basket · Fait en France 🇫🇷</p>
        {/* Decorative orbs */}
        <motion.div
          className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #7ed957 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
      </div>

      {/* Right / mobile auth area */}
      <div className="flex-1 flex flex-col px-6 py-6 relative z-10">
        {/* Back nav */}
        <a href="/" className="inline-flex items-center gap-2 text-graphite/50 hover:text-graphite transition-colors text-sm mb-auto lg:mb-0">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </a>

        <div className="flex-1 flex items-center justify-center py-12">
          <div className="w-full max-w-sm">
            {/* Animated logo */}
            <motion.div
              className="flex items-center justify-center gap-2 mb-10"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <img src="/basket_logo.png" alt="Basket" className="h-9 w-9" />
              <span className="text-2xl font-bold tracking-tight text-graphite">Basket</span>
            </motion.div>

            {/* Toggle tabs */}
            <div className="relative flex rounded-xl p-1 mb-8" style={{ background: 'rgba(17,17,17,0.06)' }}>
              <motion.div
                className="absolute top-1 bottom-1 rounded-lg"
                style={{ background: '#111111', width: 'calc(50% - 4px)' }}
                animate={{ left: isSignup ? 'calc(50%)' : '4px' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
              {['Connexion', 'Inscription'].map((label, i) => (
                <button
                  key={label}
                  onClick={() => { setIsSignup(i === 1); setError('') }}
                  className="relative z-10 flex-1 py-2 text-sm font-semibold transition-colors"
                  style={{ color: isSignup === (i === 1) ? '#FFFFFF' : 'rgba(17,17,17,0.45)' }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Form card */}
            <motion.div
              className="glass-strong rounded-2xl p-8"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <AnimatePresence mode="wait">
                <motion.form
                  key={isSignup ? 'signup' : 'login'}
                  onSubmit={handleSubmit}
                  initial={{ opacity: 0, x: isSignup ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isSignup ? -20 : 20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <div className="text-center mb-6">
                    <h1 className="text-xl font-bold mb-1 text-graphite">
                      {isSignup ? 'Créer un compte' : 'Content de vous revoir'}
                    </h1>
                    <p className="text-graphite/50 text-sm">
                      {isSignup ? 'Commencez à économiser dès maintenant' : 'Connectez-vous pour continuer'}
                    </p>
                  </div>

                  <InputField icon={<Mail className="w-4 h-4" />} type="email" placeholder="votre@email.com" value={email} onChange={setEmail} required />
                  <InputField icon={<Lock className="w-4 h-4" />} type="password" placeholder="••••••••" value={password} onChange={setPassword} required minLength={6} />
                  {isSignup && (
                    <InputField icon={<MapPin className="w-4 h-4" />} type="text" placeholder="75001 (code postal)" value={postcode} onChange={setPostcode} hint="Pour comparer les prix près de chez vous" />
                  )}

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-sm px-3 py-2 rounded-lg"
                      style={{ background: 'rgba(239,68,68,0.08)' }}
                    >
                      {error}
                    </motion.p>
                  )}

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full h-12 rounded-xl font-semibold text-white flex items-center justify-center"
                    style={{ background: '#111111' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isSignup ? 'Créer mon compte' : 'Continuer'}
                  </motion.button>
                </motion.form>
              </AnimatePresence>
            </motion.div>

            {/* Social login placeholders */}
            <div className="mt-4 space-y-3">
              <div className="relative flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: 'rgba(17,17,17,0.1)' }} />
                <span className="text-xs text-graphite/35">ou</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(17,17,17,0.1)' }} />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full h-11 rounded-xl text-sm font-medium flex items-center justify-center gap-3 glass"
                style={{ color: 'rgba(17,17,17,0.6)' }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/></svg>
                Continuer avec Google
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full h-11 rounded-xl text-sm font-medium flex items-center justify-center gap-3 glass"
                style={{ color: 'rgba(17,17,17,0.6)' }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="#111111"><path d="M13.5 1A4.5 4.5 0 0 0 9.5 4a4.5 4.5 0 0 0-4 4.5A4.5 4.5 0 0 0 10 13a4.5 4.5 0 0 0 4-4.5A4.5 4.5 0 0 0 13.5 1zM9 17c-1.11 0-2-.89-2-2s.89-2 2-2 2 .89 2 2-.89 2-2 2z"/></svg>
                Continuer avec Apple
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InputField({
  icon, type, placeholder, value, onChange, required, minLength, hint
}: {
  icon: React.ReactNode
  type: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  minLength?: number
  hint?: string
}) {
  return (
    <div>
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-graphite/40">{icon}</div>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
          className="w-full h-11 rounded-xl pl-10 pr-4 text-sm text-graphite placeholder:text-graphite/30 focus:outline-none focus:ring-2 transition-all"
          style={{
            background: 'rgba(17,17,17,0.05)',
            border: '1px solid rgba(17,17,17,0.1)',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#7ed957')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(17,17,17,0.1)')}
        />
      </div>
      {hint && <p className="text-xs text-graphite/40 mt-1 pl-1">{hint}</p>}
    </div>
  )
}
