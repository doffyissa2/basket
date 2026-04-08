'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import {
  Eye,
  ShieldCheck,
  Users,
  BarChart3,
  Smartphone,
  Bell,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  MapPin,
} from 'lucide-react'
import Link from 'next/link'

// ─── helpers ──────────────────────────────────────────────────────────────────

function useCountUp(target: number, duration: number = 2000, start: boolean = false) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!start) return
    const startTime = performance.now()
    let raf: number
    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease out quart
      const eased = 1 - Math.pow(1 - progress, 4)
      setValue(Math.round(eased * target))
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [start, target, duration])
  return value
}

// ─── reusable fade-in wrapper ─────────────────────────────────────────────────

function FadeUp({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 48 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

// ─── animated stat block ──────────────────────────────────────────────────────

function StatBlock({
  prefix = '',
  target,
  suffix = '',
  label,
  delay = 0,
}: {
  prefix?: string
  target: number
  suffix?: string
  label: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const value = useCountUp(target, 2200, inView)

  return (
    <motion.div
      ref={ref}
      className="flex flex-col gap-3 p-8 rounded-[2rem] border border-paper/10 bg-paper/5 relative overflow-hidden"
      initial={{ opacity: 0, y: 60 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* subtle grid accent */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg,#E8E4DD,#E8E4DD 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#E8E4DD,#E8E4DD 1px,transparent 1px,transparent 40px)',
        }}
      />
      <span className="font-sans text-5xl md:text-6xl font-extrabold tracking-tighter text-signal leading-none">
        {prefix}
        {value.toLocaleString('fr-FR')}
        {suffix}
      </span>
      <span className="font-mono text-xs text-paper/50 uppercase tracking-wider">{label}</span>
    </motion.div>
  )
}

// ─── principle card ───────────────────────────────────────────────────────────

const principles = [
  {
    icon: Eye,
    title: 'Transparence',
    desc: 'Pas de prix cachés, pas d\'algorithme opaque. Chaque comparaison est expliquée, chaque source est visible.',
  },
  {
    icon: Users,
    title: 'Accessibilité',
    desc: 'Gratuit. Sans abonnement. Sans carte de crédit. L\'information sur les prix appartient à tout le monde.',
  },
  {
    icon: BarChart3,
    title: 'Communauté',
    desc: 'Les données viennent des utilisateurs. Plus nous sommes nombreux, plus les prix sont précis et à jour.',
  },
  {
    icon: ShieldCheck,
    title: 'Données réelles',
    desc: 'Aucun prix fictif, aucun partenariat commercial qui biaise les résultats. Seulement les vrais prix du marché.',
  },
]

// ─── roadmap phases ───────────────────────────────────────────────────────────

const phases = [
  {
    num: '01',
    status: 'done' as const,
    title: 'Scanner + comparaison IA',
    desc: 'Photographiez votre ticket. Notre IA lit chaque article et compare instantanément avec 15 enseignes françaises.',
    icon: CheckCircle2,
  },
  {
    num: '02',
    status: 'progress' as const,
    title: 'Carte des prix communautaire',
    desc: 'Une carte interactive alimentée par les scans de la communauté. Voyez les prix réels autour de vous, en temps réel.',
    icon: MapPin,
  },
  {
    num: '03',
    status: 'coming' as const,
    title: 'App mobile native',
    desc: 'iOS et Android. Scanner depuis l\'appareil photo natif, notifications push, widget de suivi d\'économies.',
    icon: Smartphone,
  },
  {
    num: '04',
    status: 'future' as const,
    title: 'Alertes de prix & abonnements',
    desc: 'Soyez alerté quand le prix d\'un produit baisse près de chez vous. Listes de courses partagées en famille.',
    icon: Bell,
  },
]

// ─── values ───────────────────────────────────────────────────────────────────

const values = [
  { label: 'Ouverture', desc: 'Open data, retours bienvenus, pas de silos.' },
  { label: 'Précision', desc: 'Chaque chiffre est vérifiable. On préfère moins de données, mais exactes.' },
  { label: 'Respect des données', desc: 'Vos tickets ne sont jamais revendus. Votre vie privée n\'est pas un produit.' },
]

// ─── page ─────────────────────────────────────────────────────────────────────

export default function VisionPage() {
  // Override dark-mode body colors (same pattern as landing page)
  useEffect(() => {
    const htmlEl = document.documentElement
    const hadDark = htmlEl.classList.contains('dark')
    htmlEl.classList.remove('dark')
    const prevHtmlBg = htmlEl.style.backgroundColor
    const prevBodyBg = document.body.style.backgroundColor
    const prevBodyColor = document.body.style.color
    htmlEl.style.backgroundColor = '#F5F3EE'
    document.body.style.backgroundColor = '#F5F3EE'
    document.body.style.color = '#111111'
    return () => {
      htmlEl.style.backgroundColor = prevHtmlBg
      document.body.style.backgroundColor = prevBodyBg
      document.body.style.color = prevBodyColor
      if (hadDark) htmlEl.classList.add('dark')
    }
  }, [])

  // ── navbar hide on scroll ──────────────────────────────────────────────────
  const [navHidden, setNavHidden] = useState(false)
  useEffect(() => {
    let last = 0
    const onScroll = () => {
      const cur = window.scrollY
      setNavHidden(cur > last && cur > 80)
      last = cur
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ── hero number counting animation ────────────────────────────────────────
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(heroScroll, [0, 1], ['0%', '25%'])
  const heroOpacity = useTransform(heroScroll, [0, 0.7], [1, 0])

  const [inflationCount, setInflationCount] = useState(0)
  useEffect(() => {
    let raf: number
    const start = performance.now()
    const duration = 3200
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setInflationCount(Math.round(eased * 20))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    const delay = setTimeout(() => {
      raf = requestAnimationFrame(step)
    }, 600)
    return () => { clearTimeout(delay); cancelAnimationFrame(raf) }
  }, [])

  return (
    <div
      className="bg-offwhite text-graphite font-sans antialiased overflow-x-hidden"
      style={{ backgroundColor: '#F5F3EE', color: '#111111', fontFamily: '"Plus Jakarta Sans", sans-serif' }}
    >
      {/* ── noise overlay ─────────────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.035] mix-blend-overlay">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <filter id="noiseV">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseV)" />
        </svg>
      </div>

      {/* ── navbar ────────────────────────────────────────────────────────── */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-40"
        style={{
          background: 'rgba(245,243,238,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(17,17,17,0.08)',
        }}
        animate={{ y: navHidden ? '-110%' : '0%' }}
        transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 h-16 flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <img src="/basket_logo.png" alt="Basket" className="h-7 w-7" />
            <span className="font-sans font-bold tracking-tight text-graphite text-sm">
              Basket{' '}
              <span className="font-mono text-[9px] text-graphite/40 font-normal tracking-wider">(Beta)</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8 font-mono text-xs text-graphite/50">
            {[
              { label: 'Basket AI', href: '/basket-ai' },
              { label: 'Vision', href: '/vision' },
              { label: 'Comment ça marche', href: '/comment-ca-marche' },
              { label: 'Carte', href: '/carte' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`hover:text-signal transition-colors duration-200 py-1 border-b border-transparent hover:border-signal${link.href === '/vision' ? ' text-signal border-signal' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <Link href="/login" className="flex-shrink-0">
            <motion.button
              className="relative overflow-hidden rounded-xl bg-signal text-graphite px-5 py-2 font-sans text-xs font-semibold uppercase tracking-wider group"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.2 }}
            >
              <span className="absolute inset-0 bg-graphite translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]" />
              <span className="relative z-10 group-hover:text-signal transition-colors duration-500">
                Se connecter
              </span>
            </motion.button>
          </Link>
        </div>
      </motion.nav>

      {/* ══════════════════════════ HERO ══════════════════════════════════════ */}
      <header
        ref={heroRef}
        className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden pt-16"
        style={{ backgroundColor: '#F5F3EE' }}
      >
        {/* subtle dot grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(17,17,17,0.12) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <motion.div
          className="relative z-10 max-w-5xl mx-auto px-6 md:px-8 text-center flex flex-col items-center"
          style={{ y: heroY, opacity: heroOpacity }}
        >
          {/* overline */}
          <motion.div
            className="inline-flex items-center gap-2 font-mono text-xs text-graphite/50 uppercase tracking-wider border border-graphite/15 rounded-full px-4 py-1.5 mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Sparkles size={12} className="text-signal" />
            Notre vision
          </motion.div>

          {/* main headline */}
          <motion.h1
            className="font-sans font-extrabold tracking-tighter text-graphite leading-[0.9] text-[13vw] md:text-[7.5vw] mb-6"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            Payer le juste prix,
          </motion.h1>
          <motion.h1
            className="font-sans font-extrabold tracking-tighter leading-[0.9] text-[12vw] md:text-[7vw] mb-10"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            ça ne devrait pas être{' '}
            <span className="text-signal">un luxe.</span>
          </motion.h1>

          {/* sub */}
          <motion.p
            className="font-mono text-sm md:text-base text-graphite/55 max-w-xl mb-14 leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            L&apos;inflation a changé la façon dont les Français font leurs courses.
            Basket est né pour que chacun puisse défendre son budget — sans effort, sans expertise.
          </motion.p>

          {/* animated inflation badge */}
          <motion.div
            className="flex items-center gap-4 bg-graphite text-paper rounded-[1.5rem] px-6 py-4 shadow-xl"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <div className="flex flex-col items-center">
              <span className="font-sans text-4xl font-extrabold tracking-tighter text-signal leading-none">
                +{inflationCount}%
              </span>
              <span className="font-mono text-[10px] text-paper/40 uppercase tracking-wider mt-1">
                d&apos;inflation
              </span>
            </div>
            <div className="w-px h-12 bg-paper/15" />
            <p className="font-mono text-xs text-paper/60 max-w-[180px] leading-relaxed">
              Les prix alimentaires ont augmenté de{' '}
              <span className="text-signal font-bold">20 % depuis 2021</span>
            </p>
          </motion.div>
        </motion.div>

        {/* scroll cue */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
        >
          <span className="font-mono text-[10px] text-graphite/30 uppercase tracking-wider">Défiler</span>
          <motion.div
            className="w-px h-10 bg-graphite/20 origin-top"
            animate={{ scaleY: [0, 1, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </header>

      {/* ══════════════════════════ PROBLEM ═══════════════════════════════════ */}
      <section
        className="relative py-24 md:py-[18vh] px-6 md:px-[5vw] bg-graphite rounded-[2rem] md:rounded-[3rem] mx-2 md:mx-[2vw] my-4 md:my-[5vh] text-paper overflow-hidden"
        id="problem"
      >
        {/* grid texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg,#E8E4DD,#E8E4DD 1px,transparent 1px,transparent 60px),repeating-linear-gradient(90deg,#E8E4DD,#E8E4DD 1px,transparent 1px,transparent 60px)',
          }}
        />
        {/* radial glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none opacity-10"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, #7ed957 0%, transparent 70%)' }}
        />

        <div className="relative z-10 max-w-6xl mx-auto">
          <FadeUp>
            <span className="font-mono text-xs text-paper/40 uppercase tracking-wider border border-paper/10 px-4 py-1.5 rounded-full">
              Le problème
            </span>
          </FadeUp>

          <FadeUp delay={0.1} className="mt-8 mb-16 md:mb-[10vh]">
            <h2 className="font-sans font-extrabold tracking-tighter text-paper leading-[0.9] text-4xl md:text-[5.5vw]">
              L&apos;inflation alimentaire
              <br />
              <span className="text-signal">frappe les ménages français.</span>
            </h2>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <StatBlock
              prefix="+"
              target={20}
              suffix="%"
              label="Augmentation des prix alimentaires depuis 2021"
              delay={0}
            />
            <StatBlock
              prefix="1 famille sur "
              target={3}
              label="surveille activement son budget courses chaque semaine"
              delay={0.12}
            />
            <StatBlock
              prefix="€"
              target={2400}
              label="dépensés en moyenne par foyer et par an en courses alimentaires"
              delay={0.24}
            />
          </div>

          <FadeUp delay={0.3} className="mt-12 md:mt-[8vh]">
            <p className="font-mono text-sm text-paper/50 max-w-2xl leading-relaxed">
              Pourtant, pour un même article, l&apos;écart de prix entre deux enseignes peut dépasser{' '}
              <span className="text-signal">30 %</span>. Cette information existe. Elle est simplement inaccessible.
              Basket la rend visible.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ══════════════════════════ OUR ANSWER ════════════════════════════════ */}
      <section className="py-24 md:py-[18vh] px-6 md:px-[5vw]" id="answer">
        <div className="max-w-6xl mx-auto">
          <FadeUp>
            <span className="font-mono text-xs text-graphite/50 uppercase tracking-wider border border-graphite/15 px-4 py-1.5 rounded-full">
              Notre réponse
            </span>
          </FadeUp>

          <FadeUp delay={0.1} className="mt-8 mb-4">
            <h2 className="font-sans font-extrabold tracking-tighter text-graphite leading-[0.9] text-4xl md:text-[5.5vw]">
              Basket est notre réponse.
            </h2>
          </FadeUp>

          <FadeUp delay={0.18} className="mb-16 md:mb-[10vh]">
            <p className="font-mono text-sm text-graphite/55 max-w-xl leading-relaxed mt-4">
              Quatre principes non-négociables qui guident chaque décision de produit.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {principles.map((p, i) => {
              const Icon = p.icon
              const ref = useRef<HTMLDivElement>(null)
              const inView = useInView(ref, { once: true, margin: '-60px' })
              return (
                <motion.div
                  key={p.title}
                  ref={ref}
                  className="group bg-paper rounded-[2rem] p-8 border border-graphite/10 flex flex-col gap-5 hover:border-signal/40 transition-colors duration-500 relative overflow-hidden"
                  initial={{ opacity: 0, y: 56 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.75, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="absolute inset-0 bg-signal opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500 pointer-events-none rounded-[2rem]" />
                  <div className="w-10 h-10 rounded-xl bg-signal/15 flex items-center justify-center group-hover:bg-signal/25 transition-colors duration-300">
                    <Icon size={18} className="text-signal" />
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-xl tracking-tight text-graphite mb-2">{p.title}</h3>
                    <p className="font-mono text-xs text-graphite/55 leading-relaxed">{p.desc}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════ ROADMAP ═══════════════════════════════════ */}
      <section
        className="py-24 md:py-[18vh] px-6 md:px-[5vw] bg-paper rounded-[2rem] md:rounded-[3rem] mx-2 md:mx-[2vw] my-4 md:my-[5vh] overflow-hidden"
        id="roadmap"
      >
        <div className="max-w-6xl mx-auto">
          <FadeUp>
            <span className="font-mono text-xs text-graphite/50 uppercase tracking-wider border border-graphite/15 px-4 py-1.5 rounded-full">
              Feuille de route
            </span>
          </FadeUp>
          <FadeUp delay={0.1} className="mt-8 mb-14 md:mb-[10vh]">
            <h2 className="font-sans font-extrabold tracking-tighter text-graphite leading-[0.9] text-4xl md:text-[5.5vw]">
              Ce que nous
              <br />
              <span className="text-signal">construisons.</span>
            </h2>
          </FadeUp>

          {/* vertical timeline on desktop, stacked on mobile */}
          <div className="relative">
            {/* connector line — desktop only */}
            <div className="hidden md:block absolute left-[2.25rem] top-6 bottom-6 w-px bg-graphite/10" />

            <div className="flex flex-col gap-0">
              {phases.map((phase, i) => {
                const Icon = phase.icon
                const ref = useRef<HTMLDivElement>(null)
                const inView = useInView(ref, { once: true, margin: '-60px' })
                const isDone = phase.status === 'done'
                const isProgress = phase.status === 'progress'

                return (
                  <motion.div
                    key={phase.num}
                    ref={ref}
                    className="relative flex gap-6 md:gap-8 py-8 md:py-10 group"
                    style={{ borderBottom: i < phases.length - 1 ? '1px solid rgba(17,17,17,0.07)' : 'none' }}
                    initial={{ opacity: 0, x: -40 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {/* icon dot */}
                    <div
                      className={`relative z-10 flex-shrink-0 w-[4.5rem] h-[4.5rem] rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ${
                        isDone
                          ? 'bg-signal text-graphite'
                          : isProgress
                          ? 'bg-signal/20 text-signal border border-signal/40'
                          : 'bg-graphite/6 text-graphite/30 border border-graphite/10'
                      }`}
                    >
                      <Icon size={22} />
                    </div>

                    {/* content */}
                    <div className="flex-1 flex flex-col md:flex-row md:items-center gap-3 md:gap-8">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-[10px] text-graphite/30 uppercase tracking-wider">
                            Phase {phase.num}
                          </span>
                          {isDone && (
                            <span className="font-mono text-[10px] text-signal bg-signal/10 border border-signal/20 rounded-full px-2.5 py-0.5 uppercase tracking-wider">
                              Disponible
                            </span>
                          )}
                          {isProgress && (
                            <span className="font-mono text-[10px] text-signal bg-signal/10 border border-signal/30 rounded-full px-2.5 py-0.5 uppercase tracking-wider flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse inline-block" />
                              En cours
                            </span>
                          )}
                          {phase.status === 'coming' && (
                            <span className="font-mono text-[10px] text-graphite/40 bg-graphite/5 border border-graphite/10 rounded-full px-2.5 py-0.5 uppercase tracking-wider flex items-center gap-1">
                              <Clock size={9} />
                              Bientôt
                            </span>
                          )}
                          {phase.status === 'future' && (
                            <span className="font-mono text-[10px] text-graphite/30 bg-graphite/5 border border-graphite/8 rounded-full px-2.5 py-0.5 uppercase tracking-wider">
                              À venir
                            </span>
                          )}
                        </div>
                        <h3
                          className={`font-sans font-bold text-xl md:text-2xl tracking-tight mb-1 ${
                            isDone ? 'text-graphite' : isProgress ? 'text-graphite' : 'text-graphite/40'
                          }`}
                        >
                          {phase.title}
                        </h3>
                        <p className="font-mono text-xs text-graphite/50 leading-relaxed max-w-lg">
                          {phase.desc}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════ TEAM / VALUES ═════════════════════════════ */}
      <section
        className="py-24 md:py-[18vh] px-6 md:px-[5vw] bg-graphite rounded-[2rem] md:rounded-[3rem] mx-2 md:mx-[2vw] my-4 md:my-[5vh] text-paper overflow-hidden relative"
        id="values"
      >
        {/* grid texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg,#E8E4DD,#E8E4DD 1px,transparent 1px,transparent 60px),repeating-linear-gradient(90deg,#E8E4DD,#E8E4DD 1px,transparent 1px,transparent 60px)',
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto">
          {/* big quote */}
          <FadeUp className="mb-16 md:mb-[12vh]">
            <div className="flex items-start gap-3 mb-6">
              {/* French flag strip */}
              <div className="flex h-10 w-7 rounded overflow-hidden flex-shrink-0 mt-1">
                <div className="flex-1 bg-[#002395]" />
                <div className="flex-1 bg-white" />
                <div className="flex-1 bg-[#ED2939]" />
              </div>
              <span className="font-mono text-xs text-paper/40 uppercase tracking-wider pt-2.5">
                Fait en France, pour les Français
              </span>
            </div>

            <motion.blockquote
              className="font-sans font-extrabold tracking-tighter text-paper leading-[0.88] text-4xl md:text-[5.5vw]"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              &ldquo;L&apos;accès à l&apos;information sur les prix est un droit,
              <br />
              pas un <span className="text-signal">privilège.</span>&rdquo;
            </motion.blockquote>
          </FadeUp>

          {/* values */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-paper/10 border border-paper/10 rounded-[2rem] overflow-hidden">
            {values.map((v, i) => {
              const ref = useRef<HTMLDivElement>(null)
              const inView = useInView(ref, { once: true, margin: '-40px' })
              return (
                <motion.div
                  key={v.label}
                  ref={ref}
                  className="bg-graphite p-8 md:p-10 flex flex-col gap-3 group hover:bg-paper/5 transition-colors duration-500"
                  initial={{ opacity: 0, y: 40 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="w-6 h-px bg-signal mb-2 group-hover:w-12 transition-all duration-500" />
                  <h3 className="font-sans font-bold text-lg tracking-tight text-paper">{v.label}</h3>
                  <p className="font-mono text-xs text-paper/50 leading-relaxed">{v.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════ CTA ═══════════════════════════════════════ */}
      <section
        className="py-24 md:py-[20vh] px-6 md:px-[5vw] flex flex-col items-center justify-center text-center relative overflow-hidden"
        id="cta"
      >
        {/* radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(126,217,87,0.08) 0%, transparent 70%)',
          }}
        />

        <FadeUp className="relative z-10 flex flex-col items-center">
          <span className="font-mono text-xs text-graphite/50 uppercase tracking-wider border border-graphite/15 px-4 py-1.5 rounded-full mb-8">
            Rejoignez le mouvement
          </span>

          <h2 className="font-sans font-extrabold tracking-tighter text-graphite leading-[0.88] text-5xl md:text-[7vw] mb-6">
            Rejoignez le
            <br />
            <span className="text-signal">mouvement.</span>
          </h2>

          <p className="font-mono text-sm text-graphite/50 max-w-md mb-10 leading-relaxed">
            Des milliers de Français utilisent déjà Basket pour payer moins cher leurs courses chaque semaine.
            C&apos;est gratuit, sans carte de crédit, sans abonnement.
          </p>

          <Link href="/login">
            <motion.button
              className="relative overflow-hidden rounded-[2rem] bg-signal text-graphite px-8 py-4 font-sans text-sm font-bold uppercase tracking-tight group flex items-center gap-3"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.2 }}
            >
              <span className="absolute inset-0 bg-graphite translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]" />
              <span className="relative z-10 group-hover:text-signal transition-colors duration-500 flex items-center gap-3">
                Commencer gratuitement
                <ArrowRight size={16} />
              </span>
            </motion.button>
          </Link>

          <p className="font-mono text-[10px] text-graphite/30 mt-5 uppercase tracking-wider">
            Gratuit · Sans CB · Depuis le navigateur
          </p>
        </FadeUp>
      </section>

      {/* ══════════════════════════ FOOTER ════════════════════════════════════ */}
      <footer className="bg-graphite text-paper rounded-t-[2rem] md:rounded-t-[4rem] mt-4 md:mt-[5vh] pt-16 md:pt-[15vh] pb-8 md:pb-[5vh] px-6 md:px-[5vw] relative overflow-hidden">
        {/* grid texture */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="footerGridV" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E8E4DD" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#footerGridV)" />
          </svg>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[10vw] relative z-10">
          <div>
            <h2 className="font-sans text-[10vw] md:text-[6vw] font-extrabold tracking-tighter uppercase leading-none text-paper flex items-center gap-[1vw]">
              <img src="/basket_logo.png" alt="Basket" className="h-[10vw] w-[10vw] md:h-[6vw] md:w-[6vw]" />
              Basket{' '}
              <span className="font-mono text-xs md:text-[14px] text-paper/40 font-normal tracking-wider normal-case">
                (Beta)
              </span>
            </h2>
            <p className="font-mono text-xs text-paper/40 mt-[3vh] max-w-xs leading-relaxed">
              Le chemin le plus court vers les économies. Scannez, comparez, économisez — chaque semaine.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-[8vw] mt-[4vh] md:mt-0">
            <ul className="space-y-[2vh] font-mono text-xs text-paper/60">
              <li>
                <Link href="/login" className="hover:text-signal transition-colors">
                  Créer un compte
                </Link>
              </li>
              <li>
                <Link href="/basket-ai" className="hover:text-signal transition-colors">
                  Basket AI
                </Link>
              </li>
              <li>
                <Link href="/comment-ca-marche" className="hover:text-signal transition-colors">
                  Comment ça marche
                </Link>
              </li>
              <li>
                <Link href="/vision" className="hover:text-signal transition-colors text-signal">
                  Vision
                </Link>
              </li>
            </ul>
            <ul className="space-y-[2vh] font-mono text-xs text-paper/60">
              <li>
                <Link href="/carte" className="hover:text-signal transition-colors">
                  Carte des prix
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-signal transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-signal transition-colors">
                  Politique de confidentialité
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-signal transition-colors">
                  {"Conditions d'utilisation"}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 md:mt-[20vh] flex justify-between items-end border-t border-paper/10 pt-8 md:pt-[5vh] relative z-10">
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
