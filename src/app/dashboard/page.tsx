'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
  Camera, BarChart2, ShoppingCart, Bell, Map as MapIcon,
  TrendingDown, LogOut, ChevronRight, MapPin, Receipt,
  Flame, Star, Trophy, Crown, Home, Sparkles, ShoppingBag,
  ArrowRight, Zap,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import BottomNav from '@/components/BottomNav'
import OnboardingFlow from '@/components/OnboardingFlow'
import Link from 'next/link'
import { EASE, useCountUp } from '@/lib/hooks'

function getLevel(count: number) {
  if (count >= 100) return { label: 'Champion',    Icon: Crown,    color: '#F59E0B', bg: 'rgba(245,158,11,0.15)',   border: 'rgba(245,158,11,0.3)',   next: Infinity, progress: 100 }
  if (count >= 50)  return { label: 'Expert',      Icon: Trophy,   color: '#EF4444', bg: 'rgba(239,68,68,0.15)',    border: 'rgba(239,68,68,0.3)',    next: 100, progress: (count - 50) / 50 * 100 }
  if (count >= 20)  return { label: 'Économe',     Icon: Flame,    color: '#00D09C', bg: 'rgba(0,208,156,0.15)',    border: 'rgba(0,208,156,0.3)',    next: 50,  progress: (count - 20) / 30 * 100 }
  if (count >= 5)   return { label: 'Explorateur', Icon: Star,     color: '#7ed957', bg: 'rgba(126,217,87,0.15)',  border: 'rgba(126,217,87,0.3)',  next: 20,  progress: (count - 5) / 15 * 100 }
  return                    { label: 'Débutant',   Icon: Sparkles, color: '#a3f07a', bg: 'rgba(163,240,122,0.12)', border: 'rgba(163,240,122,0.25)', next: 5,   progress: count / 5 * 100 }
}

const NEXT_LEVEL: Record<string, string> = {
  Débutant: 'Explorateur', Explorateur: 'Économe', Économe: 'Expert', Expert: 'Champion',
}

function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7))
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return `${t.getUTCFullYear()}-${Math.ceil(((t.getTime() - y.getTime()) / 86400000 + 1) / 7)}`
}
function computeStreak(rs: { created_at: string }[]) {
  if (!rs.length) return 0
  const weeks = new Set(rs.map(r => isoWeek(new Date(r.created_at))))
  const sorted = [...weeks].sort().reverse()
  let cur = isoWeek(new Date()), streak = 0
  for (const w of sorted) {
    if (w !== cur) break
    streak++
    const [y, n] = w.split('-').map(Number)
    cur = n === 1 ? `${y - 1}-52` : `${y}-${n - 1}`
  }
  return streak
}

interface RecentReceipt {
  id: string; store_name: string | null; total_amount: number | null
  receipt_date: string | null; created_at: string; savings_amount: number | null
}
interface AreaInsight { cheapestChain: string; postcode: string }

const NAV = [
  { id: 'home',  label: 'Accueil',   Icon: Home,         href: '/dashboard' },
  { id: 'carte', label: 'Carte',     Icon: MapIcon,      href: '/carte' },
  { id: 'scan',  label: 'Scanner',   Icon: Camera,       href: '/scan', fab: true },
  { id: 'liste', label: 'Ma liste',  Icon: ShoppingCart, href: '/liste' },
  { id: 'bilan', label: 'Mon bilan', Icon: BarChart2,    href: '/bilan' },
]
const STORE_ACCENT = ['#7ed957', '#00D09C', '#F59E0B', '#a3f07a', '#60A5FA']

export default function DashboardPage() {
  const [user,           setUser]           = useState<User | null>(null)
  const [loading,        setLoading]        = useState(true)
  const [recentReceipts, setRecentReceipts] = useState<RecentReceipt[]>([])
  const [totalSavings,   setTotalSavings]   = useState(0)
  const [totalSpent,     setTotalSpent]     = useState(0)
  const [receiptsCount,  setReceiptsCount]  = useState(0)
  const [monthSpent,     setMonthSpent]     = useState(0)
  const [streak,         setStreak]         = useState(0)
  const [unreadCount,    setUnreadCount]    = useState(0)
  const [areaInsight,    setAreaInsight]    = useState<AreaInsight | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const savingsVal = useCountUp(totalSavings)
  const spentVal   = useCountUp(totalSpent)
  const monthVal   = useCountUp(monthSpent)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)

      const [
        { data: receipts, error: receiptsErr },
        { count: rCount },
        { count: unread },
        { data: profile },
        { data: all },
      ] = await Promise.all([
        supabase.from('receipts')
          .select('id, store_name, total_amount, receipt_date, created_at, savings_amount')
          .eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('receipts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('notifications').select('id', { count: 'exact', head: true })
          .eq('user_id', user.id).eq('read', false),
        supabase.from('profiles').select('postcode, onboarded, total_savings').eq('id', user.id).single(),
        supabase.from('receipts')
          .select('created_at, total_amount, receipt_date').eq('user_id', user.id),
      ])

      if (receiptsErr) {
        const { data: fb } = await supabase.from('receipts')
          .select('id, store_name, total_amount, receipt_date, created_at')
          .eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
        if (fb) setRecentReceipts(fb as RecentReceipt[])
      } else if (receipts) {
        setRecentReceipts(receipts)
      }

      if (rCount)  setReceiptsCount(rCount)
      if (unread)  setUnreadCount(unread)
      if (!profile?.onboarded) setShowOnboarding(true)

      // total_savings comes from the profile (maintained by the award system)
      if (profile?.total_savings) setTotalSavings(Number(profile.total_savings))

      if (all) {
        setTotalSpent(all.reduce((s, r) => s + (r.total_amount || 0), 0))
        setStreak(computeStreak(all))
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString().split('T')[0]
        setMonthSpent(
          all.filter(r => r.receipt_date && r.receipt_date >= monthStart)
             .reduce((s, r) => s + (r.total_amount || 0), 0)
        )
      }

      const pc = profile?.postcode
      if (pc && pc.length >= 2) {
        const dept = pc.slice(0, 2)
        const { data: pd } = await supabase.from('price_items')
          .select('store_chain, unit_price').like('postcode', `${dept}%`)
          .not('store_chain', 'is', null).limit(500)
        if (pd && pd.length > 0) {
          const cm = new Map<string, number[]>()
          for (const row of pd) {
            if (!row.store_chain) continue
            if (!cm.has(row.store_chain)) cm.set(row.store_chain, [])
            cm.get(row.store_chain)!.push(row.unit_price)
          }
          let best = '', bestAvg = Infinity
          for (const [chain, prices] of cm.entries()) {
            if (prices.length < 3) continue
            const avg = prices.reduce((s, p) => s + p, 0) / prices.length
            if (avg < bestAvg) { bestAvg = avg; best = chain }
          }
          if (best) setAreaInsight({ cheapestChain: best, postcode: pc })
        }
      }

      setLoading(false)
    }
    init()
  }, [])

  const level       = getLevel(receiptsCount)
  const nextLabel   = NEXT_LEVEL[level.label]
  const savingsRate = totalSpent > 0 ? (totalSavings / (totalSpent + totalSavings) * 100) : 0
  const username    = user?.email?.split('@')[0] ?? ''

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-paper flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 rounded-full border-2 border-t-transparent"
          style={{ borderColor: '#7ed957', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <>
      {showOnboarding && <OnboardingFlow />}

      <div className="min-h-[100dvh] bg-paper text-graphite flex">

        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-64 flex-shrink-0 h-screen sticky top-0"
          style={{ background: '#111', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-6 py-5 flex items-center gap-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <img src="/basket_logo.png" alt="Basket" className="h-8 w-8" />
            <span className="font-extrabold text-white text-lg tracking-tight">Basket</span>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {NAV.map((item) => (
              <Link key={item.id} href={item.href}
                className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all"
                style={item.fab ? { background: '#7ed957', color: '#111' } : { color: 'rgba(255,255,255,0.4)' }}>
                <item.Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-semibold">{item.label}</span>
                {item.fab && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />}
              </Link>
            ))}
          </nav>
          <div className="mx-3 mb-3 rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${level.border}` }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: level.bg }}>
                <level.Icon className="w-4 h-4" style={{ color: level.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">{level.label}</p>
                {nextLabel && level.next !== Infinity && (
                  <p className="text-[10px] text-white/35">{level.next - receiptsCount} → {nextLabel}</p>
                )}
              </div>
            </div>
            {level.next !== Infinity && (
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <motion.div className="h-full rounded-full" style={{ background: level.color }}
                  initial={{ width: 0 }} animate={{ width: `${level.progress}%` }}
                  transition={{ delay: 0.8, duration: 1.2, ease: EASE }} />
              </div>
            )}
          </div>
          <div className="px-4 py-4 flex items-center justify-between"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{username}</p>
              <p className="text-[10px] text-white/35 truncate">{user?.email}</p>
            </div>
            <button onClick={() => { supabase.auth.signOut(); window.location.href = '/' }}
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.07)' }}>
              <LogOut className="w-3.5 h-3.5 text-white/40" />
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 pb-28 md:pb-12">
          {/* Mobile header */}
          <div className="md:hidden flex items-center justify-between px-5 pt-14 pb-4">
            <div className="flex items-center gap-2.5">
              <img src="/basket_logo.png" alt="" className="h-7 w-7" />
              <span className="font-bold text-graphite">Basket</span>
            </div>
            <Link href="/notifications" className="relative w-9 h-9 rounded-full flex items-center justify-center glass">
              <Bell className="w-4 h-4 text-graphite/60" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                  style={{ background: '#7ed957' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          </div>

          <div className="max-w-2xl mx-auto px-4 md:px-8 md:pt-8 space-y-4">

            {/* Hero */}
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="relative overflow-hidden rounded-3xl p-6 md:p-8"
              style={{ background: '#111' }}>
              <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(126,217,87,0.10) 0%, transparent 70%)' }} />
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(126,217,87,0.3), transparent)' }} />

              <div className="flex items-center justify-between mb-6">
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, ease: EASE }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ background: level.bg, border: `1px solid ${level.border}` }}>
                  <level.Icon className="w-3.5 h-3.5" style={{ color: level.color }} />
                  <span className="text-xs font-bold" style={{ color: level.color }}>{level.label}</span>
                </motion.div>
                {streak > 1 && (
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25, ease: EASE }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400">{streak} semaines 🔥</span>
                  </motion.div>
                )}
              </div>

              <p className="text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Bonjour, {username} 👋
              </p>
              <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, ease: EASE }}
                className="font-extrabold mb-1 leading-none"
                style={{ fontSize: 'clamp(2.5rem,6vw,3.5rem)', color: '#7ed957', fontVariantNumeric: 'tabular-nums' }}>
                €{savingsVal.toFixed(2)}
              </motion.p>
              <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
                économisés · €{spentVal.toFixed(2)} dépensés au total
              </p>

              {savingsRate > 0 && (
                <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, ease: EASE }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-5"
                  style={{ background: 'rgba(0,208,156,0.12)', border: '1px solid rgba(0,208,156,0.2)' }}>
                  <TrendingDown className="w-3 h-3" style={{ color: '#00D09C' }} />
                  <span className="text-xs font-bold" style={{ color: '#00D09C' }}>
                    Taux d'économie : {savingsRate.toFixed(1)}%
                  </span>
                </motion.span>
              )}

              {level.next !== Infinity && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: 'rgba(255,255,255,0.2)' }}>
                      {level.next - receiptsCount} ticket{level.next - receiptsCount !== 1 ? 's' : ''} vers {nextLabel}
                    </span>
                    <span className="text-[10px] font-bold" style={{ color: level.color }}>
                      {Math.round(level.progress)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <motion.div className="h-full rounded-full" style={{ background: level.color }}
                      initial={{ width: 0 }} animate={{ width: `${level.progress}%` }}
                      transition={{ delay: 0.65, duration: 1.2, ease: EASE }} />
                  </div>
                </div>
              )}
            </motion.div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Tickets',   val: receiptsCount,  unit: '',  Icon: Receipt,      color: '#7ed957' },
                { label: 'Ce mois',   val: monthVal,       unit: '€', Icon: ShoppingBag,  color: '#fff' },
                { label: 'Économisé', val: savingsVal,     unit: '€', Icon: TrendingDown, color: '#00D09C' },
              ].map((s, i) => (
                <motion.div key={s.label}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 + i * 0.07, ease: EASE }}
                  className="rounded-2xl p-3 md:p-4"
                  style={{ background: '#1A1A1A', borderLeft: `3px solid ${s.color}` }}>
                  <s.Icon className="w-3.5 h-3.5 mb-2" style={{ color: s.color, opacity: 0.5 }} />
                  <p className="text-base md:text-lg font-extrabold leading-tight"
                    style={{ color: s.color, fontVariantNumeric: 'tabular-nums' }}>
                    {s.unit}{s.unit ? (s.val as number).toFixed(2) : s.val}
                  </p>
                  <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider mt-0.5"
                    style={{ color: 'rgba(255,255,255,0.25)' }}>{s.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Recent receipts */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, ease: EASE }}
              className="rounded-3xl overflow-hidden bg-white"
              style={{ border: '1px solid rgba(17,17,17,0.07)' }}>
              <div className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid rgba(17,17,17,0.06)' }}>
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-graphite/40" />
                  <p className="text-sm font-bold text-graphite">Mes tickets</p>
                  {receiptsCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(17,17,17,0.06)', color: 'rgba(17,17,17,0.4)' }}>
                      {receiptsCount}
                    </span>
                  )}
                </div>
                <Link href="/bilan"
                  className="text-xs font-semibold flex items-center gap-1 hover:opacity-70 transition-opacity"
                  style={{ color: '#7ed957', textDecoration: 'none' }}>
                  Bilan <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {recentReceipts.length === 0 ? (
                <div className="py-14 flex flex-col items-center text-center px-8">
                  <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
                    style={{ background: 'rgba(126,217,87,0.08)', border: '1px solid rgba(126,217,87,0.15)' }}>
                    <Camera className="w-8 h-8" style={{ color: '#7ed957', opacity: 0.6 }} />
                  </div>
                  <p className="font-bold text-graphite mb-1">Aucun ticket encore</p>
                  <p className="text-sm text-graphite/40 mb-5 max-w-xs">
                    Scannez votre premier ticket et découvrez combien vous économisez réellement.
                  </p>
                  <Link href="/scan"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white"
                    style={{ background: '#111', textDecoration: 'none' }}>
                    <Camera className="w-4 h-4" /> Scanner maintenant
                  </Link>
                </div>
              ) : (
                <AnimatePresence>
                  {recentReceipts.map((r, i) => {
                    const accent = STORE_ACCENT[i % STORE_ACCENT.length]
                    const dateStr = r.receipt_date
                      ? new Date(r.receipt_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                      : new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                    return (
                      <motion.div key={r.id}
                        initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.04, ease: EASE }}>
                        <Link href={`/receipt/${r.id}`}
                          className="flex items-center gap-4 px-5 py-3.5 hover:bg-black/[0.02] active:bg-black/[0.04] transition-colors"
                          style={{
                            borderBottom: i < recentReceipts.length - 1 ? '1px solid rgba(17,17,17,0.05)' : 'none',
                            textDecoration: 'none', display: 'flex',
                          }}>
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: `${accent}18` }}>
                            <ShoppingBag className="w-4 h-4" style={{ color: accent }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-graphite truncate">
                              {r.store_name || 'Magasin'}
                            </p>
                            <p className="text-[11px] text-graphite/40">{dateStr}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-graphite">
                              {r.total_amount != null ? `€${r.total_amount.toFixed(2)}` : '—'}
                            </p>
                            {(r.savings_amount ?? 0) > 0 && (
                              <p className="text-[11px] font-semibold" style={{ color: '#00D09C' }}>
                                −€{r.savings_amount!.toFixed(2)}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-graphite/20 flex-shrink-0" />
                        </Link>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              )}
            </motion.div>

            {/* Area insight */}
            {areaInsight && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, ease: EASE }}
                className="rounded-2xl p-4 flex items-center gap-4"
                style={{ background: 'rgba(126,217,87,0.06)', border: '1px solid rgba(126,217,87,0.18)', borderLeft: '3px solid #7ed957' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(126,217,87,0.12)' }}>
                  <MapPin className="w-5 h-5" style={{ color: '#7ed957' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-graphite">
                    En {areaInsight.postcode},{' '}
                    <span style={{ color: '#7ed957' }}>{areaInsight.cheapestChain}</span>{' '}
                    est le moins cher
                  </p>
                  <p className="text-xs text-graphite/45 mt-0.5">Basé sur les prix de votre secteur</p>
                </div>
                <Link href="/carte" className="text-xs font-bold flex-shrink-0"
                  style={{ color: '#7ed957', textDecoration: 'none' }}>
                  Carte →
                </Link>
              </motion.div>
            )}

            {/* Quick actions */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, ease: EASE }}
              className="grid grid-cols-2 gap-3">
              <Link href="/bilan"
                className="rounded-2xl p-5 flex flex-col gap-3 hover:opacity-90 active:scale-[0.98] transition-all"
                style={{ background: '#111', textDecoration: 'none' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(126,217,87,0.15)' }}>
                  <BarChart2 className="w-5 h-5" style={{ color: '#7ed957' }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Mon bilan</p>
                  <p className="text-xs text-white/40 mt-0.5">Semaine en cours</p>
                </div>
              </Link>
              <Link href="/liste"
                className="rounded-2xl p-5 flex flex-col gap-3 glass hover:bg-black/[0.03] active:scale-[0.98] transition-all"
                style={{ textDecoration: 'none' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(17,17,17,0.07)' }}>
                  <ShoppingCart className="w-5 h-5 text-graphite/60" />
                </div>
                <div>
                  <p className="text-sm font-bold text-graphite">Ma liste</p>
                  <p className="text-xs text-graphite/40 mt-0.5">Meilleur magasin</p>
                </div>
              </Link>
            </motion.div>

            {/* Scan CTA */}
            {receiptsCount < 5 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.62, ease: EASE }}>
                <Link href="/scan"
                  className="flex items-center gap-4 rounded-2xl p-5 hover:opacity-90 active:scale-[0.99] transition-all"
                  style={{ background: '#111', textDecoration: 'none' }}>
                  <div className="relative w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(126,217,87,0.15)' }}>
                    <Camera className="w-6 h-6" style={{ color: '#7ed957' }} />
                    <motion.div className="absolute inset-0 rounded-xl"
                      style={{ border: '2px solid #7ed957' }}
                      animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.12, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm">Scanner un ticket</p>
                    <p className="text-xs text-white/40 mt-0.5">Chaque centime économisé compte</p>
                  </div>
                  <Zap className="w-5 h-5 flex-shrink-0" style={{ color: '#7ed957' }} />
                </Link>
              </motion.div>
            )}

          </div>
        </main>
      </div>

      <BottomNav active="home" />
    </>
  )
}
