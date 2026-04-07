'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
  Camera, BarChart2, ShoppingCart, Bell, Settings,
  TrendingDown, LogOut, Home, ChevronRight, Zap, MapPin, Map as MapIcon,
  Receipt,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import BottomNav from '@/components/BottomNav'
import OnboardingFlow from '@/components/OnboardingFlow'

interface RecentReceipt {
  id: string
  store_name: string | null
  total_amount: number | null
  receipt_date: string | null
  created_at: string
  savings_amount?: number | null
}

function useCountUp(target: number, duration = 1000) {
  const [count, setCount] = useState(0)
  const started = useRef(false)
  useEffect(() => {
    if (started.current || target === 0) return
    started.current = true
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1)
      setCount(Math.round(target * (1 - Math.pow(1 - p, 3)) * 100) / 100)
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return count
}

// Unified entrance animation variants
const page = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
}
const card = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 460, damping: 36 } },
}

/* ── Desktop sidebar ──────────────────────────────────────── */
const SIDEBAR_ITEMS = [
  { id: 'home',    icon: Home,         label: 'Accueil',   href: '/dashboard' },
  { id: 'scan',    icon: Camera,       label: 'Scanner',   href: '/scan',   highlight: true },
  { id: 'liste',   icon: ShoppingCart, label: 'Ma liste',  href: '/liste' },
  { id: 'bilan',   icon: BarChart2,    label: 'Mon bilan', href: '/bilan' },
]

function DesktopSidebar({ unreadCount, totalSavings }: { unreadCount: number; user?: User | null; totalSavings: number }) {
  return (
    <aside className="hidden md:flex flex-col w-64 flex-shrink-0 h-screen sticky top-0 bg-offwhite"
      style={{ borderRight: '1px solid rgba(17,17,17,0.08)' }}>
      <div className="px-5 py-6 flex items-center gap-2.5" style={{ borderBottom: '1px solid rgba(17,17,17,0.06)' }}>
        <img src="/basket_logo.png" alt="Basket" className="h-7 w-7" />
        <span className="font-bold text-graphite">Basket</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {SIDEBAR_ITEMS.map((item) => (
          <motion.a key={item.id} href={item.href} whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 px-3 py-3 rounded-xl"
            style={item.highlight ? { background: '#111111', color: '#fff' } : { color: 'rgba(17,17,17,0.45)' }}
            onMouseEnter={(e) => { if (!item.highlight) { (e.currentTarget as HTMLElement).style.background = 'rgba(17,17,17,0.06)'; (e.currentTarget as HTMLElement).style.color = '#111111' } }}
            onMouseLeave={(e) => { if (!item.highlight) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(17,17,17,0.45)' } }}>
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium">{item.label}</span>
            {item.highlight && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />}
          </motion.a>
        ))}
      </nav>
      {totalSavings > 0 && (
        <div className="mx-3 mb-3 rounded-2xl p-4" style={{ background: 'rgba(0,208,156,0.08)', border: '1px solid rgba(0,208,156,0.15)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-graphite/40 mb-1">Économies totales</p>
          <p className="text-2xl font-extrabold" style={{ color: '#00D09C' }}>€{totalSavings.toFixed(2)}</p>
        </div>
      )}
      <div className="px-3 pb-4 space-y-1" style={{ borderTop: '1px solid rgba(17,17,17,0.06)', paddingTop: 12 }}>
        <motion.a href="/notifications" whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
          style={{ color: 'rgba(17,17,17,0.45)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(17,17,17,0.06)'; (e.currentTarget as HTMLElement).style.color = '#111111' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(17,17,17,0.45)' }}>
          <Bell className="w-4 h-4" />
          <span className="text-sm font-medium">Alertes</span>
          {unreadCount > 0 && (
            <span className="ml-auto w-4 h-4 rounded-full text-[11px] font-bold flex items-center justify-center text-white" style={{ background: '#7ed957' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </motion.a>
        <motion.a href="/profile" whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
          style={{ color: 'rgba(17,17,17,0.45)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(17,17,17,0.06)'; (e.currentTarget as HTMLElement).style.color = '#111111' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(17,17,17,0.45)' }}>
          <Settings className="w-4 h-4" />
          <span className="text-sm font-medium">Paramètres</span>
        </motion.a>
        <motion.button whileTap={{ scale: 0.97 }}
          onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl"
          style={{ color: 'rgba(17,17,17,0.45)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.06)'; (e.currentTarget as HTMLElement).style.color = '#EF4444' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(17,17,17,0.45)' }}>
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Déconnexion</span>
        </motion.button>
      </div>
    </aside>
  )
}

interface AreaInsight { cheapestChain: string; postcode: string }

/* ── Main page ─────────────────────────────────────────────── */
export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentReceipts, setRecentReceipts] = useState<RecentReceipt[]>([])
  const [totalSavings, setTotalSavings] = useState(0)
  const [totalSpent, setTotalSpent] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [userPostcode, setUserPostcode] = useState<string | null>(null)
  const [areaInsight, setAreaInsight] = useState<AreaInsight | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)

      const [{ data: receipts, error: receiptsError }, { count }, { data: profile }] = await Promise.all([
        supabase.from('receipts').select('id, store_name, total_amount, receipt_date, created_at, savings_amount')
          .eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('notifications').select('id', { count: 'exact', head: true })
          .eq('user_id', user.id).eq('read', false),
        supabase.from('profiles').select('postcode').eq('id', user.id).single(),
      ])

      if (receiptsError) {
        const { data: fallback } = await supabase.from('receipts')
          .select('id, store_name, total_amount, receipt_date, created_at')
          .eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
        if (fallback) setRecentReceipts(fallback as RecentReceipt[])
      } else if (receipts) {
        setRecentReceipts(receipts)
        setTotalSavings(receipts.reduce((s, r) => s + (r.savings_amount || 0), 0))
        setTotalSpent(receipts.reduce((s, r) => s + (r.total_amount || 0), 0))
      }

      if (count) setUnreadCount(count)
      const pc: string | null = profile?.postcode ?? null
      setUserPostcode(pc)

      if (pc && pc.length >= 2) {
        const dept = pc.slice(0, 2)
        const { data: priceData } = await supabase
          .from('price_items').select('store_chain, unit_price')
          .like('postcode', `${dept}%`).not('store_chain', 'is', null).limit(500)
        if (priceData && priceData.length > 0) {
          const chainMap = new Map<string, number[]>()
          for (const row of priceData) {
            if (!row.store_chain) continue
            if (!chainMap.has(row.store_chain)) chainMap.set(row.store_chain, [])
            chainMap.get(row.store_chain)!.push(row.unit_price)
          }
          let bestChain = ''; let bestAvg = Infinity
          for (const [chain, prices] of chainMap.entries()) {
            if (prices.length < 3) continue
            const avg = prices.reduce((s, p) => s + p, 0) / prices.length
            if (avg < bestAvg) { bestAvg = avg; bestChain = chain }
          }
          if (bestChain) setAreaInsight({ cheapestChain: bestChain, postcode: pc })
        }
      }

      setLoading(false)
    }
    init()
  }, [])

  const animatedSavings = useCountUp(totalSavings)
  const greeting = user?.email?.split('@')[0] || 'vous'
  const hasReceipts = recentReceipts.length > 0
  const savingsRatio = totalSpent > 0 && totalSavings > 0
    ? (totalSavings / (totalSpent + totalSavings)) * 100
    : 0

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-paper flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#7ed957', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-paper text-graphite flex">
      <OnboardingFlow />

      {/* Desktop sidebar */}
      <DesktopSidebar unreadCount={unreadCount} user={user} totalSavings={totalSavings} />

      {/* Main scroll area */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>

        {/* ── MOBILE HEADER ─────────────────────────────── */}
        <div className="md:hidden flex items-center justify-between px-5"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 20px)', paddingBottom: 8 }}>
          <div>
            <p className="text-xs text-graphite/40 font-medium capitalize">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="text-[22px] font-bold text-graphite leading-tight mt-0.5">
              Bonjour, {greeting}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <motion.a href="/notifications" whileTap={{ scale: 0.88 }} className="relative">
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(17,17,17,0.06)' }}>
                <Bell className="w-[18px] h-[18px] text-graphite/60" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ background: '#7ed957' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
            </motion.a>
            <motion.a href="/profile" whileTap={{ scale: 0.88 }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(17,17,17,0.06)' }}>
                <Settings className="w-[18px] h-[18px] text-graphite/60" />
              </div>
            </motion.a>
          </div>
        </div>

        {/* ── DESKTOP HEADER ────────────────────────────── */}
        <div className="hidden md:flex items-center justify-between px-8 py-6"
          style={{ borderBottom: '1px solid rgba(17,17,17,0.06)' }}>
          <div>
            <p className="text-xs text-graphite/40 font-semibold uppercase tracking-widest mb-0.5">Tableau de bord</p>
            <h1 className="text-2xl font-bold text-graphite">Bonjour, {greeting} 👋</h1>
          </div>
          <motion.a href="/notifications" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(17,17,17,0.05)' }}>
              <Bell className="w-4 h-4 text-graphite/50" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[11px] font-bold flex items-center justify-center text-white" style={{ background: '#7ed957' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
          </motion.a>
        </div>

        {/* ── MOBILE CONTENT (staggered entrance) ───────── */}
        <motion.div
          className="md:hidden px-4 pt-4 space-y-3"
          variants={page}
          initial="hidden"
          animate="show"
        >

          {/* HERO — no receipts */}
          {!hasReceipts && (
            <motion.a
              variants={card}
              href="/scan"
              whileTap={{ scale: 0.97 }}
              className="block rounded-3xl overflow-hidden"
              style={{ background: '#111111', textDecoration: 'none' }}
            >
              <div className="px-6 pt-8 pb-6">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Bienvenue sur Basket</p>
                <p className="text-[28px] font-extrabold text-white leading-snug">
                  Scannez votre<br />premier ticket
                </p>
                <p className="text-[15px] text-white/40 mt-2">Découvrez combien vous économisez sur vos courses.</p>
              </div>
              <div className="flex items-center gap-3 px-6 py-4"
                style={{ background: '#7ed957' }}>
                <Camera className="w-5 h-5 text-[#111]" />
                <span className="text-[15px] font-bold text-[#111] flex-1">Commencer à scanner</span>
                <ChevronRight className="w-5 h-5 text-[#111]/60" />
              </div>
            </motion.a>
          )}

          {/* HERO — has receipts */}
          {hasReceipts && (
            <motion.div
              variants={card}
              className="rounded-3xl overflow-hidden bg-white"
              style={{ border: '1px solid rgba(17,17,17,0.07)', boxShadow: '0 2px 16px rgba(17,17,17,0.05)' }}
            >
              {/* Main stat */}
              <div className="px-6 pt-6 pb-5">
                <p className="text-[11px] font-semibold text-graphite/40 uppercase tracking-widest mb-3">
                  Économies réalisées
                </p>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[42px] font-extrabold leading-none"
                      style={{ color: '#00D09C', fontVariantNumeric: 'tabular-nums' }}>
                      €{animatedSavings.toFixed(2)}
                    </p>
                    <p className="text-[13px] text-graphite/40 mt-2">
                      €{totalSpent.toFixed(2)} dépensés &middot; {recentReceipts.length} ticket{recentReceipts.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {savingsRatio > 0 && (
                    <div className="flex-shrink-0 flex flex-col items-end gap-1 pb-1">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                        style={{ background: 'rgba(0,208,156,0.1)' }}>
                        <TrendingDown className="w-3.5 h-3.5" style={{ color: '#00D09C' }} />
                        <span className="text-[13px] font-bold" style={{ color: '#00D09C' }}>
                          {savingsRatio.toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-[11px] text-graphite/35">du panier</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Scan strip */}
              <motion.a
                href="/scan"
                whileTap={{ scale: 0.99 }}
                className="flex items-center gap-3 px-6 py-4"
                style={{ background: '#111', textDecoration: 'none', borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(126,217,87,0.18)' }}>
                  <Camera className="w-4 h-4" style={{ color: '#7ed957' }} />
                </div>
                <span className="text-[15px] font-semibold text-white flex-1">Scanner un ticket</span>
                <div className="flex items-center gap-1" style={{ color: '#7ed957' }}>
                  <Zap className="w-3.5 h-3.5" />
                  <span className="text-[12px] font-semibold">Rapide</span>
                </div>
              </motion.a>
            </motion.div>
          )}

          {/* QUICK LINKS */}
          <motion.div variants={card} className="grid grid-cols-2 gap-3">
            {[
              { icon: BarChart2,    label: 'Mon bilan',  sub: 'Semaine en cours', href: '/bilan', color: '#7ed957',  bg: 'rgba(126,217,87,0.1)' },
              { icon: ShoppingCart, label: 'Ma liste',   sub: 'Courses à faire',  href: '/liste', color: '#00D09C', bg: 'rgba(0,208,156,0.1)' },
            ].map((action) => (
              <motion.a
                key={action.label}
                href={action.href}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-white"
                style={{ border: '1px solid rgba(17,17,17,0.07)', textDecoration: 'none', boxShadow: '0 1px 8px rgba(17,17,17,0.04)' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: action.bg }}>
                  <action.icon className="w-5 h-5" style={{ color: action.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-graphite leading-tight">{action.label}</p>
                  <p className="text-xs text-graphite/40 mt-0.5 truncate">{action.sub}</p>
                </div>
              </motion.a>
            ))}
          </motion.div>

          {/* RECENT RECEIPTS */}
          {hasReceipts && (
            <motion.div variants={card}>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-[13px] font-bold text-graphite/60 uppercase tracking-wider">Derniers tickets</h2>
                <motion.a href="/bilan" whileTap={{ scale: 0.95 }}
                  className="text-[13px] font-semibold" style={{ color: '#7ed957' }}>
                  Tout voir
                </motion.a>
              </div>

              <div className="rounded-2xl overflow-hidden bg-white"
                style={{ border: '1px solid rgba(17,17,17,0.07)', boxShadow: '0 1px 8px rgba(17,17,17,0.04)' }}>
                {recentReceipts.slice(0, 5).map((receipt, i) => {
                  const d = new Date(receipt.receipt_date || receipt.created_at)
                  const dateStr = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                  return (
                    <motion.a
                      key={receipt.id}
                      href={`/receipt/${receipt.id}`}
                      whileTap={{ scale: 0.99, backgroundColor: 'rgba(17,17,17,0.02)' }}
                      className="flex items-center gap-4 px-5 py-4"
                      style={{
                        textDecoration: 'none',
                        borderBottom: i < Math.min(recentReceipts.length, 5) - 1
                          ? '1px solid rgba(17,17,17,0.05)'
                          : 'none',
                      }}
                    >
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(126,217,87,0.1)' }}>
                        <Receipt className="w-4 h-4" style={{ color: '#7ed957' }} />
                      </div>

                      {/* Store + meta */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-semibold text-graphite leading-tight truncate">
                          {receipt.store_name || 'Magasin'}
                        </p>
                        <p className="text-[12px] text-graphite/40 mt-0.5 capitalize">{dateStr}</p>
                      </div>

                      {/* Amount + savings */}
                      <div className="flex-shrink-0 text-right">
                        {receipt.total_amount && (
                          <p className="text-[15px] font-bold text-graphite">
                            {receipt.total_amount.toFixed(2)} €
                          </p>
                        )}
                        {receipt.savings_amount && receipt.savings_amount > 0 ? (
                          <p className="text-[12px] font-semibold mt-0.5" style={{ color: '#00D09C' }}>
                            -{receipt.savings_amount.toFixed(2)} €
                          </p>
                        ) : null}
                      </div>

                      <ChevronRight className="w-4 h-4 text-graphite/20 flex-shrink-0 ml-1" />
                    </motion.a>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* AREA INSIGHT */}
          {userPostcode && (
            <motion.a
              variants={card}
              href="/carte"
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-4 rounded-2xl px-5 py-4 bg-white"
              style={{
                border: '1px solid rgba(17,17,17,0.07)',
                textDecoration: 'none',
                boxShadow: '0 1px 8px rgba(17,17,17,0.04)',
              }}
            >
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(126,217,87,0.1)' }}>
                <MapPin className="w-5 h-5" style={{ color: '#7ed957' }} />
              </div>
              <div className="flex-1 min-w-0">
                {areaInsight ? (
                  <>
                    <p className="text-[15px] font-semibold text-graphite leading-tight">
                      <span style={{ color: '#7ed957' }}>{areaInsight.cheapestChain}</span>{' '}
                      est moins cher près de vous
                    </p>
                    <p className="text-[12px] text-graphite/40 mt-0.5">Zone {userPostcode}</p>
                  </>
                ) : (
                  <>
                    <p className="text-[15px] font-semibold text-graphite leading-tight">
                      Dans votre secteur
                    </p>
                    <p className="text-[12px] text-graphite/40 mt-0.5">
                      Scannez plus pour voir les tendances
                    </p>
                  </>
                )}
              </div>
              <MapIcon className="w-4 h-4 text-graphite/20 flex-shrink-0" />
            </motion.a>
          )}

        </motion.div>

        {/* ── DESKTOP CONTENT ───────────────────────────── */}
        <main className="hidden md:block px-8 pt-6 max-w-3xl space-y-5">

          {/* Hero savings */}
          <div className="relative rounded-3xl p-6 overflow-hidden bg-white"
            style={{ border: '1px solid rgba(17,17,17,0.08)' }}>
            <div className="absolute top-0 right-0 w-56 h-56 rounded-full opacity-20"
              style={{ background: 'radial-gradient(circle, #7ed957 0%, transparent 70%)', transform: 'translate(30%,-30%)' }} />
            <div className="relative">
              <p className="text-[11px] font-semibold text-graphite/40 uppercase tracking-widest mb-2">Économies totales</p>
              <p className="text-5xl font-extrabold mb-1"
                style={{ fontVariantNumeric: 'tabular-nums', color: totalSavings > 0 ? '#00D09C' : '#111111' }}>
                €{animatedSavings.toFixed(2)}
              </p>
              <p className="text-sm text-graphite/40">
                sur {recentReceipts.length} ticket{recentReceipts.length !== 1 ? 's' : ''} scanné{recentReceipts.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Desktop quick actions */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: BarChart2,    label: 'Mon bilan', href: '/bilan', color: '#7ed957',  bg: 'rgba(126,217,87,0.1)' },
              { icon: ShoppingCart, label: 'Ma liste',  href: '/liste', color: '#00D09C', bg: 'rgba(0,208,156,0.1)' },
              { icon: Camera,       label: 'Scanner',   href: '/scan',  color: '#fff',    bg: '#111' },
            ].map((action) => (
              <motion.a key={action.label} href={action.href} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.97 }}
                className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-white"
                style={{ border: '1px solid rgba(17,17,17,0.08)', textDecoration: 'none' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: action.bg }}>
                  <action.icon className="w-4 h-4" style={{ color: action.color }} />
                </div>
                <span className="text-sm font-semibold text-graphite">{action.label}</span>
              </motion.a>
            ))}
          </div>

          {/* Desktop receipts */}
          {hasReceipts && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-sm text-graphite">Derniers tickets</h2>
                <a href="/bilan" className="text-xs font-semibold" style={{ color: '#7ed957' }}>Tout voir</a>
              </div>
              <div className="space-y-2">
                {recentReceipts.slice(0, 5).map((receipt) => (
                  <motion.a key={receipt.id} href={`/receipt/${receipt.id}`}
                    whileHover={{ x: 2 }} whileTap={{ scale: 0.99 }}
                    className="flex items-center gap-4 rounded-2xl px-5 py-4 bg-white"
                    style={{ border: '1px solid rgba(17,17,17,0.07)', textDecoration: 'none' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(126,217,87,0.1)' }}>
                      <Receipt className="w-4 h-4" style={{ color: '#7ed957' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-graphite truncate">{receipt.store_name || 'Magasin'}</p>
                      <p className="text-xs text-graphite/40 capitalize">
                        {new Date(receipt.receipt_date || receipt.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {receipt.total_amount && <p className="text-sm font-bold text-graphite">{receipt.total_amount.toFixed(2)} €</p>}
                      {receipt.savings_amount && receipt.savings_amount > 0
                        ? <p className="text-xs font-semibold" style={{ color: '#00D09C' }}>-{receipt.savings_amount.toFixed(2)} €</p>
                        : null}
                    </div>
                    <ChevronRight className="w-4 h-4 text-graphite/20 flex-shrink-0" />
                  </motion.a>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      <BottomNav active="home" />
    </div>
  )
}
