'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useScroll, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { ShoppingBasket, Receipt, TrendingDown, Share2, Check, Loader2, ArrowRight, Star } from 'lucide-react'

function useCountUp(target: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
    const startTime = performance.now()
    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(target * eased))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration, start])
  return count
}

const STATS = [
  { value: 33000, label: 'prix comparés', suffix: '+' },
  { value: 15, label: 'enseignes', suffix: '' },
  { value: 2400, label: 'produits', suffix: '+' },
]

const TESTIMONIALS = [
  { name: 'Marie L.', text: "J'économise 18€ par semaine grâce à Basket. Incroyable !", stars: 5 },
  { name: 'Thomas B.', text: "Enfin une app qui compare vraiment les prix près de chez moi.", stars: 5 },
  { name: 'Sophie M.', text: "Mon Leclerc est plus cher que mon Lidl pour la plupart des produits. Choquant.", stars: 5 },
  { name: 'Julien R.', text: "Simple, rapide, efficace. Je scanne tous mes tickets maintenant.", stars: 4 },
]

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [statsVisible, setStatsVisible] = useState(false)
  const [navSolid, setNavSolid] = useState(false)
  const statsRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()

  useEffect(() => {
    const unsub = scrollY.on('change', (v) => setNavSolid(v > 60))
    return unsub
  }, [scrollY])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true) },
      { threshold: 0.3 }
    )
    if (statsRef.current) observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [])

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError('')
    const { error: dbError } = await supabase.from('waitlist').insert({ email: email.toLowerCase().trim() })
    if (dbError) {
      setError(dbError.code === '23505' ? 'Vous êtes déjà inscrit(e) !' : 'Une erreur est survenue. Réessayez.')
    } else {
      setSubmitted(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-x-hidden">
      {/* Animated background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #E07A5F 0%, transparent 70%)', top: '-200px', left: '-200px' }}
          animate={{ x: [0, 80, 0], y: [0, 40, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #FF9B7B 0%, transparent 70%)', bottom: '-100px', right: '-100px' }}
          animate={{ x: [0, -60, 0], y: [0, -40, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Sticky nav */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto"
        style={{
          backdropFilter: navSolid ? 'blur(20px)' : 'none',
          backgroundColor: navSolid ? 'rgba(10,10,10,0.85)' : 'transparent',
          borderBottom: navSolid ? '1px solid rgba(255,255,255,0.08)' : 'none',
          transition: 'all 0.3s ease',
          width: '100%',
          maxWidth: '100%',
        }}
      >
        <div className="flex items-center gap-2">
          <ShoppingBasket className="w-6 h-6 text-[#E07A5F]" strokeWidth={2.5} />
          <span className="text-lg font-bold tracking-tight">Basket</span>
        </div>
        <a href="/login">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="px-5 py-2 rounded-full text-sm font-semibold border border-white/20 text-white hover:border-white/40 transition-colors glass"
          >
            Se connecter
          </motion.button>
        </a>
      </motion.nav>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <motion.div
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 border"
            style={{
              background: 'rgba(224,122,95,0.1)',
              borderColor: 'rgba(224,122,95,0.3)',
              color: '#E07A5F'
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            Économisez sur vos courses chaque semaine
          </motion.div>

          <h1 className="font-extrabold leading-[1.05] tracking-tight mb-6" style={{ fontSize: 'clamp(3rem, 10vw, 6.5rem)' }}>
            <span className="block text-white">Vos courses.</span>
            <span className="block">
              Au{' '}
              <span className="gradient-text">meilleur</span>
              {' '}prix.
            </span>
          </h1>

          <p className="text-lg text-[#6B7280] max-w-xl mx-auto mb-10 leading-relaxed">
            Photographiez vos tickets de caisse. Basket vous dit si vos voisins paient moins — et où trouver les meilleurs prix près de chez vous.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 px-6 py-3 rounded-full text-sm font-medium"
                  style={{ background: 'rgba(0,208,156,0.15)', color: '#00D09C', border: '1px solid rgba(0,208,156,0.3)' }}
                >
                  <Check className="w-4 h-4" />
                  Merci ! Vous serez parmi les premiers informés.
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={handleWaitlist}
                  className="flex flex-col sm:flex-row gap-3 w-full max-w-md"
                >
                  <input
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-1 h-12 rounded-xl px-4 text-sm bg-white/10 border border-white/15 text-white placeholder:text-white/40 focus:outline-none focus:border-[#E07A5F] transition-colors"
                  />
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="h-12 px-6 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2"
                    style={{ background: '#E07A5F' }}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Commencer gratuitement <ArrowRight className="w-4 h-4" /></>}
                  </motion.button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </motion.div>

        {/* Stats bar */}
        <motion.div
          ref={statsRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16"
        >
          {STATS.map((stat) => (
            <StatItem key={stat.label} stat={stat} visible={statsVisible} />
          ))}
        </motion.div>
      </section>

      {/* Flow features */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Comment ça marche</h2>
          <p className="text-[#6B7280] max-w-md mx-auto">Trois étapes simples pour commencer à économiser</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Receipt, step: '01', title: 'Scannez', desc: 'Photographiez votre ticket de caisse. Notre IA lit chaque article automatiquement.', color: '#E07A5F' },
            { icon: TrendingDown, step: '02', title: 'Comparez', desc: "Découvrez combien vos voisins paient pour les mêmes produits dans d'autres enseignes.", color: '#FF9B7B' },
            { icon: Share2, step: '03', title: 'Économisez', desc: "Partagez vos résultats et choisissez le magasin le plus avantageux près de chez vous.", color: '#00D09C' },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              className="relative glass rounded-2xl p-8 cursor-default"
              style={{ transition: 'box-shadow 0.2s', boxShadow: 'none' }}
            >
              <div className="absolute top-6 right-6 text-5xl font-extrabold opacity-5 text-white">
                {item.step}
              </div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: `${item.color}20`, border: `1px solid ${item.color}40` }}>
                <item.icon className="w-6 h-6" style={{ color: item.color }} />
              </div>
              <h3 className="text-xl font-bold mb-3">{item.title}</h3>
              <p className="text-[#6B7280] leading-relaxed text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Ils économisent déjà</h2>
          <p className="text-[#6B7280]">Des milliers d&apos;utilisateurs comparent leurs courses avec Basket</p>
        </motion.div>
        <div className="flex gap-4 overflow-x-auto scrollbar-hide px-6 pb-4">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass rounded-2xl p-6 min-w-[280px] flex-shrink-0"
            >
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-[#E07A5F] text-[#E07A5F]" />
                ))}
              </div>
              <p className="text-sm text-white/80 leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
              <p className="text-xs font-semibold text-[#6B7280]">{t.name}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-2xl mx-auto px-6 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass rounded-3xl p-10 sm:p-16"
        >
          <h2 className="text-3xl sm:text-5xl font-extrabold mb-4">
            Prêt à payer moins ?
          </h2>
          <p className="text-[#6B7280] mb-8">Rejoignez la liste d&apos;attente — c&apos;est 100% gratuit.</p>
          {!submitted ? (
            <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 h-12 rounded-xl px-4 text-sm bg-white/10 border border-white/15 text-white placeholder:text-white/40 focus:outline-none focus:border-[#E07A5F] transition-colors"
              />
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="h-12 px-6 rounded-xl font-semibold text-sm text-white"
                style={{ background: '#E07A5F' }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "S'inscrire"}
              </motion.button>
            </form>
          ) : (
            <div className="flex items-center justify-center gap-3 text-sm font-medium" style={{ color: '#00D09C' }}>
              <Check className="w-5 h-5" />
              Merci ! Vous serez parmi les premiers informés.
            </div>
          )}
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-[#4B5563]">
          <div className="flex items-center gap-2">
            <ShoppingBasket className="w-4 h-4 text-[#E07A5F]" />
            <span>Basket © 2026</span>
          </div>
          <p>Fait en France 🇫🇷</p>
        </div>
      </footer>
    </div>
  )
}

function StatItem({ stat, visible }: { stat: typeof STATS[0]; visible: boolean }) {
  const count = useCountUp(stat.value, 2000, visible)
  return (
    <div className="text-center">
      <p className="text-3xl sm:text-4xl font-extrabold text-white">
        {count.toLocaleString('fr-FR')}{stat.suffix}
      </p>
      <p className="text-sm text-[#6B7280] mt-1">{stat.label}</p>
    </div>
  )
}
