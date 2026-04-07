'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { LogOut, MapPin, Bell, Trash2, Receipt, Package, TrendingDown, Store } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import BottomNav from '@/components/BottomNav'

interface ProfileStats {
  receipts: number
  items: number
  favoriteStore: string | null
  totalSaved: number
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<ProfileStats>({ receipts: 0, items: 0, favoriteStore: null, totalSaved: 0 })
  const [loading, setLoading] = useState(true)
  const [postcode, setPostcode] = useState('')
  const [editingPostcode, setEditingPostcode] = useState(false)
  const [notifications, setNotifications] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)

      const [{ count: receiptsCount }, { count: itemsCount }, { data: profile }, { data: topStore }, { data: savingsData }] = await Promise.all([
        supabase.from('receipts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('price_items').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('profiles').select('postcode').eq('id', user.id).single(),
        supabase.from('receipts').select('store_name').eq('user_id', user.id).not('store_name', 'is', null),
        supabase.from('receipts').select('savings_amount').eq('user_id', user.id),
      ])

      if (profile?.postcode) setPostcode(profile.postcode)

      let favStore: string | null = null
      if (topStore && topStore.length > 0) {
        const storeCounts: Record<string, number> = {}
        topStore.forEach((r: { store_name: string | null }) => {
          if (r.store_name) storeCounts[r.store_name] = (storeCounts[r.store_name] || 0) + 1
        })
        favStore = Object.entries(storeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null
      }

      const totalSaved = savingsData?.reduce((s, r) => s + (r.savings_amount || 0), 0) ?? 0
      setStats({ receipts: receiptsCount || 0, items: itemsCount || 0, favoriteStore: favStore, totalSaved })
      setLoading(false)
    }
    init()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const handlePostcodeSave = async () => {
    if (!user) return
    await supabase.from('profiles').update({ postcode }).eq('id', user.id)
    setEditingPostcode(false)
  }

  const avatarLetter = user?.email?.[0]?.toUpperCase() || '?'

  const STAT_CARDS = [
    { icon: Receipt, label: 'Tickets scannés', value: stats.receipts, color: '#7ed957' },
    { icon: Package, label: 'Produits analysés', value: stats.items, color: '#a3f07a' },
    { icon: TrendingDown, label: 'Économies totales', value: `€${stats.totalSaved.toFixed(2)}`, color: '#00D09C' },
    { icon: Store, label: 'Magasin favori', value: stats.favoriteStore || '—', color: 'rgba(17,17,17,0.4)' },
  ]

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
      <div className="px-5 pt-14 pb-8 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-extrabold text-white"
          style={{ background: 'linear-gradient(135deg, #7ed957, #a3f07a)' }}
        >
          {avatarLetter}
        </motion.div>
        <h1 className="text-xl font-bold text-graphite">{user?.email?.split('@')[0]}</h1>
        <p className="text-sm text-graphite/50 mt-0.5">{user?.email}</p>
        <p className="text-xs text-graphite/35 mt-1">
          Membre depuis {user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '—'}
        </p>
      </div>

      <main className="max-w-lg mx-auto px-5 space-y-4">
        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3"
        >
          {STAT_CARDS.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              className="glass rounded-2xl p-4"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: `${card.color}18` }}>
                <card.icon className="w-4 h-4" style={{ color: card.color }} />
              </div>
              <p className="text-xl font-extrabold text-graphite">
                {typeof card.value === 'number' ? card.value.toLocaleString('fr-FR') : card.value}
              </p>
              <p className="text-xs text-graphite/50 mt-0.5">{card.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Settings */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass rounded-2xl overflow-hidden"
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(17,17,17,0.06)' }}>
            <p className="text-xs font-semibold text-graphite/40 uppercase tracking-wider">Paramètres</p>
          </div>

          {/* Postcode */}
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(17,17,17,0.06)' }}>
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-graphite/40" />
              <div>
                <p className="text-sm font-medium text-graphite">Code postal</p>
                {editingPostcode ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                      className="h-7 w-24 rounded-lg px-2 text-xs text-graphite focus:outline-none"
                      style={{ background: 'rgba(17,17,17,0.06)', border: '1px solid rgba(17,17,17,0.12)' }}
                      autoFocus
                      onFocus={(e) => (e.currentTarget.style.borderColor = '#7ed957')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(17,17,17,0.12)')}
                    />
                    <button onClick={handlePostcodeSave} className="text-xs font-semibold" style={{ color: '#7ed957' }}>Sauver</button>
                    <button onClick={() => setEditingPostcode(false)} className="text-xs text-graphite/35">Annuler</button>
                  </div>
                ) : (
                  <p className="text-xs text-graphite/50 mt-0.5">{postcode || 'Non défini'}</p>
                )}
              </div>
            </div>
            {!editingPostcode && (
              <button onClick={() => setEditingPostcode(true)} className="text-xs font-semibold" style={{ color: '#7ed957' }}>Modifier</button>
            )}
          </div>

          {/* Notifications */}
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-graphite/40" />
              <div>
                <p className="text-sm font-medium text-graphite">Notifications</p>
                <p className="text-xs text-graphite/50 mt-0.5">Alertes de baisse de prix</p>
              </div>
            </div>
            <motion.button
              onClick={() => setNotifications(!notifications)}
              className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
              style={{ background: notifications ? '#7ed957' : 'rgba(17,17,17,0.12)' }}
            >
              <motion.div
                className="absolute top-0.5 bottom-0.5 w-5 h-5 bg-white rounded-full shadow"
                animate={{ left: notifications ? '22px' : '2px' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            </motion.button>
          </div>
        </motion.div>

        {/* Logout */}
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={handleLogout}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full h-12 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 glass text-graphite"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </motion.button>

        {/* Delete account */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-center pb-4"
        >
          <button className="text-xs text-graphite/30 hover:text-red-500 transition-colors flex items-center gap-1.5 mx-auto">
            <Trash2 className="w-3 h-3" />
            Supprimer mon compte
          </button>
        </motion.div>
      </main>

      <BottomNav active="profile" />
    </div>
  )
}
