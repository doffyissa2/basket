'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChainRanking, CategoryStat } from '@/app/api/store-rankings/route'

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIER_COLOR = { cheap: '#7ed957', mid: '#F59E0B', expensive: '#EF4444' }

const CATEGORIES = [
  'Tous',
  'Produits laitiers',
  'Épicerie sèche',
  'Viandes & Poissons',
  'Fruits & Légumes',
  'Boissons',
]

function getFiltered(all: ChainRanking[], cat: string): ChainRanking[] {
  if (cat === 'Tous') return all
  const base = all
    .filter(r => r.categories[cat])
    .map(r => ({ ...r, avg_price: r.categories[cat].avg, sample_count: r.categories[cat].count }))
    .sort((a, b) => a.avg_price - b.avg_price)
  const n    = base.length
  const minP = base[0]?.avg_price ?? 1
  return base.map((r, i) => ({
    ...r,
    rank:  i + 1,
    index: Math.round((r.avg_price / minP) * 100),
    tier:  (i < n / 3 ? 'cheap' : i < (2 * n) / 3 ? 'mid' : 'expensive') as ChainRanking['tier'],
  }))
}

// ── Share icons ───────────────────────────────────────────────────────────────

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)
const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 13, height: 13 }}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.26 5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)
const FbIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)
const RedditIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
  </svg>
)
const IgIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
)
const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
)
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 13, height: 13 }}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

// ── Main component ─────────────────────────────────────────────────────────────

export default function BasketIndexSection() {
  const [all, setAll]           = useState<ChainRanking[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [category, setCategory] = useState('Tous')
  const [animated, setAnimated] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied, setCopied]     = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/store-rankings')
      .then(r => r.json())
      .then((d: { rankings: ChainRanking[]; total_samples: number }) => {
        setAll(d.rankings ?? [])
        setTotal(d.total_samples ?? 0)
        setLoading(false)
      })
      .catch(() => { setLoading(false); setFetchError(true) })
  }, [])

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setAnimated(true) },
      { threshold: 0.1 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const rankings = getFiltered(all, category)
  const maxP     = rankings.reduce((m, r) => Math.max(m, r.avg_price), 0.01)
  const minP     = rankings[0]?.avg_price ?? 0.01

  const monthLabel  = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const samplesLabel = total > 0 ? `+${Math.round(total / 1000)}k` : '+33 000'
  const top3         = rankings.slice(0, 3).map(r => `#${r.rank} ${r.chain}`).join(' · ')

  const SHARE_URL  = 'https://basketbeta.com/#basket-index'
  const SHARE_MSG  = `🛒 Classement des supermarchés les moins chers en France :\n${top3}\n\nAnalyse de ${samplesLabel} prix réels scannés par la communauté Basket 🇫🇷\n${SHARE_URL}`
  const SHARE_TITLE = `Classement des supermarchés les moins chers — Basket Index ${monthLabel}`

  const share = async (platform: string) => {
    const u = encodeURIComponent(SHARE_URL)
    const m = encodeURIComponent(SHARE_MSG)
    const ti = encodeURIComponent(SHARE_TITLE)

    if (platform === 'copy') {
      await navigator.clipboard.writeText(SHARE_URL).catch(() => {})
      setCopied(true); setTimeout(() => setCopied(false), 2500)
      return
    }
    if (platform === 'instagram') {
      await navigator.clipboard.writeText(SHARE_MSG).catch(() => {})
      setCopied(true); setTimeout(() => setCopied(false), 2500)
      return
    }

    const links: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${m}`,
      twitter:  `https://twitter.com/intent/tweet?text=${m}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      reddit:   `https://reddit.com/submit?url=${u}&title=${ti}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    }
    if (links[platform]) window.open(links[platform], '_blank', 'noopener,noreferrer')
  }

  // Bar width: normalise avg_price to 30–100% range
  const barW = (avg: number) => {
    if (maxP === minP) return 70
    return 30 + ((avg - minP) / (maxP - minP)) * 70
  }

  const SHARE_BTNS = [
    { id: 'whatsapp',  label: 'WhatsApp',  bg: '#25D366',  Icon: WhatsAppIcon },
    { id: 'twitter',   label: 'X',         bg: '#000',     Icon: XIcon,       border: '1px solid rgba(255,255,255,0.15)' },
    { id: 'facebook',  label: 'Facebook',  bg: '#1877F2',  Icon: FbIcon },
    { id: 'reddit',    label: 'Reddit',    bg: '#FF4500',  Icon: RedditIcon },
    { id: 'instagram', label: 'Instagram', bg: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', Icon: IgIcon },
    { id: 'copy',      label: copied ? 'Copié !' : 'Copier le lien', bg: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', Icon: copied ? CheckIcon : CopyIcon },
  ]

  return (
    <section
      id="basket-index"
      ref={ref}
      className="py-12 md:py-[12vh] px-5 md:px-[5vw] relative z-10 bg-graphite rounded-[2rem] md:rounded-[3rem] mx-2 md:mx-[2vw] my-4 md:my-[5vh] text-paper overflow-hidden"
    >
      {/* Glow */}
      <div className="pointer-events-none absolute top-0 right-0 w-[40vw] h-[40vw] opacity-[0.07]"
        style={{ background: 'radial-gradient(circle,#7ed957 0%,transparent 70%)', transform: 'translate(30%,-30%)' }} />
      <div className="pointer-events-none absolute bottom-0 left-0 w-[30vw] h-[30vw] opacity-[0.04]"
        style={{ background: 'radial-gradient(circle,#7ed957 0%,transparent 70%)', transform: 'translate(-30%,30%)' }} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="relative z-10 mb-8 md:mb-[5vh]">
        <div className="inline-flex items-center gap-2 bg-signal/15 border border-signal/30 rounded-full px-4 py-1.5 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
          <span className="font-mono text-[10px] text-signal font-bold uppercase tracking-widest">
            Basket Index — {monthLabel}
          </span>
        </div>
        <h2 className="font-sans text-3xl md:text-[4vw] font-extrabold tracking-tighter text-paper leading-[1.05] mb-3">
          Classement des supermarchés<br />
          <span className="text-signal">les moins chers en France</span>
        </h2>
        <p className="font-mono text-xs text-paper/45 max-w-xl leading-relaxed">
          Établi par la communauté Basket · <span className="text-paper/70">{samplesLabel} prix réels</span> scannés par des Français.{' '}
          Cliquez sur un magasin pour voir le détail par catégorie de produit.
        </p>
      </div>

      {/* ── Category toggles ───────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-wrap gap-2 mb-6 md:mb-[4vh]">
        {CATEGORIES.map(cat => {
          const active = category === cat
          return (
            <button key={cat} onClick={() => { setCategory(cat); setExpanded(null) }}
              className="px-3 py-1.5 rounded-full font-mono text-xs transition-all duration-200 hover:scale-105"
              style={{
                background: active ? '#7ed957' : 'rgba(255,255,255,0.07)',
                color:      active ? '#111'    : 'rgba(255,255,255,0.45)',
                border:     active ? 'none'    : '1px solid rgba(255,255,255,0.1)',
                fontWeight: active ? 700       : 500,
              }}>
              {cat}
            </button>
          )
        })}
      </div>

      {/* ── Rankings list ──────────────────────────────────────────────────── */}
      <div className="relative z-10 space-y-1.5 mb-8 md:mb-[5vh]">
        {loading ? (
          [1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="h-11 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
          ))
        ) : fetchError ? (
          <p className="font-mono text-sm text-paper/30 text-center py-12">Impossible de charger le classement. Réessayez dans quelques instants.</p>
        ) : rankings.length === 0 ? (
          <p className="font-mono text-sm text-paper/30 text-center py-12">Pas assez de données pour cette catégorie.</p>
        ) : rankings.map((r, i) => {
          const color      = TIER_COLOR[r.tier]
          const isTop3     = i < 3
          const isExpanded = expanded === r.chain
          const bw         = barW(r.avg_price)

          return (
            <div key={r.chain}
              onClick={() => setExpanded(isExpanded ? null : r.chain)}
              style={{
                background:    isExpanded ? 'rgba(126,217,87,0.06)' : 'rgba(255,255,255,0.03)',
                border:        `1px solid ${isExpanded ? 'rgba(126,217,87,0.18)' : 'transparent'}`,
                borderRadius:  14,
                padding:       '10px 14px',
                cursor:        'pointer',
                transition:    'all 0.2s',
              }}
            >
              {/* Main row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Rank */}
                <span style={{ fontFamily: 'monospace', fontSize: 10, width: 22, textAlign: 'right', flexShrink: 0,
                  color: isTop3 ? color : 'rgba(255,255,255,0.2)', fontWeight: isTop3 ? 700 : 400 }}>
                  #{r.rank}
                </span>
                {/* Tier dot */}
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0,
                  boxShadow: isTop3 ? `0 0 8px ${color}88` : 'none' }} />
                {/* Name */}
                <span style={{ fontWeight: 700, fontSize: 13, width: 104, flexShrink: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  color: isTop3 ? color : '#fff' }}>
                  {r.chain}
                </span>
                {/* Bar track */}
                <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', minWidth: 40 }}>
                  <div style={{
                    height: '100%', borderRadius: 99, background: color,
                    width:      animated ? `${bw}%` : '0%',
                    transition: `width 0.9s cubic-bezier(0.16,1,0.3,1) ${i * 55}ms`,
                    boxShadow:  isTop3 ? `0 0 10px ${color}55` : 'none',
                  }} />
                </div>
                {/* Avg price */}
                <span style={{ fontFamily: 'monospace', fontSize: 12, flexShrink: 0, minWidth: 50, textAlign: 'right',
                  color: isTop3 ? color : 'rgba(255,255,255,0.5)', fontWeight: isTop3 ? 700 : 400 }}>
                  {r.avg_price.toFixed(2)} €
                </span>
                {/* Index — desktop */}
                <span className="hidden md:block" style={{ fontFamily: 'monospace', fontSize: 10, flexShrink: 0, width: 46, textAlign: 'right',
                  color: 'rgba(255,255,255,0.18)' }}>
                  {r.rank === 1 ? '— base' : `+${r.index - 100}%`}
                </span>
              </div>

              {/* Expanded: category breakdown */}
              {isExpanded && Object.keys(r.categories).length > 0 && (
                <div style={{
                  marginTop: 10, paddingTop: 10,
                  borderTop: '1px solid rgba(255,255,255,0.07)',
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8,
                }}>
                  {(Object.entries(r.categories) as Array<[string, CategoryStat]>)
                    .sort(([, a], [, b]) => a.avg - b.avg)
                    .map(([cat, stat]) => (
                      <div key={cat} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '8px 10px' }}>
                        <p style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{cat}</p>
                        <p style={{ fontWeight: 800, fontSize: 15, color, fontFamily: '"Plus Jakarta Sans", sans-serif', margin: 0 }}>{stat.avg.toFixed(2)} €</p>
                        <p style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.22)', marginTop: 2 }}>{stat.count} prix</p>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Source ─────────────────────────────────────────────────────────── */}
      <div className="relative z-10 border-t pb-5 pt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <p className="font-mono text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.32)' }}>
          <span style={{ color: 'rgba(255,255,255,0.55)' }}>Source: Basket</span> — analyse de {samplesLabel} prix réels ·{' '}
          Moyennes calculées à partir de tickets de caisse scannés par la communauté française.
        </p>
        <span className="font-mono text-xs font-bold flex-shrink-0" style={{ color: 'rgba(126,217,87,0.8)' }}>basketbeta.com</span>
      </div>

      {/* ── Social sharing ─────────────────────────────────────────────────── */}
      <div className="relative z-10">
        <p className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Partager ce classement
        </p>
        <div className="flex flex-wrap gap-2">
          {SHARE_BTNS.map(({ id, label, bg, border, Icon }) => (
            <button key={id} onClick={() => share(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 10,
                background: bg,
                border: border ?? 'none',
                color: (id === 'copy' && !copied) ? 'rgba(255,255,255,0.6)' : '#fff',
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.06)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
            >
              <Icon />
              {label}
            </button>
          ))}
        </div>
        <p className="font-mono text-[10px] mt-2" style={{ color: 'rgba(255,255,255,0.18)' }}>
          Instagram : le texte est copié dans votre presse-papiers — collez-le dans votre story ou votre bio.
        </p>
      </div>
    </section>
  )
}
