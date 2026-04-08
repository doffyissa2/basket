'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'

// ─── Constants ────────────────────────────────────────────────────────────────
const G   = '#7ed957'
const W   = 1080
const H   = 1920
const EXPO_OUT  = [0.16, 1, 0.3, 1] as const
const BACK_OUT  = [0.34, 1.56, 0.64, 1] as const
const EXPO_IN   = [0.7, 0, 0.84, 0] as const

// ─── Extended item list (15 items for scroll effect) ─────────────────────────
const ALL_ITEMS = [
  { name: 'Coca-Cola 1.5L',         price: 2.39, store: 'Aldi',        save: 0.80 },
  { name: 'Pain complet 500g',       price: 1.79, store: 'Leclerc',     save: 0.55 },
  { name: 'Camembert 250g',          price: 2.49, store: 'Lidl',        save: 0.70 },
  { name: 'Riz basmati 1kg',         price: 2.29, store: 'Intermarché', save: 0.60 },
  { name: 'Gruyère râpé 200g',       price: 2.69, store: 'Aldi',        save: 0.50 },
  { name: 'Oeufs fermiers x12',      price: 3.49, store: 'Lidl',        save: 0.90 },
  { name: 'Thon en boîte x3',        price: 4.29, store: 'Leclerc',     save: 0.80 },
  { name: 'Yaourts nature x8',       price: 3.20, store: 'Lidl',        save: 0.70 },
  { name: 'Beurre Président 250g',   price: 2.89, store: 'Aldi',        save: 0.64 },
  { name: 'Lait demi-écrémé 1L',     price: 1.29, store: 'Aldi',        save: 0.70 },
  { name: 'Pâtes Barilla 500g',      price: 1.55, store: 'Leclerc',     save: 0.56 },
  { name: 'Jambon cuit 4 tranches',  price: 2.99, store: 'Intermarché', save: 0.70 },
  // SLOW last 3 — dramatic reveals
  { name: 'Huile d\'olive 75cl',     price: 8.99, store: 'Lidl',        save: 2.10 },
  { name: 'Saumon fumé 200g',        price: 6.49, store: 'Aldi',        save: 1.80 },
  { name: 'Nutella 750g',            price: 5.99, store: 'Leclerc',     save: 1.60 },
]
const TOTAL_SAVING = ALL_ITEMS.reduce((s, i) => s + i.save, 0)  // ~12.35€

// ─── Map pins ─────────────────────────────────────────────────────────────────
const PINS = [
  { name: 'Aldi',        tag: '0,59 €/L', x: 22, y: 40, best: true,  dist: '320 m',  drop: 0.0  },
  { name: 'Lidl',        tag: '2,25 €',   x: 63, y: 28, best: true,  dist: '540 m',  drop: 0.12 },
  { name: 'Leclerc',     tag: '0,99 €',   x: 45, y: 68, best: true,  dist: '780 m',  drop: 0.22 },
  { name: 'Carrefour',   tag: '1,29 €',   x: 76, y: 58, best: false, dist: '1,2 km', drop: 0.32 },
  { name: 'Intermarché', tag: '2,29 €',   x: 56, y: 50, best: false, dist: '950 m',  drop: 0.18 },
]

// ─── Supermarket background ───────────────────────────────────────────────────
const SHELF_COLORS = [
  ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#c0392b','#2980b9','#27ae60',
   '#d35400','#8e44ad','#16a085','#f1c40f','#e91e63','#00bcd4','#ff5722','#607d8b','#795548','#ff9800'],
  ['#4caf50','#2196f3','#ff5722','#9c27b0','#00bcd4','#ffc107','#e91e63','#673ab7','#03a9f4','#8bc34a',
   '#ff9800','#f44336','#009688','#3f51b5','#cddc39','#795548','#607d8b','#9e9e9e','#ff5252','#69f0ae'],
  ['#b71c1c','#0d47a1','#1b5e20','#f57f17','#4a148c','#006064','#e65100','#880e4f','#1a237e','#33691e'],
]
const SHELF_HEIGHTS = [72,60,80,68,76,64,72,58,82,70,66,74,62,78,72,60,80,68,76,64]

function SupermarketBG() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* Store atmosphere */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #0e0b04 0%, #1a1208 35%, #211610 65%, #160f08 100%)' }} />

      {/* Ceiling structure */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 110, background: 'linear-gradient(180deg, #0a0704, #121008)' }}>
        {/* Ceiling grid beams */}
        {[0,1,2,3,4,5].map(i => (
          <div key={i} style={{ position: 'absolute', left: `${i * 18}%`, top: 0, bottom: 0, width: 3, background: 'rgba(255,255,200,0.04)' }} />
        ))}
      </div>

      {/* Fluorescent overhead lights */}
      {[140, 400, 660, 920].map((x, i) => (
        <div key={i} style={{ position: 'absolute', left: x, top: 18, width: 180, height: 14, zIndex: 2 }}>
          <motion.div
            style={{ width: '100%', height: '100%', background: '#fffff0', borderRadius: 7, boxShadow: '0 0 30px 12px rgba(255,255,200,0.35), 0 0 80px 30px rgba(255,255,180,0.12)' }}
            animate={{ opacity: [1, 0.88, 1, 0.93, 1] }}
            transition={{ duration: 3 + i * 0.7, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Light cone downward */}
          <div style={{
            position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
            width: 600, height: 500, opacity: 0.08,
            background: 'linear-gradient(180deg, rgba(255,255,200,0.9), transparent)',
            clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
            pointerEvents: 'none',
          }} />
        </div>
      ))}

      {/* Back shelving units (3 rows) */}
      {[160, 300, 440].map((top, rowIdx) => (
        <div key={rowIdx} style={{ position: 'absolute', left: 0, right: 0, top, height: 110 }}>
          {/* Shelf board */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 14, background: 'linear-gradient(180deg, #2a1c0e, #1a1108)', boxShadow: '0 4px 12px rgba(0,0,0,0.6)' }} />
          {/* Metal shelf front edge */}
          <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, height: 4, background: 'rgba(255,255,200,0.06)' }} />
          {/* Products row */}
          <div style={{ position: 'absolute', bottom: 14, left: 0, right: 0, height: 96, display: 'flex', alignItems: 'flex-end', gap: 3, paddingLeft: 8 }}>
            {SHELF_COLORS[rowIdx].map((color, i) => (
              <div key={i} style={{
                width: 48, height: SHELF_HEIGHTS[i % SHELF_HEIGHTS.length],
                background: color,
                flexShrink: 0, borderRadius: '3px 3px 0 0',
                opacity: 0.55 + (i % 3) * 0.12,
                boxShadow: `inset -4px 0 8px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.06)`,
              }} />
            ))}
          </div>
        </div>
      ))}

      {/* Aisle floor — perspective tiles */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 700 }}>
        <svg viewBox="0 0 1080 700" style={{ width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a1208" stopOpacity="0" />
              <stop offset="100%" stopColor="#0e0b06" stopOpacity="1" />
            </linearGradient>
          </defs>
          {/* Perspective floor tiles */}
          {[0,1,2,3,4,5,6].map(row =>
            [0,1,2,3,4,5,6,7].map(col => {
              const y0 = row * 100
              const y1 = (row + 1) * 100
              const spread0 = row * 12
              const spread1 = (row + 1) * 12
              const tileW = 135 + spread0
              const tileX = col * (135 + spread0) - spread0 * 3
              return (
                <rect key={`${row}-${col}`}
                  x={tileX + 2} y={y0 + 2}
                  width={tileW - 4} height={96}
                  rx={2} fill="rgba(255,255,255,0.015)"
                  stroke="rgba(255,255,200,0.04)" strokeWidth="1"
                />
              )
            })
          )}
          {/* Floor gradient overlay */}
          <rect width="1080" height="700" fill="url(#floorGrad)" />
          {/* Reflection strip */}
          <ellipse cx="540" cy="100" rx="400" ry="30" fill="rgba(255,255,200,0.025)" />
        </svg>
      </div>

      {/* Depth haze — makes background feel far away */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,8,4,0.45)', backdropFilter: 'blur(1px)', pointerEvents: 'none' }} />

      {/* Warm ambient fill from ceiling lights */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '60%', background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,180,0.06), transparent)', pointerEvents: 'none' }} />
    </div>
  )
}

// ─── Large receipt (held-up view) ─────────────────────────────────────────────
const RECEIPT_ITEMS = ALL_ITEMS.slice(7, 12)  // show 5 items clearly

function LargeReceipt() {
  return (
    <div style={{
      width: 820, background: '#F8F2E4',
      borderRadius: 12, padding: '44px 52px 48px',
      boxShadow: '0 60px 120px rgba(0,0,0,0.8), 0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.2)',
      position: 'relative', overflow: 'hidden', fontFamily: 'monospace',
    }}>
      {/* Paper texture overlay */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.03, background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.5) 2px, rgba(0,0,0,0.5) 3px)' }} />

      {/* Store header */}
      <div style={{ textAlign: 'center', marginBottom: 24, paddingBottom: 20, borderBottom: '2px dashed rgba(0,0,0,0.18)' }}>
        <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '0.18em', color: '#111', textTransform: 'uppercase' }}>CARREFOUR MARKET</div>
        <div style={{ fontSize: 18, color: '#777', marginTop: 6, letterSpacing: '0.05em' }}>Paris 11ème  ·  06/04/2026  ·  14:32</div>
        <div style={{ fontSize: 16, color: '#999', marginTop: 4 }}>TICKET N° 4728-A</div>
      </div>

      {/* Items */}
      {RECEIPT_ITEMS.map((item) => (
        <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16, gap: 16 }}>
          <span style={{ fontSize: 26, color: '#333', flex: 1, letterSpacing: '-0.02em' }}>{item.name}</span>
          <span style={{ fontSize: 30, fontWeight: 700, color: '#111', flexShrink: 0 }}>{item.price.toFixed(2).replace('.', ',')} €</span>
        </div>
      ))}
      {/* Dots separator */}
      <div style={{ display: 'flex', gap: 5, margin: '16px 0 20px' }}>
        {Array.from({ length: 52 }).map((_, i) => <div key={i} style={{ flex: 1, height: 2, background: 'rgba(0,0,0,0.12)', borderRadius: 1 }} />)}
      </div>

      {/* Total */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 32, fontWeight: 900, color: '#111', letterSpacing: '0.08em' }}>TOTAL TTC</span>
        <span style={{ fontSize: 44, fontWeight: 900, color: '#111' }}>11,92 €</span>
      </div>

      {/* Barcode at bottom */}
      <div style={{ marginTop: 24, display: 'flex', gap: 2, height: 40 }}>
        {Array.from({ length: 70 }).map((_, i) => (
          <div key={i} style={{ flex: i % 5 === 0 ? 2 : 1, background: '#222', borderRadius: 1, opacity: 0.7 + (i % 3) * 0.1 }} />
        ))}
      </div>
      <div style={{ fontSize: 14, color: '#999', textAlign: 'center', marginTop: 8, letterSpacing: '0.2em' }}>4728-A-2026-0604</div>
    </div>
  )
}

// ─── Realistic white hands holding receipt ────────────────────────────────────
function HoldingHands() {
  const skin     = '#F5C8A8'
  const skinMid  = '#E8AA84'
  const skinDark = '#D4906A'
  const nail     = '#F8E0CC'

  return (
    <svg width="960" height="320" viewBox="0 0 960 320" style={{ position: 'absolute', bottom: -80, left: '50%', transform: 'translateX(-50%)', zIndex: 5 }}>
      <defs>
        <linearGradient id="skinL" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={skin} />
          <stop offset="100%" stopColor={skinMid} />
        </linearGradient>
        <linearGradient id="skinR" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skin} />
          <stop offset="100%" stopColor={skinMid} />
        </linearGradient>
      </defs>

      {/* ── LEFT HAND ── */}
      <g>
        {/* Palm */}
        <path d="M 40 320 C 40 260, 60 220, 90 200 L 250 200 C 270 220, 280 260, 270 320 Z" fill="url(#skinL)" />
        {/* Palm shading */}
        <path d="M 100 280 C 130 260, 210 260, 240 280" stroke={skinDark} strokeWidth="2" fill="none" opacity="0.3" />
        {/* Thumb */}
        <path d="M 42 240 C 14 230, 4 210, 10 185 C 16 162, 36 158, 52 168 C 64 176, 68 198, 68 214" fill={skin} />
        <path d="M 18 192 Q 28 186 40 188" stroke={skinDark} strokeWidth="1.5" fill="none" opacity="0.4" />
        {/* Thumbnail */}
        <ellipse cx="22" cy="180" rx="8" ry="6" fill={nail} opacity="0.7" />
        {/* Index finger */}
        <rect x="80"  y="10" width="40" height="196" rx="20" fill={skin} />
        <path d="M 88 120 Q 100 116 112 120" stroke={skinDark} strokeWidth="2" fill="none" opacity="0.4" />
        <path d="M 88 155 Q 100 150 112 155" stroke={skinDark} strokeWidth="2" fill="none" opacity="0.3" />
        <ellipse cx="100" cy="20" rx="14" ry="10" fill={nail} opacity="0.6" />
        {/* Middle finger */}
        <rect x="126" y="0"  width="40" height="206" rx="20" fill={skin} />
        <path d="M 134 115 Q 146 110 158 115" stroke={skinDark} strokeWidth="2" fill="none" opacity="0.4" />
        <path d="M 134 152 Q 146 147 158 152" stroke={skinDark} strokeWidth="2" fill="none" opacity="0.3" />
        <ellipse cx="146" cy="12"  rx="14" ry="10" fill={nail} opacity="0.6" />
        {/* Ring finger */}
        <rect x="172" y="8"  width="38" height="198" rx="19" fill={skin} />
        <path d="M 179 122 Q 191 117 203 122" stroke={skinDark} strokeWidth="2" fill="none" opacity="0.4" />
        <ellipse cx="191" cy="20"  rx="13" ry="9" fill={nail} opacity="0.6" />
        {/* Pinky */}
        <rect x="216" y="28" width="32" height="178" rx="16" fill={skin} />
        <ellipse cx="232" cy="40"  rx="11" ry="8" fill={nail} opacity="0.6" />
        {/* Wrist shading line */}
        <path d="M 55 308 Q 155 295 265 308" stroke={skinDark} strokeWidth="2.5" fill="none" opacity="0.25" />
      </g>

      {/* ── RIGHT HAND (mirrored) ── */}
      <g transform="translate(960, 0) scale(-1, 1)">
        <path d="M 40 320 C 40 260, 60 220, 90 200 L 250 200 C 270 220, 280 260, 270 320 Z" fill="url(#skinR)" />
        <path d="M 100 280 C 130 260, 210 260, 240 280" stroke={skinDark} strokeWidth="2" fill="none" opacity="0.3" />
        <path d="M 42 240 C 14 230, 4 210, 10 185 C 16 162, 36 158, 52 168 C 64 176, 68 198, 68 214" fill={skin} />
        <path d="M 18 192 Q 28 186 40 188" stroke={skinDark} strokeWidth="1.5" fill="none" opacity="0.4" />
        <ellipse cx="22" cy="180" rx="8" ry="6" fill={nail} opacity="0.7" />
        <rect x="80"  y="10" width="40" height="196" rx="20" fill={skin} />
        <path d="M 88 120 Q 100 116 112 120" stroke={skinDark} strokeWidth="2" fill="none" opacity="0.4" />
        <path d="M 88 155 Q 100 150 112 155" stroke={skinDark} strokeWidth="2" fill="none" opacity="0.3" />
        <ellipse cx="100" cy="20" rx="14" ry="10" fill={nail} opacity="0.6" />
        <rect x="126" y="0"  width="40" height="206" rx="20" fill={skin} />
        <path d="M 134 115 Q 146 110 158 115" stroke={skinDark} strokeWidth="2" fill="none" opacity="0.4" />
        <path d="M 134 152 Q 146 147 158 152" stroke={skinDark} strokeWidth="2" fill="none" opacity="0.3" />
        <ellipse cx="146" cy="12"  rx="14" ry="10" fill={nail} opacity="0.6" />
        <rect x="172" y="8"  width="38" height="198" rx="19" fill={skin} />
        <path d="M 179 122 Q 191 117 203 122" stroke={skinDark} strokeWidth="2" fill="none" opacity="0.4" />
        <ellipse cx="191" cy="20"  rx="13" ry="9" fill={nail} opacity="0.6" />
        <rect x="216" y="28" width="32" height="178" rx="16" fill={skin} />
        <ellipse cx="232" cy="40"  rx="11" ry="8" fill={nail} opacity="0.6" />
        <path d="M 55 308 Q 155 295 265 308" stroke={skinDark} strokeWidth="2.5" fill="none" opacity="0.25" />
      </g>
    </svg>
  )
}

// ─── Phone frame ──────────────────────────────────────────────────────────────
function PhoneFrame({ children, width = 380 }: { children: React.ReactNode; width?: number }) {
  const h = width * 1.94
  return (
    <div style={{
      width, height: h, background: '#1C1C1E', borderRadius: width * 0.135,
      border: '2px solid #3A3A3C',
      boxShadow: '0 0 0 1px #080808, 0 60px 140px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.07)',
      position: 'relative', overflow: 'hidden', flexShrink: 0,
    }}>
      {/* Dynamic Island */}
      <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', width: width * 0.34, height: 38, background: '#000', borderRadius: 20, zIndex: 20 }} />
      <div style={{ position: 'absolute', inset: 3, borderRadius: width * 0.13, overflow: 'hidden', background: '#0A0A0A' }}>
        {children}
      </div>
      <div style={{ position: 'absolute', right: -4, top: 160, width: 5, height: 90, background: '#3A3A3C', borderRadius: '0 3px 3px 0' }} />
      <div style={{ position: 'absolute', left: -4, top: 140, width: 5, height: 52, background: '#3A3A3C', borderRadius: '3px 0 0 3px' }} />
      <div style={{ position: 'absolute', left: -4, top: 208, width: 5, height: 52, background: '#3A3A3C', borderRadius: '3px 0 0 3px' }} />
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
  return <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 999, background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.65) 100%)' }} />
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
      {[0,1,2,3].map(r => [0,1,2,3].map(c => <rect key={`${r}-${c}`} x={c*100+4} y={r*100+4} width={92} height={92} rx={4} fill="#111D27" />))}
      <rect x={104} y={104} width={80} height={80} rx={8} fill="#0D1F14" opacity={0.9} />
      <rect x={220} y={210} width={60} height={50} rx={6} fill="#0D1F14" opacity={0.7} />
      {[96, 196, 296].map(y => <rect key={y} x={0} y={y} width={400} height={12} fill="#162230" />)}
      {[96, 196, 296].map(x => <rect key={x} x={x} y={0} width={12} height={400} fill="#162230" />)}
      {[102,202,302].map(x => [0,1,2,3,4,5,6,7].map(i => <rect key={`vd-${x}-${i}`} x={x} y={i*50+10} width={3} height={24} rx={1} fill="#1E3040" />))}
      {[102,202,302].map(y => [0,1,2,3,4,5,6,7].map(i => <rect key={`hd-${y}-${i}`} x={i*50+10} y={y} width={24} height={3} rx={1} fill="#1E3040" />))}
    </svg>
  )
}

// ─── Ambient particles ────────────────────────────────────────────────────────
function Particles({ count = 20 }: { count?: number }) {
  const pts = useRef(Array.from({ length: count }, (_, i) => ({
    id: i, x: (i * 37) % 100, y: (i * 53) % 100,
    s: 2 + (i % 4), d: 5 + (i % 6), delay: (i % 5) * 1.1
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
  const [scale, setScale]   = useState(1)
  const [elapsed, setElapsed] = useState(0)

  // ── Scene state ──
  const [scene, setScene] = useState<'world'|'items'|'map'|'finale'>('world')

  // World scene
  const [showReceipt, setShowReceipt] = useState(false)
  const [showPhone,   setShowPhone]   = useState(false)
  const [phoneScan,   setPhoneScan]   = useState(false)

  // Items scene
  const [activeItem,    setActiveItem]    = useState(-1)   // which item is "centered"
  const [revealedItems, setRevealedItems] = useState<number[]>([]) // items that have their badge
  const [runningTotal,  setRunningTotal]  = useState(0)
  const [isSlow,        setIsSlow]        = useState(false)
  const [showSavings,   setShowSavings]   = useState(false)
  const [runCounter,    setRunCounter]    = useState(false)
  const [flashGreen,    setFlashGreen]    = useState(false)

  // Map scene
  const [pinsVisible,  setPinsVisible]  = useState(false)
  const [spotlightPin, setSpotlightPin] = useState(-1)

  // Finale
  const [showLogo,    setShowLogo]    = useState(false)
  const [showUrl,     setShowUrl]     = useState(false)
  const [showTagline, setShowTagline] = useState(false)

  // ── Camera ──
  const camScale = useMotionValue(1)
  const camX     = useMotionValue(0)
  const camY     = useMotionValue(0)
  const camRotZ  = useMotionValue(0)
  const camBlur  = useMotionValue(0)
  const filterStyle = useTransform([camBlur] as const, ([b]: number[]) => `blur(${b}px)`)

  // List scroll position (for items scene)
  const listY = useMotionValue(0)
  const listBlur = useMotionValue(0)
  const listFilter = useTransform([listBlur] as const, ([b]: number[]) => `blur(${b}px)`)

  // ── Viewport scale ──
  useEffect(() => {
    const upd = () => setScale(Math.min(window.innerWidth / W, window.innerHeight / H))
    upd(); window.addEventListener('resize', upd); return () => window.removeEventListener('resize', upd)
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
    const at = (ms: number, fn: () => void) => { T.push(setTimeout(fn, ms)); return ms }

    // ──────────── ACT 1: SUPERMARKET (0-5.2s) ────────────
    at(400,  () => setShowReceipt(true))

    // Camera: very slow push inward while person holds receipt
    at(400,  () => animate(camScale, 1.12, { duration: 4.5, ease: 'easeOut' }))
    at(400,  () => animate(camRotZ, -0.8, { duration: 4.5, ease: 'easeOut' }))
    at(400,  () => animate(camY, 30, { duration: 4.5, ease: 'easeOut' }))

    at(1600, () => setShowPhone(true))
    // Phone arrival: camera bump
    at(1600, () => animate(camY, 20, { duration: 0.4, ease: BACK_OUT }))
    at(2200, () => setPhoneScan(true))

    // Camera creeps forward more aggressively as scan begins
    at(2200, () => animate(camScale, 1.35, { duration: 2.5, ease: EXPO_OUT }))

    // ──────────── CRASH ZOOM (5.2s) ────────────
    at(5200, () => {
      animate(camBlur, 22, { duration: 0.25, ease: EXPO_IN }).then(() => {
        animate(camScale, 6, { duration: 0.2, ease: EXPO_IN }).then(() => {
          setScene('items')
          setActiveItem(0)
          // Reset camera instantly
          animate(camScale, 1, { duration: 0 })
          animate(camX,     0, { duration: 0 })
          animate(camY,     0, { duration: 0 })
          animate(camRotZ,  0, { duration: 0 })
          animate(camBlur,  0, { duration: 0.3, ease: EXPO_OUT })
        })
      })
    })

    // ──────────── ACT 2: ITEMS SCROLL (5.8-14.5s) ────────────
    const ITEM_H = 220   // px per item in the list
    const CENTER_Y = H / 2 - ITEM_H / 2   // where "active" item sits

    // Fast phase: items 0-11, 280ms each (scroll + blur)
    const fastStart = 5800
    for (let i = 0; i < 12; i++) {
      at(fastStart + i * 280, () => {
        setActiveItem(i)
        // Scroll list so item i is centered
        animate(listY, CENTER_Y - i * ITEM_H, { duration: 0.22, ease: EXPO_IN })
        animate(listBlur, 10, { duration: 0.11, ease: EXPO_IN }).then(() =>
          animate(listBlur, 0, { duration: 0.11, ease: EXPO_OUT })
        )
      })
      // Reveal badge slightly after item lands
      at(fastStart + i * 280 + 140, () => {
        setRevealedItems(prev => [...prev, i])
        setRunningTotal(prev => prev + ALL_ITEMS[i].save)
      })
    }

    // Slow phase: items 12-14
    const slowStart = fastStart + 12 * 280  // = 5800 + 3360 = 9160ms

    // Slow item 12
    at(slowStart, () => {
      setIsSlow(true)
      setActiveItem(12)
      animate(listY, CENTER_Y - 12 * ITEM_H, { duration: 0.7, ease: [0.22, 1, 0.36, 1] })
      animate(camScale, 1.18, { duration: 0.6, ease: BACK_OUT })
    })
    at(slowStart + 600, () => {
      setRevealedItems(prev => [...prev, 12])
      setRunningTotal(prev => prev + ALL_ITEMS[12].save)
      setFlashGreen(true)
      setTimeout(() => setFlashGreen(false), 300)
      animate(camScale, 1, { duration: 0.4, ease: EXPO_OUT })
    })

    // Slow item 13
    at(slowStart + 1600, () => {
      setActiveItem(13)
      animate(listY, CENTER_Y - 13 * ITEM_H, { duration: 0.8, ease: [0.22, 1, 0.36, 1] })
      animate(camScale, 1.22, { duration: 0.7, ease: BACK_OUT })
    })
    at(slowStart + 2300, () => {
      setRevealedItems(prev => [...prev, 13])
      setRunningTotal(prev => prev + ALL_ITEMS[13].save)
      setFlashGreen(true)
      setTimeout(() => setFlashGreen(false), 300)
      animate(camScale, 1, { duration: 0.4, ease: EXPO_OUT })
    })

    // Slow item 14 — GRAND FINALE of items
    at(slowStart + 3300, () => {
      setActiveItem(14)
      animate(listY, CENTER_Y - 14 * ITEM_H, { duration: 1.0, ease: [0.22, 1, 0.36, 1] })
      animate(camScale, 1.28, { duration: 0.8, ease: BACK_OUT })
      // Camera also tilts slightly for drama
      animate(camRotZ, -1.5, { duration: 0.8, ease: BACK_OUT })
    })
    at(slowStart + 4500, () => {
      setRevealedItems(prev => [...prev, 14])
      setRunningTotal(TOTAL_SAVING)
      setFlashGreen(true)
      setTimeout(() => setFlashGreen(false), 400)
      animate(camScale, 1, { duration: 0.5, ease: EXPO_OUT })
      animate(camRotZ,  0, { duration: 0.5, ease: EXPO_OUT })
    })

    // Savings hero
    const savingsT = slowStart + 5400
    at(savingsT, () => {
      setShowSavings(true)
      animate(camScale, 1.06, { duration: 0.5, ease: BACK_OUT })
    })
    at(savingsT + 200, () => setRunCounter(true))

    // ──────────── TRANSITION → MAP (savingsT + 2.2s) ────────────
    const mapT = savingsT + 2200
    at(mapT, () => {
      animate(camX, -300, { duration: 0.3, ease: EXPO_IN }).then(() => {
        setScene('map')
        animate(camX,     0, { duration: 0 })
        animate(camY,     0, { duration: 0 })
        animate(camRotZ,  0, { duration: 0 })
        animate(camScale, 0.15, { duration: 0 })
        animate(camBlur,  12,   { duration: 0 })
        animate(camScale, 1, { duration: 0.9, ease: EXPO_OUT })
        animate(camBlur,  0, { duration: 0.5, ease: EXPO_OUT })
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
      animate(camX, 90, { duration: 0.9, ease: EXPO_OUT })
      animate(camY, 70, { duration: 0.9, ease: EXPO_OUT })
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

  const ITEM_H   = 220
  const CENTER_Y = H / 2 - ITEM_H / 2

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
              <motion.div key="world" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.4 }} transition={{ duration: 0.4 }}
                style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 240 }}>

                <SupermarketBG />

                {/* Receipt + hands */}
                <AnimatePresence>
                  {showReceipt && (
                    <motion.div
                      initial={{ y: 500, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 1.0, ease: EXPO_OUT }}
                      style={{ position: 'relative', zIndex: 10 }}
                    >
                      <motion.div
                        animate={{ y: [0, -8, 0], rotateZ: [0, 0.3, 0, -0.2, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <LargeReceipt />
                        <HoldingHands />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Phone scanning from above */}
                <AnimatePresence>
                  {showPhone && (
                    <motion.div
                      initial={{ y: -700, opacity: 0, rotateZ: 12 }}
                      animate={{ y: -820, opacity: 1, rotateZ: 0 }}
                      transition={{ duration: 0.9, ease: BACK_OUT }}
                      style={{ position: 'absolute', top: '50%', zIndex: 20 }}
                    >
                      {/* Scan beam going down onto receipt */}
                      {phoneScan && (
                        <motion.div
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
                          style={{ position: 'absolute', bottom: -400, left: '50%', transform: 'translateX(-50%)', width: 300, height: 400, background: `linear-gradient(180deg, ${G}44, transparent)`, clipPath: 'polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)', pointerEvents: 'none' }}
                        />
                      )}
                      <motion.div animate={{ y: [-5, 5, -5] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
                        <PhoneFrame width={300}>
                          <div style={{ width: '100%', height: '100%', background: '#0A0A0A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, position: 'relative', overflow: 'hidden' }}>
                            <div style={{ width: 200, height: 150, border: `2px solid ${G}66`, borderRadius: 12, position: 'relative', overflow: 'hidden' }}>
                              {[{t:0,l:0},{t:0,r:0},{b:0,l:0},{b:0,r:0}].map((c, i) => (
                                <div key={i} style={{ position: 'absolute', width: 22, height: 22, ...c, borderTop: 't' in c && c.t === 0 ? `3px solid ${G}` : undefined, borderBottom: 'b' in c && c.b === 0 ? `3px solid ${G}` : undefined, borderLeft: 'l' in c && c.l === 0 ? `3px solid ${G}` : undefined, borderRight: 'r' in c && c.r === 0 ? `3px solid ${G}` : undefined }} />
                              ))}
                              {phoneScan && (
                                <motion.div initial={{ top: 0 }} animate={{ top: '100%' }} transition={{ duration: 1.6, ease: 'linear', repeat: Infinity }}
                                  style={{ position: 'absolute', left: 0, right: 0, height: 3, background: G, boxShadow: `0 0 18px 8px ${G}77` }} />
                              )}
                            </div>
                            <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.7, repeat: Infinity }}
                              style={{ fontFamily: 'monospace', fontSize: 11, color: G, letterSpacing: '0.1em' }}>
                              {phoneScan ? 'SCAN EN COURS...' : 'CADRER LE TICKET'}
                            </motion.span>
                          </div>
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
              <motion.div key="items" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
                style={{ position: 'absolute', inset: 0, background: '#060606', overflow: 'hidden' }}>

                {/* Green flash on badge reveal */}
                <AnimatePresence>
                  {flashGreen && (
                    <motion.div initial={{ opacity: 0.35 }} animate={{ opacity: 0 }} transition={{ duration: 0.3 }}
                      style={{ position: 'absolute', inset: 0, background: G, zIndex: 100, pointerEvents: 'none' }} />
                  )}
                </AnimatePresence>

                {/* Ambient glow */}
                <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 60% 40% at 50% 50%, ${G}06, transparent)`, pointerEvents: 'none' }} />

                {/* Header */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 130, background: 'rgba(6,6,6,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'flex-end', padding: '0 60px 24px', zIndex: 50 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <motion.img src="/basket_logo.png" alt="" style={{ width: 50, height: 50 }}
                      animate={{ rotate: [0, 5, 0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }} />
                    <div>
                      <div style={{ color: '#fff', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 30, fontWeight: 800 }}>Basket IA</div>
                      <div style={{ color: G, fontFamily: 'monospace', fontSize: 15, letterSpacing: '0.14em' }}>
                        ANALYSE · {revealedItems.length}/{ALL_ITEMS.length} articles
                      </div>
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    {[0,1,2].map(i => (
                      <motion.div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: G }}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.7, delay: i * 0.2, repeat: Infinity }} />
                    ))}
                  </div>
                </div>

                {/* Scrolling items list */}
                <motion.div
                  style={{ position: 'absolute', left: 0, right: 0, top: 0, y: listY, filter: listFilter, transformOrigin: 'top center' }}
                >
                  {ALL_ITEMS.map((item, i) => {
                    const isActive    = i === activeItem
                    const isRevealed  = revealedItems.includes(i)
                    const isSlowItem  = i >= 12

                    return (
                      <motion.div key={i}
                        style={{
                          height: ITEM_H, display: 'flex', alignItems: 'center',
                          padding: isActive ? '0 60px' : '0 80px',
                          transition: 'padding 0.3s',
                        }}
                        animate={{
                          opacity: isActive ? 1 : Math.max(0, 1 - Math.abs(i - activeItem) * 0.45),
                          scale:   isActive ? (isSlowItem ? 1.06 : 1) : 0.88,
                        }}
                        transition={{ duration: isSlowItem ? 0.5 : 0.2 }}
                      >
                        <div style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          background: isActive ? (isSlowItem ? `linear-gradient(135deg, #141414, #1a1a14)` : '#141414') : 'rgba(14,14,14,0.6)',
                          borderRadius: isActive ? 28 : 20,
                          padding: isActive ? '32px 44px' : '24px 36px',
                          border: isActive && isRevealed ? `2px solid ${G}44` :
                                  isActive ? '2px solid rgba(255,255,255,0.08)' :
                                  '1px solid rgba(255,255,255,0.03)',
                          boxShadow: isActive && isRevealed ? `0 0 60px ${G}18` : isActive ? '0 20px 60px rgba(0,0,0,0.6)' : 'none',
                          position: 'relative', overflow: 'hidden',
                        }}>
                          {/* Sweep highlight when active */}
                          {isActive && !isRevealed && (
                            <motion.div
                              animate={{ x: ['-120%', '200%'] }}
                              transition={{ duration: 0.6, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.2 }}
                              style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, transparent, ${G}0F, transparent)`, pointerEvents: 'none' }}
                            />
                          )}

                          {/* Status dot */}
                          <div style={{
                            width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginRight: 24,
                            background: isRevealed ? G : isActive ? `${G}44` : 'rgba(255,255,255,0.08)',
                            boxShadow: isRevealed ? `0 0 14px ${G}` : 'none',
                            transition: 'all 0.3s',
                          }} />

                          <span style={{ flex: 1, fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: isActive ? 600 : 400, color: isRevealed ? 'rgba(255,255,255,0.45)' : isActive ? '#fff' : 'rgba(255,255,255,0.25)', fontSize: isActive ? (isSlowItem ? 38 : 32) : 26, letterSpacing: '-0.5px' }}>
                            {item.name}
                          </span>

                          {/* Badge */}
                          <AnimatePresence>
                            {isRevealed && (
                              <motion.div
                                initial={{ scale: 0, opacity: 0, x: 60 }}
                                animate={{ scale: 1, opacity: 1, x: 0 }}
                                transition={{ type: 'spring', stiffness: isSlowItem ? 600 : 800, damping: isSlowItem ? 18 : 22 }}
                                style={{ background: '#dfffc4', border: `2px solid ${G}`, borderRadius: 16, padding: isSlowItem ? '12px 24px' : '8px 18px', marginRight: 20, textAlign: 'right', flexShrink: 0 }}
                              >
                                <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: isSlowItem ? 24 : 18, fontWeight: 900, color: '#0f5000' }}>{item.store}</div>
                                <div style={{ fontFamily: 'monospace', fontSize: isSlowItem ? 28 : 20, fontWeight: 900, color: '#1a7000' }}>−{item.save.toFixed(2).replace('.', ',')} €</div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <span style={{
                            fontFamily: 'monospace', flexShrink: 0,
                            fontSize: isActive ? (isSlowItem ? 44 : 36) : 28, fontWeight: 700,
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
                </motion.div>

                {/* Running savings total — bottom strip */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 140, background: 'linear-gradient(180deg, transparent, rgba(6,6,6,0.98))', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 28, zIndex: 50 }}>
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

                  {/* Savings hero */}
                  <AnimatePresence>
                    {showSavings && (
                      <motion.div key="savings-hero"
                        initial={{ opacity: 0, y: 100, scale: 0.85 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.8, ease: BACK_OUT }}
                        style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent 0%, ${G}1A 40%, ${G}28 100%)`, backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 60px', borderTop: `2px solid ${G}33` }}
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
              <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
                style={{ position: 'absolute', inset: 0 }}>
                <motion.div initial={{ scale: 0.55 }} animate={{ scale: 1 }} transition={{ duration: 0.9, ease: EXPO_OUT }} style={{ width: '100%', height: '100%', position: 'relative' }}>
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
                <motion.div initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6, duration: 0.7, ease: BACK_OUT }}
                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(5,5,5,0.92)', backdropFilter: 'blur(24px)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '36px 56px 50px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 40 }}>
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
              <motion.div key="finale" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
                style={{ position: 'absolute', inset: 0, background: '#050505', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.2, ease: EXPO_OUT }}
                  style={{ position: 'absolute', width: 1200, height: 1200, borderRadius: '50%', background: `radial-gradient(circle, ${G}10 0%, ${G}03 40%, transparent 70%)`, pointerEvents: 'none' }} />
                {[280, 500, 720].map((r, i) => (
                  <motion.div key={r} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15 + i * 0.12, duration: 0.8, ease: EXPO_OUT }}
                    style={{ position: 'absolute', width: r, height: r, borderRadius: '50%', border: `1px solid ${G}${['18','10','08'][i]}`, pointerEvents: 'none' }} />
                ))}
                <Particles count={32} />
                {showLogo && (
                  <motion.div initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.9, ease: BACK_OUT }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36, marginBottom: 72, position: 'relative' }}>
                    <motion.img src="/basket_logo.png" alt="Basket" style={{ width: 210, height: 210, objectFit: 'contain' }}
                      animate={{ rotate: [0, 5, 0, -5, 0] }} transition={{ duration: 5, repeat: Infinity }} />
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 140, fontWeight: 900, color: '#fff', letterSpacing: '-6px', lineHeight: 1 }}>Basket</span>
                  </motion.div>
                )}
                {showUrl && (
                  <motion.div initial={{ opacity: 0, y: 30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7, ease: BACK_OUT }}
                    style={{ background: `${G}18`, border: `2.5px solid ${G}55`, borderRadius: 32, padding: '26px 80px', marginBottom: 52, boxShadow: `0 0 70px ${G}22` }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 64, fontWeight: 700, color: G, letterSpacing: '-1px' }}>basketbeta.com</span>
                  </motion.div>
                )}
                {showTagline && (
                  <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
                    style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 58, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.3, letterSpacing: '-1px' }}>
                    Scannez.{' '}
                    <motion.span style={{ color: '#fff' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>Comparez.</motion.span>{' '}
                    <motion.span style={{ color: G }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>Économisez.</motion.span>
                  </motion.p>
                )}
                <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.8, 1, 0.8] }} transition={{ duration: 1.6, repeat: Infinity }}
                  style={{ position: 'absolute', bottom: 130, width: 18, height: 18, borderRadius: '50%', background: G, boxShadow: `0 0 32px ${G}` }} />
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </div>
  )
}
