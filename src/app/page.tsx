'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
  ShoppingBasket, ArrowRight, Check, Star, Shield, Zap, Bell, BarChart2,
  ShoppingCart, Receipt, Menu, X, TrendingDown, MapPin, Share2, Lock, Loader2
} from 'lucide-react'

/* ─── helpers ─────────────────────────────────────────────── */

function useCountUp(target: number, duration = 2000, trigger = false) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!trigger || target === 0) return
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(target * e))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration, trigger])
  return val
}

/* ─── phone mockup ────────────────────────────────────────── */

function PhoneMockup({ screen }: { screen: React.ReactNode }) {
  return (
    <div
      className="relative mx-auto"
      style={{ width: 260, height: 520 }}
    >
      {/* Frame */}
      <div
        className="absolute inset-0 rounded-[44px] border-[7px] border-white/10"
        style={{ background: '#111' }}
      />
      {/* Notch */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-4 rounded-full bg-black z-10" />
      {/* Screen */}
      <div className="absolute inset-[7px] rounded-[38px] overflow-hidden">
        {screen}
      </div>
      {/* Shine */}
      <div
        className="absolute inset-0 rounded-[44px] pointer-events-none"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 50%)' }}
      />
    </div>
  )
}

/* ─── data ────────────────────────────────────────────────── */

const NAV_LINKS = [
  { label: 'Fonctionnalités', href: '#features' },
  { label: 'Comment ça marche', href: '#how' },
  { label: 'Avis', href: '#reviews' },
  { label: 'À propos', href: '#about' },
]

const FEATURES = [
  { icon: Receipt, label: 'Scan IA', desc: 'Notre IA lit votre ticket en moins de 5 secondes, article par article.', color: '#E07A5F' },
  { icon: TrendingDown, label: 'Comparaison', desc: "Comparez instantanément avec 15 enseignes autour de chez vous.", color: '#7C3AED' },
  { icon: Bell, label: 'Alertes prix', desc: "Soyez notifié dès qu'un produit est moins cher qu'avant.", color: '#0EA5E9' },
  { icon: ShoppingCart, label: 'Liste de courses', desc: 'Préparez votre liste et Basket vous dit où faire les meilleures économies.', color: '#10B981' },
  { icon: BarChart2, label: 'Bilan hebdo', desc: 'Visualisez vos économies semaine par semaine et partagez vos résultats.', color: '#F59E0B' },
  { icon: Share2, label: 'Partage social', desc: "Invitez vos proches et économisez encore plus grâce à l'intelligence collective.", color: '#EC4899' },
]

const STEPS = [
  { n: '01', title: 'Photographiez votre ticket', desc: "Ouvrez Basket, appuyez sur Scanner et prenez votre ticket en photo. Fini les saisies manuelles — notre IA s'occupe de tout." },
  { n: '02', title: 'Comparez les prix', desc: "En quelques secondes, Basket analyse chaque article et le compare aux prix pratiqués dans les enseignes autour de vous, en temps réel." },
  { n: '03', title: "Économisez chaque semaine", desc: "Découvrez combien vous pourriez économiser en changeant d'enseigne pour certains articles. En moyenne, nos utilisateurs économisent 18€ par semaine." },
]

const TESTIMONIALS = [
  { name: 'Marie L.', city: 'Paris 15e', text: "18€ d'économies en changeant juste mon enseigne pour les produits laitiers. Bluffant.", stars: 5 },
  { name: 'Thomas B.', city: 'Lyon', text: "Simple, rapide, indispensable. Je scanne tous mes tickets depuis 2 mois et j'ai économisé 140€.", stars: 5 },
  { name: 'Sophie M.', city: 'Bordeaux', text: "Mon Leclerc est 20% plus cher que le Lidl à côté pour mes produits habituels. Shocking.", stars: 5 },
  { name: 'Julien R.', city: 'Nantes', text: "L'interface est superbe, l'IA est précise et les alertes prix sont un vrai plus. 10/10.", stars: 5 },
  { name: 'Amandine T.', city: 'Toulouse', text: "Enfin une app qui compare vraiment les prix localement et pas juste en ligne.", stars: 4 },
  { name: 'Kévin D.', city: 'Lille', text: "J'utilise la liste de courses avant chaque visite au supermarché. Indispensable.", stars: 5 },
]

const TRUSTS = [
  { icon: Shield, title: 'Vos données vous appartiennent', desc: "Nous ne vendons aucune donnée personnelle. Vos tickets restent privés et chiffrés." },
  { icon: Lock, title: 'Sécurisé par Supabase', desc: 'Authentification et stockage de niveau professionnel, comme les grandes banques.' },
  { icon: Zap, title: 'IA locale & rapide', desc: "L'analyse se fait en quelques secondes sans stocker vos photos plus de 24h." },
]

/* ─── main component ───────────────────────────────────────── */

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [navSolid, setNavSolid] = useState(false)
  const [statsVisible, setStatsVisible] = useState(false)
  const statsRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()

  useEffect(() => {
    const unsub = scrollY.on('change', (v) => setNavSolid(v > 80))
    return unsub
  }, [scrollY])

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVisible(true) }, { threshold: 0.3 })
    if (statsRef.current) observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [])

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true); setError('')
    const { error: dbErr } = await supabase.from('waitlist').insert({ email: email.toLowerCase().trim() })
    if (dbErr) setError(dbErr.code === '23505' ? 'Déjà inscrit(e) !' : 'Erreur. Réessayez.')
    else setSubmitted(true)
    setLoading(false)
  }

  const s1 = useCountUp(33000, 2000, statsVisible)
  const s2 = useCountUp(18, 2000, statsVisible)
  const s3 = useCountUp(15, 2000, statsVisible)
  const s4 = useCountUp(2400, 2000, statsVisible)

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden">

      {/* ── GRADIENT MESH BACKGROUND ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute rounded-full opacity-[0.15]"
          style={{ width: 800, height: 800, background: 'radial-gradient(circle, #E07A5F 0%, transparent 65%)', top: -300, left: -200 }}
          animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute rounded-full opacity-[0.10]"
          style={{ width: 600, height: 600, background: 'radial-gradient(circle, #7C3AED 0%, transparent 65%)', top: 200, right: -150 }}
          animate={{ x: [0, -50, 0], y: [0, 60, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute rounded-full opacity-[0.08]"
          style={{ width: 500, height: 500, background: 'radial-gradient(circle, #0EA5E9 0%, transparent 65%)', bottom: -100, left: '40%' }}
          animate={{ x: [0, 40, 0], y: [0, -40, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* ── NAV ── */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          backdropFilter: navSolid ? 'blur(24px)' : 'none',
          WebkitBackdropFilter: navSolid ? 'blur(24px)' : 'none',
          backgroundColor: navSolid ? 'rgba(5,5,5,0.9)' : 'transparent',
          borderBottom: navSolid ? '1px solid rgba(255,255,255,0.06)' : 'none',
          transition: 'all 0.4s ease',
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 flex-shrink-0">
            <ShoppingBasket className="w-6 h-6 text-[#E07A5F]" strokeWidth={2.5} />
            <span className="text-base font-bold tracking-tight">Basket</span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} className="text-sm text-[#9CA3AF] hover:text-white transition-colors">
                {l.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <a href="/login">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="px-4 py-2 rounded-full text-sm font-medium text-[#9CA3AF] hover:text-white transition-colors">
                Se connecter
              </motion.button>
            </a>
            <a href="/login">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="px-5 py-2 rounded-full text-sm font-semibold text-white"
                style={{ background: '#E07A5F', boxShadow: '0 4px 20px rgba(224,122,95,0.35)' }}>
                Commencer
              </motion.button>
            </a>
          </div>

          {/* Mobile menu button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </motion.button>
        </div>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-16 z-40 md:hidden"
            style={{ background: 'rgba(10,10,10,0.98)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <nav className="flex flex-col px-6 py-6 gap-4">
              {NAV_LINKS.map((l) => (
                <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)}
                  className="text-base text-[#9CA3AF] hover:text-white transition-colors py-1">
                  {l.label}
                </a>
              ))}
              <div className="h-px bg-white/06 my-2" />
              <a href="/login" onClick={() => setMenuOpen(false)}>
                <motion.button whileTap={{ scale: 0.97 }}
                  className="w-full h-12 rounded-2xl text-sm font-semibold text-white"
                  style={{ background: '#E07A5F' }}>
                  Commencer gratuitement
                </motion.button>
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HERO ── */}
      <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center">
        {/* Eyebrow pill */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 border"
          style={{ background: 'rgba(224,122,95,0.1)', borderColor: 'rgba(224,122,95,0.3)', color: '#E07A5F' }}
        >
          <TrendingDown className="w-3 h-3" />
          L&apos;app qui fait baisser vos courses
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="font-extrabold leading-[1.04] tracking-tight mb-6"
          style={{ fontSize: 'clamp(3.2rem, 9vw, 7.5rem)' }}
        >
          <span className="block text-white">Vos courses.</span>
          <span className="block">
            Au{' '}
            <span style={{
              background: 'linear-gradient(135deg, #E07A5F, #FF9B7B, #7C3AED)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              meilleur
            </span>
            {' '}prix.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-base sm:text-lg text-[#6B7280] max-w-xl mx-auto mb-10 leading-relaxed"
        >
          Photographiez votre ticket. Basket compare chaque article dans 15 enseignes autour de chez vous et vous montre où économiser — chaque semaine.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-3 mb-6"
        >
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div key="ok" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium"
                style={{ background: 'rgba(0,208,156,0.12)', color: '#00D09C', border: '1px solid rgba(0,208,156,0.25)' }}>
                <Check className="w-4 h-4" /> Vous serez parmi les premiers informés !
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                <input
                  type="email" placeholder="votre@email.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} required
                  className="h-12 rounded-2xl px-5 text-sm text-white placeholder:text-[#4B5563] focus:outline-none flex-1"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', transition: 'border-color 0.2s' }}
                  onFocus={(e) => e.target.style.borderColor = '#E07A5F'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="h-12 px-6 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 flex-shrink-0"
                  style={{ background: '#E07A5F', boxShadow: '0 6px 24px rgba(224,122,95,0.35)' }}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Commencer gratuitement <ArrowRight className="w-4 h-4" /></>}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
          <a href="/login">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="h-12 px-6 rounded-2xl text-sm font-medium text-[#9CA3AF] flex items-center gap-2 border border-white/10 hover:border-white/20 transition-colors">
              J&apos;ai déjà un compte
            </motion.button>
          </a>
        </motion.div>
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-3 text-sm text-[#6B7280] mb-16"
        >
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-[#E07A5F] text-[#E07A5F]" />)}
          </div>
          <span>4.9 · Gratuit · iOS & Android</span>
        </motion.div>

        {/* Phone mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.35, duration: 0.7, type: 'spring', stiffness: 100 }}
          style={{ filter: 'drop-shadow(0 40px 80px rgba(224,122,95,0.2))' }}
        >
          <PhoneMockup screen={
            <div className="w-full h-full" style={{ background: 'linear-gradient(180deg, #0F0F0F 0%, #1A1A1A 100%)' }}>
              {/* Mini dashboard */}
              <div className="p-4 pt-8">
                <p className="text-[8px] text-[#4B5563] uppercase tracking-widest mb-1">Économies totales</p>
                <p className="text-3xl font-extrabold" style={{ color: '#00D09C' }}>€124.50</p>
                <p className="text-[9px] text-[#6B7280] mt-0.5">sur 12 tickets scannés</p>
                <div className="mt-4 rounded-xl overflow-hidden" style={{ background: 'rgba(0,208,156,0.08)', border: '1px solid rgba(0,208,156,0.2)', padding: '10px 12px' }}>
                  <p className="text-[8px] text-[#00D09C] font-semibold uppercase tracking-wider mb-1">Meilleure économie</p>
                  <p className="text-[11px] font-bold text-white">Lidl · €8.20 de moins</p>
                  <p className="text-[9px] text-[#6B7280]">sur 3 articles ce mois-ci</p>
                </div>
                <div className="mt-3 space-y-2">
                  {['CRISTALINE 1.5L', 'NUTELLA 400G', 'COCA COLA 1.5L'].map((item, i) => (
                    <div key={i} className="flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '6px 10px' }}>
                      <p className="text-[9px] text-[#9CA3AF] truncate flex-1">{item}</p>
                      <p className="text-[9px] font-semibold flex-shrink-0 ml-2" style={{ color: '#00D09C' }}>-€{(1.2 + i * 0.5).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          } />
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center pt-1.5">
            <div className="w-1 h-1.5 rounded-full bg-white/40" />
          </div>
        </motion.div>
      </section>

      {/* ── RETAILER BAR ── */}
      <section className="py-8 border-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
          <p className="text-[11px] uppercase tracking-widest text-[#4B5563] w-full text-center mb-2">Comparez dans les grandes enseignes</p>
          {['Carrefour', 'Lidl', 'Auchan', 'Leclerc', 'Intermarché', 'Monoprix', 'Casino', 'Super U'].map((s) => (
            <span key={s} className="text-sm font-semibold text-[#374151] select-none">{s}</span>
          ))}
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-[#E07A5F] mb-4">Fonctionnalités</p>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">Tout en un.</h2>
          <p className="text-[#6B7280] max-w-lg mx-auto text-base leading-relaxed">
            De la photo du ticket à l&apos;économie réalisée — une seule app, six fonctionnalités essentielles.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.4 }}
              whileHover={{ y: -4, scale: 1.01 }}
              className="relative rounded-2xl p-6 cursor-default group"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                transition: 'border-color 0.3s, box-shadow 0.3s',
              }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${f.color}15`, border: `1px solid ${f.color}30` }}
              >
                <f.icon className="w-5 h-5" style={{ color: f.color }} />
              </div>
              <h3 className="font-bold text-base mb-2 text-white">{f.label}</h3>
              <p className="text-[#6B7280] text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURE DEEP DIVES ── */}
      {/* Deep-dive 1: scan */}
      <section id="how" className="py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-[#E07A5F] mb-4">Étape 1</p>
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
                Scannez votre<br />ticket en<br /><span className="gradient-text">5 secondes.</span>
              </h2>
              <p className="text-[#6B7280] text-base leading-relaxed mb-8">
                Notre IA reconnaît automatiquement chaque article sur votre ticket — même les abréviations illisibles des caisses de supermarché. Pas de saisie manuelle. Jamais.
              </p>
              <ul className="space-y-3">
                {["Reconnaissance IA ultra-précise", "Fonctionne avec tous les supermarchés français", "Résultats en moins de 10 secondes"].map((t) => (
                  <li key={t} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,208,156,0.15)' }}>
                      <Check className="w-3 h-3" style={{ color: '#00D09C' }} />
                    </div>
                    <span className="text-sm text-[#9CA3AF]">{t}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex justify-center lg:justify-end"
            >
              <PhoneMockup screen={
                <div className="w-full h-full flex flex-col items-center justify-center gap-3" style={{ background: '#0A0A0A' }}>
                  <motion.div
                    className="w-36 h-36 rounded-2xl flex items-center justify-center"
                    style={{ background: '#E07A5F', boxShadow: '0 0 0 0 rgba(224,122,95,0.4)' }}
                    animate={{ boxShadow: ['0 0 0 0 rgba(224,122,95,0.4)', '0 0 0 20px rgba(224,122,95,0)', '0 0 0 0 rgba(224,122,95,0)'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Receipt className="w-16 h-16 text-white" />
                  </motion.div>
                  <p className="text-[11px] text-white font-semibold">Analyser ce ticket</p>
                  <div className="flex gap-1">
                    {[...Array(3)].map((_, i) => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-[#E07A5F]"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
                    ))}
                  </div>
                </div>
              } />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Deep-dive 2: compare */}
      <section className="py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex justify-center lg:justify-start order-2 lg:order-1"
            >
              <PhoneMockup screen={
                <div className="w-full h-full" style={{ background: '#0A0A0A', padding: '32px 12px 12px' }}>
                  <p className="text-[9px] text-[#4B5563] uppercase tracking-wider mb-3">Comparaison des prix</p>
                  {[
                    { name: 'COCA COLA 1.5L', you: 2.15, best: 1.49, store: 'Lidl' },
                    { name: 'NUTELLA 400G', you: 4.99, best: 3.79, store: 'Auchan' },
                    { name: 'LAIT DEMI ECR.', you: 1.05, best: 0.79, store: 'Lidl' },
                  ].map((item, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 + 0.3 }}
                      className="mb-2 rounded-xl px-3 py-2.5"
                      style={{ background: 'rgba(0,208,156,0.08)', border: '1px solid rgba(0,208,156,0.2)' }}>
                      <p className="text-[9px] text-white font-semibold">{item.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[8px] text-[#4B5563] line-through">€{item.you.toFixed(2)}</span>
                        <span className="text-[8px] font-bold" style={{ color: '#00D09C' }}>€{item.best.toFixed(2)} chez {item.store}</span>
                      </div>
                    </motion.div>
                  ))}
                  <div className="mt-4 rounded-xl px-3 py-2" style={{ background: 'rgba(224,122,95,0.1)', border: '1px solid rgba(224,122,95,0.2)' }}>
                    <p className="text-[8px] text-[#E07A5F] font-semibold">💡 Meilleur magasin</p>
                    <p className="text-[10px] text-white font-bold mt-0.5">Lidl · économisez €3.12</p>
                  </div>
                </div>
              } />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="order-1 lg:order-2"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-[#7C3AED] mb-4">Étape 2</p>
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
                Découvrez ce que<br />paient vos<br /><span style={{ background: 'linear-gradient(135deg, #7C3AED, #0EA5E9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>voisins.</span>
              </h2>
              <p className="text-[#6B7280] text-base leading-relaxed mb-8">
                Prix en temps réel, géolocalisés dans votre département. Basket ne compare pas des prix nationaux abstraits — il cherche ce que les gens paient vraiment près de chez vous.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { n: '15', label: 'enseignes comparées' },
                  { n: '33K+', label: 'prix dans la base' },
                  { n: '€18', label: 'économies/semaine en moy.' },
                  { n: '< 10s', label: 'pour avoir vos résultats' },
                ].map((s) => (
                  <div key={s.n} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-2xl font-extrabold text-white">{s.n}</p>
                    <p className="text-xs text-[#6B7280] mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Deep-dive 3: alerts */}
      <section className="py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-[#10B981] mb-4">Étape 3</p>
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
                Ne ratez plus<br />jamais une<br /><span style={{ background: 'linear-gradient(135deg, #10B981, #0EA5E9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>promotion.</span>
              </h2>
              <p className="text-[#6B7280] text-base leading-relaxed mb-8">
                Surveillez vos produits préférés. Dès que Basket détecte une baisse de prix de 5% ou plus, vous recevez une alerte. Comme un ami qui fait les courses et vous prévient des bonnes affaires.
              </p>
              <ul className="space-y-3">
                {["Alertes dès -5% sur vos produits surveillés", "Notification push ou dans l'app", "Historique des baisses de prix"].map((t) => (
                  <li key={t} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.15)' }}>
                      <Bell className="w-2.5 h-2.5" style={{ color: '#10B981' }} />
                    </div>
                    <span className="text-sm text-[#9CA3AF]">{t}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex justify-center lg:justify-end"
            >
              <PhoneMockup screen={
                <div className="w-full h-full" style={{ background: '#0A0A0A', padding: '32px 12px 12px' }}>
                  <p className="text-[9px] text-[#4B5563] uppercase tracking-wider mb-3">Alertes prix</p>
                  {[
                    { item: 'Nutella 400g', drop: '-€1.20', store: 'Auchan', time: 'il y a 2h' },
                    { item: 'Coca Cola 6x', drop: '-€0.89', store: 'Lidl', time: 'il y a 5h' },
                    { item: 'Camembert', drop: '-€0.45', store: 'Carrefour', time: 'hier' },
                  ].map((n, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 + 0.2 }}
                      viewport={{ once: true }}
                      className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.15)' }}>
                        <TrendingDown className="w-3.5 h-3.5" style={{ color: '#10B981' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-semibold text-white truncate">{n.item}</p>
                        <p className="text-[8px] text-[#6B7280]">{n.store} · {n.time}</p>
                      </div>
                      <span className="text-[9px] font-bold flex-shrink-0" style={{ color: '#10B981' }}>{n.drop}</span>
                    </motion.div>
                  ))}
                </div>
              } />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-28 relative">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(124,58,237,0.05) 50%, transparent 100%)' }} />
        <div className="max-w-4xl mx-auto px-6 relative">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#7C3AED] mb-4">En 3 étapes</p>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">Démarrez en moins<br />d&apos;une minute.</h2>
          </motion.div>
          <div className="space-y-6">
            {STEPS.map((s, i) => (
              <motion.div key={s.n}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="flex gap-5 items-start rounded-2xl p-6"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-extrabold"
                  style={{ background: 'rgba(224,122,95,0.15)', color: '#E07A5F', border: '1px solid rgba(224,122,95,0.25)' }}>
                  {s.n}
                </div>
                <div>
                  <h3 className="font-bold text-base mb-2 text-white">{s.title}</h3>
                  <p className="text-[#6B7280] text-sm leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section ref={statsRef} className="py-24 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(224,122,95,0.08) 0%, rgba(124,58,237,0.08) 100%)' }} />
        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { value: s1.toLocaleString('fr-FR'), suffix: '+', label: 'prix dans la base' },
              { value: `€${s2}`, suffix: '', label: 'économisés/semaine en moy.' },
              { value: s3, suffix: '', label: 'enseignes comparées' },
              { value: s4.toLocaleString('fr-FR'), suffix: '+', label: 'produits référencés' },
            ].map((s, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="text-center">
                <p className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                  {s.value}{s.suffix}
                </p>
                <p className="text-sm text-[#6B7280] mt-2">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="reviews" className="py-28">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#E07A5F] mb-4">Avis utilisateurs</p>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">Ils économisent déjà.</h2>
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className="flex gap-0.5">{[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-[#E07A5F] text-[#E07A5F]" />)}</div>
              <span className="text-sm text-[#6B7280]">4.9/5 · Plus de 2,000 avis</span>
            </div>
          </motion.div>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-6 px-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -4 }}
                className="rounded-2xl p-5 min-w-[280px] flex-shrink-0 flex flex-col justify-between"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div>
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(t.stars)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-[#E07A5F] text-[#E07A5F]" />)}
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                </div>
                <div className="flex items-center gap-3 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: `hsl(${i * 60}, 60%, 45%)` }}>
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{t.name}</p>
                    <p className="text-[10px] text-[#6B7280] flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{t.city}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST / SECURITY ── */}
      <section className="py-24 border-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#6B7280] mb-4">Confiance & sécurité</p>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Vos données vous<br />appartiennent.</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {TRUSTS.map((t, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl p-6 text-center"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(0,208,156,0.1)', border: '1px solid rgba(0,208,156,0.2)' }}>
                  <t.icon className="w-6 h-6" style={{ color: '#00D09C' }} />
                </div>
                <h3 className="font-bold text-sm text-white mb-2">{t.title}</h3>
                <p className="text-xs text-[#6B7280] leading-relaxed">{t.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-32">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(224,122,95,0.15) 0%, rgba(124,58,237,0.12) 100%)', border: '1px solid rgba(224,122,95,0.2)', padding: 'clamp(40px, 8vw, 80px)' }}
          >
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-30"
              style={{ background: 'radial-gradient(circle, #E07A5F 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
            <div className="relative">
              <h2 className="font-extrabold tracking-tight mb-4" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}>
                Prêt à payer<br />moins cher ?
              </h2>
              <p className="text-[#6B7280] mb-10 text-base">Gratuit. Sans engagement. Sans CB.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="/login">
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    className="h-14 px-8 rounded-2xl text-base font-bold text-white flex items-center gap-2 mx-auto sm:mx-0"
                    style={{ background: '#E07A5F', boxShadow: '0 8px 32px rgba(224,122,95,0.4)' }}>
                    Commencer gratuitement <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </a>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="h-14 px-8 rounded-2xl text-base font-medium text-[#9CA3AF] border border-white/10 hover:border-white/20 transition-colors">
                  Voir une démo
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer id="about" className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingBasket className="w-5 h-5 text-[#E07A5F]" strokeWidth={2.5} />
                <span className="font-bold">Basket</span>
              </div>
              <p className="text-[#6B7280] text-sm leading-relaxed max-w-xs">
                L&apos;application qui compare les prix de vos courses dans les supermarchés autour de vous — gratuitement.
              </p>
            </div>
            {/* Links */}
            {[
              { title: 'Produit', links: ['Fonctionnalités', 'Comment ça marche', 'Tarifs', 'Nouveautés'] },
              { title: 'Entreprise', links: ['À propos', 'Blog', 'Carrières', 'Presse'] },
              { title: 'Légal', links: ['Confidentialité', 'CGU', 'Cookies', 'Contact'] },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-xs font-semibold text-white uppercase tracking-widest mb-4">{col.title}</p>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l}><a href="#" className="text-sm text-[#6B7280] hover:text-white transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs text-[#4B5563]">© 2026 Basket. Tous droits réservés.</p>
            <p className="text-xs text-[#4B5563]">Fait avec ❤️ en France 🇫🇷</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
