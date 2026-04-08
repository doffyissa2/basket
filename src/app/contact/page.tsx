'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

// ── Types ──────────────────────────────────────────────────────────────────────
type FormState = 'idle' | 'loading' | 'success' | 'error'

const SUBJECTS = [
  'Question générale',
  'Bug / Problème technique',
  'Partenariat',
  'Presse',
  'Autre',
] as const

const MAX_CHARS = 2000

// ── Animated decorative dots ──────────────────────────────────────────────────
function DecorativeDots() {
  const dots = [
    { cx: 50, cy: 50, r: 6, delay: 0, color: '#7ed957' },
    { cx: 120, cy: 30, r: 4, delay: 0.4, color: '#7ed957' },
    { cx: 30, cy: 110, r: 5, delay: 0.8, color: '#7ed957' },
    { cx: 160, cy: 90, r: 3, delay: 1.2, color: 'rgba(17,17,17,0.2)' },
    { cx: 80, cy: 140, r: 4, delay: 0.6, color: 'rgba(17,17,17,0.15)' },
    { cx: 140, cy: 160, r: 6, delay: 1.0, color: '#7ed957' },
    { cx: 20, cy: 60, r: 3, delay: 1.6, color: 'rgba(17,17,17,0.2)' },
    { cx: 100, cy: 180, r: 5, delay: 0.2, color: 'rgba(17,17,17,0.15)' },
  ]

  return (
    <div className="relative w-full h-48 overflow-hidden" aria-hidden>
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Connecting lines */}
        <motion.line
          x1="50" y1="50" x2="120" y2="30"
          stroke="rgba(126,217,87,0.2)" strokeWidth="0.5"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, delay: 0.5 }}
        />
        <motion.line
          x1="120" y1="30" x2="160" y2="90"
          stroke="rgba(126,217,87,0.2)" strokeWidth="0.5"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, delay: 0.8 }}
        />
        <motion.line
          x1="50" y1="50" x2="30" y2="110"
          stroke="rgba(126,217,87,0.2)" strokeWidth="0.5"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, delay: 1.0 }}
        />
        <motion.line
          x1="30" y1="110" x2="140" y2="160"
          stroke="rgba(17,17,17,0.08)" strokeWidth="0.5"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, delay: 1.2 }}
        />

        {/* Orbit ring */}
        <motion.circle
          cx="90" cy="100" r="55"
          fill="none" stroke="rgba(126,217,87,0.08)" strokeWidth="0.8"
          strokeDasharray="4 6"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '90px 100px' }}
        />

        {/* Dots */}
        {dots.map((d, i) => (
          <motion.circle
            key={i}
            cx={d.cx} cy={d.cy} r={d.r}
            fill={d.color}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1, 0.8] }}
            transition={{ duration: 3, delay: d.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </svg>
    </div>
  )
}

// ── Info Card ─────────────────────────────────────────────────────────────────
function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-4 bg-white rounded-2xl p-5 border border-graphite/[0.07]">
      <div className="w-9 h-9 rounded-xl bg-signal/10 flex items-center justify-center flex-shrink-0 text-signal">
        {icon}
      </div>
      <div>
        <p className="font-mono text-[10px] text-graphite/40 uppercase tracking-wider mb-1">{label}</p>
        <p className="font-sans text-sm font-semibold text-graphite">{value}</p>
      </div>
    </div>
  )
}

// ── Animated checkmark SVG ────────────────────────────────────────────────────
function AnimatedCheck() {
  return (
    <motion.svg
      width="64" height="64" viewBox="0 0 64 64"
      initial="hidden" animate="visible"
    >
      <motion.circle
        cx="32" cy="32" r="30"
        fill="none" stroke="#7ed957" strokeWidth="2"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
      <motion.path
        d="M19 33 L28 42 L45 24"
        fill="none" stroke="#7ed957" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, delay: 0.5, ease: 'easeOut' }}
      />
    </motion.svg>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [formState, setFormState] = useState<FormState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  const charsLeft = MAX_CHARS - message.length

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormState('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject: subject || undefined, message }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Une erreur est survenue. Réessayez.')
        setFormState('error')
        return
      }

      setFormState('success')
    } catch {
      setErrorMsg('Impossible de joindre le serveur. Vérifiez votre connexion.')
      setFormState('error')
    }
  }

  // shared input classes
  const inputBase =
    'w-full rounded-xl border border-graphite/15 bg-white px-4 py-3 font-sans text-sm text-graphite placeholder:text-graphite/30 outline-none transition-all duration-200 focus:border-signal focus:ring-2 focus:ring-signal/20 disabled:opacity-50'

  return (
    <div
      className="min-h-screen bg-offwhite text-graphite font-sans antialiased"
      style={{ backgroundColor: '#F5F3EE', color: '#111111', fontFamily: '"Plus Jakarta Sans", sans-serif' }}
    >

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-40"
        style={{
          background: 'rgba(245,243,238,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(17,17,17,0.08)',
        }}
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 h-16 flex items-center justify-between gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <img src="/basket_logo.png" alt="Basket" className="h-7 w-7" />
            <span className="font-sans font-bold tracking-tight text-graphite text-sm">
              Basket{' '}
              <span className="font-mono text-[9px] text-graphite/40 font-normal tracking-wider">
                (Beta)
              </span>
            </span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8 font-mono text-xs text-graphite/50">
            {[
              { href: '/basket-ai', label: 'Basket AI' },
              { href: '/vision', label: 'Vision' },
              { href: '/comment-ca-marche', label: 'Comment ça marche' },
              { href: '/carte', label: 'Carte' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="hover:text-signal transition-colors duration-200 py-1 border-b border-transparent hover:border-signal"
              >
                {label}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <Link href="/login" className="flex-shrink-0">
            <button className="relative overflow-hidden rounded-xl bg-signal text-graphite px-5 py-2 font-sans text-xs font-semibold uppercase tracking-wider group transition-transform duration-300 hover:scale-[1.03]">
              <span className="absolute inset-0 bg-graphite translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]" />
              <span className="relative z-10 group-hover:text-signal transition-colors duration-500">
                Se connecter
              </span>
            </button>
          </Link>
        </div>
      </nav>

      {/* ── Page body ──────────────────────────────────────────────────────── */}
      <main className="pt-28 pb-24 px-5 md:px-8">
        <div className="max-w-[1200px] mx-auto">

          {/* Section tag */}
          <motion.p
            className="font-mono text-[10px] text-graphite/40 uppercase tracking-widest mb-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Contact
          </motion.p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">

            {/* ── Left column ─────────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <h1 className="font-sans text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold tracking-tighter text-graphite leading-[0.95] mb-5">
                Contactez-nous
              </h1>
              <p className="font-mono text-sm text-graphite/55 leading-relaxed max-w-sm mb-10">
                Une question&nbsp;? Une idée&nbsp;? Un problème&nbsp;? On est là.
              </p>

              {/* Info cards */}
              <div className="flex flex-col gap-3 mb-10">
                <InfoCard
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  }
                  label="Temps de réponse"
                  value="< 48h en général"
                />
                <InfoCard
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  }
                  label="Basé à"
                  value="Paris, France 🇫🇷"
                />
              </div>

              {/* Decorative animated element */}
              <DecorativeDots />
            </motion.div>

            {/* ── Right column — Form ──────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
            >
              <AnimatePresence mode="wait">

                {/* ── Success state ── */}
                {formState === 'success' ? (
                  <motion.div
                    key="success"
                    className="bg-white rounded-3xl border border-graphite/[0.07] p-10 flex flex-col items-center justify-center text-center gap-6 min-h-[400px]"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.4 }}
                  >
                    <AnimatedCheck />
                    <div>
                      <h2 className="font-sans text-xl font-bold text-graphite tracking-tight mb-2">
                        Message envoyé&nbsp;!
                      </h2>
                      <p className="font-mono text-sm text-graphite/55 leading-relaxed max-w-xs">
                        On vous répondra dans les plus brefs délais.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setFormState('idle')
                        setName('')
                        setEmail('')
                        setSubject('')
                        setMessage('')
                        setErrorMsg('')
                      }}
                      className="font-mono text-xs text-graphite/40 hover:text-signal transition-colors duration-200 underline underline-offset-4"
                    >
                      Envoyer un autre message
                    </button>
                  </motion.div>
                ) : (

                  /* ── Form ── */
                  <motion.form
                    key="form"
                    ref={formRef}
                    onSubmit={handleSubmit}
                    className="bg-white rounded-3xl border border-graphite/[0.07] p-7 md:p-10 flex flex-col gap-5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    noValidate
                  >

                    {/* Name */}
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="contact-name"
                        className="font-mono text-[10px] uppercase tracking-widest text-graphite/50"
                      >
                        Prénom et nom <span className="text-signal">*</span>
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        autoComplete="name"
                        required
                        placeholder="Marie Dupont"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={formState === 'loading'}
                        className={inputBase}
                      />
                    </div>

                    {/* Email */}
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="contact-email"
                        className="font-mono text-[10px] uppercase tracking-widest text-graphite/50"
                      >
                        Email <span className="text-signal">*</span>
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder="marie@exemple.fr"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={formState === 'loading'}
                        className={inputBase}
                      />
                    </div>

                    {/* Subject */}
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="contact-subject"
                        className="font-mono text-[10px] uppercase tracking-widest text-graphite/50"
                      >
                        Sujet
                      </label>
                      <div className="relative">
                        <select
                          id="contact-subject"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          disabled={formState === 'loading'}
                          className={`${inputBase} appearance-none pr-10 cursor-pointer`}
                        >
                          <option value="">Choisir un sujet (optionnel)</option>
                          {SUBJECTS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        {/* Chevron icon */}
                        <svg
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-graphite/30"
                          width="16" height="16" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </div>

                    {/* Message */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="contact-message"
                          className="font-mono text-[10px] uppercase tracking-widest text-graphite/50"
                        >
                          Message <span className="text-signal">*</span>
                        </label>
                        <span
                          className={`font-mono text-[10px] tabular-nums transition-colors duration-200 ${
                            charsLeft < 100
                              ? charsLeft < 0
                                ? 'text-red-500'
                                : 'text-amber-500'
                              : 'text-graphite/30'
                          }`}
                        >
                          {charsLeft} / {MAX_CHARS}
                        </span>
                      </div>
                      <textarea
                        id="contact-message"
                        required
                        maxLength={MAX_CHARS}
                        rows={6}
                        placeholder="Bonjour, je voulais vous signaler…"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        disabled={formState === 'loading'}
                        className={`${inputBase} resize-none`}
                      />
                    </div>

                    {/* Error message */}
                    <AnimatePresence>
                      {formState === 'error' && errorMsg && (
                        <motion.p
                          key="error"
                          className="font-mono text-xs text-red-500 bg-red-50 rounded-xl px-4 py-3 border border-red-100"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                        >
                          {errorMsg}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    {/* Submit */}
                    <motion.button
                      type="submit"
                      disabled={formState === 'loading' || message.length === 0 || name.trim().length === 0 || email.trim().length === 0}
                      className="relative overflow-hidden mt-1 rounded-xl bg-signal text-graphite px-6 py-3.5 font-sans text-sm font-semibold uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all duration-300 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 group"
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="absolute inset-0 bg-graphite translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-disabled:hidden" />
                      <span className="relative z-10 flex items-center gap-2.5 group-hover:text-signal transition-colors duration-500">
                        {formState === 'loading' ? (
                          <>
                            <Spinner />
                            Envoi en cours…
                          </>
                        ) : (
                          <>
                            Envoyer le message
                            <svg
                              width="15" height="15" viewBox="0 0 24 24"
                              fill="none" stroke="currentColor" strokeWidth="2.5"
                              strokeLinecap="round" strokeLinejoin="round"
                            >
                              <line x1="22" y1="2" x2="11" y2="13" />
                              <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                          </>
                        )}
                      </span>
                    </motion.button>

                    <p className="font-mono text-[10px] text-graphite/30 text-center leading-relaxed">
                      En soumettant ce formulaire vous acceptez que Basket conserve votre message pour y répondre.
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="bg-graphite text-paper rounded-t-[2rem] md:rounded-t-[4rem] mt-4 pt-16 md:pt-[12vh] pb-8 px-5 md:px-[5vw] relative overflow-hidden">
        {/* Grid texture */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="footerGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E8E4DD" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#footerGrid)" />
          </svg>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[10vw] relative z-10">
          {/* Brand */}
          <div>
            <h2 className="font-sans text-[10vw] md:text-[6vw] font-extrabold tracking-tighter uppercase leading-none text-paper flex items-center gap-[1vw]">
              <img src="/basket_logo.png" alt="Basket" className="h-[10vw] w-[10vw] md:h-[6vw] md:w-[6vw]" />
              Basket{' '}
              <span className="font-mono text-xs md:text-[14px] text-paper/40 font-normal tracking-wider normal-case">
                (Beta)
              </span>
            </h2>
            <p className="font-mono text-xs text-paper/40 mt-[3vh] max-w-xs">
              Le chemin le plus court vers les économies. Scannez, comparez, économisez — chaque semaine.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-col md:flex-row gap-[8vw] mt-[4vh] md:mt-0">
            <ul className="space-y-[2vh] font-mono text-xs text-paper/60">
              <li><Link href="/login" className="hover:text-signal transition-colors">Créer un compte</Link></li>
              <li><Link href="/basket-ai" className="hover:text-signal transition-colors">Basket AI</Link></li>
              <li><Link href="/comment-ca-marche" className="hover:text-signal transition-colors">Comment ça marche</Link></li>
              <li><Link href="/vision" className="hover:text-signal transition-colors">Vision</Link></li>
            </ul>
            <ul className="space-y-[2vh] font-mono text-xs text-paper/60">
              <li><Link href="/carte" className="hover:text-signal transition-colors">Carte des prix</Link></li>
              <li><Link href="/contact" className="hover:text-signal transition-colors">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-signal transition-colors">Politique de confidentialité</Link></li>
              <li><Link href="/terms" className="hover:text-signal transition-colors">{"Conditions d'utilisation"}</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 md:mt-[10vh] flex justify-between items-end border-t border-paper/10 pt-8 relative z-10">
          <div className="flex items-center gap-[1vw]">
            <div className="w-2 h-2 rounded-full bg-signal animate-pulse" />
            <span className="font-mono text-xs text-paper/50 uppercase tracking-tight">
              Fait avec soin en France 🇫🇷
            </span>
          </div>
          <span className="font-mono text-xs text-paper/30">© 2026 Basket</span>
        </div>
      </footer>

    </div>
  )
}
