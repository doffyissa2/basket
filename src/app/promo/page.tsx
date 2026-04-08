'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'

// ─── Palette & canvas ────────────────────────────────────────────────────────
const G  = '#7ed957'   // signal green
const W  = 1080
const H  = 1920

// ─── Receipt data ────────────────────────────────────────────────────────────
const ITEMS = [
  { name: 'Lait demi-écrémé 1L',   price: 1.29, store: 'Aldi',        cheap: 0.59, save: 0.70 },
  { name: 'Beurre Président 250g', price: 2.89, store: 'Lidl',        cheap: 2.25, save: 0.64 },
  { name: 'Pâtes Barilla 500g',    price: 1.55, store: 'Leclerc',     cheap: 0.99, save: 0.56 },
  { name: 'Yaourts nature x8',     price: 3.20, store: 'Lidl',        cheap: 2.40, save: 0.80 },
  { name: 'Jambon cuit 4 tr.',     price: 2.99, store: 'Intermarché', cheap: 2.29, save: 0.70 },
]

// ─── Map store pins ───────────────────────────────────────────────────────────
const PINS = [
  { name: 'Aldi',        tag: '0,59 €/L', x: 22, y: 40, best: true,  dist: '320 m', drop: 0.0 },
  { name: 'Lidl',        tag: '2,25 €',   x: 63, y: 28, best: true,  dist: '540 m', drop: 0.12 },
  { name: 'Leclerc',     tag: '0,99 €',   x: 45, y: 68, best: true,  dist: '780 m', drop: 0.22 },
  { name: 'Carrefour',   tag: '1,29 €',   x: 76, y: 58, best: false, dist: '1,2 km', drop: 0.32 },
  { name: 'Intermarché', tag: '2,29 €',   x: 56, y: 50, best: false, dist: '950 m', drop: 0.18 },
]

// ─── Ease curves ─────────────────────────────────────────────────────────────
const EXPO_OUT  = [0.16, 1, 0.3, 1] as const
const EXPO_IN   = [0.7, 0, 0.84, 0] as const
const BACK_OUT  = [0.34, 1.56, 0.64, 1] as const

// ─── Ambient particles ────────────────────────────────────────────────────────
function Particles({ count = 28, color = G }: { count?: number; color?: string }) {
  const pts = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      s: 1.5 + Math.random() * 3,
      d: 4 + Math.random() * 8,
      delay: Math.random() * 5,
    }))
  ).current
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {pts.map((p) => (
        <motion.div
          key={p.id}
          style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, borderRadius: '50%', background: color, opacity: 0.18 }}
          animate={{ y: [0, -60, 0], opacity: [0.10, 0.35, 0.10] }}
          transition={{ duration: p.d, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

// ─── Text scramble ────────────────────────────────────────────────────────────
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&'
function Scramble({ text, run, duration = 800 }: { text: string; run: boolean; duration?: number }) {
  const [out, setOut] = useState(text.replace(/[^ ]/g, '·'))
  useEffect(() => {
    if (!run) return
    let frame = 0
    const total = Math.ceil(duration / 16)
    const iv = setInterval(() => {
      frame++
      const progress = frame / total
      setOut(
        text.split('').map((ch, i) => {
          if (ch === ' ') return ' '
          if (i / text.length < progress) return ch
          return CHARS[Math.floor(Math.random() * CHARS.length)]
        }).join('')
      )
      if (frame >= total) clearInterval(iv)
    }, 16)
    return () => clearInterval(iv)
  }, [run, text, duration])
  return <>{out}</>
}

// ─── Savings counter ─────────────────────────────────────────────────────────
function Counter({ to, run }: { to: number; run: boolean }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!run) return
    const c = animate(0, to, { duration: 2, ease: EXPO_OUT, onUpdate: setV })
    return c.stop
  }, [run, to])
  return <>{v.toFixed(2).replace('.', ',')}</>
}

// ─── City map SVG background ──────────────────────────────────────────────────
function CityMap() {
  return (
    <svg viewBox="0 0 400 400" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <rect width="400" height="400" fill="#0B151E" />
      {/* City block grid */}
      {[0,1,2,3].map(row => [0,1,2,3].map(col => (
        <rect key={`${row}-${col}`} x={col*100+4} y={row*100+4} width={92} height={92} rx={4} fill="#111D27" />
      )))}
      {/* Parks */}
      <rect x={104} y={104} width={80} height={80} rx={8} fill="#0D1F14" opacity={0.9} />
      <rect x={220} y={210} width={60} height={50} rx={6} fill="#0D1F14" opacity={0.7} />
      {/* Main roads */}
      <rect x={0} y={96} width={400} height={12} fill="#162230" />
      <rect x={0} y={196} width={400} height={12} fill="#162230" />
      <rect x={0} y={296} width={400} height={12} fill="#162230" />
      <rect x={96} y={0} width={12} height={400} fill="#162230" />
      <rect x={196} y={0} width={12} height={400} fill="#162230" />
      <rect x={296} y={0} width={12} height={400} fill="#162230" />
      {/* Road center dashes */}
      {[102,202,302].map(x => [0,1,2,3,4,5,6,7].map(i => (
        <rect key={`vd-${x}-${i}`} x={x} y={i*50+10} width={3} height={24} rx={1} fill="#1E3040" />
      )))}
      {[102,202,302].map(y => [0,1,2,3,4,5,6,7].map(i => (
        <rect key={`hd-${y}-${i}`} x={i*50+10} y={y} width={24} height={3} rx={1} fill="#1E3040" />
      )))}
    </svg>
  )
}

// ─── Phone frame ──────────────────────────────────────────────────────────────
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: 320, height: 620,
      background: '#1C1C1E',
      borderRadius: 52,
      border: '2px solid #3A3A3C',
      boxShadow: '0 0 0 1px #0a0a0a, 0 50px 120px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06)',
      position: 'relative',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Dynamic Island */}
      <div style={{
        position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
        width: 120, height: 34, background: '#000', borderRadius: 20, zIndex: 20,
      }} />
      {/* Screen */}
      <div style={{ position: 'absolute', inset: 2, borderRadius: 50, overflow: 'hidden', background: '#0A0A0A' }}>
        {children}
      </div>
      {/* Side buttons */}
      <div style={{ position: 'absolute', right: -3, top: 140, width: 4, height: 80, background: '#3A3A3C', borderRadius: '0 3px 3px 0' }} />
      <div style={{ position: 'absolute', left: -3, top: 120, width: 4, height: 48, background: '#3A3A3C', borderRadius: '3px 0 0 3px' }} />
      <div style={{ position: 'absolute', left: -3, top: 186, width: 4, height: 48, background: '#3A3A3C', borderRadius: '3px 0 0 3px' }} />
    </div>
  )
}

// ─── App UI: AI parsing screen ────────────────────────────────────────────────
function AppParsingScreen({ badgeIdx }: { badgeIdx: number }) {
  return (
    <div style={{ width: '100%', height: '100%', background: '#0A0A0A', padding: '60px 20px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* App header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <img src="/basket_logo.png" alt="" style={{ width: 22, height: 22 }} />
        <span style={{ color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Basket</span>
        <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: G, boxShadow: `0 0 8px ${G}` }} />
      </div>
      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{ width: 10, height: 10, border: `2px solid ${G}`, borderTopColor: 'transparent', borderRadius: '50%' }} />
        <span style={{ color: G, fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.1em' }}>ANALYSE EN COURS</span>
      </div>
      {/* Items */}
      {ITEMS.map((item, i) => (
        <motion.div
          key={item.name}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: i <= badgeIdx ? 1 : 0.25, x: 0 }}
          transition={{ delay: i * 0.12, duration: 0.3 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#141414', borderRadius: 10, padding: '7px 10px', border: i <= badgeIdx && badgeIdx >= 0 ? `1px solid ${G}33` : '1px solid transparent' }}
        >
          <span style={{ color: i < badgeIdx ? 'rgba(255,255,255,0.5)' : '#fff', fontSize: 9, fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 500, flex: 1 }}>
            <Scramble text={item.name} run={i <= badgeIdx} duration={400} />
          </span>
          {i < badgeIdx && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              style={{ background: '#edffd8', border: `1px solid ${G}`, borderRadius: 6, padding: '2px 6px', fontSize: 8, color: '#1a6600', fontWeight: 700, fontFamily: 'monospace', flexShrink: 0 }}>
              {item.store} −{item.save.toFixed(2).replace('.', ',')}€
            </motion.span>
          )}
          <span style={{ color: i < badgeIdx ? 'rgba(255,255,255,0.3)' : '#fff', fontSize: 10, fontFamily: 'monospace', fontWeight: 700, marginLeft: 6, textDecoration: i < badgeIdx ? 'line-through' : 'none' }}>
            {item.price.toFixed(2).replace('.', ',')}€
          </span>
        </motion.div>
      ))}
    </div>
  )
}

// ─── App UI: map screen ───────────────────────────────────────────────────────
function AppMapScreen({ pinsVisible }: { pinsVisible: boolean }) {
  return (
    <div style={{ width: '100%', height: '100%', background: '#0B151E', position: 'relative', overflow: 'hidden' }}>
      <div style={{ transform: 'scale(1.1)', transformOrigin: 'center', width: '100%', height: '100%' }}>
        <CityMap />
      </div>
      {/* User location */}
      <div style={{ position: 'absolute', left: '48%', top: '49%', transform: 'translate(-50%,-50%)', zIndex: 10 }}>
        <motion.div animate={{ scale: [1, 2.5, 1], opacity: [0.7, 0, 0.7] }} transition={{ repeat: Infinity, duration: 2 }}
          style={{ position: 'absolute', inset: -8, borderRadius: '50%', background: '#4A9EFF33', border: '1.5px solid #4A9EFF88' }} />
        <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#4A9EFF', border: '2.5px solid #fff', boxShadow: '0 0 12px #4A9EFF' }} />
      </div>
      {/* Store pins */}
      {PINS.map((pin) => (
        <AnimatePresence key={pin.name}>
          {pinsVisible && (
            <motion.div
              initial={{ y: -60, opacity: 0, scale: 0.5 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: pin.drop, duration: 0.5, type: 'spring', stiffness: 400, damping: 18 }}
              style={{ position: 'absolute', left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%,-100%)', zIndex: 8 }}
            >
              <div style={{
                background: pin.best ? G : '#1C2B38',
                borderRadius: 8, padding: '3px 8px',
                border: pin.best ? 'none' : '1px solid #2A3D4E',
                boxShadow: pin.best ? `0 4px 16px ${G}66` : '0 2px 8px rgba(0,0,0,0.4)',
              }}>
                <div style={{ fontSize: 8, fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, color: pin.best ? '#000' : 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>{pin.name}</div>
                <div style={{ fontSize: 7, fontFamily: 'monospace', color: pin.best ? '#1a4000' : 'rgba(255,255,255,0.4)' }}>{pin.tag}</div>
              </div>
              <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: pin.best ? `6px solid ${G}` : '6px solid #1C2B38', margin: '0 auto' }} />
            </motion.div>
          )}
        </AnimatePresence>
      ))}
    </div>
  )
}

// ─── Receipt (real-world scene) ───────────────────────────────────────────────
function Receipt() {
  return (
    <div style={{
      background: '#F9F4E6',
      width: 480,
      borderRadius: 8,
      padding: '36px 40px 40px',
      boxShadow: '0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.15)',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'monospace',
    }}>
      {/* Paper grain */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: '200px' }} />
      <div style={{ textAlign: 'center', marginBottom: 20, borderBottom: '1px dashed rgba(0,0,0,0.2)', paddingBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.2em', color: '#111', textTransform: 'uppercase' }}>CARREFOUR MARKET</div>
        <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>Paris 11ème  —  06/04/2026  14:32</div>
      </div>
      {ITEMS.map((it) => (
        <div key={it.name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: '#333' }}>{it.name}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{it.price.toFixed(2).replace('.', ',')} €</span>
        </div>
      ))}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px dashed rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#111', letterSpacing: '0.05em' }}>TOTAL</span>
        <span style={{ fontSize: 18, fontWeight: 900, color: '#111' }}>11,92 €</span>
      </div>
      {/* Perforated bottom */}
      <div style={{ marginTop: 20, display: 'flex', gap: 6 }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 2, background: 'rgba(0,0,0,0.15)', borderRadius: 2 }} />
        ))}
      </div>
    </div>
  )
}

// ─── Hand silhouette ──────────────────────────────────────────────────────────
function HandGrip() {
  return (
    <svg width="320" height="200" viewBox="0 0 320 200" style={{ position: 'absolute', bottom: -40, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}>
      {/* Palm */}
      <path d="M 60 200 Q 60 120 80 100 L 240 100 Q 260 120 260 200 Z" fill="#1A0F0A" />
      {/* Fingers */}
      <rect x="80" y="44" width="32" height="68" rx="16" fill="#1A0F0A" />
      <rect x="120" y="22" width="32" height="90" rx="16" fill="#1A0F0A" />
      <rect x="160" y="18" width="32" height="94" rx="16" fill="#1A0F0A" />
      <rect x="200" y="28" width="32" height="84" rx="16" fill="#1A0F0A" />
      {/* Thumb */}
      <path d="M 62 130 Q 30 118 24 90 Q 22 68 48 68 Q 72 68 80 100" fill="#1A0F0A" />
      {/* Subtle skin highlight */}
      <path d="M 80 100 Q 80 108 86 110 L 236 110 Q 240 108 240 100" fill="rgba(255,200,150,0.04)" />
    </svg>
  )
}

// ─── Vignette overlay ─────────────────────────────────────────────────────────
function Vignette() {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 999,
      background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
    }} />
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ elapsed, total = 20000 }: { elapsed: number; total?: number }) {
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.06)', zIndex: 1000, pointerEvents: 'none' }}>
      <motion.div
        style={{ height: '100%', background: G, originX: 0 }}
        animate={{ width: `${Math.min(100, (elapsed / total) * 100)}%` }}
        transition={{ duration: 0.1 }}
      />
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PromoPage() {
  const [scale, setScale] = useState(1)
  const [elapsed, setElapsed] = useState(0)

  // ── Scene flags ──
  const [showReceipt, setShowReceipt]     = useState(false)
  const [showPhone, setShowPhone]         = useState(false)
  const [phoneScan, setPhoneScan]         = useState(false)
  const [crashZoom, setCrashZoom]         = useState(false)
  const [scene, setScene]                 = useState<'world'|'app'|'map'|'finale'>('world')
  const [badgeIdx, setBadgeIdx]           = useState(-1)
  const [showSavings, setShowSavings]     = useState(false)
  const [runCounter, setRunCounter]       = useState(false)
  const [mapDive, setMapDive]             = useState(false)
  const [pinsVisible, setPinsVisible]     = useState(false)
  const [spotlightPin, setSpotlightPin]   = useState(-1)
  const [showFinalLogo, setShowFinalLogo] = useState(false)
  const [showUrl, setShowUrl]             = useState(false)
  const [showTagline, setShowTagline]     = useState(false)

  // ── Camera motion values ──
  const camScale  = useMotionValue(1)
  const camX      = useMotionValue(0)
  const camY      = useMotionValue(0)
  const camRotZ   = useMotionValue(0)
  const camBlur   = useMotionValue(0)
  const camBrightness = useMotionValue(1)

  // ── Viewport scaling ──
  useEffect(() => {
    const upd = () => setScale(Math.min(window.innerWidth / W, window.innerHeight / H))
    upd()
    window.addEventListener('resize', upd)
    return () => window.removeEventListener('resize', upd)
  }, [])

  // ── Elapsed timer ──
  useEffect(() => {
    const start = Date.now()
    const iv = setInterval(() => setElapsed(Date.now() - start), 100)
    return () => clearInterval(iv)
  }, [])

  // ── Master timeline ──
  useEffect(() => {
    const T: ReturnType<typeof setTimeout>[] = []
    const at = (ms: number, fn: () => void) => { T.push(setTimeout(fn, ms)); return ms }

    // ── ACT 1: WORLD (0-4s) — receipt on table + phone descends ──
    at(300,  () => setShowReceipt(true))
    at(1000, () => setShowPhone(true))

    // Camera drifts slightly to follow phone descend
    at(1000, () => {
      animate(camY, 40, { duration: 1.2, ease: EXPO_OUT })
      animate(camRotZ, -1.5, { duration: 1.2, ease: EXPO_OUT })
    })

    at(1800, () => setPhoneScan(true))

    // Camera creeps forward (push in)
    at(2000, () => {
      animate(camScale, 1.35, { duration: 1.0, ease: EXPO_OUT })
      animate(camY, 60, { duration: 1.0, ease: EXPO_OUT })
    })

    // ── CRASH ZOOM into phone screen ──
    at(3000, () => {
      setCrashZoom(true)
      // Slam forward: scale up fast, blur peaks, then snap
      animate(camBlur, 18, { duration: 0.22, ease: EXPO_IN }).then(() => {
        animate(camScale, 5.5, { duration: 0.22, ease: EXPO_IN }).then(() => {
          setScene('app')
          animate(camScale, 1, { duration: 0 })
          animate(camY, 0, { duration: 0 })
          animate(camRotZ, 0, { duration: 0 })
          animate(camX, 0, { duration: 0 })
          animate(camBlur, 0, { duration: 0.25, ease: EXPO_OUT })
        })
      })
    })

    // ── ACT 2: APP (3.5-10s) — AI parsing ──
    const parseStart = 3600
    ITEMS.forEach((_, i) => {
      at(parseStart + i * 700, () => setBadgeIdx(i - 1))
    })
    at(parseStart + ITEMS.length * 700, () => setBadgeIdx(ITEMS.length))

    // Camera gently tracks down as items appear
    at(parseStart, () => animate(camY, -30, { duration: 3.5, ease: 'easeInOut' }))

    at(8200, () => {
      setShowSavings(true)
      // Camera nudges in on savings reveal
      animate(camScale, 1.08, { duration: 0.6, ease: BACK_OUT })
    })
    at(8500, () => setRunCounter(true))

    // Camera breathes back out
    at(9200, () => animate(camScale, 1, { duration: 0.8, ease: EXPO_OUT }))

    // ── TRANSITION to MAP: swipe + zoom ──
    at(10200, () => {
      animate(camX, -200, { duration: 0.3, ease: EXPO_IN }).then(() => {
        setScene('map')
        setMapDive(true)
        animate(camX, 0, { duration: 0 })
        animate(camY, 0, { duration: 0 })
        // Camera starts FAR above (map tiny), crashes down
        animate(camScale, 0.18, { duration: 0 })
        animate(camBlur, 10, { duration: 0 })
        animate(camScale, 1, { duration: 0.9, ease: EXPO_OUT })
        animate(camBlur, 0, { duration: 0.5, ease: EXPO_OUT })
      })
    })

    // ── ACT 3: MAP (10.5-17s) ──
    at(10700, () => {
      // Camera sways on landing
      animate(camY, -20, { duration: 0.4, ease: EXPO_OUT }).then(() =>
        animate(camY, 8, { duration: 0.3, ease: EXPO_OUT }).then(() =>
          animate(camY, 0, { duration: 0.4, ease: EXPO_OUT })
        )
      )
    })

    at(11200, () => setPinsVisible(true))

    // Camera slowly pans across the map
    at(11500, () => animate(camX, -40, { duration: 2.5, ease: 'easeInOut' }))

    // Spotlight best pin (Aldi)
    at(13000, () => {
      setSpotlightPin(0)
      animate(camX, 80, { duration: 0.9, ease: EXPO_OUT })
      animate(camY, 60, { duration: 0.9, ease: EXPO_OUT })
      animate(camScale, 1.5, { duration: 0.9, ease: EXPO_OUT })
    })

    // Zoom into Aldi pin
    at(14200, () => {
      animate(camScale, 2.2, { duration: 0.7, ease: BACK_OUT })
    })

    // Pull back to overview
    at(15600, () => {
      animate(camScale, 1, { duration: 1.0, ease: EXPO_OUT })
      animate(camX, 0, { duration: 1.0, ease: EXPO_OUT })
      animate(camY, 0, { duration: 1.0, ease: EXPO_OUT })
    })

    // ── TRANSITION to FINALE ──
    at(17000, () => {
      animate(camBlur, 24, { duration: 0.5, ease: EXPO_IN }).then(() => {
        setScene('finale')
        animate(camBlur, 0, { duration: 0 })
        animate(camScale, 1, { duration: 0 })
        animate(camX, 0, { duration: 0 })
        animate(camY, 0, { duration: 0 })
        animate(camBlur, 0, { duration: 0.5, ease: EXPO_OUT })
      })
    })

    // ── ACT 4: FINALE (17.5-20s) ──
    at(17600, () => setShowFinalLogo(true))
    at(18400, () => setShowUrl(true))
    at(19000, () => setShowTagline(true))

    // Finale camera: slow zoom into logo
    at(17600, () => animate(camScale, 1.06, { duration: 2.5, ease: 'easeOut' }))

    return () => T.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Derived filter style ──
  const filterStyle = useTransform(
    [camBlur, camBrightness] as const,
    ([b, br]: number[]) => `blur(${b}px) brightness(${br})`
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>

      {/* ── Canvas ── */}
      <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'center center', position: 'relative', overflow: 'hidden', background: '#050505' }}>

        <Vignette />
        <ProgressBar elapsed={elapsed} />
        <Particles count={20} color={G} />

        {/* ── CAMERA WRAPPER ── */}
        <motion.div
          style={{
            position: 'absolute', inset: 0,
            scale: camScale, x: camX, y: camY, rotateZ: camRotZ,
            filter: filterStyle,
            transformOrigin: 'center center',
          }}
        >

          {/* ══════════ SCENE: WORLD ══════════ */}
          <AnimatePresence>
            {scene === 'world' && (
              <motion.div
                key="world"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 1.3 }}
                transition={{ duration: 0.4 }}
                style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0 }}
              >
                {/* Surface */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%',
                  background: 'linear-gradient(180deg, #0d0d0d 0%, #1a1410 100%)',
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                }} />

                {/* Table surface highlight */}
                <div style={{
                  position: 'absolute', bottom: '48%', left: '10%', right: '10%', height: 2,
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
                }} />

                {/* Receipt on table */}
                <AnimatePresence>
                  {showReceipt && (
                    <motion.div
                      initial={{ y: 300, opacity: 0, rotateX: 80 }}
                      animate={{ y: 120, opacity: 1, rotateX: 55 }}
                      transition={{ duration: 1.0, ease: EXPO_OUT }}
                      style={{ perspective: 800, transformStyle: 'preserve-3d', position: 'absolute', top: '28%' }}
                    >
                      <motion.div
                        animate={{ rotateZ: [0, 0.4, 0, -0.3, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Receipt />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Phone hovering above receipt */}
                <AnimatePresence>
                  {showPhone && (
                    <motion.div
                      initial={{ y: -500, opacity: 0, rotateX: -20 }}
                      animate={{ y: -80, opacity: 1, rotateX: 12 }}
                      transition={{ duration: 0.9, ease: BACK_OUT, delay: 0.1 }}
                      style={{ position: 'relative', perspective: 600, transformStyle: 'preserve-3d', zIndex: 10 }}
                    >
                      {/* Subtle glow under phone */}
                      <div style={{
                        position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)',
                        width: 280, height: 40, background: `radial-gradient(ellipse, ${G}22, transparent 70%)`,
                        filter: 'blur(8px)',
                      }} />

                      <motion.div
                        animate={{ y: [-6, 6, -6], rotateZ: [-0.8, 0.8, -0.8] }}
                        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <PhoneFrame>
                          {/* Phone screen content: scanning beam */}
                          <div style={{ width: '100%', height: '100%', background: '#0A0A0A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, position: 'relative', overflow: 'hidden' }}>
                            {/* Viewfinder */}
                            <div style={{ width: 220, height: 160, border: '2px solid rgba(126,217,87,0.4)', borderRadius: 12, position: 'relative', overflow: 'hidden' }}>
                              {/* Corner accents */}
                              {[{t:0,l:0},{t:0,r:0},{b:0,l:0},{b:0,r:0}].map((pos, i) => (
                                <div key={i} style={{ position: 'absolute', width: 20, height: 20, ...pos,
                                  borderTop: (pos.t===0) ? `3px solid ${G}` : undefined,
                                  borderBottom: (pos.b===0) ? `3px solid ${G}` : undefined,
                                  borderLeft: (pos.l===0) ? `3px solid ${G}` : undefined,
                                  borderRight: (pos.r===0) ? `3px solid ${G}` : undefined,
                                }} />
                              ))}
                              {/* Scan line */}
                              {phoneScan && (
                                <motion.div
                                  initial={{ top: 0 }}
                                  animate={{ top: '100%' }}
                                  transition={{ duration: 1.8, ease: 'linear', repeat: Infinity }}
                                  style={{ position: 'absolute', left: 0, right: 0, height: 2, background: G, boxShadow: `0 0 20px 8px ${G}66` }}
                                />
                              )}
                            </div>
                            {/* Label */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <motion.div
                                animate={{ opacity: [1, 0.3, 1] }}
                                transition={{ duration: 0.8, repeat: Infinity }}
                                style={{ width: 6, height: 6, borderRadius: '50%', background: G }}
                              />
                              <span style={{ fontFamily: 'monospace', fontSize: 10, color: G, letterSpacing: '0.12em' }}>
                                {phoneScan ? 'SCAN EN COURS...' : 'POSITIONNEZ LE TICKET'}
                              </span>
                            </div>
                          </div>
                        </PhoneFrame>

                        {/* Hand grip below phone */}
                        <HandGrip />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Ambient light beam from phone scan */}
                {phoneScan && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.15, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                    style={{
                      position: 'absolute', top: '18%', left: '50%', transform: 'translateX(-50%)',
                      width: 200, height: 300,
                      background: `linear-gradient(180deg, ${G}44, transparent)`,
                      clipPath: 'polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)',
                    }}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ══════════ SCENE: APP ══════════ */}
          <AnimatePresence>
            {scene === 'app' && (
              <motion.div
                key="app"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ position: 'absolute', inset: 0 }}
              >
                {/* Full screen app BG */}
                <div style={{ position: 'absolute', inset: 0, background: '#0A0A0A' }} />

                {/* Ambient glow */}
                <div style={{ position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)', width: 900, height: 600, background: `radial-gradient(ellipse, ${G}0A, transparent 65%)`, pointerEvents: 'none' }} />

                {/* Basket header bar */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'flex-end', paddingBottom: 24, paddingLeft: 56, paddingRight: 56, borderBottom: '1px solid rgba(255,255,255,0.05)', zIndex: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    <motion.img src="/basket_logo.png" alt="" style={{ width: 48, height: 48 }}
                      animate={{ rotate: [0, 5, 0, -5, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <div>
                      <div style={{ color: '#fff', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 28, fontWeight: 800, lineHeight: 1 }}>Basket</div>
                      <div style={{ color: G, fontFamily: 'monospace', fontSize: 14, letterSpacing: '0.15em', marginTop: 2 }}>IA EN COURS · · ·</div>
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    {[0,1,2].map(i => (
                      <motion.div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: G }}
                        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }} />
                    ))}
                  </div>
                </div>

                {/* Main content area */}
                <div style={{ position: 'absolute', top: 130, left: 56, right: 56, bottom: 120 }}>
                  {/* Section title */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    style={{ marginBottom: 36 }}
                  >
                    <div style={{ fontFamily: 'monospace', fontSize: 18, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
                      Carrefour Market · 11,92 €
                    </div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 44, fontWeight: 900, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>
                      Analyse des prix
                    </div>
                  </motion.div>

                  {/* Items list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {ITEMS.map((item, i) => (
                      <motion.div
                        key={item.name}
                        initial={{ opacity: 0, x: -60 }}
                        animate={{ opacity: i <= badgeIdx ? 1 : 0.2, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.05, duration: 0.5, ease: EXPO_OUT }}
                        style={{
                          display: 'flex', alignItems: 'center',
                          background: i < badgeIdx ? '#141414' : 'rgba(20,20,20,0.5)',
                          borderRadius: 20, padding: '22px 28px',
                          border: i === badgeIdx ? `1.5px solid ${G}66` : '1.5px solid rgba(255,255,255,0.04)',
                          position: 'relative', overflow: 'hidden',
                        }}
                      >
                        {/* Active scan highlight */}
                        {i === badgeIdx && (
                          <motion.div
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 0.8, ease: 'easeInOut' }}
                            style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, transparent, ${G}18, transparent)`, pointerEvents: 'none' }}
                          />
                        )}

                        {/* Status dot */}
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: i < badgeIdx ? G : 'rgba(255,255,255,0.1)', marginRight: 20, flexShrink: 0, boxShadow: i < badgeIdx ? `0 0 10px ${G}` : 'none', transition: 'all 0.3s' }} />

                        <span style={{ flex: 1, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 26, fontWeight: 500, color: i < badgeIdx ? 'rgba(255,255,255,0.5)' : '#fff' }}>
                          {item.name}
                        </span>

                        {/* Comparison badge */}
                        <AnimatePresence>
                          {i < badgeIdx && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0, x: 40 }}
                              animate={{ scale: 1, opacity: 1, x: 0 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                              style={{ background: '#edffd8', border: `1.5px solid ${G}`, borderRadius: 14, padding: '8px 20px', marginRight: 16, textAlign: 'right' }}
                            >
                              <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 20, fontWeight: 800, color: '#1a6600' }}>{item.store}</div>
                              <div style={{ fontFamily: 'monospace', fontSize: 18, color: '#2a7a00', fontWeight: 700 }}>−{item.save.toFixed(2).replace('.', ',')} €</div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div style={{ fontFamily: 'monospace', fontSize: 30, fontWeight: 700, color: i < badgeIdx ? 'rgba(255,255,255,0.25)' : '#fff', textDecoration: i < badgeIdx ? 'line-through' : 'none', flexShrink: 0, transition: 'all 0.4s' }}>
                          {item.price.toFixed(2).replace('.', ',')} €
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Savings reveal bar */}
                <AnimatePresence>
                  {showSavings && (
                    <motion.div
                      initial={{ y: 200, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 200 }}
                      transition={{ duration: 0.7, ease: BACK_OUT }}
                      style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: `linear-gradient(135deg, ${G}22, ${G}0A)`,
                        backdropFilter: 'blur(24px)',
                        border: `1.5px solid ${G}44`,
                        borderBottom: 'none',
                        borderRadius: '40px 40px 0 0',
                        padding: '48px 80px 60px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        boxShadow: `0 -20px 80px ${G}18`,
                      }}
                    >
                      <div>
                        <div style={{ fontFamily: 'monospace', fontSize: 20, color: G, letterSpacing: '0.15em', marginBottom: 8 }}>TU POURRAIS ÉCONOMISER</div>
                        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 100, fontWeight: 900, color: G, lineHeight: 1, letterSpacing: '-3px' }}>
                          <Counter to={3.40} run={runCounter} /> €
                        </div>
                      </div>
                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                          width: 140, height: 140, borderRadius: '50%',
                          background: G, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexDirection: 'column', gap: 4, boxShadow: `0 0 60px ${G}66`,
                        }}
                      >
                        <span style={{ fontFamily: 'monospace', fontSize: 14, color: '#0a0a0a', fontWeight: 700 }}>VOIR LA</span>
                        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 24, color: '#0a0a0a', fontWeight: 900 }}>CARTE</span>
                        <span style={{ fontSize: 20 }}>→</span>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ══════════ SCENE: MAP ══════════ */}
          <AnimatePresence>
            {scene === 'map' && (
              <motion.div
                key="map"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                style={{ position: 'absolute', inset: 0 }}
              >
                {/* Map fills screen */}
                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ scale: 0.6 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.8, ease: EXPO_OUT }}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <CityMap />
                  </motion.div>

                  {/* User location */}
                  <div style={{ position: 'absolute', left: '50%', top: '52%', transform: 'translate(-50%,-50%)', zIndex: 20 }}>
                    <motion.div
                      animate={{ scale: [1, 3, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ repeat: Infinity, duration: 2.2 }}
                      style={{ position: 'absolute', inset: -16, borderRadius: '50%', background: '#4A9EFF22', border: '1.5px solid #4A9EFF66' }}
                    />
                    <motion.div
                      animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ repeat: Infinity, duration: 2.2, delay: 0.4 }}
                      style={{ position: 'absolute', inset: -8, borderRadius: '50%', background: '#4A9EFF33' }}
                    />
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#4A9EFF', border: '3px solid #fff', boxShadow: '0 0 16px #4A9EFF, 0 4px 12px rgba(0,0,0,0.5)', position: 'relative' }} />
                  </div>

                  {/* Store pins */}
                  {PINS.map((pin, idx) => (
                    <AnimatePresence key={pin.name}>
                      {pinsVisible && (
                        <motion.div
                          initial={{ y: -160, opacity: 0, scale: 0.4 }}
                          animate={{ y: 0, opacity: 1, scale: spotlightPin === idx ? 1.5 : 1 }}
                          transition={{
                            y: { delay: pin.drop, duration: 0.55, type: 'spring', stiffness: 350, damping: 16 },
                            scale: { duration: 0.5, ease: BACK_OUT },
                            opacity: { delay: pin.drop, duration: 0.3 },
                          }}
                          style={{ position: 'absolute', left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%, -100%)', zIndex: spotlightPin === idx ? 30 : 10 }}
                        >
                          {/* Glow ring for best pins */}
                          {pin.best && (
                            <motion.div
                              animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                              transition={{ duration: 2, repeat: Infinity, delay: pin.drop }}
                              style={{ position: 'absolute', inset: -12, borderRadius: 16, background: `${G}22`, border: `1.5px solid ${G}44` }}
                            />
                          )}
                          <div style={{
                            background: pin.best ? G : '#1C2B38',
                            borderRadius: 16,
                            padding: '12px 20px',
                            border: pin.best ? 'none' : '1.5px solid #2A3D4E',
                            boxShadow: pin.best ? `0 8px 32px ${G}88, 0 2px 8px rgba(0,0,0,0.5)` : '0 4px 16px rgba(0,0,0,0.5)',
                            position: 'relative',
                          }}>
                            <div style={{ fontSize: 20, fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, color: pin.best ? '#000' : '#fff', whiteSpace: 'nowrap' }}>{pin.name}</div>
                            <div style={{ fontSize: 17, fontFamily: 'monospace', fontWeight: 700, color: pin.best ? '#0a3a00' : 'rgba(255,255,255,0.5)' }}>{pin.tag}</div>
                            <div style={{ fontSize: 13, fontFamily: 'monospace', color: pin.best ? '#1a6600' : 'rgba(255,255,255,0.3)', marginTop: 2 }}>{pin.dist}</div>
                          </div>
                          {/* Pin arrow */}
                          <div style={{ width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderTop: pin.best ? `12px solid ${G}` : '12px solid #1C2B38', margin: '0 auto' }} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  ))}

                  {/* Spotlight glow on Aldi */}
                  <AnimatePresence>
                    {spotlightPin === 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                          position: 'absolute', left: `${PINS[0].x}%`, top: `${PINS[0].y}%`,
                          transform: 'translate(-50%, -50%)',
                          width: 200, height: 200,
                          background: `radial-gradient(circle, ${G}22, transparent 70%)`,
                          pointerEvents: 'none', zIndex: 5,
                        }}
                      />
                    )}
                  </AnimatePresence>
                </div>

                {/* Map header */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 140, background: 'linear-gradient(180deg, rgba(5,5,5,0.95) 60%, transparent)', display: 'flex', alignItems: 'flex-end', padding: '0 56px 28px', zIndex: 40 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <img src="/basket_logo.png" alt="" style={{ width: 42, height: 42 }} />
                    <div>
                      <div style={{ fontFamily: 'monospace', fontSize: 17, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em' }}>CARTE DES PRIX</div>
                      <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1 }}>Autour de vous</div>
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', background: `${G}22`, border: `1.5px solid ${G}44`, borderRadius: 16, padding: '10px 24px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 17, color: G }}>5 magasins</span>
                  </div>
                </div>

                {/* Bottom savings bar */}
                <motion.div
                  initial={{ y: 200, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.7, ease: BACK_OUT }}
                  style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'rgba(5,5,5,0.92)',
                    backdropFilter: 'blur(24px)',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    padding: '36px 56px 50px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    zIndex: 40,
                  }}
                >
                  <div>
                    <div style={{ fontFamily: 'monospace', fontSize: 16, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', marginBottom: 6 }}>MEILLEURE OPTION</div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 48, fontWeight: 900, color: '#fff', lineHeight: 1 }}>Aldi · 320 m</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 20, color: G, marginTop: 4 }}>Économisez jusqu'à 3,40 €</div>
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{ background: G, borderRadius: 20, padding: '20px 36px', boxShadow: `0 0 40px ${G}44` }}
                  >
                    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 28, fontWeight: 900, color: '#000' }}>−3,40 €</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'rgba(0,0,0,0.6)' }}>vs Carrefour</div>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ══════════ SCENE: FINALE ══════════ */}
          <AnimatePresence>
            {scene === 'finale' && (
              <motion.div
                key="finale"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                style={{ position: 'absolute', inset: 0, background: '#050505', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0 }}
              >
                {/* Green radial burst */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 1.2, ease: EXPO_OUT }}
                  style={{ position: 'absolute', width: 1200, height: 1200, borderRadius: '50%', background: `radial-gradient(circle, ${G}12 0%, ${G}04 40%, transparent 70%)`, pointerEvents: 'none' }}
                />

                {/* Concentric rings */}
                {[280, 480, 680].map((r, i) => (
                  <motion.div key={r}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 + i * 0.1, duration: 0.8, ease: EXPO_OUT }}
                    style={{ position: 'absolute', width: r, height: r, borderRadius: '50%', border: `1px solid ${G}${20 - i * 6}`, pointerEvents: 'none' }}
                  />
                ))}

                <Particles count={30} color={G} />

                {/* Logo */}
                <AnimatePresence>
                  {showFinalLogo && (
                    <motion.div
                      initial={{ scale: 0.3, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.9, ease: BACK_OUT }}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, marginBottom: 64, position: 'relative' }}
                    >
                      <motion.img
                        src="/basket_logo.png" alt="Basket"
                        style={{ width: 200, height: 200, objectFit: 'contain' }}
                        animate={{ rotate: [0, 4, 0, -4, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                      />
                      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 130, fontWeight: 900, color: '#fff', letterSpacing: '-5px', lineHeight: 1 }}>
                        Basket
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* URL */}
                <AnimatePresence>
                  {showUrl && (
                    <motion.div
                      initial={{ opacity: 0, y: 30, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.7, ease: BACK_OUT }}
                      style={{ background: `${G}18`, border: `2px solid ${G}55`, borderRadius: 28, padding: '24px 72px', marginBottom: 48, boxShadow: `0 0 60px ${G}22` }}
                    >
                      <span style={{ fontFamily: 'monospace', fontSize: 60, fontWeight: 700, color: G, letterSpacing: '-1px' }}>
                        basketbeta.com
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Tagline */}
                <AnimatePresence>
                  {showTagline && (
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                      style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 56, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.3, letterSpacing: '-1px' }}
                    >
                      Scannez.{' '}
                      <motion.span style={{ color: '#fff' }}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}>Comparez.</motion.span>{' '}
                      <motion.span style={{ color: G }}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}>Économisez.</motion.span>
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Pulsing dot */}
                <motion.div
                  animate={{ scale: [1, 1.4, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  style={{ position: 'absolute', bottom: 120, width: 16, height: 16, borderRadius: '50%', background: G, boxShadow: `0 0 30px ${G}` }}
                />
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
        {/* end camera wrapper */}

      </div>
      {/* end canvas */}
    </div>
  )
}
