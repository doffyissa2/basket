'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import BetaGate from '@/components/BetaGate'
import { Bell, ArrowLeft, TrendingDown, Check, Sparkles, ShoppingBag } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'
import { EASE } from '@/lib/hooks'

interface Notification {
  id: string; type: string; title: string; body: string; read: boolean
  created_at: string
  metadata: { item_name?: string; new_price?: number; old_price?: number; store?: string } | null
}

function groupByDate(notifs: Notification[]): { label: string; items: Notification[] }[] {
  const groups: Record<string, Notification[]> = {}
  const today     = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()
  for (const n of notifs) {
    const d = new Date(n.created_at).toDateString()
    const label = d === today ? "Aujourd'hui" : d === yesterday ? 'Hier' :
      new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    if (!groups[label]) groups[label] = []
    groups[label].push(n)
  }
  return Object.entries(groups).map(([label, items]) => ({ label, items }))
}

function NotifIcon({ type }: { type: string }) {
  if (type === 'price_drop') return (
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: 'rgba(0,208,156,0.12)' }}>
      <TrendingDown className="w-5 h-5" style={{ color: '#00D09C' }} />
    </div>
  )
  if (type === 'achievement') return (
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: 'rgba(126,217,87,0.12)' }}>
      <Sparkles className="w-5 h-5" style={{ color: '#7ed957' }} />
    </div>
  )
  return (
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: 'rgba(126,217,87,0.12)' }}>
      <Bell className="w-5 h-5" style={{ color: '#7ed957' }} />
    </div>
  )
}

export default function NotificationsPage() {
  const [user,          setUser]          = useState<User | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)
      const { data } = await supabase.from('notifications')
        .select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(50)
      if (data) setNotifications(data)
      setLoading(false)
    }
    init()
  }, [])

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }

  const markAllRead = async () => {
    if (!user) return
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
  }

  const unreadCount = notifications.filter(n => !n.read).length
  const groups      = groupByDate(notifications)

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 rounded-full border-2 border-t-transparent"
          style={{ borderColor: '#7ed957', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <BetaGate>
    <div className="min-h-screen bg-paper text-graphite pb-28">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-5"
        style={{ borderBottom: '1px solid rgba(17,17,17,0.06)' }}>
        <Link href="/dashboard"
          className="flex items-center gap-2 text-graphite/50 text-sm hover:text-graphite transition-colors"
          style={{ textDecoration: 'none' }}>
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Link>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5" style={{ color: '#7ed957' }} />
          <h1 className="text-lg font-bold text-graphite">Alertes</h1>
          {unreadCount > 0 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
              style={{ background: '#7ed957', color: '#111' }}>
              {unreadCount}
            </motion.span>
          )}
        </div>
        {unreadCount > 0 ? (
          <button onClick={markAllRead} className="text-xs font-semibold" style={{ color: '#7ed957' }}>
            Tout lire
          </button>
        ) : <div className="w-16" />}
      </div>

      <main className="max-w-lg mx-auto px-5 pt-4">
        {notifications.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ ease: EASE }}
            className="text-center py-20">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(17,17,17,0.04)', border: '1px solid rgba(17,17,17,0.08)' }}>
              <Bell className="w-10 h-10 text-graphite/20" />
            </div>
            <p className="text-base font-bold text-graphite mb-2">Aucune alerte</p>
            <p className="text-sm text-graphite/40 max-w-xs mx-auto leading-relaxed">
              Surveillez des produits depuis vos scans pour être notifié dès qu'un prix baisse
            </p>
            <Link href="/scan"
              className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl font-bold text-sm text-white"
              style={{ background: '#111', textDecoration: 'none' }}>
              <ShoppingBag className="w-4 h-4" /> Scanner un ticket
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence initial={false}>
              {groups.map(({ label, items }) => (
                <div key={label}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-graphite/35 mb-2 px-1">
                    {label}
                  </p>
                  <div className="space-y-2">
                    {items.map((notif, i) => (
                      <motion.div key={notif.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: notif.read ? 0.55 : 1, y: 0 }}
                        transition={{ delay: i * 0.04, ease: EASE }}
                        onClick={() => { if (!notif.read) markRead(notif.id) }}
                        className="rounded-2xl p-4 flex items-start gap-4 cursor-pointer relative transition-all hover:bg-black/[0.02] bg-white"
                        style={{ border: notif.read ? '1px solid rgba(17,17,17,0.05)' : '1px solid rgba(17,17,17,0.08)' }}>

                        {!notif.read && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                            className="absolute top-4 right-4 w-2 h-2 rounded-full"
                            style={{ background: '#7ed957' }} />
                        )}

                        <NotifIcon type={notif.type} />

                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-sm font-semibold text-graphite mb-0.5">{notif.title}</p>
                          <p className="text-xs text-graphite/50 leading-relaxed">{notif.body}</p>
                          {notif.metadata?.new_price && notif.metadata?.old_price && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs line-through text-graphite/30">
                                €{notif.metadata.old_price.toFixed(2)}
                              </span>
                              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                                style={{ background: 'rgba(0,208,156,0.1)', color: '#00D09C' }}>
                                €{notif.metadata.new_price.toFixed(2)}
                              </span>
                              {notif.metadata.store && (
                                <span className="text-xs text-graphite/35">chez {notif.metadata.store}</span>
                              )}
                            </div>
                          )}
                          <p className="text-[10px] text-graphite/25 mt-1.5">
                            {new Date(notif.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        {notif.read && <Check className="w-4 h-4 text-graphite/20 flex-shrink-0 mt-0.5" />}
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      <BottomNav active="home" />
    </div>
    </BetaGate>
  )
}
