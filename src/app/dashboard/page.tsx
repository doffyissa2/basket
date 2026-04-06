'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Camera, Settings, History, BarChart2, ShoppingCart, Bell, Lightbulb } from 'lucide-react'
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
    const startTime = performance.now()
    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(target * eased * 100) / 100)
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return count
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentReceipts, setRecentReceipts] = useState<RecentReceipt[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)

      const [{ data: receipts }, { count }] = await Promise.all([
        supabase
          .from('receipts')
          .select('id, store_name, total_amount, receipt_date, created_at, savings_amount')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false),
      ])
      if (receipts) {
        setRecentReceipts(receipts)
        const saved = receipts.reduce((s, r) => s + (r.savings_amount || 0), 0)
        setTotalItems(saved)
      }
      if (count) setUnreadCount(count)
      setLoading(false)
    }
    init()
  }, [])

  const animatedItems = useCountUp(totalItems)
  const greeting = user?.email?.split('@')[0] || 'vous'

  const QUICK_ACTIONS = [
    { icon: Camera, label: 'Scanner', href: '/scan', color: '#E07A5F' },
    { icon: History, label: 'Historique', href: '#', color: '#6B7280' },
    { icon: BarChart2, label: 'Mon bilan', href: '/bilan', color: '#FF9B7B' },
    { icon: ShoppingCart, label: 'Ma liste', href: '/liste', color: '#6B7280' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
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
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-28 md:pb-0">
      <OnboardingFlow />

      {/* Header */}
      <div className="px-5 pt-14 pb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-[#4B5563] font-medium uppercase tracking-wider mb-0.5">Tableau de bord</p>
          <h1 className="text-xl font-bold">Bonjour, {greeting} 👋</h1>
        </div>
        <div className="flex items-center gap-2">
          <a href="/notifications" className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-full flex items-center justify-center glass"
            >
              <Bell className="w-4 h-4 text-[#6B7280]" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white" style={{ background: '#E07A5F' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </motion.button>
          </a>
          <a href="/profile">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-full flex items-center justify-center glass"
            >
              <Settings className="w-4 h-4 text-[#6B7280]" />
            </motion.button>
          </a>
        </div>
      </div>

      <main className="px-5 space-y-5 max-w-lg mx-auto">
        {/* Hero savings card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative rounded-3xl p-6 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1A1A1A 0%, #111111 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #E07A5F 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />

          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Économies totales</p>
          <AnimatePresence mode="wait">
            <motion.p
              key={totalItems > 0 ? 'savings' : 'zero'}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-5xl font-extrabold mb-1"
              style={{
                fontVariantNumeric: 'tabular-nums',
                color: totalItems > 0 ? '#00D09C' : '#FFFFFF',
              }}
            >
              €{animatedItems.toFixed(2)}
            </motion.p>
          </AnimatePresence>
          <p className="text-sm text-[#4B5563]">
            sur {recentReceipts.length} ticket{recentReceipts.length !== 1 ? 's' : ''} scannés
          </p>

          {/* Dots indicator */}
          <div className="flex gap-1.5 mt-5">
            {[1, 0.3, 0.2].map((op, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-white" style={{ opacity: op }} />
            ))}
          </div>
        </motion.div>

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="grid grid-cols-4 gap-3"
        >
          {QUICK_ACTIONS.map((action) => (
            <a key={action.label} href={action.href} className="flex flex-col items-center gap-2">
              <motion.div
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className="w-14 h-14 rounded-2xl flex items-center justify-center glass"
                style={action.color === '#E07A5F' ? { background: 'rgba(224,122,95,0.15)', border: '1px solid rgba(224,122,95,0.3)' } : {}}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <action.icon className="w-5 h-5" style={{ color: action.color }} />
              </motion.div>
              <span className="text-[10px] font-medium" style={{ color: action.color === '#E07A5F' ? '#E07A5F' : '#6B7280' }}>
                {action.label}
              </span>
            </a>
          ))}
        </motion.div>

        {/* Scanner CTA */}
        <motion.a
          href="/scan"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="block rounded-3xl p-6 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(224,122,95,0.15) 0%, rgba(255,155,123,0.08) 100%)',
            border: '1px solid rgba(224,122,95,0.3)',
          }}
        >
          <div className="flex items-center gap-4">
            <motion.div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#E07A5F' }}
              animate={{ boxShadow: ['0 0 0 0 rgba(224,122,95,0.4)', '0 0 0 12px rgba(224,122,95,0)', '0 0 0 0 rgba(224,122,95,0)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Camera className="w-7 h-7 text-white" />
            </motion.div>
            <div>
              <p className="font-bold text-base text-white">Scanner un ticket</p>
              <p className="text-sm text-[#6B7280]">Découvrez vos économies possibles</p>
            </div>
          </div>
        </motion.a>

        {/* Recent receipts */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm text-white">Derniers scans</h2>
            <span className="text-xs text-[#4B5563]">{recentReceipts.length} tickets</span>
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
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {recentReceipts.map((receipt, i) => (
                <motion.div
                  key={receipt.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.06 }}
                  className="glass rounded-2xl p-4 min-w-[160px] flex-shrink-0"
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(224,122,95,0.15)' }}>
                    <History className="w-4 h-4 text-[#E07A5F]" />
                  </div>
                  <p className="font-semibold text-sm text-white truncate">{receipt.store_name || 'Magasin'}</p>
                  <p className="text-xs text-[#4B5563] mt-0.5">
                    {receipt.receipt_date
                      ? new Date(receipt.receipt_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                      : new Date(receipt.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </p>
                  {receipt.total_amount && (
                    <p className="text-sm font-bold text-white mt-2">{receipt.total_amount.toFixed(2)} €</p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Tip card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="glass rounded-2xl p-5 flex gap-4"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,155,123,0.15)' }}>
            <Lightbulb className="w-5 h-5 text-[#FF9B7B]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white mb-1">Astuce de la semaine</p>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              Les produits de marque distributeur coûtent en moyenne 30% moins cher. Scannez pour comparer avec les marques !
            </p>
          </div>
        </motion.div>
      </main>

      <BottomNav active="home" />
    </div>
  )
}
