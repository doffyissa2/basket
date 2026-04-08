'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import {
  motion,
  useInView,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
} from 'framer-motion'
import { useEffect } from 'react'
import {
  Camera,
  Cpu,
  BarChart2,
  TrendingDown,
  PiggyBank,
  ChevronDown,
  ArrowRight,
} from 'lucide-react'

// ─── Easing presets ──────────────────────────────────────────────────────────
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const
const EASE_IN_OUT_QUART = [0.77, 0, 0.175, 1] as const

// ─── Reusable fade-up variant factory ────────────────────────────────────────
function fadeUp(delay = 0) {
  return {
    hidden: { opacity: 0, y: 48 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.9, ease: EASE_OUT_EXPO, delay },
    },
  }
}

// ─── Animated counter hook ───────────────────────────────────────────────────
function useCounter(target: number, active: boolean, duration = 1.8) {
  const mv = useMotionValue(0)
  const rounded = useTransform(mv, (v) => Math.round(v))
  useEffect(() => {
    if (!active) return
    const ctrl = animate(mv, target, { duration, ease: EASE_OUT_EXPO })
    return ctrl.stop
  }, [active, target, duration, mv])
  return rounded
}

// ─── Step illustrations ───────────────────────────────────────────────────────

function IlluScanner({ active }: { active: boolean }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Phone frame */}
      <div
        className="relative w-28 h-48 rounded-[1.6rem] border-2 border-graphite/20 bg-white shadow-xl overflow-hidden"
        style={{ boxShadow: '0 20px 60px rgba(17,17,17,0.12)' }}
      >
        {/* Screen */}
        <div className="absolute inset-1 rounded-[1.2rem] bg-graphite/5 overflow-hidden flex items-center justify-center">
          {/* Receipt inside phone */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={active ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.7, ease: EASE_OUT_EXPO, delay: 0.3 }}
            className="w-[80%] bg-white rounded-lg p-2 shadow-sm"
          >
            <div className="space-y-1">
              {['Lait 1L', 'Beurre', 'Pâtes'].map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -8 }}
                  animate={active ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.5 + i * 0.12, duration: 0.4, ease: EASE_OUT_EXPO }}
                  className="flex justify-between items-center"
                >
                  <span className="font-mono text-[7px] text-graphite/60 truncate">{item}</span>
                  <span className="font-mono text-[7px] text-graphite font-bold ml-1">1,xx€</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
          {/* Scan line */}
          <motion.div
            className="absolute left-0 w-full h-[2px] bg-signal/80 pointer-events-none"
            style={{ boxShadow: '0 0 10px rgba(126,217,87,0.8)' }}
            initial={{ top: '15%' }}
            animate={active ? { top: ['15%', '85%', '15%'] } : { top: '15%' }}
            transition={{ duration: 2.4, ease: EASE_IN_OUT_QUART, repeat: Infinity, delay: 0.2 }}
          />
        </div>
        {/* Home indicator */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full bg-graphite/20" />
      </div>
      {/* Camera flash ring */}
      <motion.div
        className="absolute inset-0 rounded-full border border-signal/40 pointer-events-none"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={active ? { scale: [0.6, 1.2, 0.6], opacity: [0, 0.5, 0] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        style={{ width: 120, height: 120, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
      />
    </div>
  )
}

function IlluAnalyse({ active }: { active: boolean }) {
  const items = [
    { name: 'Lait demi-écrémé 1L', price: '1,15 €' },
    { name: 'Beurre Président 250g', price: '2,49 €' },
    { name: 'Pâtes Barilla 500g', price: '1,29 €' },
    { name: 'Eau Cristaline 6×1,5L', price: '2,49 €' },
    { name: 'Oeufs x12', price: '3,45 €' },
  ]
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        className="w-56 bg-white rounded-2xl p-4 shadow-xl border border-graphite/8"
        style={{ boxShadow: '0 20px 60px rgba(17,17,17,0.10)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-graphite/8">
          <div className="w-2 h-2 rounded-full bg-signal animate-pulse" />
          <span className="font-mono text-[9px] text-graphite/50 uppercase tracking-wider">IA extraction…</span>
        </div>
        {/* Items appearing */}
        <div className="space-y-2">
          {items.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -16 }}
              animate={active ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.3 + i * 0.18, duration: 0.5, ease: EASE_OUT_EXPO }}
              className="flex justify-between items-center"
            >
              <span className="font-mono text-[8px] text-graphite/70 truncate pr-2 flex-1">{item.name}</span>
              <motion.span
                initial={{ opacity: 0, scale: 0.7 }}
                animate={active ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.5 + i * 0.18, duration: 0.3, ease: EASE_OUT_EXPO }}
                className="font-mono text-[8px] text-graphite font-bold flex-shrink-0"
              >
                {item.price}
              </motion.span>
            </motion.div>
          ))}
        </div>
        {/* Status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={active ? { opacity: 1 } : {}}
          transition={{ delay: 1.4, duration: 0.5 }}
          className="mt-3 pt-2 border-t border-graphite/8 flex items-center gap-1.5"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-signal" />
          <span className="font-mono text-[8px] text-signal">5 articles extraits</span>
        </motion.div>
      </div>
    </div>
  )
}

function IlluComparer({ active }: { active: boolean }) {
  const stores = [
    { name: 'Lidl', pct: 62, price: '8,20 €', color: '#7ed957', best: true },
    { name: 'Aldi', pct: 68, price: '8,95 €', color: '#7ed957', best: false },
    { name: 'Leclerc', pct: 78, price: '10,20 €', color: '#111111', best: false },
    { name: 'Carrefour', pct: 95, price: '12,52 €', color: '#111111', best: false },
    { name: 'Monoprix', pct: 100, price: '13,10 €', color: '#111111', best: false },
  ]
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        className="w-60 bg-white rounded-2xl p-4 shadow-xl border border-graphite/8"
        style={{ boxShadow: '0 20px 60px rgba(17,17,17,0.10)' }}
      >
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-graphite/8">
          <span className="font-mono text-[9px] text-graphite/50 uppercase tracking-wider">15 enseignes</span>
          <span className="font-mono text-[9px] text-signal font-bold">comparaison</span>
        </div>
        <div className="space-y-2.5">
          {stores.map((s, i) => (
            <div key={s.name} className="flex items-center gap-2">
              <span className="font-mono text-[8px] text-graphite/50 w-14 flex-shrink-0">{s.name}</span>
              <div className="flex-1 h-2 bg-graphite/6 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: s.best ? '#7ed957' : 'rgba(17,17,17,0.15)' }}
                  initial={{ width: 0 }}
                  animate={active ? { width: `${s.pct}%` } : { width: 0 }}
                  transition={{ delay: 0.3 + i * 0.12, duration: 0.7, ease: EASE_OUT_EXPO }}
                />
              </div>
              <motion.span
                initial={{ opacity: 0 }}
                animate={active ? { opacity: 1 } : {}}
                transition={{ delay: 0.5 + i * 0.12 }}
                className="font-mono text-[8px] w-12 text-right flex-shrink-0"
                style={{ color: s.best ? '#7ed957' : 'rgba(17,17,17,0.5)' }}
              >
                {s.price}
              </motion.span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function IlluDecouvrir({ active }: { active: boolean }) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        className="w-56 bg-white rounded-2xl p-4 shadow-xl border border-graphite/8"
        style={{ boxShadow: '0 20px 60px rgba(17,17,17,0.10)' }}
      >
        <span className="font-mono text-[9px] text-graphite/40 uppercase tracking-wider block mb-3">Écart de prix</span>
        {/* Ticket total vs Basket suggestion */}
        <div className="space-y-2 mb-3">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[9px] text-graphite/50">Votre magasin</span>
            <span className="font-mono text-[9px] text-graphite font-bold">12,52 €</span>
          </div>
          <div className="w-full h-[1px] bg-graphite/8" />
          <div className="flex justify-between items-center">
            <span className="font-mono text-[9px] text-graphite/50">Lidl (meilleur)</span>
            <span className="font-mono text-[9px] text-signal font-bold">8,20 €</span>
          </div>
        </div>
        {/* Revealed savings pill */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 8 }}
          animate={active ? { opacity: 1, scale: 1, y: 0 } : {}}
          transition={{ delay: 0.5, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          className="bg-signal/15 border border-signal/30 rounded-xl p-2.5 text-center"
        >
          <p className="font-sans text-base font-extrabold text-signal leading-none">− 4,32 €</p>
          <p className="font-mono text-[8px] text-graphite/50 mt-0.5">économisés par semaine</p>
        </motion.div>
        {/* Arrow decoration */}
        <motion.div
          initial={{ opacity: 0, x: -6 }}
          animate={active ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: 0.9, duration: 0.4 }}
          className="mt-2 flex items-center justify-center gap-1"
        >
          <span className="font-mono text-[8px] text-signal">Vous payez trop cher</span>
          <TrendingDown size={10} className="text-signal" />
        </motion.div>
      </div>
    </div>
  )
}

function IlluEconomiser({ active }: { active: boolean }) {
  const savings = useCounter(224, active, 2.2)
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        className="w-56 bg-graphite rounded-2xl p-5 shadow-xl text-paper"
        style={{ boxShadow: '0 20px 60px rgba(17,17,17,0.25)' }}
      >
        {/* Month label */}
        <span className="font-mono text-[9px] text-paper/40 uppercase tracking-wider block mb-2">Ce mois-ci</span>
        {/* Counter */}
        <div className="flex items-end gap-1 mb-4">
          <motion.span
            className="font-sans text-4xl font-extrabold text-signal leading-none"
          >
            {savings}
          </motion.span>
          <span className="font-mono text-sm text-signal mb-0.5">€</span>
        </div>
        <p className="font-mono text-[9px] text-paper/50 leading-relaxed mb-4">économisés grâce à Basket depuis 30 jours</p>
        {/* Mini bar chart */}
        <div className="flex items-end gap-1.5 h-8">
          {[30, 55, 40, 75, 60, 90, 100].map((h, i) => (
            <motion.div
              key={i}
              className="flex-1 rounded-t-sm"
              style={{ background: i === 6 ? '#7ed957' : 'rgba(255,255,255,0.15)' }}
              initial={{ height: 0 }}
              animate={active ? { height: `${h}%` } : { height: 0 }}
              transition={{ delay: 0.3 + i * 0.08, duration: 0.6, ease: EASE_OUT_EXPO }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Step component ───────────────────────────────────────────────────────────
interface StepProps {
  number: string
  label: string
  title: string
  description: string
  icon: React.ReactNode
  illustration: (active: boolean) => React.ReactNode
  reversed?: boolean
}

function Step({ number, label, title, description, icon, illustration, reversed }: StepProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })

  return (
    <motion.div
      ref={ref}
      variants={fadeUp(0)}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className={`flex flex-col ${reversed ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-10 md:gap-16 py-20 md:py-28 border-b border-graphite/8 last:border-b-0`}
    >
      {/* Text side */}
      <div className="flex-1 min-w-0">
        {/* Number + label row */}
        <div className="flex items-center gap-4 mb-6">
          <span className="font-mono text-[4.5rem] leading-none font-bold text-graphite/[0.07] select-none">
            {number}
          </span>
          <div className="flex items-center gap-2 border border-graphite/15 rounded-full px-3 py-1">
            <span className="text-signal">{icon}</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-graphite/50">{label}</span>
          </div>
        </div>
        {/* Title */}
        <motion.h3
          variants={fadeUp(0.1)}
          className="font-sans text-3xl md:text-[2.6vw] font-extrabold tracking-tighter text-graphite leading-[1.05] mb-5"
        >
          {title}
        </motion.h3>
        {/* Description */}
        <motion.p
          variants={fadeUp(0.2)}
          className="font-mono text-sm text-graphite/55 leading-relaxed max-w-md"
        >
          {description}
        </motion.p>
      </div>

      {/* Illustration side */}
      <motion.div
        variants={{
          hidden: { opacity: 0, scale: 0.92, y: 32 },
          visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 1, ease: EASE_OUT_EXPO, delay: 0.25 } },
        }}
        className="flex-shrink-0 w-full md:w-[42%] h-56 md:h-72 bg-offwhite rounded-[2rem] border border-graphite/8 overflow-hidden flex items-center justify-center relative"
      >
        {/* Subtle grid bg */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(17,17,17,0.06) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative z-10 w-full h-full p-6">
          {illustration(inView)}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── FAQ item ─────────────────────────────────────────────────────────────────
function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })

  return (
    <motion.div
      ref={ref}
      variants={fadeUp(index * 0.07)}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className="border-b border-graphite/10 last:border-b-0"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-6 py-5 md:py-6 text-left group"
      >
        <span className="font-sans text-base md:text-lg font-semibold text-graphite tracking-tight group-hover:text-signal transition-colors duration-300">
          {question}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
          className="flex-shrink-0 w-7 h-7 rounded-full border border-graphite/15 flex items-center justify-center text-graphite/50 group-hover:border-signal group-hover:text-signal transition-colors duration-300"
        >
          <ChevronDown size={14} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE_IN_OUT_QUART }}
            className="overflow-hidden"
          >
            <p className="font-mono text-sm text-graphite/55 leading-relaxed pb-5 max-w-2xl">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Hero countdown ───────────────────────────────────────────────────────────
function HeroCounter() {
  const [started, setStarted] = useState(false)
  const count = useCounter(10, started, 1.6)

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), 800)
    return () => clearTimeout(t)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.9, duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
      className="inline-flex items-baseline gap-2 bg-signal/12 border border-signal/25 rounded-2xl px-5 py-3"
    >
      <motion.span className="font-sans text-5xl md:text-7xl font-extrabold text-signal leading-none tabular-nums">
        {count}
      </motion.span>
      <span className="font-mono text-sm md:text-base text-graphite/50 tracking-tight">secondes</span>
    </motion.div>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(245,243,238,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(17,17,17,0.08)',
      }}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 h-16 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <img src="/basket_logo.png" alt="Basket" className="h-7 w-7" />
          <span className="font-sans font-bold tracking-tight text-graphite text-sm">
            Basket{' '}
            <span className="font-mono text-[9px] text-graphite/40 font-normal tracking-wider">(Beta)</span>
          </span>
        </Link>

        {/* Links */}
        <div className="hidden md:flex items-center gap-8 font-mono text-xs text-graphite/50">
          <Link href="/basket-ai" className="hover:text-signal transition-colors duration-200 py-1 border-b border-transparent hover:border-signal">
            Basket AI
          </Link>
          <Link href="/vision" className="hover:text-signal transition-colors duration-200 py-1 border-b border-transparent hover:border-signal">
            Vision
          </Link>
          <Link
            href="/comment-ca-marche"
            className="text-signal border-b border-signal py-1 transition-colors duration-200"
          >
            Comment ça marche
          </Link>
          <Link href="/carte" className="hover:text-signal transition-colors duration-200 py-1 border-b border-transparent hover:border-signal">
            Carte
          </Link>
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
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-graphite text-paper rounded-t-[2rem] md:rounded-t-[4rem] mt-4 md:mt-[5vh] pt-16 md:pt-[15vh] pb-8 md:pb-[5vh] px-5 md:px-[5vw] relative overflow-hidden">
      {/* Grid background */}
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
        <div>
          <h2 className="font-sans text-[10vw] md:text-[6vw] font-extrabold tracking-tighter uppercase leading-none text-paper flex items-center gap-[1vw]">
            <img src="/basket_logo.png" alt="Basket" className="h-[10vw] w-[10vw] md:h-[6vw] md:w-[6vw]" />
            Basket{' '}
            <span className="font-mono text-xs md:text-[14px] text-paper/40 font-normal tracking-wider normal-case">(Beta)</span>
          </h2>
          <p className="font-mono text-xs text-paper/40 mt-[3vh] max-w-xs">
            Le chemin le plus court vers les économies. Scannez, comparez, économisez — chaque semaine.
          </p>
        </div>
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
            <li><Link href="#" className="hover:text-signal transition-colors">Politique de confidentialité</Link></li>
            <li><Link href="#" className="hover:text-signal transition-colors">{"Conditions d'utilisation"}</Link></li>
          </ul>
        </div>
      </div>

      <div className="mt-16 md:mt-[20vh] flex justify-between items-end border-t border-paper/10 pt-8 md:pt-[5vh] relative z-10">
        <div className="flex items-center gap-[1vw]">
          <div className="w-2 h-2 rounded-full bg-signal animate-pulse" />
          <span className="font-mono text-xs text-paper/50 uppercase tracking-tight">Fait avec soin en France 🇫🇷</span>
        </div>
        <span className="font-mono text-xs text-paper/30">© 2026 Basket</span>
      </div>
    </footer>
  )
}

// ─── Page data ────────────────────────────────────────────────────────────────
const STEPS: StepProps[] = [
  {
    number: '01',
    label: 'Scanner',
    title: 'Photographiez votre ticket de caisse',
    description:
      "Après vos courses, ouvrez Basket et prenez en photo votre ticket. Notre IA lit chaque ligne en quelques instants — même les tickets froissés ou partiellement illisibles.",
    icon: <Camera size={12} />,
    illustration: (active) => <IlluScanner active={active} />,
  },
  {
    number: '02',
    label: 'Analyser',
    title: "L'IA extrait automatiquement chaque article",
    description:
      "Notre moteur de reconnaissance extrait automatiquement le nom de chaque produit, sa quantité et son prix. Aucune saisie manuelle — tout est détecté en moins de 3 secondes.",
    icon: <Cpu size={12} />,
    illustration: (active) => <IlluAnalyse active={active} />,
    reversed: true,
  },
  {
    number: '03',
    label: 'Comparer',
    title: 'Basket compare vos prix avec 15 enseignes',
    description:
      "Chaque article est comparé en temps réel avec notre base de plus de 40 000 références dans 15 enseignes françaises près de chez vous : Lidl, Leclerc, Aldi, Carrefour, Super U et bien d'autres.",
    icon: <BarChart2 size={12} />,
    illustration: (active) => <IlluComparer active={active} />,
  },
  {
    number: '04',
    label: 'Découvrir',
    title: 'Voyez où vous payez trop cher',
    description:
      "Basket met en évidence les articles pour lesquels vous avez payé plus que nécessaire, et vous indique précisément dans quel magasin vous auriez payé moins — article par article.",
    icon: <TrendingDown size={12} />,
    illustration: (active) => <IlluDecouvrir active={active} />,
    reversed: true,
  },
  {
    number: '05',
    label: 'Économiser',
    title: 'Faites vos prochaines courses au bon endroit',
    description:
      "Grâce aux recommandations de Basket, planifiez vos courses là où vos habitudes d'achat vous coûtent le moins. Suivez vos économies cumulées semaine après semaine.",
    icon: <PiggyBank size={12} />,
    illustration: (active) => <IlluEconomiser active={active} />,
  },
]

const FAQ_ITEMS = [
  {
    question: 'Basket est-il gratuit ?',
    answer: 'Oui, entièrement gratuit et sans CB requise. Basket est conçu pour être accessible à tous — pas d\'abonnement, pas de carte de crédit, pas de publicité intrusive.',
  },
  {
    question: 'Mes données sont-elles sécurisées ?',
    answer: 'Vos tickets et données personnelles restent privés. Seuls les prix (anonymisés) contribuent à la base communautaire. Nous ne vendons aucune donnée et ne partageons jamais vos informations avec des tiers.',
  },
  {
    question: 'Quelles enseignes sont comparées ?',
    answer: '15 enseignes : Leclerc, Lidl, Aldi, Carrefour, Super U, Monoprix, Casino, Intermarché, Franprix, Auchan, Picard, Biocoop, Netto, Grand Frais… La base s\'enrichit continuellement grâce aux scans de la communauté.',
  },
  {
    question: 'La carte des prix est-elle disponible ?',
    answer: 'En cours de déploiement — les données s\'enrichissent à chaque scan de la communauté. La carte interactive sera disponible très prochainement pour vous montrer les prix par magasin autour de vous.',
  },
  {
    question: 'Puis-je l\'utiliser sur mobile ?',
    answer: 'Oui ! Ajoutez Basket à votre écran d\'accueil depuis votre navigateur (Safari sur iPhone, Chrome sur Android → "Ajouter à l\'écran d\'accueil") pour une expérience native, sans passer par l\'App Store.',
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CommentCaMarche() {
  const heroRef = useRef<HTMLElement>(null)
  const heroInView = useInView(heroRef, { once: true })

  const stepsRef = useRef<HTMLElement>(null)
  const faqRef = useRef<HTMLElement>(null)
  const faqInView = useInView(faqRef, { once: true, margin: '-10% 0px' })
  const ctaRef = useRef<HTMLElement>(null)
  const ctaInView = useInView(ctaRef, { once: true, margin: '-15% 0px' })

  return (
    <div
      className="bg-offwhite text-graphite font-sans antialiased overflow-x-hidden"
      style={{ backgroundColor: '#F5F3EE', color: '#111111' }}
    >
      <Navbar />

      {/* ──────────── HERO ──────────── */}
      <section
        ref={heroRef}
        className="relative min-h-[100dvh] flex flex-col items-center justify-center px-6 md:px-[5vw] pt-24 pb-20 overflow-hidden"
      >
        {/* Radial glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[60vh] pointer-events-none opacity-40"
          style={{ background: 'radial-gradient(ellipse at top, rgba(126,217,87,0.18) 0%, transparent 65%)' }}
        />
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(17,17,17,0.07) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: EASE_OUT_EXPO, delay: 0.1 }}
            className="inline-flex items-center gap-2 bg-signal/10 border border-signal/20 rounded-full px-4 py-1.5 mb-8"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
            <span className="font-mono text-xs text-graphite/60 uppercase tracking-widest">Guide d'utilisation</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, ease: EASE_OUT_EXPO, delay: 0.25 }}
            className="font-sans text-[13vw] md:text-[7.5vw] leading-[0.9] font-extrabold tracking-tighter text-graphite mb-6"
          >
            Comment ça{' '}
            <span className="text-signal">marche ?</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: EASE_OUT_EXPO, delay: 0.45 }}
            className="font-mono text-sm md:text-base text-graphite/50 mb-10 max-w-lg mx-auto leading-relaxed"
          >
            De la photo à l'économie en moins de
          </motion.p>

          {/* Countdown chip */}
          <HeroCounter />

          {/* Scroll cue */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={heroInView ? { opacity: 1 } : {}}
            transition={{ delay: 1.8, duration: 0.6 }}
            className="mt-14 flex flex-col items-center gap-2"
          >
            <span className="font-mono text-[10px] text-graphite/35 uppercase tracking-widest">Découvrir</span>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ChevronDown size={18} className="text-graphite/30" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ──────────── STEPS ──────────── */}
      <section
        ref={stepsRef}
        className="px-6 md:px-[5vw] max-w-[1200px] mx-auto"
        id="steps"
      >
        {STEPS.map((step) => (
          <Step key={step.number} {...step} />
        ))}
      </section>

      {/* ──────────── FAQ ──────────── */}
      <section
        ref={faqRef}
        className="px-6 md:px-[5vw] py-20 md:py-[15vh] max-w-[1200px] mx-auto"
        id="faq"
      >
        {/* Section header */}
        <motion.div
          variants={fadeUp(0)}
          initial="hidden"
          animate={faqInView ? 'visible' : 'hidden'}
          className="mb-12 md:mb-16"
        >
          <span className="font-mono text-xs text-graphite/40 uppercase tracking-widest block mb-3">Questions fréquentes</span>
          <h2 className="font-sans text-4xl md:text-[4.5vw] font-extrabold tracking-tighter text-graphite leading-[0.95]">
            Tout ce que vous<br />
            <span className="text-signal">voulez savoir.</span>
          </h2>
        </motion.div>

        {/* Accordion */}
        <div className="border-t border-graphite/10">
          {FAQ_ITEMS.map((item, i) => (
            <FAQItem key={i} question={item.question} answer={item.answer} index={i} />
          ))}
        </div>
      </section>

      {/* ──────────── CTA ──────────── */}
      <section
        ref={ctaRef}
        className="px-6 md:px-[5vw] py-20 md:py-[15vh] mx-2 md:mx-[2vw] mb-0 rounded-[2rem] md:rounded-[3rem] bg-graphite text-paper relative overflow-hidden"
        id="cta"
      >
        {/* Glow */}
        <div
          className="absolute top-0 right-0 w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(circle, #7ed957 0%, transparent 65%)', transform: 'translate(30%, -30%)' }}
        />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(232,228,221,0.5) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative z-10 max-w-3xl">
          <motion.span
            variants={fadeUp(0)}
            initial="hidden"
            animate={ctaInView ? 'visible' : 'hidden'}
            className="font-mono text-xs text-paper/35 uppercase tracking-widest block mb-5"
          >
            Prêt à commencer ?
          </motion.span>

          <motion.h2
            variants={fadeUp(0.1)}
            initial="hidden"
            animate={ctaInView ? 'visible' : 'hidden'}
            className="font-sans text-4xl md:text-[5.5vw] font-extrabold tracking-tighter text-paper leading-[0.92] mb-6"
          >
            Scannez votre premier<br />
            ticket <span className="text-signal">gratuitement.</span>
          </motion.h2>

          <motion.p
            variants={fadeUp(0.2)}
            initial="hidden"
            animate={ctaInView ? 'visible' : 'hidden'}
            className="font-mono text-sm text-paper/45 mb-10 max-w-md leading-relaxed"
          >
            Rejoignez des milliers de Français qui économisent chaque semaine grâce à Basket. Gratuit, sans CB, sans engagement.
          </motion.p>

          <motion.div
            variants={fadeUp(0.3)}
            initial="hidden"
            animate={ctaInView ? 'visible' : 'hidden'}
          >
            <Link href="/login">
              <button className="relative overflow-hidden inline-flex items-center gap-3 rounded-2xl bg-signal text-graphite px-7 py-4 font-sans text-sm font-bold uppercase tracking-wide group hover:scale-[1.04] transition-transform duration-400">
                <span className="absolute inset-0 bg-paper translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]" />
                <span className="relative z-10 flex items-center gap-3 group-hover:text-graphite transition-colors duration-500">
                  Commencer maintenant
                  <ArrowRight size={16} />
                </span>
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
