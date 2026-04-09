'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, ArrowRight, Loader2, Share, MoreVertical, Plus, Home } from 'lucide-react'

// ── Newsletter ────────────────────────────────────────────────────────────────

function NewsletterForm() {
  const [email, setEmail]   = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email.trim() || status === 'loading') return
    setStatus('loading')
    try {
      const res  = await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      const data = await res.json()
      if (res.ok) { setStatus('success'); setMessage(data.message || 'Inscription réussie !'); setEmail('') }
      else        { setStatus('error');   setMessage(data.error  || 'Une erreur est survenue.'); setTimeout(() => setStatus('idle'), 3000) }
    } catch {
      setStatus('error'); setMessage('Une erreur est survenue.'); setTimeout(() => setStatus('idle'), 3000)
    }
  }

  return (
    <AnimatePresence mode="wait">
      {status === 'success' ? (
        <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
          className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(126,217,87,0.15)', border: '1px solid rgba(126,217,87,0.3)' }}>
            <CheckCircle2 className="w-7 h-7 text-signal" />
          </div>
          <p className="font-sans font-bold text-graphite text-lg">{message}</p>
          <p className="font-mono text-xs text-graphite/40">On vous tient au courant dès le lancement.</p>
        </motion.div>
      ) : (
        <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input type="email" required placeholder="votre@email.fr" value={email}
            onChange={e => setEmail(e.target.value)}
            className="flex-1 h-14 rounded-2xl px-5 font-mono text-sm text-graphite placeholder-graphite/30 outline-none transition-all"
            style={{ background: 'rgba(17,17,17,0.05)', border: status === 'error' ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(17,17,17,0.1)' }} />
          <motion.button type="submit" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            disabled={status === 'loading'}
            className="h-14 px-7 rounded-2xl font-sans font-bold text-sm flex items-center justify-center gap-2 flex-shrink-0 disabled:opacity-70"
            style={{ background: '#111111', color: '#F5F3EE' }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
            {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>M&apos;inscrire</span><ArrowRight className="w-4 h-4" /></>}
          </motion.button>
        </motion.form>
      )}
    </AnimatePresence>
  )
}

// ── PWA Install Guide ─────────────────────────────────────────────────────────

type Platform = 'ios' | 'android'

const IOS_STEPS = [
  {
    icon: Share,
    title: 'Appuyez sur Partager',
    desc: 'L\'icône carrée avec une flèche vers le haut, en bas de Safari.',
    visual: (
      <div className="flex items-end justify-center gap-3 h-16">
        <div className="w-10 h-10 rounded-xl bg-[#007AFF] flex items-center justify-center">
          <Share className="w-5 h-5 text-white" />
        </div>
        <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="text-[11px] font-mono text-graphite/40 mb-1">← ici</motion.div>
      </div>
    ),
  },
  {
    icon: Plus,
    title: 'Sur l\'écran d\'accueil',
    desc: 'Faites défiler et appuyez sur « Sur l\'écran d\'accueil ».',
    visual: (
      <div className="flex flex-col items-center gap-1.5 h-16 justify-center">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-graphite/10 shadow-sm w-40">
          <Plus className="w-4 h-4 text-[#007AFF] flex-shrink-0" />
          <span className="text-[11px] font-semibold text-graphite">Sur l&apos;écran d&apos;accueil</span>
        </div>
        <motion.div className="w-32 h-0.5 rounded-full bg-[#7ed957]"
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, delay: 0.2 }} />
      </div>
    ),
  },
  {
    icon: Home,
    title: 'Appuyez sur Ajouter',
    desc: 'Confirmez en haut à droite. Basket apparaît sur votre écran d\'accueil comme une vraie app.',
    visual: (
      <div className="flex items-center justify-center gap-3 h-16">
        <div className="w-12 h-12 rounded-2xl bg-[#111] flex items-center justify-center shadow-lg">
          <span className="text-xl">🧺</span>
        </div>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.3 }}
          className="w-5 h-5 rounded-full bg-[#7ed957] flex items-center justify-center">
          <CheckCircle2 className="w-3 h-3 text-white" />
        </motion.div>
      </div>
    ),
  },
]

const ANDROID_STEPS = [
  {
    icon: MoreVertical,
    title: 'Menu Chrome',
    desc: 'Appuyez sur les trois points en haut à droite de Chrome.',
    visual: (
      <div className="flex items-start justify-center gap-3 h-16">
        <div className="w-10 h-10 rounded-full bg-[#4285F4] flex items-center justify-center">
          <MoreVertical className="w-5 h-5 text-white" />
        </div>
        <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="text-[11px] font-mono text-graphite/40 mt-2">← ici</motion.div>
      </div>
    ),
  },
  {
    icon: Plus,
    title: 'Ajouter à l\'écran d\'accueil',
    desc: 'Appuyez sur cette option dans le menu déroulant.',
    visual: (
      <div className="flex flex-col items-center gap-1.5 h-16 justify-center">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-graphite/10 shadow-sm w-44">
          <Home className="w-4 h-4 text-[#4285F4] flex-shrink-0" />
          <span className="text-[11px] font-semibold text-graphite">Écran d&apos;accueil</span>
        </div>
        <motion.div className="w-36 h-0.5 rounded-full bg-[#7ed957]"
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, delay: 0.2 }} />
      </div>
    ),
  },
  {
    icon: Home,
    title: 'Appuyez sur Ajouter',
    desc: 'Confirmez. Basket s\'installe comme une app native, sans passer par le Play Store.',
    visual: (
      <div className="flex items-center justify-center gap-3 h-16">
        <div className="w-12 h-12 rounded-2xl bg-[#111] flex items-center justify-center shadow-lg">
          <span className="text-xl">🧺</span>
        </div>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.3 }}
          className="w-5 h-5 rounded-full bg-[#7ed957] flex items-center justify-center">
          <CheckCircle2 className="w-3 h-3 text-white" />
        </motion.div>
      </div>
    ),
  },
]

export function PWAGuide() {
  const [platform, setPlatform] = useState<Platform>('ios')
  const [activeStep, setActiveStep] = useState(0)
  const steps = platform === 'ios' ? IOS_STEPS : ANDROID_STEPS

  return (
    <div className="max-w-2xl mx-auto mt-24">
      {/* Header */}
      <motion.div className="text-center mb-10"
        initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5"
          style={{ background: 'rgba(126,217,87,0.12)', border: '1px solid rgba(126,217,87,0.25)' }}>
          <span className="text-signal text-[11px] font-mono uppercase tracking-widest font-bold">Indispensable pour la bêta</span>
        </div>
        <h3 className="font-sans text-3xl md:text-4xl font-extrabold tracking-tighter text-graphite mb-4">
          Ajoutez Basket à<br />
          <span className="text-signal">votre écran d&apos;accueil.</span>
        </h3>
        <p className="font-mono text-sm text-graphite/50 max-w-sm mx-auto leading-relaxed">
          Pour profiter pleinement de la bêta — scanner rapide, notifications, accès instantané — l&apos;ajout à l&apos;écran d&apos;accueil est indispensable.
        </p>
      </motion.div>

      {/* Platform toggle */}
      <motion.div className="flex justify-center mb-8"
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.15 }}>
        <div className="flex rounded-2xl p-1 gap-1" style={{ background: 'rgba(17,17,17,0.06)', border: '1px solid rgba(17,17,17,0.08)' }}>
          {(['ios', 'android'] as Platform[]).map(p => (
            <button key={p} onClick={() => { setPlatform(p); setActiveStep(0) }}
              className="px-6 py-2.5 rounded-xl font-sans font-bold text-sm transition-all"
              style={platform === p
                ? { background: '#111', color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }
                : { color: 'rgba(17,17,17,0.4)' }}>
              {p === 'ios' ? '🍎 iPhone / iPad' : '🤖 Android'}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Step cards */}
      <AnimatePresence mode="wait">
        <motion.div key={platform}
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-3 mb-6">
            {steps.map((_, i) => (
              <button key={i} onClick={() => setActiveStep(i)}
                className="transition-all duration-300"
                style={{
                  width:  activeStep === i ? 24 : 8,
                  height: 8,
                  borderRadius: 99,
                  background: activeStep === i ? '#7ed957' : 'rgba(17,17,17,0.12)',
                }} />
            ))}
          </div>

          {/* Active step card */}
          <AnimatePresence mode="wait">
            <motion.div key={activeStep}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-3xl p-8 mb-5"
              style={{ background: '#fff', border: '1px solid rgba(17,17,17,0.07)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

              {/* Visual */}
              <div className="mb-6">
                {steps[activeStep].visual}
              </div>

              {/* Step label */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                  style={{ background: '#7ed957', color: '#111' }}>
                  {activeStep + 1}
                </div>
                <h4 className="font-sans font-bold text-graphite text-lg">{steps[activeStep].title}</h4>
              </div>
              <p className="font-mono text-sm text-graphite/50 leading-relaxed pl-10">
                {steps[activeStep].desc}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {activeStep > 0 && (
              <button onClick={() => setActiveStep(s => s - 1)}
                className="flex-1 h-12 rounded-2xl font-sans font-bold text-sm transition-all"
                style={{ background: 'rgba(17,17,17,0.06)', color: 'rgba(17,17,17,0.5)', border: '1px solid rgba(17,17,17,0.08)' }}>
                ← Retour
              </button>
            )}
            {activeStep < steps.length - 1 ? (
              <motion.button onClick={() => setActiveStep(s => s + 1)}
                whileTap={{ scale: 0.97 }}
                className="flex-1 h-12 rounded-2xl font-sans font-bold text-sm flex items-center justify-center gap-2 transition-all"
                style={{ background: '#111', color: '#fff' }}>
                Étape suivante <ArrowRight className="w-4 h-4" />
              </motion.button>
            ) : (
              <motion.div
                initial={{ scale: 0.95 }} animate={{ scale: 1 }}
                className="flex-1 h-12 rounded-2xl font-sans font-bold text-sm flex items-center justify-center gap-2"
                style={{ background: 'rgba(126,217,87,0.15)', color: '#7ed957', border: '1px solid rgba(126,217,87,0.3)' }}>
                <CheckCircle2 className="w-4 h-4" /> C&apos;est fait !
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function NewsletterSection() {
  return (
    <section className="py-12 md:py-[15vh] px-5 md:px-[5vw] relative z-10 overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full opacity-10 blur-[100px]"
          style={{ background: '#7ed957' }} />
      </div>

      <div className="relative z-10">
        {/* Newsletter */}
        <div className="max-w-2xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
            <p className="font-mono text-xs text-graphite/40 uppercase tracking-[0.2em] mb-5">Restez dans la boucle</p>
            <h2 className="font-sans text-4xl md:text-[4.5vw] leading-[0.92] tracking-tighter text-graphite font-extrabold mb-5">
              L&apos;application mobile<br />
              <span className="text-signal">arrive bientôt.</span>
            </h2>
            <p className="font-mono text-sm text-graphite/50 mb-10 max-w-md mx-auto leading-relaxed">
              Soyez parmi les premiers à découvrir l&apos;app native, les nouvelles fonctionnalités et nos offres de lancement exclusives. Aucun spam, promis.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}>
            <NewsletterForm />
            <p className="font-mono text-[10px] text-graphite/30 mt-5">
              En vous inscrivant, vous acceptez de recevoir des emails de la part de Basket. Désabonnement possible à tout moment.
            </p>
          </motion.div>
        </div>

        {/* PWA install guide */}
        <PWAGuide />
      </div>
    </section>
  )
}
