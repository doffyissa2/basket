'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import {
  Camera,
  ScanLine,
  GitMerge,
  BarChart2,
  ArrowRight,
  Cpu,
  Database,
  Layers,
  Zap,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react'

// ─── Animated counter hook ─────────────────────────────────────────────────────
function useCountUp(target: number, duration = 2, inView = false) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!inView) return
    const controls = animate(0, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setValue(Math.round(v)),
    })
    return () => controls.stop()
  }, [inView, target, duration])
  return value
}

// ─── Particle dot (floating bg) ────────────────────────────────────────────────
function Particle({ x, y, delay, size }: { x: number; y: number; delay: number; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-signal pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
      animate={{ y: [0, -24, 0], opacity: [0.12, 0.45, 0.12] }}
      transition={{ duration: 5 + delay, repeat: Infinity, delay, ease: 'easeInOut' }}
    />
  )
}

// ─── Animated scan line component ──────────────────────────────────────────────
function ScanningReceipt() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Receipt body */}
      <div className="relative w-48 bg-white rounded-2xl shadow-2xl overflow-hidden border border-graphite/5 p-4">
        {/* Animated scan line */}
        <motion.div
          className="absolute left-0 w-full h-[2px] z-10"
          style={{ background: 'linear-gradient(90deg, transparent, #7ed957, transparent)', boxShadow: '0 0 16px rgba(126,217,87,0.7)' }}
          animate={{ top: ['8%', '90%', '8%'] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="text-center mb-3 border-b border-dashed border-graphite/15 pb-3">
          <p className="font-mono text-[9px] text-graphite/40 uppercase tracking-wider">Carrefour Market</p>
          <p className="font-mono text-[8px] text-graphite/25 mt-0.5">08/04/2026 — 14:32</p>
        </div>
        <div className="space-y-2 font-mono text-[9px]">
          {[
            { label: 'Lait demi-écrémé 1L', price: '1,15 €' },
            { label: 'Beurre Président 250g', price: '2,49 €' },
            { label: 'Pâtes Barilla 500g', price: '1,29 €' },
            { label: 'Oeufs x12', price: '3,45 €' },
            { label: 'Eau Cristaline 6×1.5L', price: '2,49 €' },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              className="flex justify-between"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.15, duration: 0.4 }}
            >
              <span className="text-graphite/60 truncate pr-2">{item.label}</span>
              <span className="text-graphite font-semibold flex-shrink-0">{item.price}</span>
            </motion.div>
          ))}
        </div>
        <div className="mt-3 pt-2.5 border-t border-dashed border-graphite/15 flex justify-between font-sans text-[10px] font-bold">
          <span>TOTAL</span><span>10,87 €</span>
        </div>
      </div>
    </div>
  )
}

// ─── Interactive demo receipt item ─────────────────────────────────────────────
type DemoItem = { label: string; paid: string; best: string; store: string; saving: string }

const demoItems: DemoItem[] = [
  { label: 'Lait demi-écrémé 1L', paid: '1,15 €', best: '0,89 €', store: 'Lidl', saving: '−0,26 €' },
  { label: 'Beurre Président 250g', paid: '2,49 €', best: '1,85 €', store: 'Aldi', saving: '−0,64 €' },
  { label: 'Pâtes Barilla 500g', paid: '1,29 €', best: '0,99 €', store: 'Leclerc', saving: '−0,30 €' },
  { label: 'Oeufs x12 Label Rouge', paid: '3,45 €', best: '2,95 €', store: 'Intermarché', saving: '−0,50 €' },
  { label: 'Eau Cristaline 6×1.5L', paid: '2,49 €', best: '1,69 €', store: 'Leclerc', saving: '−0,80 €' },
]

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function BasketAIPage() {
  // Section refs for inView
  const stepsRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const demoRef = useRef<HTMLDivElement>(null)
  const techRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)

  const stepsInView = useInView(stepsRef, { once: true, margin: '-80px' })
  const statsInView = useInView(statsRef, { once: true, margin: '-80px' })
  const demoInView = useInView(demoRef, { once: true, margin: '-80px' })
  const techInView = useInView(techRef, { once: true, margin: '-80px' })
  const ctaInView = useInView(ctaRef, { once: true, margin: '-80px' })

  // Demo state
  const [demoPhase, setDemoPhase] = useState<'scan' | 'parse' | 'compare'>('scan')
  const [visibleItems, setVisibleItems] = useState(0)

  useEffect(() => {
    if (!demoInView) return
    // Phase 1 — scan (1.5s)
    const t1 = setTimeout(() => setDemoPhase('parse'), 1500)
    // Phase 2 — reveal items one by one
    const timers: ReturnType<typeof setTimeout>[] = [t1]
    demoItems.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleItems(i + 1), 1500 + (i + 1) * 400))
    })
    // Phase 3 — compare prices
    timers.push(setTimeout(() => setDemoPhase('compare'), 1500 + demoItems.length * 400 + 600))
    return () => timers.forEach(clearTimeout)
  }, [demoInView])

  // Stat counters
  const stat1 = useCountUp(97, 2, statsInView)
  const stat2 = useCountUp(2, 1.5, statsInView)
  const stat3 = useCountUp(15, 1.8, statsInView)
  const stat4 = useCountUp(40, 2, statsInView)

  // Particle positions (stable, not re-randomised on render)
  const particles = useRef([
    { x: 8, y: 15, delay: 0, size: 4 },
    { x: 22, y: 70, delay: 1.2, size: 3 },
    { x: 60, y: 30, delay: 0.5, size: 5 },
    { x: 75, y: 80, delay: 2, size: 3 },
    { x: 90, y: 20, delay: 0.8, size: 4 },
    { x: 45, y: 60, delay: 1.6, size: 3 },
    { x: 15, y: 45, delay: 2.4, size: 2 },
    { x: 85, y: 55, delay: 0.3, size: 5 },
    { x: 35, y: 10, delay: 1.9, size: 3 },
    { x: 68, y: 88, delay: 0.7, size: 4 },
    { x: 50, y: 95, delay: 3.1, size: 2 },
    { x: 5, y: 85, delay: 2.7, size: 3 },
  ])

  // How AI works — steps
  const steps = [
    {
      num: '01',
      icon: Camera,
      title: 'Vous photographiez votre ticket',
      desc: 'Un simple cliché depuis votre téléphone suffit. Notre système accepte même les tickets froissés, mal éclairés ou partiellement découpés.',
      visual: (
        <div className="relative flex items-center justify-center h-40">
          <motion.div
            className="w-16 h-16 rounded-2xl bg-signal/10 border border-signal/30 flex items-center justify-center"
            animate={{ scale: [1, 1.08, 1], rotate: [0, -3, 3, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Camera className="w-7 h-7 text-signal" />
          </motion.div>
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border border-signal/20"
              style={{ width: 64 + i * 28, height: 64 + i * 28 }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.5, ease: 'easeOut' }}
            />
          ))}
        </div>
      ),
    },
    {
      num: '02',
      icon: ScanLine,
      title: 'Claude Vision extrait chaque article, prix et quantité',
      desc: 'Le modèle Claude Vision d\'Anthropic analyse l\'image et reconnaît chaque ligne du ticket avec une précision de 97%.',
      visual: (
        <div className="relative flex items-center justify-center h-40">
          <div className="relative w-28 h-32 bg-white rounded-xl border border-graphite/10 shadow-lg overflow-hidden">
            <motion.div
              className="absolute left-0 w-full h-[2px] bg-signal z-10"
              style={{ boxShadow: '0 0 10px rgba(126,217,87,0.8)' }}
              animate={{ top: ['5%', '90%', '5%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            {['Article 1', 'Article 2', 'Article 3', 'Article 4'].map((_, i) => (
              <motion.div
                key={i}
                className="mx-2 my-1.5 h-2 rounded-full bg-graphite/10"
                style={{ width: `${60 + (i % 3) * 12}%` }}
                animate={{ backgroundColor: ['rgba(17,17,17,0.1)', 'rgba(126,217,87,0.4)', 'rgba(17,17,17,0.1)'] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
              />
            ))}
          </div>
          <motion.div
            className="absolute top-2 right-8 font-mono text-[9px] text-signal bg-graphite/90 rounded px-1.5 py-0.5"
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          >
            [EXTRACT]
          </motion.div>
        </div>
      ),
    },
    {
      num: '03',
      icon: GitMerge,
      title: 'Notre algorithme retrouve le même produit dans 15 enseignes',
      desc: 'La correspondance floue pg_trgm compare chaque article avec 40 000+ références, même quand les noms varient d\'un distributeur à l\'autre.',
      visual: (
        <div className="relative flex items-center justify-center h-40">
          <div className="flex flex-col items-center gap-2">
            <motion.div
              className="w-24 h-6 rounded-full bg-signal/20 border border-signal/40 flex items-center justify-center font-mono text-[9px] text-signal"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Lait demi-écrémé
            </motion.div>
            <div className="flex gap-3 mt-1">
              {['Lidl', 'Aldi', 'Leclerc'].map((s, i) => (
                <motion.div
                  key={s}
                  className="w-14 h-5 rounded-full bg-offwhite border border-graphite/20 flex items-center justify-center font-mono text-[8px] text-graphite/50"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.3, duration: 0.5, repeat: Infinity, repeatDelay: 2.5 }}
                >
                  {s}
                </motion.div>
              ))}
            </div>
            <div className="flex gap-3">
              {['0,89 €', '0,95 €', '0,79 €'].map((p, i) => (
                <motion.div
                  key={p}
                  className="w-14 h-5 rounded bg-signal/10 flex items-center justify-center font-mono text-[8px] text-signal font-semibold"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 + i * 0.3, duration: 0.4, repeat: Infinity, repeatDelay: 2.5 }}
                >
                  {p}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      num: '04',
      icon: BarChart2,
      title: 'Vous voyez où vous pourriez économiser',
      desc: 'Un rapport clair, article par article, avec le meilleur prix trouvé et le magasin correspondant — directement sur votre téléphone.',
      visual: (
        <div className="flex items-end justify-center gap-2 h-40 pb-4">
          {[
            { store: 'Carrefour', pct: 100, color: 'bg-graphite/20' },
            { store: 'Monoprix', pct: 88, color: 'bg-graphite/20' },
            { store: 'Lidl', pct: 55, color: 'bg-signal' },
            { store: 'Aldi', pct: 65, color: 'bg-graphite/20' },
            { store: 'Leclerc', pct: 72, color: 'bg-graphite/20' },
          ].map((bar, i) => (
            <div key={bar.store} className="flex flex-col items-center gap-1">
              <motion.div
                className={`w-8 rounded-t-md ${bar.color}`}
                style={{ height: 0 }}
                animate={stepsInView ? { height: `${bar.pct * 0.72}px` } : { height: 0 }}
                transition={{ duration: 0.8, delay: 0.4 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              />
              <span className="font-mono text-[7px] text-graphite/40 text-center leading-none">{bar.store}</span>
            </div>
          ))}
        </div>
      ),
    },
  ]

  return (
    <div
      className="bg-offwhite text-graphite font-sans antialiased overflow-x-hidden"
      style={{ backgroundColor: '#F5F3EE', color: '#111111', fontFamily: '"Plus Jakarta Sans", sans-serif' }}
    >
      {/* Noise overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.035] mix-blend-overlay">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <filter id="aiNoise">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#aiNoise)" />
        </svg>
      </div>

      {/* ==================== NAVBAR ==================== */}
      <nav
        className="fixed top-0 left-0 right-0 z-40"
        style={{ background: 'rgba(245,243,238,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(17,17,17,0.08)' }}
      >
        <div className="max-w-[1400px] mx-auto px-8 h-16 flex items-center justify-between gap-8">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5 flex-shrink-0">
            {/* Inline SVG basket logo placeholder */}
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="28" height="28" rx="8" fill="#7ed957" />
              <path d="M7 11h14l-2 9H9L7 11z" stroke="#111" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
              <path d="M10 11L12 7M18 11L16 7" stroke="#111" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="font-sans font-bold tracking-tight text-graphite text-sm">
              Basket{' '}
              <span className="font-mono text-[9px] text-graphite/40 font-normal tracking-wider">(Beta)</span>
            </span>
          </a>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8 font-mono text-xs text-graphite/50">
            <a href="/basket-ai" className="text-graphite border-b border-graphite transition-colors duration-200 py-1">
              Basket AI
            </a>
            <a href="/vision" className="hover:text-signal transition-colors duration-200 py-1 border-b border-transparent hover:border-signal">
              Vision
            </a>
            <a href="/comment-ca-marche" className="hover:text-signal transition-colors duration-200 py-1 border-b border-transparent hover:border-signal">
              Comment ça marche
            </a>
            <a href="/carte" className="hover:text-signal transition-colors duration-200 py-1 border-b border-transparent hover:border-signal">
              Carte
            </a>
          </div>

          {/* CTA */}
          <a href="/login" className="flex-shrink-0">
            <button className="relative overflow-hidden rounded-xl bg-signal text-graphite px-5 py-2 font-sans text-xs font-semibold uppercase tracking-wider group transition-transform duration-300 hover:scale-[1.03]">
              <span className="absolute inset-0 bg-graphite translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]" />
              <span className="relative z-10 group-hover:text-signal transition-colors duration-500">Se connecter</span>
            </button>
          </a>
        </div>
      </nav>

      {/* ==================== HERO ==================== */}
      <header className="relative h-[100dvh] overflow-hidden pt-16 flex items-center">
        {/* Particle dots */}
        <div className="absolute inset-0 pointer-events-none">
          {particles.current.map((p, i) => (
            <Particle key={i} {...p} />
          ))}
        </div>

        {/* Large background number */}
        <motion.span
          className="absolute left-0 bottom-0 font-mono font-extrabold text-graphite/[0.04] leading-none select-none pointer-events-none"
          style={{ fontSize: 'clamp(8rem, 30vw, 28rem)' }}
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          01
        </motion.span>

        <div className="relative z-10 max-w-[1400px] mx-auto px-8 w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left — text */}
          <div>
            {/* Label */}
            <motion.div
              className="inline-flex items-center gap-2 border border-graphite/15 rounded-full px-4 py-1.5 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="w-2 h-2 rounded-full bg-signal animate-pulse" />
              <span className="font-mono text-xs text-graphite/50 uppercase tracking-widest">Basket AI</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="font-sans font-extrabold tracking-tighter text-graphite leading-[0.9] mb-6"
              style={{ fontSize: 'clamp(2.6rem, 6vw, 6rem)' }}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              L&apos;intelligence<br />artificielle qui<br />
              <span className="text-signal">lit vos courses.</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="font-mono text-sm text-graphite/55 max-w-md leading-relaxed mb-10"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              Photographiez votre ticket. En moins de 2 secondes, notre IA extrait chaque article et compare les prix dans 15 enseignes françaises.
            </motion.p>

            {/* CTA */}
            <motion.div
              className="flex items-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <a href="/login">
                <button className="relative overflow-hidden rounded-2xl bg-signal text-graphite px-7 py-3.5 font-sans text-sm font-bold uppercase tracking-wide group transition-transform duration-300 hover:scale-105 flex items-center gap-2.5">
                  <span className="absolute inset-0 bg-graphite translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]" />
                  <span className="relative z-10 group-hover:text-signal transition-colors duration-500 flex items-center gap-2.5">
                    Essayer maintenant
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
              </a>
              <span className="font-mono text-xs text-graphite/35">Gratuit · Sans CB</span>
            </motion.div>
          </div>

          {/* Right — floating receipt card */}
          <motion.div
            className="hidden md:flex items-center justify-center"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              animate={{ y: [0, -18, 0], rotateY: [0, 6, 0], rotateX: [4, 0, 4] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
            >
              {/* Receipt card */}
              <div className="w-72 bg-white rounded-3xl shadow-[0_30px_80px_-20px_rgba(17,17,17,0.2)] p-6 relative overflow-hidden border border-graphite/5">
                {/* Animated scan line */}
                <motion.div
                  className="absolute left-0 w-full h-[2px] z-10"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(126,217,87,0.8), transparent)', boxShadow: '0 0 20px rgba(126,217,87,0.6)' }}
                  animate={{ top: ['8%', '88%', '8%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* Header */}
                <div className="text-center mb-4 border-b border-dashed border-graphite/15 pb-4">
                  <p className="font-mono text-[10px] text-graphite/40 uppercase tracking-wider">Carrefour Market</p>
                  <p className="font-mono text-[8px] text-graphite/25 mt-1">08/04/2026 — 14:32 — Caisse #07</p>
                </div>

                {/* Items */}
                <div className="space-y-2 font-mono text-xs">
                  {[
                    { name: 'Lait demi-écrémé 1L', price: '1,15 €', delay: 0 },
                    { name: 'Beurre Président 250g', price: '2,49 €', delay: 0.3 },
                    { name: 'Pain de mie 500g', price: '1,65 €', delay: 0.6 },
                    { name: 'Pâtes Barilla 500g', price: '1,29 €', delay: 0.9 },
                    { name: 'Oeufs x12', price: '3,45 €', delay: 1.2 },
                    { name: 'Eau Cristaline 6×1.5L', price: '2,49 €', delay: 1.5 },
                  ].map((item) => (
                    <motion.div
                      key={item.name}
                      className="flex justify-between"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 4, repeat: Infinity, delay: item.delay, ease: 'easeInOut' }}
                    >
                      <span className="text-graphite/65 truncate pr-2">{item.name}</span>
                      <span className="text-graphite font-semibold flex-shrink-0">{item.price}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Total */}
                <div className="mt-4 pt-3 border-t border-dashed border-graphite/15 flex justify-between font-sans text-sm font-bold">
                  <span>TOTAL</span>
                  <span>12,52 €</span>
                </div>

                {/* Basket badge */}
                <div className="mt-3 bg-signal/10 border border-signal/20 rounded-xl p-2.5 text-center">
                  <p className="font-sans text-[11px] font-bold text-signal flex items-center justify-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="8" fill="#7ed957" /><path d="M7 11h14l-2 9H9L7 11z" stroke="#111" strokeWidth="1.5" strokeLinejoin="round" fill="none" /><path d="M10 11L12 7M18 11L16 7" stroke="#111" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    Basket : économisez 3,40 € chez Lidl
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <span className="font-mono text-[10px] text-graphite/30 uppercase tracking-widest">Défiler</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
            <ChevronDown className="w-4 h-4 text-graphite/30" />
          </motion.div>
        </motion.div>
      </header>

      {/* ==================== HOW AI WORKS (step-by-step) ==================== */}
      <section
        ref={stepsRef}
        className="py-24 md:py-36 px-5 md:px-[5vw] bg-paper"
      >
        <div className="max-w-[1400px] mx-auto">
          {/* Section label */}
          <motion.div
            className="mb-16 md:mb-24"
            initial={{ opacity: 0, y: 30 }}
            animate={stepsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="font-mono text-xs text-graphite/40 uppercase tracking-widest border border-graphite/15 px-4 py-1.5 rounded-full">Comment ça marche</span>
            <h2
              className="font-sans font-extrabold tracking-tighter text-graphite leading-none mt-6"
              style={{ fontSize: 'clamp(2.4rem, 5.5vw, 5.5rem)' }}
            >
              4 étapes,{' '}
              <span className="text-signal">une magie.</span>
            </h2>
          </motion.div>

          {/* Steps grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                className="bg-offwhite rounded-3xl p-8 border border-graphite/8 flex flex-col gap-6 group hover:border-signal/30 transition-colors duration-500"
                initial={{ opacity: 0, y: 50 }}
                animate={stepsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.7, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Top row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-graphite/30 uppercase tracking-widest">{step.num}</span>
                    <div className="w-8 h-8 rounded-xl bg-signal/10 border border-signal/20 flex items-center justify-center">
                      <step.icon className="w-4 h-4 text-signal" />
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-graphite/25 uppercase tracking-wider">[IA]</span>
                </div>

                {/* Visual */}
                <div className="bg-white/60 rounded-2xl border border-graphite/6 overflow-hidden">
                  {step.visual}
                </div>

                {/* Text */}
                <div>
                  <h3 className="font-sans font-bold text-xl tracking-tight text-graphite mb-2 group-hover:text-signal transition-colors duration-300">
                    {step.title}
                  </h3>
                  <p className="font-mono text-xs text-graphite/55 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== ACCURACY STATS ==================== */}
      <section
        ref={statsRef}
        className="py-24 md:py-32 px-5 md:px-[5vw] bg-graphite relative overflow-hidden"
      >
        {/* Background glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #7ed957 0%, transparent 70%)' }}
        />

        <div className="max-w-[1400px] mx-auto relative z-10">
          <motion.p
            className="font-mono text-xs text-paper/30 uppercase tracking-widest mb-12 text-center"
            initial={{ opacity: 0 }}
            animate={statsInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6 }}
          >
            Précision & performance
          </motion.p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-1 bg-paper/5 rounded-3xl overflow-hidden border border-paper/10">
            {[
              { value: stat1, suffix: '%', label: 'Précision OCR', note: 'reconnu par article' },
              { value: stat2, suffix: 's', label: 'Temps d\'analyse', note: 'par ticket' },
              { value: stat3, suffix: '', label: 'Enseignes', note: 'comparées en temps réel' },
              { value: stat4, suffix: 'k+', label: 'Produits', note: 'dans notre base' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="p-8 md:p-10 flex flex-col justify-between bg-graphite border border-paper/5"
                initial={{ opacity: 0, y: 30 }}
                animate={statsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <div>
                  <div
                    className="font-sans font-extrabold tracking-tighter text-paper leading-none"
                    style={{ fontSize: 'clamp(2.8rem, 5vw, 5rem)' }}
                  >
                    {i === 1 ? `< ${stat.value}` : stat.value}
                    <span className="text-signal">{stat.suffix}</span>
                  </div>
                  <p className="font-sans font-bold text-base text-paper/70 mt-3">{stat.label}</p>
                </div>
                <p className="font-mono text-[10px] text-paper/30 mt-4 uppercase tracking-wide">{stat.note}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== INTERACTIVE DEMO ==================== */}
      <section
        ref={demoRef}
        className="py-24 md:py-36 px-5 md:px-[5vw] bg-graphite"
        style={{ background: '#111111' }}
      >
        <div className="max-w-[1400px] mx-auto">
          <motion.div
            className="mb-14"
            initial={{ opacity: 0, y: 30 }}
            animate={demoInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="font-mono text-xs text-paper/30 uppercase tracking-widest border border-paper/10 px-4 py-1.5 rounded-full">Démo interactive</span>
            <h2
              className="font-sans font-extrabold tracking-tighter text-paper leading-none mt-6"
              style={{ fontSize: 'clamp(2.2rem, 5vw, 5rem)' }}
            >
              Regardez l&apos;IA{' '}
              <span className="text-signal">en action.</span>
            </h2>
          </motion.div>

          {/* Demo terminal card */}
          <motion.div
            className="rounded-3xl overflow-hidden border border-paper/8"
            style={{ background: 'rgba(255,255,255,0.04)' }}
            initial={{ opacity: 0, y: 40 }}
            animate={demoInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Terminal top bar */}
            <div className="px-5 py-3 border-b border-paper/8 flex items-center gap-2.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-signal/60" />
              <span className="font-mono text-[10px] text-paper/25 ml-3 uppercase tracking-widest">basket-ai — analyse en cours</span>
              <AnimatePresence>
                {demoPhase === 'scan' && (
                  <motion.div
                    className="ml-auto flex items-center gap-1.5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full bg-signal"
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    />
                    <span className="font-mono text-[10px] text-signal uppercase tracking-wider">Scanning...</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="p-6 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Left — receipt being scanned */}
              <div className="flex flex-col gap-4">
                <p className="font-mono text-[10px] text-paper/30 uppercase tracking-widest">Ticket de caisse</p>
                <div className="relative">
                  <ScanningReceipt />
                  {/* Phase indicator */}
                  <motion.div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full mt-4 font-mono text-[10px] uppercase tracking-widest"
                    style={{ color: '#7ed957' }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    {demoPhase === 'scan' ? '[SCAN EN COURS...]' : demoPhase === 'parse' ? '[EXTRACTION...]' : '[COMPARAISON TERMINÉE]'}
                  </motion.div>
                </div>
              </div>

              {/* Right — items appearing + comparison */}
              <div className="flex flex-col gap-3">
                <p className="font-mono text-[10px] text-paper/30 uppercase tracking-widest">Résultats Basket AI</p>
                <div className="space-y-2">
                  <AnimatePresence>
                    {demoItems.slice(0, visibleItems).map((item, i) => (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="rounded-xl p-3 border border-paper/8"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-sans text-xs font-semibold text-paper/80 truncate">{item.label}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-mono text-[10px] text-paper/35 line-through">{item.paid}</span>
                              <AnimatePresence>
                                {demoPhase === 'compare' && (
                                  <motion.span
                                    className="font-mono text-[10px] text-signal font-semibold"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3, delay: i * 0.08 }}
                                  >
                                    {item.best} chez {item.store}
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                          <AnimatePresence>
                            {demoPhase === 'compare' && (
                              <motion.span
                                className="font-mono text-[10px] text-signal font-bold flex-shrink-0 bg-signal/10 border border-signal/20 rounded-lg px-2 py-0.5"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.35, delay: i * 0.08 + 0.1 }}
                              >
                                {item.saving}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Total savings */}
                  <AnimatePresence>
                    {demoPhase === 'compare' && visibleItems >= demoItems.length && (
                      <motion.div
                        className="rounded-xl p-4 border border-signal/30 bg-signal/8 mt-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-signal" />
                            <span className="font-sans text-sm font-bold text-paper">Analyse terminée</span>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-xs text-paper/50">Économies possibles</p>
                            <p className="font-sans font-extrabold text-signal text-xl tracking-tight">−2,50 €</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ==================== TECHNOLOGY STACK ==================== */}
      <section
        ref={techRef}
        className="py-24 md:py-36 px-5 md:px-[5vw] bg-offwhite"
      >
        <div className="max-w-[1400px] mx-auto">
          <motion.div
            className="mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={techInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="font-mono text-xs text-graphite/40 uppercase tracking-widest border border-graphite/15 px-4 py-1.5 rounded-full">Stack technique</span>
            <h2
              className="font-sans font-extrabold tracking-tighter text-graphite leading-none mt-6"
              style={{ fontSize: 'clamp(2.2rem, 5vw, 5rem)' }}
            >
              Construit sur{' '}
              <span className="text-signal">des bases solides.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: Cpu,
                label: 'Claude Vision API',
                by: 'Anthropic',
                desc: 'Le modèle Vision de Claude analyse chaque ticket avec une précision de 97%. Il reconnaît les caractères OCR, les mises en page variables et les tickets abîmés.',
                tag: 'OCR + Compréhension sémantique',
                color: 'text-signal',
                border: 'border-signal/20',
                bg: 'bg-signal/5',
              },
              {
                icon: Database,
                label: 'pg_trgm',
                by: 'PostgreSQL',
                desc: 'L\'extension de correspondance floue de PostgreSQL compare les noms de produits même quand ils diffèrent légèrement d\'une enseigne à l\'autre — Barilla vs "Pâtes Barilla n°5".',
                tag: 'Fuzzy matching · trigrammes',
                color: 'text-blue-400',
                border: 'border-blue-400/20',
                bg: 'bg-blue-400/5',
              },
              {
                icon: Layers,
                label: 'Données communautaires',
                by: 'Réseau Basket',
                desc: 'Les prix sont collectés et validés par notre communauté d\'utilisateurs, enrichis par des scraping automatisés et mis à jour en temps réel pour refléter les prix actuels en magasin.',
                tag: '+40 000 produits · 15 enseignes',
                color: 'text-orange-400',
                border: 'border-orange-400/20',
                bg: 'bg-orange-400/5',
              },
            ].map((tech, i) => (
              <motion.div
                key={tech.label}
                className={`rounded-3xl p-8 border bg-paper group hover:shadow-lg transition-all duration-500 hover:-translate-y-1 ${tech.border}`}
                initial={{ opacity: 0, y: 40 }}
                animate={techInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.7, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Icon */}
                <div className={`w-12 h-12 rounded-2xl ${tech.bg} border ${tech.border} flex items-center justify-center mb-6`}>
                  <tech.icon className={`w-5 h-5 ${tech.color}`} />
                </div>

                {/* Names */}
                <p className="font-mono text-[10px] text-graphite/35 uppercase tracking-wider mb-1">Propulsé par</p>
                <h3 className="font-sans font-bold text-xl text-graphite tracking-tight">{tech.label}</h3>
                <p className={`font-mono text-xs ${tech.color} mt-0.5 mb-4`}>{tech.by}</p>

                {/* Description */}
                <p className="font-mono text-xs text-graphite/55 leading-relaxed mb-6">{tech.desc}</p>

                {/* Tag */}
                <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${tech.bg} border ${tech.border}`}>
                  <Zap className={`w-3 h-3 ${tech.color}`} />
                  <span className={`font-mono text-[9px] ${tech.color} uppercase tracking-wider`}>{tech.tag}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Architecture diagram — inline SVG */}
          <motion.div
            className="mt-12 rounded-3xl bg-paper border border-graphite/8 p-8 overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            animate={techInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="font-mono text-[10px] text-graphite/35 uppercase tracking-widest mb-6 text-center">Flux d&apos;une analyse</p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-0">
              {[
                { label: 'Photo', icon: Camera, detail: 'Ticket JPG/PNG' },
                { label: 'Claude Vision', icon: Cpu, detail: 'OCR + extraction' },
                { label: 'pg_trgm', icon: Database, detail: 'Matching flou' },
                { label: 'Rapport', icon: BarChart2, detail: 'Économies affichées' },
              ].map((node, i, arr) => (
                <div key={node.label} className="flex flex-col md:flex-row items-center">
                  {/* Node */}
                  <motion.div
                    className="flex flex-col items-center gap-2"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={techInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-offwhite border border-graphite/10 flex items-center justify-center">
                      <node.icon className="w-5 h-5 text-graphite/60" />
                    </div>
                    <div className="text-center">
                      <p className="font-sans text-xs font-semibold text-graphite">{node.label}</p>
                      <p className="font-mono text-[9px] text-graphite/40">{node.detail}</p>
                    </div>
                  </motion.div>

                  {/* Arrow connector */}
                  {i < arr.length - 1 && (
                    <motion.div
                      className="mx-4 hidden md:flex items-center"
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={techInView ? { opacity: 1, scaleX: 1 } : {}}
                      transition={{ duration: 0.4, delay: 0.65 + i * 0.1 }}
                      style={{ transformOrigin: 'left center' }}
                    >
                      <div className="w-16 h-[1px] bg-gradient-to-r from-graphite/20 to-signal/40" />
                      <div className="w-0 h-0 border-t-4 border-b-4 border-l-8 border-transparent border-l-signal/50" style={{ borderTopColor: 'transparent', borderBottomColor: 'transparent' }} />
                    </motion.div>
                  )}
                  {i < arr.length - 1 && (
                    <motion.div
                      className="my-2 flex md:hidden flex-col items-center"
                      initial={{ opacity: 0 }}
                      animate={techInView ? { opacity: 1 } : {}}
                      transition={{ delay: 0.65 + i * 0.1 }}
                    >
                      <div className="w-[1px] h-6 bg-signal/30" />
                      <div className="w-0 h-0" style={{ borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '6px solid rgba(126,217,87,0.4)' }} />
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ==================== CTA ==================== */}
      <section
        ref={ctaRef}
        className="py-24 md:py-36 px-5 md:px-[5vw] bg-graphite relative overflow-hidden"
      >
        {/* Background signal glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={ctaInView ? { opacity: 1 } : {}}
          transition={{ duration: 1.5 }}
        >
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(126,217,87,0.15) 0%, transparent 70%)' }}
          />
        </motion.div>

        {/* Large background text */}
        <motion.span
          className="absolute right-0 bottom-0 font-mono font-extrabold text-paper/[0.03] leading-none select-none pointer-events-none"
          style={{ fontSize: 'clamp(6rem, 22vw, 22rem)' }}
          initial={{ opacity: 0, x: 40 }}
          animate={ctaInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          AI
        </motion.span>

        <div className="max-w-[1400px] mx-auto relative z-10 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={ctaInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="font-mono text-xs text-paper/30 uppercase tracking-widest border border-paper/10 px-4 py-1.5 rounded-full inline-block mb-8">
              Prêt à commencer ?
            </span>
          </motion.div>

          <motion.h2
            className="font-sans font-extrabold tracking-tighter text-paper leading-[0.9] mb-6"
            style={{ fontSize: 'clamp(2.8rem, 7vw, 8rem)' }}
            initial={{ opacity: 0, y: 50 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            Essayez<br />
            <span className="text-signal">maintenant.</span>
          </motion.h2>

          <motion.p
            className="font-mono text-sm text-paper/45 max-w-md mb-12 leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            Rejoignez des milliers de Français qui utilisent Basket AI pour économiser sur leurs courses chaque semaine.
          </motion.p>

          <motion.a
            href="/login"
            initial={{ opacity: 0, y: 20 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <button className="relative overflow-hidden rounded-[2rem] bg-signal text-graphite px-10 py-4 font-sans text-sm font-bold uppercase tracking-wide group hover:scale-105 transition-transform duration-500 flex items-center gap-3">
              <span className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]" />
              <span className="relative z-10 transition-colors duration-500 flex items-center gap-3">
                Essayer gratuitement
                <ArrowRight className="w-4 h-4" />
              </span>
            </button>
          </motion.a>

          {/* Trust indicators */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-6 mt-10"
            initial={{ opacity: 0 }}
            animate={ctaInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            {['Sans carte bancaire', 'Données privées', '97% de précision', 'Analyse en < 2s'].map((item) => (
              <div key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-signal" />
                <span className="font-mono text-[10px] text-paper/40 uppercase tracking-wider">{item}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="bg-graphite text-paper rounded-t-[2rem] md:rounded-t-[4rem] pt-16 md:pt-[15vh] pb-8 md:pb-[5vh] px-5 md:px-[5vw] relative overflow-hidden border-t border-paper/5">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="footerGridAI" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E8E4DD" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#footerGridAI)" />
          </svg>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[10vw] relative z-10">
          {/* Brand */}
          <div>
            <h2
              className="font-sans font-extrabold tracking-tighter uppercase leading-none text-paper flex items-center gap-3"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 6rem)' }}
            >
              <svg width="1em" height="1em" viewBox="0 0 28 28" fill="none" style={{ fontSize: 'inherit', maxWidth: '1em', maxHeight: '1em' }}>
                <rect width="28" height="28" rx="8" fill="#7ed957" />
                <path d="M7 11h14l-2 9H9L7 11z" stroke="#111" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
                <path d="M10 11L12 7M18 11L16 7" stroke="#111" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Basket{' '}
              <span className="font-mono text-xs text-paper/40 font-normal tracking-wider normal-case">(Beta)</span>
            </h2>
            <p className="font-mono text-xs text-paper/40 mt-6 max-w-xs leading-relaxed">
              L&apos;intelligence artificielle qui lit vos courses. Scannez, comparez, économisez — chaque semaine.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-col md:flex-row gap-[8vw] mt-8 md:mt-0">
            <ul className="space-y-4 font-mono text-xs text-paper/60">
              <li><a href="/login" className="hover:text-signal transition-colors">Créer un compte</a></li>
              <li><a href="/basket-ai" className="hover:text-signal transition-colors">Basket AI</a></li>
              <li><a href="/comment-ca-marche" className="hover:text-signal transition-colors">Comment ça marche</a></li>
              <li><a href="/vision" className="hover:text-signal transition-colors">Vision</a></li>
            </ul>
            <ul className="space-y-4 font-mono text-xs text-paper/60">
              <li><a href="/carte" className="hover:text-signal transition-colors">Carte des prix</a></li>
              <li><a href="/contact" className="hover:text-signal transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-signal transition-colors">Politique de confidentialité</a></li>
              <li><a href="#" className="hover:text-signal transition-colors">{"Conditions d'utilisation"}</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 md:mt-20 flex justify-between items-end border-t border-paper/10 pt-8 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-signal animate-pulse" />
            <span className="font-mono text-xs text-paper/50 uppercase tracking-tight">Fait avec soin en France 🇫🇷</span>
          </div>
          <span className="font-mono text-xs text-paper/30">© 2026 Basket</span>
        </div>
      </footer>
    </div>
  )
}
