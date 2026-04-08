'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence, animate } from 'framer-motion'

// ── Constants ──────────────────────────────────────────────────────────────────
const GREEN = '#7ed957'
const BG = '#0A0A0A'
const CARD_BG = '#141414'
const W = 1080
const H = 1920

const ITEMS = [
  { name: 'Lait demi-écrémé 1L',   price: '1,29 €', cheaperAt: 'Aldi',        cheaperPrice: '0,59 €', saving: '−0,70 €' },
  { name: 'Beurre Président 250g', price: '2,89 €', cheaperAt: 'Lidl',        cheaperPrice: '2,25 €', saving: '−0,64 €' },
  { name: 'Pâtes Barilla 500g',    price: '1,55 €', cheaperAt: 'Leclerc',     cheaperPrice: '0,99 €', saving: '−0,56 €' },
  { name: 'Yaourts nature x8',     price: '3,20 €', cheaperAt: 'Lidl',        cheaperPrice: '2,40 €', saving: '−0,80 €' },
  { name: 'Jambon cuit 4 tr.',     price: '2,99 €', cheaperAt: 'Intermarché', cheaperPrice: '2,29 €', saving: '−0,70 €' },
]

const STATS = [
  { value: '15',      label: 'enseignes\ncomparées', delay: 0 },
  { value: '33 000+', label: 'produits\nen base',    delay: 0.12 },
  { value: '100%',    label: 'gratuit\nsans CB',     delay: 0.24 },
]

// ── Typewriter ─────────────────────────────────────────────────────────────────
function Typewriter({ text, delay = 0, speed = 52 }: { text: string; delay?: number; speed?: number }) {
  const [shown, setShown] = useState('')
  const [active, setActive] = useState(false)

  useEffect(() => {
    const t0 = setTimeout(() => setActive(true), delay)
    return () => clearTimeout(t0)
  }, [delay])

  useEffect(() => {
    if (!active) return
    let i = 0
    const iv = setInterval(() => {
      i++
      setShown(text.slice(0, i))
      if (i >= text.length) clearInterval(iv)
    }, speed)
    return () => clearInterval(iv)
  }, [active, text, speed])

  const done = shown.length >= text.length

  return (
    <>
      {shown}
      {!done && active && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 0.45, ease: 'linear' }}
          style={{
            display: 'inline-block',
            width: 6,
            height: 62,
            background: GREEN,
            marginLeft: 6,
            borderRadius: 3,
            verticalAlign: 'middle',
          }}
        />
      )}
    </>
  )
}

// ── Savings Counter ────────────────────────────────────────────────────────────
function SavingsCounter({ run }: { run: boolean }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!run) return
    const ctrl = animate(0, 3.4, {
      duration: 2.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setVal(v),
    })
    return ctrl.stop
  }, [run])
  return <>{val.toFixed(2).replace('.', ',')}</>
}

// ── Scan-line glow ─────────────────────────────────────────────────────────────
function ScanLine({ run }: { run: boolean }) {
  return (
    <AnimatePresence>
      {run && (
        <motion.div
          initial={{ top: 0 }}
          animate={{ top: '100%' }}
          transition={{ duration: 2.2, ease: 'linear' }}
          exit={{ opacity: 0 }}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 4,
            background: GREEN,
            boxShadow: `0 0 32px 12px ${GREEN}88, 0 0 80px 24px ${GREEN}33`,
            borderRadius: 2,
            zIndex: 10,
            pointerEvents: 'none',
          }}
        />
      )}
    </AnimatePresence>
  )
}

// ── Receipt card ───────────────────────────────────────────────────────────────
function ReceiptCard({ show, scan, badges }: { show: boolean; scan: boolean; badges: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="receipt"
          initial={{ y: 900, opacity: 0, rotateX: 10 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          exit={{ y: -200, opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: '#FAFAF8',
            borderRadius: 32,
            padding: '52px 56px',
            width: 860,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 60px 160px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
          }}
        >
          <ScanLine run={scan} />

          {/* Receipt header */}
          <div style={{ marginBottom: 40, borderBottom: '2px dashed rgba(17,17,17,0.12)', paddingBottom: 32 }}>
            <p style={{ fontFamily: 'monospace', fontSize: 20, color: 'rgba(17,17,17,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>
              Carrefour Market
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: 16, color: 'rgba(17,17,17,0.25)' }}>
              06/04/2026 — 14:32
            </p>
          </div>

          {/* Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {ITEMS.map((item, i) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + i * 0.08, duration: 0.4 }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
              >
                <span style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 26,
                  fontWeight: 500,
                  color: '#111111',
                  flex: 1,
                }}>
                  {item.name}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                  {/* Cheaper badge */}
                  <AnimatePresence>
                    {badges && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.7, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        transition={{ delay: i * 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                          background: '#edffd8',
                          border: `1.5px solid ${GREEN}`,
                          borderRadius: 10,
                          padding: '6px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                        }}
                      >
                        <span style={{ fontFamily: 'monospace', fontSize: 14, color: '#2a7a00', fontWeight: 700 }}>
                          {item.saving}
                        </span>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#2a7a00', opacity: 0.7 }}>
                          {item.cheaperAt}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <span style={{
                    fontFamily: 'monospace',
                    fontSize: 28,
                    fontWeight: 700,
                    color: badges ? 'rgba(17,17,17,0.35)' : '#111111',
                    textDecoration: badges ? 'line-through' : 'none',
                    transition: 'all 0.4s ease',
                  }}>
                    {item.price}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Total row */}
          <div style={{
            marginTop: 36,
            paddingTop: 28,
            borderTop: '2px dashed rgba(17,17,17,0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 28, fontWeight: 700, color: '#111' }}>Total payé</span>
            <span style={{ fontFamily: 'monospace', fontSize: 36, fontWeight: 700, color: '#111' }}>11,92 €</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ value, label, delay, show }: { value: string; label: string; delay: number; show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 120, opacity: 0, scale: 0.88 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: CARD_BG,
            border: `1.5px solid rgba(126,217,87,0.25)`,
            borderRadius: 36,
            padding: '52px 44px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
            boxShadow: `0 0 60px rgba(126,217,87,0.07)`,
          }}
        >
          <span style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 80,
            fontWeight: 900,
            color: GREEN,
            lineHeight: 1,
            letterSpacing: '-3px',
          }}>
            {value}
          </span>
          <span style={{
            fontFamily: 'monospace',
            fontSize: 22,
            color: 'rgba(255,255,255,0.45)',
            textAlign: 'center',
            lineHeight: 1.4,
            whiteSpace: 'pre-line',
          }}>
            {label}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function PromoPage() {
  const [scale, setScale] = useState(1)

  // Animation flags
  const [showLogo, setShowLogo] = useState(false)
  const [showQuestion, setShowQuestion] = useState(false)
  const [hideIntro, setHideIntro] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [showScan, setShowScan] = useState(false)
  const [showBadges, setShowBadges] = useState(false)
  const [showSavings, setShowSavings] = useState(false)
  const [runCounter, setRunCounter] = useState(false)
  const [hideReceipt, setHideReceipt] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showFinal, setShowFinal] = useState(false)

  // Scale canvas to viewport
  useEffect(() => {
    const upd = () => setScale(Math.min(window.innerWidth / W, window.innerHeight / H))
    upd()
    window.addEventListener('resize', upd)
    return () => window.removeEventListener('resize', upd)
  }, [])

  // Master timeline (all times in ms from page load)
  useEffect(() => {
    const ts = [
      setTimeout(() => setShowLogo(true),     200),    // 0.2s — logo fades in
      setTimeout(() => setShowQuestion(true),  1100),   // 1.1s — text starts typing
      setTimeout(() => setShowReceipt(true),   3200),   // 3.2s — receipt slides up
      setTimeout(() => setHideIntro(true),     3600),   // 3.6s — intro fades out
      setTimeout(() => setShowScan(true),      4600),   // 4.6s — scan line starts
      setTimeout(() => setShowBadges(true),    8000),   // 8s   — badges pop
      setTimeout(() => setShowSavings(true),   9800),   // 9.8s — savings card appears
      setTimeout(() => setRunCounter(true),    10000),  // 10s  — counter ticks up
      setTimeout(() => setHideReceipt(true),   13700),  // 13.7s— receipt slides out
      setTimeout(() => setShowStats(true),     14000),  // 14s  — stat cards fly in
      setTimeout(() => setShowFinal(true),     18000),  // 18s  — final screen
    ]
    return () => ts.forEach(clearTimeout)
  }, [])

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Canvas */}
      <div style={{
        width: W,
        height: H,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        background: BG,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>

        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.035,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        {/* Green glow top */}
        <div style={{
          position: 'absolute', top: -300, left: '50%', transform: 'translateX(-50%)',
          width: 800, height: 600,
          background: `radial-gradient(ellipse, ${GREEN}18 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        {/* ─────────────── PHASE 1: INTRO ─────────────── */}
        <AnimatePresence>
          {!hideIntro && (
            <motion.div
              key="intro"
              exit={{ opacity: 0, y: -60 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 48, padding: '0 80px',
              }}
            >
              {/* Logo */}
              <AnimatePresence>
                {showLogo && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}
                  >
                    {/* Basket logo glow ring */}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <motion.div
                        animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
                        transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                        style={{
                          position: 'absolute',
                          width: 200, height: 200,
                          borderRadius: '50%',
                          background: `radial-gradient(circle, ${GREEN}40, transparent 70%)`,
                        }}
                      />
                      <img
                        src="/basket_logo.png"
                        alt="Basket"
                        style={{ width: 140, height: 140, objectFit: 'contain', position: 'relative', zIndex: 1 }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                      <span style={{
                        fontSize: 72, fontWeight: 900, color: '#fff',
                        letterSpacing: '-3px', lineHeight: 1,
                      }}>
                        Basket
                      </span>
                      <span style={{
                        fontFamily: 'monospace', fontSize: 22,
                        color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em',
                      }}>
                        bêta
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Question text */}
              <AnimatePresence>
                {showQuestion && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      fontSize: 68, fontWeight: 800,
                      color: '#fff', textAlign: 'center',
                      lineHeight: 1.15, letterSpacing: '-2px',
                    }}
                  >
                    <Typewriter text="Tu paies trop cher tes courses ?" delay={0} speed={52} />
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─────────────── PHASE 2-3: RECEIPT ─────────────── */}
        <AnimatePresence>
          {showReceipt && !hideReceipt && (
            <motion.div
              key="receipt-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -80 }}
              transition={{ duration: 0.5 }}
              style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center',
                paddingTop: 140,
                gap: 60,
              }}
            >
              {/* Mini header */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                style={{ display: 'flex', alignItems: 'center', gap: 16 }}
              >
                <img src="/basket_logo.png" alt="" style={{ width: 52, height: 52 }} />
                <span style={{ fontSize: 38, fontWeight: 800, color: '#fff', letterSpacing: '-1px' }}>
                  Analyse en cours...
                </span>
              </motion.div>

              {/* Receipt */}
              <ReceiptCard
                show={showReceipt && !hideReceipt}
                scan={showScan}
                badges={showBadges}
              />

              {/* Savings card */}
              <AnimatePresence>
                {showSavings && (
                  <motion.div
                    initial={{ opacity: 0, y: 60, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      background: `linear-gradient(135deg, ${GREEN}22, ${GREEN}08)`,
                      border: `2px solid ${GREEN}55`,
                      borderRadius: 32,
                      padding: '40px 80px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 10,
                      width: 860,
                      boxShadow: `0 0 80px ${GREEN}22`,
                    }}
                  >
                    <span style={{ fontFamily: 'monospace', fontSize: 24, color: GREEN, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                      Tu pourrais économiser
                    </span>
                    <span style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: 120, fontWeight: 900, color: GREEN,
                      lineHeight: 1, letterSpacing: '-4px',
                    }}>
                      <SavingsCounter run={runCounter} /> €
                    </span>
                    <span style={{ fontFamily: 'monospace', fontSize: 22, color: 'rgba(126,217,87,0.6)' }}>
                      en faisant tes courses ailleurs
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─────────────── PHASE 4: STATS ─────────────── */}
        <AnimatePresence>
          {showStats && !showFinal && (
            <motion.div
              key="stats-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '80px 60px',
                gap: 60,
              }}
            >
              {/* Section label */}
              <motion.p
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                style={{ fontFamily: 'monospace', fontSize: 26, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.2em', textTransform: 'uppercase' }}
              >
                Basket en chiffres
              </motion.p>

              {/* Big claim */}
              <motion.h2
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  fontSize: 90, fontWeight: 900, color: '#fff',
                  textAlign: 'center', lineHeight: 1.05, letterSpacing: '-3px',
                }}
              >
                Fais tes courses<br />
                <span style={{ color: GREEN }}>plus intelligemment.</span>
              </motion.h2>

              {/* Stat cards */}
              <div style={{ display: 'flex', gap: 28, width: '100%' }}>
                {STATS.map((s) => (
                  <StatCard key={s.value} value={s.value} label={s.label} delay={s.delay} show={showStats} />
                ))}
              </div>

              {/* Tagline */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                  marginTop: 20,
                }}
              >
                <div style={{ width: 80, height: 2, background: `${GREEN}55`, borderRadius: 2 }} />
                <p style={{ fontFamily: 'monospace', fontSize: 26, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
                  Scanne ton ticket en moins de 10 secondes
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─────────────── PHASE 5: FINAL ─────────────── */}
        <AnimatePresence>
          {showFinal && (
            <motion.div
              key="final-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 48,
                padding: '0 80px',
              }}
            >
              {/* Green glow burst */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: 'absolute',
                  width: 800, height: 800,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${GREEN}1A 0%, transparent 65%)`,
                  pointerEvents: 'none',
                }}
              />

              {/* Logo */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, position: 'relative' }}
              >
                <img src="/basket_logo.png" alt="Basket" style={{ width: 180, height: 180, objectFit: 'contain' }} />
                <span style={{ fontSize: 96, fontWeight: 900, color: '#fff', letterSpacing: '-4px', lineHeight: 1 }}>
                  Basket
                </span>
              </motion.div>

              {/* URL */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.7 }}
                style={{
                  background: `${GREEN}18`,
                  border: `2px solid ${GREEN}44`,
                  borderRadius: 20,
                  padding: '20px 52px',
                  position: 'relative',
                }}
              >
                <span style={{ fontFamily: 'monospace', fontSize: 48, fontWeight: 700, color: GREEN, letterSpacing: '-1px' }}>
                  basketbeta.com
                </span>
              </motion.div>

              {/* Tagline */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.7 }}
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 52, fontWeight: 700,
                  color: 'rgba(255,255,255,0.55)',
                  textAlign: 'center', lineHeight: 1.3,
                  letterSpacing: '-1px',
                }}
              >
                Scannez.{' '}
                <span style={{ color: '#fff' }}>Comparez.</span>{' '}
                <span style={{ color: GREEN }}>Économisez.</span>
              </motion.p>

              {/* Pulsing ring */}
              <motion.div
                animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  bottom: 160,
                  width: 14, height: 14,
                  borderRadius: '50%',
                  background: GREEN,
                  boxShadow: `0 0 24px ${GREEN}`,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Persistent bottom bar (watermark) */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 80,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          paddingBottom: 24,
          pointerEvents: 'none',
        }}>
          <span style={{ fontFamily: 'monospace', fontSize: 18, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>
            basketbeta.com
          </span>
        </div>

      </div>
    </div>
  )
}
