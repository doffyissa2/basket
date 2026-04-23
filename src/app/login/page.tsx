'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Loader2, ArrowLeft, Mail, Lock, MapPin, CheckCircle2 } from 'lucide-react'

type Mode = 'login' | 'signup' | 'forgot'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [postcode, setPostcode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)

  const reset = (nextMode: Mode) => {
    setMode(nextMode)
    setError('')
    setResetSent(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (mode === 'forgot') {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login?mode=reset`,
      })
      if (resetError) {
        setError(resetError.message)
      } else {
        setResetSent(true)
      }
      setLoading(false)
      return
    }

    if (mode === 'signup') {
      const { data, error: signupError } = await supabase.auth.signUp({ email, password })
      if (signupError) {
        setError(signupError.message)
      } else if (data.user) {
        if (postcode) {
          await supabase.from('profiles').update({ postcode }).eq('id', data.user.id)
        }
        window.location.href = '/waitlist'
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
        <motion.div
          className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #7ed957 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
      </div>

      {/* Right / mobile auth area */}
      <div className="flex-1 flex flex-col px-6 py-6 relative z-10">
        <a href="/" className="inline-flex items-center gap-2 text-graphite/50 hover:text-graphite transition-colors text-sm mb-auto lg:mb-0">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </a>

        <div className="flex-1 flex items-center justify-center py-12">
          <div className="w-full max-w-sm">
            {/* Logo */}
            <motion.div
              className="flex items-center justify-center gap-2 mb-10"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <img src="/basket_logo.png" alt="Basket" className="h-9 w-9" />
              <span className="text-2xl font-bold tracking-tight text-graphite">Basket</span>
            </motion.div>

            {/* Mode tabs — only show for login/signup */}
            <AnimatePresence mode="wait">
              {mode !== 'forgot' && (
                <motion.div
                  key="tabs"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="relative flex rounded-xl p-1 mb-8"
                  style={{ background: 'rgba(17,17,17,0.06)' }}
                >
                  <motion.div
                    className="absolute top-1 bottom-1 rounded-lg"
                    style={{ background: '#111111', width: 'calc(50% - 4px)' }}
                    animate={{ left: mode === 'signup' ? 'calc(50%)' : '4px' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                  {(['login', 'signup'] as const).map((m, i) => (
                    <button
                      key={m}
                      onClick={() => reset(m)}
                      className="relative z-10 flex-1 py-2 text-sm font-semibold transition-colors"
                      style={{ color: mode === m ? '#FFFFFF' : 'rgba(17,17,17,0.45)' }}
                    >
                      {i === 0 ? 'Connexion' : 'Inscription'}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form card */}
            <motion.div
              className="glass-strong rounded-2xl p-8"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <AnimatePresence mode="wait">

                {/* ── Forgot password success ── */}
                {mode === 'forgot' && resetSent ? (
                  <motion.div
                    key="reset-sent"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-4 text-center py-4"
                  >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(126,217,87,0.12)', border: '1px solid rgba(126,217,87,0.25)' }}>
                      <CheckCircle2 className="w-7 h-7" style={{ color: '#7ed957' }} />
                    </div>
                    <div>
                      <p className="font-bold text-graphite text-lg mb-1">Email envoyé !</p>
                      <p className="text-sm text-graphite/50 leading-relaxed">
                        Vérifiez votre boîte mail. Cliquez sur le lien pour réinitialiser votre mot de passe.
                      </p>
                    </div>
                    <button
                      onClick={() => reset('login')}
                      className="text-sm font-semibold mt-2"
                      style={{ color: '#7ed957' }}
                    >
                      Retour à la connexion
                    </button>
                  </motion.div>

                ) : (
                  /* ── Main form ── */
                  <motion.form
                    key={mode}
                    onSubmit={handleSubmit}
                    initial={{ opacity: 0, x: mode === 'signup' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: mode === 'signup' ? -20 : 20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div className="text-center mb-6">
                      <h1 className="text-xl font-bold mb-1 text-graphite">
                        {mode === 'login' && 'Content de vous revoir'}
                        {mode === 'signup' && 'Créer un compte'}
                        {mode === 'forgot' && 'Mot de passe oublié'}
                      </h1>
                      <p className="text-graphite/50 text-sm">
                        {mode === 'login' && 'Connectez-vous pour continuer'}
                        {mode === 'signup' && 'Commencez à économiser dès maintenant'}
                        {mode === 'forgot' && 'Entrez votre email pour recevoir un lien de réinitialisation'}
                      </p>
                    </div>

                    <InputField
                      icon={<Mail className="w-4 h-4" />}
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={setEmail}
                      required
                    />

                    {mode !== 'forgot' && (
                      <InputField
                        icon={<Lock className="w-4 h-4" />}
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={setPassword}
                        required
                        minLength={6}
                      />
                    )}

                    {mode === 'signup' && (
                      <InputField
                        icon={<MapPin className="w-4 h-4" />}
                        type="text"
                        placeholder="75001 (code postal)"
                        value={postcode}
                        onChange={setPostcode}
                        hint="Pour comparer les prix près de chez vous"
                      />
                    )}

                    {/* Forgot password link — only in login mode */}
                    {mode === 'login' && (
                      <div className="flex justify-end -mt-1">
                        <button
                          type="button"
                          onClick={() => reset('forgot')}
                          className="text-xs text-graphite/40 hover:text-graphite transition-colors"
                        >
                          Mot de passe oublié ?
                        </button>
                      </div>
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
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : mode === 'login' ? 'Continuer'
                        : mode === 'signup' ? 'Créer mon compte'
                        : 'Envoyer le lien'}
                    </motion.button>

                    {/* Back link for forgot mode */}
                    {mode === 'forgot' && (
                      <button
                        type="button"
                        onClick={() => reset('login')}
                        className="w-full text-center text-sm text-graphite/40 hover:text-graphite transition-colors pt-1"
                      >
                        ← Retour à la connexion
                      </button>
                    )}
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>
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
          style={{ background: 'rgba(17,17,17,0.05)', border: '1px solid rgba(17,17,17,0.1)' }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#7ed957')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(17,17,17,0.1)')}
        />
      </div>
      {hint && <p className="text-xs text-graphite/40 mt-1 pl-1">{hint}</p>}
    </div>
  )
}
