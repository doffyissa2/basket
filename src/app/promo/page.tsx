'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'

// ─── Constants ────────────────────────────────────────────────────────────────
const G        = '#7ed957'
const W        = 1080
const H        = 1920
const EXPO_OUT = [0.16, 1, 0.3, 1] as const
const BACK_OUT = [0.34, 1.56, 0.64, 1] as const
const EXPO_IN  = [0.7, 0, 0.84, 0] as const

// ─── Items (10 items for the new items scene) ────────────────────────────────
const ITEMS = [
  { name: 'Coca-Cola 1.5L',        price: 2.39, store: 'Aldi',        save: 0.80 },
  { name: 'Pain complet 500g',      price: 1.79, store: 'Leclerc',     save: 0.55 },
  { name: 'Camembert 250g',         price: 2.49, store: 'Lidl',        save: 0.70 },
  { name: 'Riz basmati 1kg',        price: 2.29, store: 'Intermarché', save: 0.60 },
  { name: 'Gruyère râpé 200g',      price: 2.69, store: 'Aldi',        save: 0.50 },
  { name: 'Oeufs fermiers x12',     price: 3.49, store: 'Lidl',        save: 0.90 },
  { name: 'Thon en boîte x3',       price: 4.29, store: 'Leclerc',     save: 0.80 },
  { name: 'Yaourts nature x8',      price: 3.20, store: 'Lidl',        save: 0.70 },
  { name: 'Beurre Président 250g',  price: 2.89, store: 'Aldi',        save: 0.64 },
  { name: 'Lait demi-écrémé 1L',    price: 1.29, store: 'Aldi',        save: 0.70 },
]
const TOTAL_SAVING = ITEMS.reduce((s, i) => s + i.save, 0)

// Receipt shows first 7 items
const RECEIPT_ITEMS = ITEMS.slice(0, 7)

// ─── Map pins ─────────────────────────────────────────────────────────────────
const PINS = [
  { name: 'Aldi',        tag: '0,59 €/L', x: 22, y: 40, best: true,  dist: '320 m',  drop: 0.0  },
  { name: 'Lidl',        tag: '2,25 €',   x: 63, y: 28, best: true,  dist: '540 m',  drop: 0.12 },
  { name: 'Leclerc',     tag: '0,99 €',   x: 45, y: 68, best: true,  dist: '780 m',  drop: 0.22 },
  { name: 'Carrefour',   tag: '1,29 €',   x: 76, y: 58, best: false, dist: '1,2 km', drop: 0.32 },
  { name: 'Intermarché', tag: '2,29 €',   x: 56, y: 50, best: false, dist: '950 m',  drop: 0.18 },
]

// ─── Wooden table background ──────────────────────────────────────────────────
function WoodenTable() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* Base wood gradient */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(158deg, #7B4C25 0%, #8E6035 15%, #6B3D1C 35%, #9A6840 50%, #7C4E28 70%, #6D3E1D 100%)',
      }} />

      {/* Wood grain SVG overlay */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 1080 1920" preserveAspectRatio="none">
        {/* 20 organic grain paths */}
        <g stroke="rgba(0,0,0,0.07)" strokeWidth="1.2" fill="none">
          <path d="M 20 0 C 35 400, 15 800, 28 1200 C 40 1600, 22 1750, 18 1920" />
          <path d="M 75 0 C 90 380, 65 760, 80 1140 C 92 1520, 70 1700, 78 1920" />
          <path d="M 130 0 C 148 420, 118 840, 135 1260 C 150 1600, 125 1760, 132 1920" />
          <path d="M 185 0 C 200 390, 172 780, 190 1170 C 205 1560, 178 1730, 188 1920" />
          <path d="M 252 0 C 270 410, 238 820, 256 1230 C 272 1580, 244 1750, 255 1920" />
          <path d="M 318 0 C 338 430, 302 860, 322 1290 C 340 1640, 308 1790, 320 1920" />
          <path d="M 390 0 C 412 400, 372 800, 395 1200 C 415 1560, 382 1740, 393 1920" />
          <path d="M 458 0 C 482 415, 445 830, 462 1245 C 478 1610, 450 1775, 460 1920" />
          <path d="M 530 0 C 555 425, 515 850, 535 1275 C 552 1640, 522 1800, 532 1920" />
          <path d="M 600 0 C 626 410, 588 820, 605 1230 C 622 1590, 595 1760, 603 1920" />
          <path d="M 668 0 C 695 400, 655 800, 672 1200 C 690 1560, 660 1730, 670 1920" />
          <path d="M 735 0 C 763 420, 722 840, 740 1260 C 758 1620, 728 1790, 738 1920" />
          <path d="M 800 0 C 829 415, 788 830, 806 1245 C 825 1610, 793 1775, 803 1920" />
          <path d="M 862 0 C 892 405, 850 810, 869 1215 C 888 1580, 856 1760, 865 1920" />
          <path d="M 920 0 C 950 420, 908 840, 927 1260 C 946 1620, 914 1790, 922 1920" />
          <path d="M 975 0 C 1005 410, 963 820, 982 1230 C 1001 1600, 969 1770, 978 1920" />
          <path d="M 1020 0 C 1048 395, 1010 790, 1028 1185 C 1046 1540, 1016 1720, 1023 1920" />
          <path d="M 1055 0 C 1075 385, 1048 770, 1062 1155 C 1076 1520, 1050 1710, 1058 1920" />
          <path d="M 1070 0 C 1082 400, 1068 800, 1075 1200 C 1082 1560, 1068 1740, 1072 1920" />
          <path d="M 45 0 C 60 440, 38 880, 52 1320 C 64 1680, 40 1810, 46 1920" />
        </g>
        {/* 4 plank edge lines */}
        <g stroke="rgba(0,0,0,0.13)" strokeWidth="2.5" fill="none">
          <line x1="195" y1="0" x2="195" y2="1920" />
          <line x1="390" y1="0" x2="390" y2="1920" />
          <line x1="585" y1="0" x2="585" y2="1920" />
          <line x1="780" y1="0" x2="780" y2="1920" />
        </g>
        {/* 2 wood knots */}
        <g fill="none">
          <ellipse cx="290" cy="620" rx="42" ry="28" stroke="rgba(0,0,0,0.10)" strokeWidth="2" />
          <ellipse cx="290" cy="620" rx="26" ry="17" stroke="rgba(0,0,0,0.07)" strokeWidth="1.5" />
          <ellipse cx="820" cy="1340" rx="36" ry="24" stroke="rgba(0,0,0,0.10)" strokeWidth="2" />
          <ellipse cx="820" cy="1340" rx="22" ry="14" stroke="rgba(0,0,0,0.07)" strokeWidth="1.5" />
        </g>
      </svg>

      {/* Overhead warm light */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 100% 70% at 50% 38%, rgba(255,215,140,0.22), rgba(255,190,90,0.08) 50%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Edge vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 90% 80% at 50% 50%, transparent 42%, rgba(22,9,3,0.6) 100%)',
        pointerEvents: 'none',
      }} />
    </div>
  )
}

// ─── Table receipt ─────────────────────────────────────────────────────────────
function TableReceipt() {
  return (
    <div style={{
      width: 660,
      background: '#FAF5EC',
      borderRadius: 10,
      padding: '40px 48px 44px',
      boxShadow: '12px 20px 70px rgba(18,7,2,0.6), 4px 8px 24px rgba(18,7,2,0.45), 0 2px 6px rgba(18,7,2,0.3), inset 0 1px 0 rgba(255,255,255,0.7)',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'monospace',
    }}>
      {/* Paper texture overlay */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.022,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.5) 2px, rgba(0,0,0,0.5) 3px)',
        pointerEvents: 'none',
      }} />

      {/* Store header */}
      <div style={{ textAlign: 'center', marginBottom: 22, paddingBottom: 18, borderBottom: '2px dashed rgba(0,0,0,0.18)' }}>
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '0.18em', color: '#111', textTransform: 'uppercase' }}>CARREFOUR MARKET</div>
        <div style={{ fontSize: 16, color: '#777', marginTop: 6, letterSpacing: '0.05em' }}>Paris 11ème  ·  08/04/2026  ·  14:32</div>
        <div style={{ fontSize: 14, color: '#999', marginTop: 4 }}>TICKET N° 4728-A</div>
      </div>

      {/* 7 items */}
      {RECEIPT_ITEMS.map((item) => (
        <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, gap: 14 }}>
          <span style={{ fontSize: 22, color: '#333', flex: 1, letterSpacing: '-0.02em' }}>{item.name}</span>
          <span style={{ fontSize: 24, fontWeight: 700, color: '#111', flexShrink: 0 }}>{item.price.toFixed(2).replace('.', ',')} €</span>
        </div>
      ))}

      {/* Dashed separator */}
      <div style={{ display: 'flex', gap: 4, margin: '14px 0 18px' }}>
        {Array.from({ length: 48 }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 2, background: 'rgba(0,0,0,0.12)', borderRadius: 1 }} />
        ))}
      </div>

      {/* Total */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 26, fontWeight: 900, color: '#111', letterSpacing: '0.08em' }}>TOTAL TTC</span>
        <span style={{ fontSize: 40, fontWeight: 900, color: '#111' }}>
          {RECEIPT_ITEMS.reduce((s, i) => s + i.price, 0).toFixed(2).replace('.', ',')} €
        </span>
      </div>

      {/* Barcode */}
      <div style={{ marginTop: 22, display: 'flex', gap: 1.5, height: 38 }}>
        {Array.from({ length: 82 }).map((_, i) => (
          <div key={i} style={{
            flex: i % 7 === 0 ? 2.5 : i % 4 === 0 ? 1.8 : 1,
            background: '#222', borderRadius: 1,
            opacity: 0.65 + (i % 3) * 0.12,
          }} />
        ))}
      </div>
      <div style={{ fontSize: 12, color: '#999', textAlign: 'center', marginTop: 7, letterSpacing: '0.2em' }}>4728-A-2026-0804</div>
    </div>
  )
}

// ─── Phone frame ──────────────────────────────────────────────────────────────
function PhoneFrame({ children, width = 440, scanning }: { children: React.ReactNode; width?: number; scanning?: boolean }) {
  void scanning
  const h = width * 1.955
  const br = width * 0.148

  return (
    <div style={{ width, height: h, position: 'relative', flexShrink: 0 }}>
      {/* Body */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(145deg, #2D2D2D 0%, #1C1C1E 35%, #252525 70%, #1A1A1C 100%)',
        borderRadius: br,
        boxShadow: [
          '0 80px 220px rgba(0,0,0,0.97)',
          '0 30px 80px rgba(0,0,0,0.85)',
          '0 0 0 1px rgba(255,255,255,0.06)',
          'inset 0 1px 0 rgba(255,255,255,0.09)',
          'inset 0 -1px 0 rgba(0,0,0,0.5)',
        ].join(', '),
      }} />

      {/* Frame sheen */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: br,
        background: 'linear-gradient(155deg, rgba(255,255,255,0.09) 0%, transparent 35%)',
        pointerEvents: 'none', zIndex: 5,
      }} />

      {/* Screen bezel */}
      <div style={{
        position: 'absolute', top: 7, left: 7, right: 7, bottom: 7,
        borderRadius: br - 5,
        overflow: 'hidden',
        background: '#000',
        zIndex: 2,
      }}>
        {children}
        {/* Glass reflection */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(140deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 30%, transparent 60%)',
        }} />
      </div>

      {/* Dynamic Island */}
      <div style={{
        position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)',
        width: width * 0.315, height: 38,
        background: '#000', borderRadius: 22,
        zIndex: 10,
      }} />

      {/* Power button (right side) */}
      <div style={{
        position: 'absolute', right: -5.5, top: h * 0.308,
        width: 6, height: h * 0.132,
        background: 'linear-gradient(180deg, #3A3A3C, #2A2A2C)',
        borderRadius: '0 3px 3px 0',
      }} />

      {/* Action button (left top) */}
      <div style={{
        position: 'absolute', left: -5.5, top: h * 0.19,
        width: 6, height: h * 0.048,
        background: 'linear-gradient(180deg, #3A3A3C, #2A2A2C)',
        borderRadius: '3px 0 0 3px',
      }} />

      {/* Volume up (left) */}
      <div style={{
        position: 'absolute', left: -5.5, top: h * 0.262,
        width: 6, height: h * 0.095,
        background: 'linear-gradient(180deg, #3A3A3C, #2A2A2C)',
        borderRadius: '3px 0 0 3px',
      }} />

      {/* Volume down (left) */}
      <div style={{
        position: 'absolute', left: -5.5, top: h * 0.378,
        width: 6, height: h * 0.095,
        background: 'linear-gradient(180deg, #3A3A3C, #2A2A2C)',
        borderRadius: '3px 0 0 3px',
      }} />

      {/* USB-C port */}
      <div style={{
        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        width: width * 0.145, height: 9,
        background: '#030303',
        borderRadius: 5,
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,1)',
        zIndex: 10,
      }} />

      {/* Speaker holes left */}
      <div style={{ position: 'absolute', bottom: 18, left: '22%', display: 'flex', gap: 5, zIndex: 10 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ width: 5, height: 9, background: '#111', borderRadius: 3 }} />
        ))}
      </div>

      {/* Speaker holes right */}
      <div style={{ position: 'absolute', bottom: 18, right: '22%', display: 'flex', gap: 5, zIndex: 10 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ width: 5, height: 9, background: '#111', borderRadius: 3 }} />
        ))}
      </div>
    </div>
  )
}

// ─── Scan UI (screen content) ─────────────────────────────────────────────────
function ScanUI({ scanning }: { scanning: boolean }) {
  return (
    <div style={{ width: '100%', height: '100%', background: '#060606', position: 'relative', overflow: 'hidden' }}>
      {/* Status bar */}
      <div style={{ position: 'absolute', top: 14, left: 0, right: 0, padding: '0 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 30 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 15, color: '#fff', fontWeight: 600 }}>9:41</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {/* Signal bars */}
          {[5, 8, 11, 14].map((h, i) => (
            <div key={i} style={{ width: 3, height: h, background: i < 3 ? '#fff' : 'rgba(255,255,255,0.3)', borderRadius: 1.5 }} />
          ))}
          {/* Battery */}
          <div style={{ width: 22, height: 11, border: '1.5px solid rgba(255,255,255,0.6)', borderRadius: 3, marginLeft: 3, position: 'relative', display: 'flex', alignItems: 'center', padding: '0 1.5px' }}>
            <div style={{ width: '78%', height: 6, background: '#4cd964', borderRadius: 1.5 }} />
            <div style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', width: 2.5, height: 5, background: 'rgba(255,255,255,0.4)', borderRadius: '0 1px 1px 0' }} />
          </div>
        </div>
      </div>

      {/* App bar */}
      <div style={{ position: 'absolute', top: 52, left: 0, right: 0, padding: '0 18px', display: 'flex', alignItems: 'center', gap: 10, zIndex: 30 }}>
        <img src="/basket_logo.png" alt="" style={{ width: 30, height: 30, borderRadius: 8 }} />
        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700, color: '#fff' }}>Basket</span>
        <div style={{ background: G, borderRadius: 10, padding: '3px 12px', marginLeft: 4 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#000', letterSpacing: '0.08em' }}>SCAN</span>
        </div>
      </div>

      {/* Viewfinder frame */}
      <div style={{
        position: 'absolute', top: '18%', left: '8%', right: '8%', bottom: '28%',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16,
        overflow: 'hidden',
      }}>
        {/* Blurry receipt lines inside */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.08, filter: 'blur(2px)' }}>
          {[20, 35, 50, 65, 80].map(top => (
            <div key={top} style={{ position: 'absolute', top: `${top}%`, left: '8%', right: '8%', height: 2, background: '#fff', borderRadius: 1 }} />
          ))}
        </div>

        {/* Corner brackets */}
        {/* Top-left */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 28, height: 28, borderTop: `3px solid ${G}`, borderLeft: `3px solid ${G}` }} />
        {/* Top-right */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: 28, height: 28, borderTop: `3px solid ${G}`, borderRight: `3px solid ${G}` }} />
        {/* Bottom-left */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: 28, height: 28, borderBottom: `3px solid ${G}`, borderLeft: `3px solid ${G}` }} />
        {/* Bottom-right */}
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderBottom: `3px solid ${G}`, borderRight: `3px solid ${G}` }} />

        {/* Scan laser */}
        {scanning && (
          <motion.div
            initial={{ top: '0%' }}
            animate={{ top: '100%' }}
            transition={{ duration: 1.6, ease: 'linear', repeat: Infinity }}
            style={{
              position: 'absolute', left: 0, right: 0, height: 3,
              background: G,
              boxShadow: `0 0 18px 8px ${G}77`,
            }}
          />
        )}
      </div>

      {/* Bottom status */}
      <div style={{ position: 'absolute', bottom: '8%', left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          style={{ width: 8, height: 8, borderRadius: '50%', background: scanning ? G : 'rgba(255,255,255,0.3)', flexShrink: 0 }}
        />
        <motion.span
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          style={{ fontFamily: 'monospace', fontSize: 13, color: scanning ? G : 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}
        >
          {scanning ? 'ANALYSE EN COURS...' : 'PLACEZ LE TICKET'}
        </motion.span>
      </div>
    </div>
  )
}

// ─── Counter ──────────────────────────────────────────────────────────────────
function Counter({ to, run, dec = 2 }: { to: number; run: boolean; dec?: number }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!run) return
    const c = animate(0, to, { duration: 2, ease: EXPO_OUT, onUpdate: setV })
    return c.stop
  }, [run, to, dec])
  return <>{v.toFixed(dec).replace('.', ',')}</>
}

// ─── Vignette ─────────────────────────────────────────────────────────────────
function Vignette() {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 999,
      background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.65) 100%)',
    }} />
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct }: { pct: number }) {
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'rgba(255,255,255,0.05)', zIndex: 1000, pointerEvents: 'none' }}>
      <motion.div style={{ height: '100%', background: G, originX: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.15 }} />
    </div>
  )
}

// ─── CityMap SVG ──────────────────────────────────────────────────────────────
function CityMap() {
  return (
    <svg viewBox="0 0 400 400" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <rect width="400" height="400" fill="#0B151E" />
      {[0, 1, 2, 3].map(r => [0, 1, 2, 3].map(c => (
        <rect key={`${r}-${c}`} x={c * 100 + 4} y={r * 100 + 4} width={92} height={92} rx={4} fill="#111D27" />
      )))}
      <rect x={104} y={104} width={80} height={80} rx={8} fill="#0D1F14" opacity={0.9} />
      <rect x={220} y={210} width={60} height={50} rx={6} fill="#0D1F14" opacity={0.7} />
      {[96, 196, 296].map(y => <rect key={y} x={0} y={y} width={400} height={12} fill="#162230" />)}
      {[96, 196, 296].map(x => <rect key={x} x={x} y={0} width={12} height={400} fill="#162230" />)}
      {[102, 202, 302].map(x => [0, 1, 2, 3, 4, 5, 6, 7].map(i => (
        <rect key={`vd-${x}-${i}`} x={x} y={i * 50 + 10} width={3} height={24} rx={1} fill="#1E3040" />
      )))}
      {[102, 202, 302].map(y => [0, 1, 2, 3, 4, 5, 6, 7].map(i => (
        <rect key={`hd-${y}-${i}`} x={i * 50 + 10} y={y} width={24} height={3} rx={1} fill="#1E3040" />
      )))}
    </svg>
  )
}

// ─── Ambient particles ────────────────────────────────────────────────────────
function Particles({ count = 20 }: { count?: number }) {
  const pts = useRef(Array.from({ length: count }, (_, i) => ({
    id: i, x: (i * 37) % 100, y: (i * 53) % 100,
    s: 2 + (i % 4), d: 5 + (i % 6), delay: (i % 5) * 1.1,
  }))).current
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {pts.map(p => (
        <motion.div key={p.id}
          style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, borderRadius: '50%', background: G, opacity: 0.12 }}
          animate={{ y: [0, -70, 0], opacity: [0.08, 0.28, 0.08] }}
          transition={{ duration: p.d, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PromoPage() {
  const [scale, setScale]     = useState(1)
  const [elapsed, setElapsed] = useState(0)

  // ── Scene state ──
  const [scene, setScene] = useState<'world' | 'items' | 'map' | 'finale'>('world')

  // World scene
  const [showReceipt, setShowReceipt] = useState(false)
  const [showPhone,   setShowPhone]   = useState(false)
  const [phoneScan,   setPhoneScan]   = useState(false)

  // Items scene
  const [visibleItems,  setVisibleItems]  = useState<number[]>([])
  const [revealedItems, setRevealedItems] = useState<number[]>([])
  const [activeItem,    setActiveItem]    = useState(-1)
  const [runningTotal,  setRunningTotal]  = useState(0)
  const [showSavings,   setShowSavings]   = useState(false)
  const [runCounter,    setRunCounter]    = useState(false)

  // Map scene
  const [pinsVisible,  setPinsVisible]  = useState(false)
  const [spotlightPin, setSpotlightPin] = useState(-1)

  // Finale
  const [showLogo,    setShowLogo]    = useState(false)
  const [showUrl,     setShowUrl]     = useState(false)
  const [showTagline, setShowTagline] = useState(false)

  // ── Camera motion values ──
  const camScale = useMotionValue(1)
  const camX     = useMotionValue(0)
  const camY     = useMotionValue(0)
  const camRotZ  = useMotionValue(0)
  const camBlur  = useMotionValue(0)
  const filterStyle = useTransform(camBlur, (v: number) => `blur(${v}px)`)

  // ── Viewport scale ──
  useEffect(() => {
    const upd = () => setScale(Math.min(window.innerWidth / W, window.innerHeight / H))
    upd()
    window.addEventListener('resize', upd)
    return () => window.removeEventListener('resize', upd)
  }, [])

  // ── Elapsed timer ──
  useEffect(() => {
    const t0 = Date.now()
    const iv = setInterval(() => setElapsed(Date.now() - t0), 100)
    return () => clearInterval(iv)
  }, [])

  // ── Master timeline ──
  useEffect(() => {
    const T: ReturnType<typeof setTimeout>[] = []
    const at = (ms: number, fn: () => void) => { T.push(setTimeout(fn, ms)) }

    // ──────────── ACT 1: WORLD (0-5.2s) ────────────
    at(400,  () => setShowReceipt(true))
    at(600,  () => {
      animate(camScale, 1.10, { duration: 4.5, ease: 'easeOut' })
      animate(camY, 30, { duration: 4.5, ease: 'easeOut' })
    })
    at(1600, () => {
      setShowPhone(true)
      animate(camY, 18, { duration: 0.4, ease: BACK_OUT })
    })
    at(2300, () => {
      setPhoneScan(true)
      animate(camScale, 1.32, { duration: 2.5, ease: EXPO_OUT })
    })

    // ──────────── CRASH ZOOM (5.2s) ────────────
    at(5200, () => {
      animate(camBlur, 22, { duration: 0.25, ease: EXPO_IN }).then(() => {
        animate(camScale, 6, { duration: 0.2, ease: EXPO_IN }).then(() => {
          setScene('items')
          setVisibleItems([])
          setRevealedItems([])
          setActiveItem(-1)
          animate(camScale, 1, { duration: 0 })
          animate(camX,     0, { duration: 0 })
          animate(camY,     0, { duration: 0 })
          animate(camRotZ,  0, { duration: 0 })
          animate(camBlur,  0, { duration: 0.3, ease: EXPO_OUT })
        })
      })
    })

    // ──────────── ACT 2: ITEMS (5.8-~10.6s) ────────────
    const ITEM_INTERVAL = 420
    const itemsStart    = 5800

    for (let i = 0; i < 10; i++) {
      const ii = i
      at(itemsStart + ii * ITEM_INTERVAL, () => {
        setVisibleItems(prev => [...prev, ii])
        setActiveItem(ii)
      })
      at(itemsStart + ii * ITEM_INTERVAL + 300, () => {
        setRevealedItems(prev => [...prev, ii])
        setRunningTotal(prev => +(prev + ITEMS[ii].save).toFixed(2))
      })
    }

    const savingsT = itemsStart + 9 * ITEM_INTERVAL + 700  // ~10580ms
    at(savingsT, () => {
      setShowSavings(true)
      animate(camScale, 1.05, { duration: 0.5, ease: BACK_OUT })
    })
    at(savingsT + 200, () => setRunCounter(true))

    // ──────────── TRANSITION → MAP (~12.6s) ────────────
    const mapT = savingsT + 2000
    at(mapT, () => {
      animate(camX, -320, { duration: 0.3, ease: EXPO_IN }).then(() => {
        setScene('map')
        animate(camX,     0, { duration: 0 })
        animate(camY,     0, { duration: 0 })
        animate(camRotZ,  0, { duration: 0 })
        animate(camScale, 0.15, { duration: 0 })
        animate(camBlur,  14, { duration: 0 })
        animate(camScale, 1,  { duration: 0.9, ease: EXPO_OUT })
        animate(camBlur,  0,  { duration: 0.5, ease: EXPO_OUT })
      })
    })

    // ──────────── ACT 3: MAP ────────────
    at(mapT + 600, () => {
      animate(camY, -25, { duration: 0.4, ease: EXPO_OUT }).then(() =>
        animate(camY, 10, { duration: 0.3, ease: EXPO_OUT }).then(() =>
          animate(camY, 0, { duration: 0.4, ease: EXPO_OUT })
        )
      )
    })
    at(mapT + 1000, () => setPinsVisible(true))
    at(mapT + 1200, () => animate(camX, -50, { duration: 2.5, ease: 'easeInOut' }))
    at(mapT + 2800, () => {
      setSpotlightPin(0)
      animate(camX,     90,   { duration: 0.9, ease: EXPO_OUT })
      animate(camY,     70,   { duration: 0.9, ease: EXPO_OUT })
      animate(camScale, 1.55, { duration: 0.9, ease: EXPO_OUT })
    })
    at(mapT + 4000, () => animate(camScale, 2.3, { duration: 0.7, ease: BACK_OUT }))
    at(mapT + 5200, () => {
      animate(camScale, 1, { duration: 1.0, ease: EXPO_OUT })
      animate(camX,     0, { duration: 1.0, ease: EXPO_OUT })
      animate(camY,     0, { duration: 1.0, ease: EXPO_OUT })
    })

    // ──────────── TRANSITION → FINALE ────────────
    const finT = mapT + 6400
    at(finT, () => {
      animate(camBlur, 28, { duration: 0.5, ease: EXPO_IN }).then(() => {
        setScene('finale')
        animate(camBlur,  0, { duration: 0 })
        animate(camScale, 1, { duration: 0 })
        animate(camX,     0, { duration: 0 })
        animate(camY,     0, { duration: 0 })
        animate(camBlur,  0, { duration: 0.5, ease: EXPO_OUT })
      })
    })

    // ──────────── ACT 4: FINALE ────────────
    at(finT + 600,  () => setShowLogo(true))
    at(finT + 1400, () => setShowUrl(true))
    at(finT + 2000, () => setShowTagline(true))
    at(finT + 600,  () => animate(camScale, 1.07, { duration: 2.5, ease: 'easeOut' }))

    return () => T.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'center center', position: 'relative', overflow: 'hidden', background: '#050505' }}>

        <Vignette />
        <ProgressBar pct={Math.min(100, (elapsed / 20000) * 100)} />

        {/* ── Camera wrapper ── */}
        <motion.div style={{ position: 'absolute', inset: 0, scale: camScale, x: camX, y: camY, rotateZ: camRotZ, filter: filterStyle, transformOrigin: 'center center' }}>

          {/* ════════════════ WORLD SCENE ════════════════ */}
          <AnimatePresence>
            {scene === 'world' && (
              <motion.div key="world"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.4 }}
                transition={{ duration: 0.4 }}
                style={{ position: 'absolute', inset: 0 }}
              >
                <WoodenTable />

                {/* Receipt on table */}
                <AnimatePresence>
                  {showReceipt && (
                    <motion.div
                      initial={{ y: 300, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 1.0, ease: EXPO_OUT }}
                      style={{ position: 'absolute', top: 920, left: 'calc(50% - 330px)', zIndex: 10 }}
                    >
                      <motion.div
                        animate={{ y: [0, -8, 0], rotateZ: [-1.5, -1, -1.8, -1.5] }}
                        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ rotateZ: -1.5 }}
                      >
                        <TableReceipt />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Phone scanning from above */}
                <AnimatePresence>
                  {showPhone && (
                    <motion.div
                      initial={{ y: -900, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.9, ease: BACK_OUT }}
                      style={{ position: 'absolute', top: 80, left: 'calc(50% - 220px)', zIndex: 20 }}
                    >
                      {/* Scan beam below phone */}
                      {phoneScan && (
                        <motion.div
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
                          style={{
                            position: 'absolute', bottom: -200, left: '50%', transform: 'translateX(-50%)',
                            width: 560, height: 220,
                            background: `linear-gradient(180deg, ${G}50 0%, ${G}15 60%, transparent 100%)`,
                            clipPath: 'polygon(24% 0%, 76% 0%, 100% 100%, 0% 100%)',
                            pointerEvents: 'none',
                          }}
                        />
                      )}
                      <motion.div
                        animate={{ y: [-4, 4, -4] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <PhoneFrame width={440} scanning={phoneScan}>
                          <ScanUI scanning={phoneScan} />
                        </PhoneFrame>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ════════════════ ITEMS SCENE ════════════════ */}
          <AnimatePresence>
            {scene === 'items' && (
              <motion.div key="items"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ position: 'absolute', inset: 0, background: '#060606', overflow: 'hidden' }}
              >
                {/* Ambient glow */}
                <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 60% 40% at 50% 50%, ${G}06, transparent)`, pointerEvents: 'none' }} />

                {/* Header */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 130,
                  background: 'rgba(6,6,6,0.9)', backdropFilter: 'blur(20px)',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  display: 'flex', alignItems: 'flex-end', padding: '0 60px 24px', zIndex: 50,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <motion.img src="/basket_logo.png" alt="" style={{ width: 50, height: 50 }}
                      animate={{ rotate: [0, 5, 0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }} />
                    <div>
                      <div style={{ color: '#fff', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 30, fontWeight: 800 }}>Basket IA</div>
                      <div style={{ color: G, fontFamily: 'monospace', fontSize: 15, letterSpacing: '0.14em' }}>
                        ANALYSE · {revealedItems.length}/{ITEMS.length} articles
                      </div>
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: G }}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.7, delay: i * 0.2, repeat: Infinity }} />
                    ))}
                  </div>
                </div>

                {/* Items container — no scrolling, all 10 fit */}
                <div style={{
                  position: 'absolute', top: 130, bottom: 160, left: 0, right: 0,
                  padding: '14px 36px', display: 'flex', flexDirection: 'column', gap: 7,
                }}>
                  {ITEMS.map((item, i) => {
                    const isVisible  = visibleItems.includes(i)
                    const isRevealed = revealedItems.includes(i)
                    const isActive   = i === activeItem

                    return (
                      <motion.div
                        key={i}
                        style={{ flex: 1, minHeight: 0 }}
                        initial={{ opacity: 0, x: 110 }}
                        animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: 110 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      >
                        <div style={{
                          height: '100%',
                          display: 'flex', flexDirection: 'row', alignItems: 'center',
                          padding: '0 28px',
                          background: isRevealed
                            ? 'linear-gradient(90deg,#0f1a0c,#0d140a)'
                            : isActive ? '#131313' : '#0c0c0c',
                          borderRadius: 18,
                          border: isRevealed ? `1.5px solid ${G}33` : '1px solid rgba(255,255,255,0.04)',
                          boxShadow: isRevealed ? `0 0 40px ${G}10` : 'none',
                          position: 'relative', overflow: 'hidden',
                          gap: 16,
                        }}>
                          {/* Shimmer sweep when active and not yet revealed */}
                          {isActive && !isRevealed && (
                            <motion.div
                              animate={{ x: ['-120%', '200%'] }}
                              transition={{ duration: 0.6, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.2 }}
                              style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, transparent, ${G}0F, transparent)`, pointerEvents: 'none' }}
                            />
                          )}

                          {/* Status dot */}
                          <div style={{
                            width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                            background: isRevealed ? G : isActive ? `${G}44` : 'rgba(255,255,255,0.08)',
                            boxShadow: isRevealed ? `0 0 14px ${G}` : 'none',
                            transition: 'all 0.3s',
                          }} />

                          {/* Name */}
                          <span style={{
                            flex: 1,
                            fontFamily: "'Plus Jakarta Sans',sans-serif",
                            fontWeight: isActive ? 600 : 400,
                            color: isRevealed ? 'rgba(255,255,255,0.45)' : isActive ? '#fff' : 'rgba(255,255,255,0.3)',
                            fontSize: 30,
                            letterSpacing: '-0.3px',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {item.name}
                          </span>

                          {/* Badge (AnimatePresence) */}
                          <AnimatePresence>
                            {isRevealed && (
                              <motion.div
                                initial={{ scale: 0, opacity: 0, x: 60 }}
                                animate={{ scale: 1, opacity: 1, x: 0 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 600, damping: 22 }}
                                style={{
                                  background: '#dfffc4',
                                  border: `1.5px solid ${G}`,
                                  borderRadius: 14,
                                  padding: '8px 20px',
                                  textAlign: 'right',
                                  flexShrink: 0,
                                }}
                              >
                                <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 900, color: '#0f5000' }}>{item.store}</div>
                                <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 900, color: '#1a7000' }}>−{item.save.toFixed(2).replace('.', ',')} €</div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Price */}
                          <span style={{
                            fontFamily: 'monospace', flexShrink: 0,
                            fontSize: 32, fontWeight: 700,
                            color: isRevealed ? 'rgba(255,255,255,0.2)' : isActive ? '#fff' : 'rgba(255,255,255,0.2)',
                            textDecoration: isRevealed ? 'line-through' : 'none',
                            transition: 'all 0.4s',
                          }}>
                            {item.price.toFixed(2).replace('.', ',')} €
                          </span>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>

                {/* Savings strip */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 160,
                  background: 'linear-gradient(180deg, transparent, rgba(6,6,6,0.98))',
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                  paddingBottom: 28, zIndex: 50,
                }}>
                  <AnimatePresence>
                    {!showSavings && (
                      <motion.div key="running"
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }}
                        style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}
                      >
                        <span style={{ fontFamily: 'monospace', fontSize: 24, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em' }}>ÉCONOMIES</span>
                        <motion.span
                          key={runningTotal}
                          initial={{ scale: 1.3, color: G }}
                          animate={{ scale: 1, color: G }}
                          style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 60, fontWeight: 900, color: G, lineHeight: 1 }}
                        >
                          {runningTotal.toFixed(2).replace('.', ',')} €
                        </motion.span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {showSavings && (
                      <motion.div key="savings-hero"
                        initial={{ opacity: 0, y: 100, scale: 0.85 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.8, ease: BACK_OUT }}
                        style={{
                          position: 'absolute', inset: 0,
                          background: `linear-gradient(180deg, transparent 0%, ${G}1A 40%, ${G}28 100%)`,
                          backdropFilter: 'blur(20px)',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                          padding: '0 60px', borderTop: `2px solid ${G}33`,
                        }}
                      >
                        <span style={{ fontFamily: 'monospace', fontSize: 22, color: G, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Tu pourrais économiser</span>
                        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 110, fontWeight: 900, color: G, lineHeight: 1, letterSpacing: '-4px' }}>
                          <Counter to={TOTAL_SAVING} run={runCounter} /> €
                        </span>
                        <span style={{ fontFamily: 'monospace', fontSize: 22, color: `${G}88` }}>chaque semaine · en changeant de magasin</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ════════════════ MAP SCENE ════════════════ */}
          <AnimatePresence>
            {scene === 'map' && (
              <motion.div key="map"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                style={{ position: 'absolute', inset: 0 }}
              >
                <motion.div
                  initial={{ scale: 0.55 }} animate={{ scale: 1 }}
                  transition={{ duration: 0.9, ease: EXPO_OUT }}
                  style={{ width: '100%', height: '100%', position: 'relative' }}
                >
                  <CityMap />
                </motion.div>

                {/* User location */}
                <div style={{ position: 'absolute', left: '50%', top: '52%', transform: 'translate(-50%,-50%)', zIndex: 20 }}>
                  <motion.div animate={{ scale: [1, 3, 1], opacity: [0.6, 0, 0.6] }} transition={{ repeat: Infinity, duration: 2.2 }}
                    style={{ position: 'absolute', inset: -16, borderRadius: '50%', background: '#4A9EFF22', border: '1.5px solid #4A9EFF66' }} />
                  <motion.div animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }} transition={{ repeat: Infinity, duration: 2.2, delay: 0.4 }}
                    style={{ position: 'absolute', inset: -8, borderRadius: '50%', background: '#4A9EFF33' }} />
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#4A9EFF', border: '3px solid #fff', boxShadow: '0 0 16px #4A9EFF' }} />
                </div>

                {/* Store pins */}
                {PINS.map((pin, idx) => (
                  <AnimatePresence key={pin.name}>
                    {pinsVisible && (
                      <motion.div
                        initial={{ y: -180, opacity: 0, scale: 0.3 }}
                        animate={{ y: 0, opacity: 1, scale: spotlightPin === idx ? 1.6 : 1 }}
                        transition={{ y: { delay: pin.drop, type: 'spring', stiffness: 320, damping: 15 }, scale: { duration: 0.5, ease: BACK_OUT }, opacity: { delay: pin.drop, duration: 0.3 } }}
                        style={{ position: 'absolute', left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%,-100%)', zIndex: spotlightPin === idx ? 30 : 10 }}
                      >
                        {pin.best && (
                          <motion.div animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 2, repeat: Infinity, delay: pin.drop }}
                            style={{ position: 'absolute', inset: -14, borderRadius: 18, background: `${G}22`, border: `1.5px solid ${G}44` }} />
                        )}
                        <div style={{ background: pin.best ? G : '#1C2B38', borderRadius: 18, padding: '12px 22px', border: pin.best ? 'none' : '1.5px solid #2A3D4E', boxShadow: pin.best ? `0 8px 32px ${G}88` : '0 4px 16px rgba(0,0,0,0.6)' }}>
                          <div style={{ fontSize: 22, fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, color: pin.best ? '#000' : '#fff', whiteSpace: 'nowrap' }}>{pin.name}</div>
                          <div style={{ fontSize: 18, fontFamily: 'monospace', fontWeight: 700, color: pin.best ? '#0a3a00' : 'rgba(255,255,255,0.5)' }}>{pin.tag}</div>
                          <div style={{ fontSize: 14, fontFamily: 'monospace', color: pin.best ? '#1a6600' : 'rgba(255,255,255,0.3)', marginTop: 2 }}>{pin.dist}</div>
                        </div>
                        <div style={{ width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderTop: pin.best ? `12px solid ${G}` : '12px solid #1C2B38', margin: '0 auto' }} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                ))}

                {/* Map header */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 150, background: 'linear-gradient(180deg, rgba(5,5,5,0.96) 55%, transparent)', display: 'flex', alignItems: 'flex-end', padding: '0 56px 28px', zIndex: 40 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <img src="/basket_logo.png" alt="" style={{ width: 46, height: 46 }} />
                    <div>
                      <div style={{ fontFamily: 'monospace', fontSize: 18, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em' }}>CARTE DES PRIX</div>
                      <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 38, fontWeight: 800, color: '#fff', lineHeight: 1 }}>Autour de vous</div>
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', background: `${G}22`, border: `1.5px solid ${G}44`, borderRadius: 16, padding: '10px 24px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 18, color: G }}>5 magasins</span>
                  </div>
                </div>

                {/* Bottom info */}
                <motion.div
                  initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.7, ease: BACK_OUT }}
                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(5,5,5,0.92)', backdropFilter: 'blur(24px)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '36px 56px 50px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 40 }}
                >
                  <div>
                    <div style={{ fontFamily: 'monospace', fontSize: 16, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', marginBottom: 6 }}>MEILLEURE OPTION</div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 50, fontWeight: 900, color: '#fff', lineHeight: 1 }}>Aldi · 320 m</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 22, color: G, marginTop: 4 }}>Économisez jusqu&apos;à {TOTAL_SAVING.toFixed(2).replace('.', ',')} €</div>
                  </div>
                  <motion.div animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 2, repeat: Infinity }}
                    style={{ background: G, borderRadius: 22, padding: '22px 40px', boxShadow: `0 0 48px ${G}44` }}>
                    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 32, fontWeight: 900, color: '#000' }}>−{TOTAL_SAVING.toFixed(2).replace('.', ',')} €</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 15, color: 'rgba(0,0,0,0.6)' }}>vs Carrefour</div>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ════════════════ FINALE ════════════════ */}
          <AnimatePresence>
            {scene === 'finale' && (
              <motion.div key="finale"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                style={{ position: 'absolute', inset: 0, background: '#050505', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0 }}
              >
                <motion.div
                  initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 1.2, ease: EXPO_OUT }}
                  style={{ position: 'absolute', width: 1200, height: 1200, borderRadius: '50%', background: `radial-gradient(circle, ${G}10 0%, ${G}03 40%, transparent 70%)`, pointerEvents: 'none' }}
                />
                {[280, 500, 720].map((r, i) => (
                  <motion.div key={r}
                    initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15 + i * 0.12, duration: 0.8, ease: EXPO_OUT }}
                    style={{ position: 'absolute', width: r, height: r, borderRadius: '50%', border: `1px solid ${G}${['18', '10', '08'][i]}`, pointerEvents: 'none' }}
                  />
                ))}
                <Particles count={32} />
                {showLogo && (
                  <motion.div
                    initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.9, ease: BACK_OUT }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36, marginBottom: 72, position: 'relative' }}
                  >
                    <motion.img src="/basket_logo.png" alt="Basket" style={{ width: 210, height: 210, objectFit: 'contain' }}
                      animate={{ rotate: [0, 5, 0, -5, 0] }} transition={{ duration: 5, repeat: Infinity }} />
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 140, fontWeight: 900, color: '#fff', letterSpacing: '-6px', lineHeight: 1 }}>Basket</span>
                  </motion.div>
                )}
                {showUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.7, ease: BACK_OUT }}
                    style={{ background: `${G}18`, border: `2.5px solid ${G}55`, borderRadius: 32, padding: '26px 80px', marginBottom: 52, boxShadow: `0 0 70px ${G}22` }}
                  >
                    <span style={{ fontFamily: 'monospace', fontSize: 64, fontWeight: 700, color: G, letterSpacing: '-1px' }}>basketbeta.com</span>
                  </motion.div>
                )}
                {showTagline && (
                  <motion.p
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 58, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.3, letterSpacing: '-1px' }}
                  >
                    Scannez.{' '}
                    <motion.span style={{ color: '#fff' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>Comparez.</motion.span>{' '}
                    <motion.span style={{ color: G }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>Économisez.</motion.span>
                  </motion.p>
                )}
                <motion.div
                  animate={{ scale: [1, 1.4, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  style={{ position: 'absolute', bottom: 130, width: 18, height: 18, borderRadius: '50%', background: G, boxShadow: `0 0 32px ${G}` }}
                />
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </div>
  )
}
