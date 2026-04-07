'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Bell, ArrowLeft, TrendingDown, Check } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import BottomNav from '@/components/BottomNav'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  created_at: string
  metadata: {
    item_name?: string
    new_price?: number
    old_price?: number
    store?: string
  } | null
}

export default function NotificationsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (data) setNotifications(data)
      setLoading(false)
    }
    init()
  }, [])

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }

  const markAllRead = async () => {
    if (!user) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#7ed957', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper text-graphite pb-28">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-6">
        <a href="/dashboard" className="flex items-center gap-2 text-graphite/50 hover:text-graphite transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </a>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5" style={{ color: '#7ed957' }} />
          <h1 className="text-lg font-bold text-graphite">Alertes</h1>
          {unreadCount > 0 && (
            <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ background: '#7ed957' }}>
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 ? (
          <button onClick={markAllRead} className="text-xs font-semibold" style={{ color: '#7ed957' }}>
            Tout lire
          </button>
        ) : <div className="w-16" />}
      </div>

      <main className="max-w-lg mx-auto px-5">
        {notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-3xl glass flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-graphite/25" />
            </div>
            <p className="text-sm font-medium text-graphite mb-1">Aucune alerte</p>
            <p className="text-xs text-graphite/40 max-w-xs mx-auto">
              Surveillez des produits depuis vos scans pour être notifié quand leur prix baisse
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {notifications.map((notif, i) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: notif.read ? 0.6 : 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => { if (!notif.read) markRead(notif.id) }}
                  className="glass rounded-2xl p-4 flex items-start gap-4 cursor-pointer relative"
                >
                  {/* Unread dot */}
                  {!notif.read && (
                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full" style={{ background: '#7ed957' }} />
                  )}

                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: notif.type === 'price_drop' ? 'rgba(0,208,156,0.12)' : 'rgba(126,217,87,0.12)' }}
                  >
                    {notif.type === 'price_drop' ? (
                      <TrendingDown className="w-5 h-5" style={{ color: '#00D09C' }} />
                    ) : (
                      <Bell className="w-5 h-5" style={{ color: '#7ed957' }} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-sm font-semibold text-graphite mb-0.5">{notif.title}</p>
                    <p className="text-xs text-graphite/50 leading-relaxed">{notif.body}</p>
                    {notif.metadata?.new_price && notif.metadata?.old_price && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs line-through text-graphite/30">€{notif.metadata.old_price.toFixed(2)}</span>
                        <span className="text-xs font-bold" style={{ color: '#00D09C' }}>€{notif.metadata.new_price.toFixed(2)}</span>
                        {notif.metadata.store && (
                          <span className="text-xs text-graphite/35">chez {notif.metadata.store}</span>
                        )}
                      </div>
                    )}
                    <p className="text-[10px] text-graphite/30 mt-1.5">
                      {new Date(notif.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {notif.read && (
                    <Check className="w-4 h-4 text-graphite/25 flex-shrink-0 mt-0.5" />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      <BottomNav active="home" />
    </div>
  )
}
