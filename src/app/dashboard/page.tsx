'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
  Camera, History, BarChart2, ShoppingCart, Bell, Settings,
  TrendingDown, LogOut, Home, ChevronRight, Zap, MapPin, Map as MapIcon
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

function useCountUp(target: number, duration = 1500) {
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

/* ── Desktop sidebar nav ──────────────────────────────────── */
const SIDEBAR_ITEMS = [
  { id: 'home',     icon: Home,          label: 'Accueil',     href: '/dashboard' },
  { id: 'scan',     icon: Camera,        label: 'Scanner',     href: '/scan',     highlight: true },
  { id: 'liste',    icon: ShoppingCart,  label: 'Ma liste',    href: '/liste' },
  { id: 'bilan',    icon: BarChart2,     label: 'Mon bilan',   href: '/bilan' },
  { id: 'history',  icon: History,       label: 'Historique',  href: '#' },
]

function DesktopSidebar({ unreadCount, totalSavings }: { unreadCount: number; user?: User | null; totalSavings: number }) {
  return (
    <aside className="hidden md:flex flex-col w-64 flex-shrink-0 h-screen sticky top-0"
      style={{ background: '#0D0D0D', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#E07A5F' }}>
          <span className="text-white font-bold text-sm">B</span>
        </div>
        <span className="font-bold text-white">Basket</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {SIDEBAR_ITEMS.map((item) => (
          <motion.a
            key={item.id}
            href={item.href}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors"
            style={item.highlight
              ? { background: '#E07A5F', color: '#fff' }
              : { color: '#6B7280' }}
            onMouseEnter={(e) => { if (!item.highlight) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
            onMouseLeave={(e) => { if (!item.highlight) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6B7280' } }}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium">{item.label}</span>
            {item.highlight && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />}
          </motion.a>
        ))}
      </nav>

      {/* Savings summary */}
      {totalSavings > 0 && (
        <div className="mx-3 mb-3 rounded-2xl p-4" style={{ background: 'rgba(0,208,156,0.08)', border: '1px solid rgba(0,208,156,0.15)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#4B5563] mb-1">Économies totales</p>
          <p className="text-2xl font-extrabold" style={{ color: '#00D09C' }}>€{totalSavings.toFixed(2)}</p>
        </div>
      )}

      {/* User / settings */}
      <div className="px-3 pb-4 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
        <motion.a href="/notifications" whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#6B7280] relative"
          style={{ color: '#6B7280' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6B7280' }}>
          <Bell className="w-4 h-4" />
          <span className="text-sm font-medium">Alertes</span>
          {unreadCount > 0 && (
            <span className="ml-auto w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white" style={{ background: '#E07A5F' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </motion.a>
        <motion.a href="/profile" whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
          style={{ color: '#6B7280' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6B7280' }}>
          <Settings className="w-4 h-4" />
          <span className="text-sm font-medium">Paramètres</span>
        </motion.a>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl"
          style={{ color: '#6B7280' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLElement).style.color = '#EF4444' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6B7280' }}>
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
      }

      if (count) setUnreadCount(count)

      const pc: string | null = profile?.postcode ?? null
      setUserPostcode(pc)

      // Compute area insight: cheapest store_chain in user's département
      if (pc && pc.length >= 2) {
        const dept = pc.slice(0, 2)
        const { data: priceData } = await supabase
          .from('price_items')
          .select('store_chain, unit_price')
          .like('postcode', `${dept}%`)
          .not('store_chain', 'is', null)
          .limit(500)

        if (priceData && priceData.length > 0) {
          // Group by chain, compute avg
          const chainMap = new Map<string, number[]>()
          for (const row of priceData) {
            if (!row.store_chain) continue
            if (!chainMap.has(row.store_chain)) chainMap.set(row.store_chain, [])
            chainMap.get(row.store_chain)!.push(row.unit_price)
          }
          let bestChain = ''
          let bestAvg = Infinity
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

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#0A0A0A] flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex items-center gap-3 text-[#6B7280]"
        >
          <div className="w-6 h-6 rounded-full border-2 border-[#E07A5F] border-t-transparent animate-spin" />
          <span className="text-sm">Chargement...</span>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-[#0A0A0A] text-white flex">
      <OnboardingFlow />

      {/* Desktop sidebar */}
      <DesktopSidebar unreadCount={unreadCount} user={user} totalSavings={totalSavings} />

      {/* Main content */}
      <div className="flex-1 overflow-y-auto pb-28 md:pb-0">

        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between px-5 pt-safe-or-14 pt-14 pb-5">
          <div>
            <p className="text-[10px] text-[#4B5563] font-semibold uppercase tracking-widest mb-0.5">Tableau de bord</p>
            <h1 className="text-lg font-bold">Bonjour, {greeting} 👋</h1>
          </div>
          <div className="flex items-center gap-2">
            <motion.a href="/notifications" whileTap={{ scale: 0.9 }} className="relative">
              <div className="w-9 h-9 rounded-full flex items-center justify-center glass">
                <Bell className="w-4 h-4 text-[#6B7280]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white" style={{ background: '#E07A5F' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
            </motion.a>
            <motion.a href="/profile" whileTap={{ scale: 0.9 }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center glass">
                <Settings className="w-4 h-4 text-[#6B7280]" />
              </div>
            </motion.a>
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden md:flex items-center justify-between px-8 py-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <p className="text-xs text-[#4B5563] font-semibold uppercase tracking-widest mb-0.5">Tableau de bord</p>
            <h1 className="text-2xl font-bold">Bonjour, {greeting} 👋</h1>
          </div>
          <div className="flex items-center gap-3">
            <motion.a href="/notifications" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative">
              <div className="w-9 h-9 rounded-full flex items-center justify-center glass">
                <Bell className="w-4 h-4 text-[#6B7280]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white" style={{ background: '#E07A5F' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
            </motion.a>
          </div>
        </div>

        <main className="px-5 md:px-8 py-5 md:py-6 max-w-3xl space-y-5">

          {/* Hero savings card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative rounded-3xl p-6 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #111 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="absolute top-0 right-0 w-56 h-56 rounded-full opacity-20"
              style={{ background: 'radial-gradient(circle, #E07A5F 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
            <div className="relative">
              <p className="text-[10px] font-semibold text-[#4B5563] uppercase tracking-widest mb-2">Économies totales</p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={totalSavings > 0 ? 'savings' : 'zero'}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-5xl font-extrabold mb-1"
                  style={{ fontVariantNumeric: 'tabular-nums', color: totalSavings > 0 ? '#00D09C' : '#FFFFFF' }}
                >
                  €{animatedSavings.toFixed(2)}
                </motion.p>
              </AnimatePresence>
              <p className="text-sm text-[#4B5563]">
                sur {recentReceipts.length} ticket{recentReceipts.length !== 1 ? 's' : ''} scanné{recentReceipts.length !== 1 ? 's' : ''}
              </p>
              {totalSavings > 0 && (
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: 'rgba(0,208,156,0.12)', color: '#00D09C', border: '1px solid rgba(0,208,156,0.2)' }}>
                  <TrendingDown className="w-3 h-3" />
                  {((totalSavings / recentReceipts.length) || 0).toFixed(2)}€ par ticket en moyenne
                </div>
              )}
            </div>
          </motion.div>

          {/* Quick actions — no scan button here, that's in BottomNav/sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="grid grid-cols-3 gap-3"
          >
            {[
              { icon: BarChart2, label: 'Mon bilan', href: '/bilan', color: '#FF9B7B', bg: 'rgba(255,155,123,0.12)' },
              { icon: ShoppingCart, label: 'Ma liste', href: '/liste', color: '#00D09C', bg: 'rgba(0,208,156,0.12)' },
              { icon: History, label: 'Historique', href: '#', color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
            ].map((action) => (
              <motion.a
                key={action.label}
                href={action.href}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.94 }}
                className="flex flex-col items-center gap-2 py-4 rounded-2xl"
                style={{ background: action.bg, border: `1px solid ${action.color}20` }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <action.icon className="w-5 h-5" style={{ color: action.color }} />
                <span className="text-[11px] font-semibold" style={{ color: action.color }}>{action.label}</span>
              </motion.a>
            ))}
          </motion.div>

          {/* Area intelligence card */}
          {userPostcode && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.10 }}
              className="glass rounded-2xl p-5"
              style={{ borderLeft: '3px solid #E07A5F' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#E07A5F]" />
                  <p className="text-sm font-bold">Dans votre secteur ({userPostcode})</p>
                </div>
                <motion.a
                  href="/carte"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1 text-xs text-[#E07A5F] font-semibold"
                >
                  <MapIcon className="w-3 h-3" />
                  Carte
                </motion.a>
              </div>
              {areaInsight ? (
                <p className="text-xs text-[#6B7280] leading-relaxed">
                  En {userPostcode},{' '}
                  <span className="text-white font-semibold">{areaInsight.cheapestChain}</span>{' '}
                  est l'enseigne la moins chère pour votre panier habituel.
                </p>
              ) : (
                <p className="text-xs text-[#4B5563] leading-relaxed">
                  Scannez plus de tickets pour voir les insights de votre secteur.
                </p>
              )}
            </motion.div>
          )}

          {/* Scan CTA — only shown if NO receipts yet (onboarding) OR on desktop where there's no FAB */}
          <AnimatePresence>
            {(!hasReceipts) && (
              <motion.a
                href="/scan"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: 0.12 }}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                className="block rounded-3xl p-6 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, rgba(224,122,95,0.18) 0%, rgba(255,155,123,0.08) 100%)', border: '1px solid rgba(224,122,95,0.3)' }}
              >
                <div className="flex items-center gap-4">
                  <motion.div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: '#E07A5F' }}
                    animate={{ boxShadow: ['0 0 0 0 rgba(224,122,95,0.4)', '0 0 0 14px rgba(224,122,95,0)', '0 0 0 0 rgba(224,122,95,0)'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Camera className="w-7 h-7 text-white" />
                  </motion.div>
                  <div className="flex-1">
                    <p className="font-bold text-base text-white">Scannez votre premier ticket</p>
                    <p className="text-sm text-[#6B7280] mt-0.5">Découvrez combien vous pourriez économiser</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#E07A5F] flex-shrink-0" />
                </div>
              </motion.a>
            )}
          </AnimatePresence>

          {/* Desktop scan CTA (always visible on md+, hidden on mobile where FAB exists) */}
          <motion.a
            href="/scan"
            className="hidden md:block rounded-3xl p-5 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(224,122,95,0.15) 0%, rgba(255,155,123,0.06) 100%)', border: '1px solid rgba(224,122,95,0.25)' }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#E07A5F' }}>
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-white">Scanner un ticket</p>
                <p className="text-xs text-[#4B5563]">Analyser et comparer les prix en quelques secondes</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#E07A5F] flex-shrink-0">
                <Zap className="w-3.5 h-3.5" />
                Rapide
              </div>
            </div>
          </motion.a>

          {/* Recent receipts */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm text-white">Derniers tickets</h2>
              <span className="text-xs text-[#4B5563]">{recentReceipts.length}</span>
            </div>

            {recentReceipts.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center">
                <div className="w-12 h-12 rounded-2xl glass flex items-center justify-center mx-auto mb-3">
                  <History className="w-6 h-6 text-[#4B5563]" />
                </div>
                <p className="text-sm text-[#6B7280]">Aucun ticket scanné</p>
                <p className="text-xs text-[#4B5563] mt-1">Scannez votre premier ticket pour commencer</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentReceipts.slice(0, 5).map((receipt, i) => (
                  <motion.div
                    key={receipt.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.22 + i * 0.05 }}
                    whileHover={{ x: 3 }}
                    className="glass rounded-2xl px-4 py-3.5 flex items-center gap-3 cursor-pointer"
                    style={{ transition: 'border-color 0.2s' }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'}
                    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(224,122,95,0.12)' }}>
                      <History className="w-4 h-4 text-[#E07A5F]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-white truncate">{receipt.store_name || 'Magasin'}</p>
                      <p className="text-xs text-[#4B5563]">
                        {receipt.receipt_date
                          ? new Date(receipt.receipt_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                          : new Date(receipt.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {receipt.total_amount && (
                        <p className="text-sm font-bold text-white">{receipt.total_amount.toFixed(2)} €</p>
                      )}
                      {receipt.savings_amount && receipt.savings_amount > 0 ? (
                        <p className="text-[11px] font-semibold" style={{ color: '#00D09C' }}>-{receipt.savings_amount.toFixed(2)} €</p>
                      ) : null}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Tip */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26 }}
            className="glass rounded-2xl p-4 flex gap-3 items-start"
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,155,123,0.12)' }}>
              <Zap className="w-4 h-4 text-[#FF9B7B]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white mb-0.5">Le saviez-vous ?</p>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Les produits marque distributeur coûtent en moyenne 30% moins cher que les grandes marques. Scannez pour comparer !
              </p>
            </div>
          </motion.div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav active="home" />
    </div>
  )
}
