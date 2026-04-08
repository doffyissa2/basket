'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
  LogOut, MapPin, Bell, Trash2, Receipt, Package, TrendingDown,
  Store, AlertTriangle, Loader2, Crown, Trophy, Flame, Star, Sparkles,
  ChevronRight, Lock,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

function useCountUp(target: number, duration = 1200) {
  const [v, setV] = useState(0)
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    if (target === 0) { setV(0); return }
    started.current = true
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1)
      setV(Math.round(target * (1 - Math.pow(1 - p, 4)) * 100) / 100)
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return v
}

function getLevel(count: number) {
  if (count >= 100) return { label: 'Champion',    Icon: Crown,    color: '#F59E0B', bg: 'rgba(245,158,11,0.15)',   border: 'rgba(245,158,11,0.3)',   next: Infinity, progress: 100 }
  if (count >= 50)  return { label: 'Expert',      Icon: Trophy,   color: '#EF4444', bg: 'rgba(239,68,68,0.15)',    border: 'rgba(239,68,68,0.3)',    next: 100, progress: (count-50)/50*100 }
  if (count >= 20)  return { label: 'Économe',     Icon: Flame,    color: '#00D09C', bg: 'rgba(0,208,156,0.15)',    border: 'rgba(0,208,156,0.3)',    next: 50,  progress: (count-20)/30*100 }
  if (count >= 5)   return { label: 'Explorateur', Icon: Star,     color: '#7ed957', bg: 'rgba(126,217,87,0.15)',  border: 'rgba(126,217,87,0.3)',  next: 20,  progress: (count-5)/15*100 }
  return                    { label: 'Débutant',   Icon: Sparkles, color: '#a3f07a', bg: 'rgba(163,240,122,0.12)', border: 'rgba(163,240,122,0.25)', next: 5,   progress: count/5*100 }
}

interface ProfileStats { receipts: number; items: number; favoriteStore: string | null; totalSaved: number }

const ACHIEVEMENTS = [
  { id: 'first',   emoji: '🧾', label: 'Premier ticket',       desc: 'Bienvenue dans Basket !', unlocked: (r: number, _s: number) => r >= 1 },
  { id: 'five',    emoji: '⭐', label: '5 tickets scannés',    desc: 'Vous prenez l\'habitude', unlocked: (r: number, _s: number) => r >= 5 },
  { id: 'saving',  emoji: '💰', label: 'Première économie',    desc: 'Vous avez économisé !',   unlocked: (_r: number, s: number) => s > 0 },
  { id: 'ten',     emoji: '🔥', label: '10 tickets',            desc: 'Bel effort !',            unlocked: (r: number, _s: number) => r >= 10 },
  { id: 'five€',   emoji: '💎', label: '€5 économisés',        desc: 'Ça commence bien',        unlocked: (_r: number, s: number) => s >= 5 },
  { id: 'twenty',  emoji: '🏆', label: '20 tickets',            desc: 'Expert en devenir',       unlocked: (r: number, _s: number) => r >= 20 },
  { id: 'twenty€', emoji: '🌟', label: '€20 économisés',       desc: 'Impressionnant !',        unlocked: (_r: number, s: number) => s >= 20 },
  { id: 'fifty',   emoji: '👑', label: '50 tickets',            desc: 'Véritable économe',       unlocked: (r: number, _s: number) => r >= 50 },
  { id: 'fifty€',  emoji: '🎯', label: '€50 économisés',       desc: 'Maître des économies',    unlocked: (_r: number, s: number) => s >= 50 },
]

export default function ProfilePage() {
  const [user,              setUser]             = useState<User | null>(null)
  const [stats,             setStats]            = useState<ProfileStats>({ receipts: 0, items: 0, favoriteStore: null, totalSaved: 0 })
  const [loading,           setLoading]          = useState(true)
  const [postcode,          setPostcode]         = useState('')
  const [editingPostcode,   setEditingPostcode]  = useState(false)
  const [notifications,     setNotifications]    = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting,          setDeleting]         = useState(false)
  const [deleteError,       setDeleteError]      = useState('')

  const receiptsVal = useCountUp(stats.receipts)
  const itemsVal    = useCountUp(stats.items)
  const savedVal    = useCountUp(stats.totalSaved)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)

      const [{ count: rc }, { count: ic }, { data: profile }, { data: topStore }, { data: savingsData }] = await Promise.all([
        supabase.from('receipts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('price_items').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('profiles').select('postcode').eq('id', user.id).single(),
        supabase.from('receipts').select('store_name').eq('user_id', user.id).not('store_name', 'is', null),
        supabase.from('receipts').select('savings_amount').eq('user_id', user.id),
      ])

      if (profile?.postcode) setPostcode(profile.postcode)

      let favStore: string | null = null
      if (topStore && topStore.length > 0) {
        const counts: Record<string, number> = {}
        topStore.forEach((r: { store_name: string | null }) => {
          if (r.store_name) counts[r.store_name] = (counts[r.store_name] || 0) + 1
        })
        favStore = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null
      }

      const totalSaved = savingsData?.reduce((s, r) => s + (r.savings_amount || 0), 0) ?? 0
      setStats({ receipts: rc || 0, items: ic || 0, favoriteStore: favStore, totalSaved })
      setLoading(false)
    }
    init()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const handleDeleteAccount = async () => {
    setDeleting(true); setDeleteError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const res = await fetch('/api/delete-account', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        await supabase.auth.signOut()
        window.location.href = '/?deleted=1'
      } else {
        const data = await res.json()
        setDeleteError(data.error || 'Erreur lors de la suppression.')
        setDeleting(false)
      }
    } catch {
      setDeleteError('Erreur réseau. Réessayez.')
      setDeleting(false)
    }
  }

  const handlePostcodeSave = async () => {
    if (!user) return
    await supabase.from('profiles').update({ postcode }).eq('id', user.id)
    setEditingPostcode(false)
  }

  const level    = getLevel(stats.receipts)
  const username = user?.email?.split('@')[0] ?? ''
  const initial  = username[0]?.toUpperCase() ?? '?'

  const unlockedAchievements = ACHIEVEMENTS.filter(a => a.unlocked(stats.receipts, stats.totalSaved))
  const lockedAchievements   = ACHIEVEMENTS.filter(a => !a.unlocked(stats.receipts, stats.totalSaved))

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
    <div className="min-h-screen bg-paper text-graphite pb-28">
      {/* Header */}
      <div className="relative overflow-hidden pt-14 pb-8 px-5 text-center"
        style={{ background: '#111' }}>
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(126,217,87,0.08) 0%, transparent 70%)' }} />

        {/* Avatar + level ring */}
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="relative inline-flex mb-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-extrabold text-white"
            style={{ background: 'linear-gradient(135deg, #7ed957, #a3f07a)' }}>
            {initial}
          </div>
          {/* Level badge */}
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: level.bg, border: `2px solid #111`, boxShadow: `0 0 0 1px ${level.color}` }}>
            <level.Icon className="w-3.5 h-3.5" style={{ color: level.color }} />
          </div>
        </motion.div>

        <h1 className="text-xl font-extrabold text-white">{username}</h1>
        <p className="text-sm text-white/40 mt-0.5">{user?.email}</p>

        {/* Level + progress */}
        <div className="mt-4 max-w-xs mx-auto">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold" style={{ color: level.color }}>{level.label}</span>
            {level.next !== Infinity && (
              <span className="text-[10px] text-white/30 font-semibold">
                {level.next - stats.receipts} tickets vers {
                  level.label === 'Débutant' ? 'Explorateur' :
                  level.label === 'Explorateur' ? 'Économe' :
                  level.label === 'Économe' ? 'Expert' : 'Champion'
                }
              </span>
            )}
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <motion.div className="h-full rounded-full" style={{ background: level.color }}
              initial={{ width: 0 }} animate={{ width: `${level.progress}%` }}
              transition={{ delay: 0.4, duration: 1, ease: EASE }} />
          </div>
        </div>

        <p className="text-[10px] text-white/25 mt-3">
          Membre depuis {user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '—'}
        </p>
      </div>

      <main className="max-w-lg mx-auto px-5 space-y-4 pt-4">

        {/* Stats grid */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, ease: EASE }}
          className="grid grid-cols-2 gap-3">
          {[
            { Icon: Receipt,     label: 'Tickets scannés',   value: Math.round(receiptsVal).toLocaleString('fr-FR'), color: '#7ed957' },
            { Icon: Package,     label: 'Produits analysés', value: Math.round(itemsVal).toLocaleString('fr-FR'),    color: '#a3f07a' },
            { Icon: TrendingDown, label: 'Économies totales', value: `€${savedVal.toFixed(2)}`,                     color: '#00D09C' },
            { Icon: Store,       label: 'Magasin favori',    value: stats.favoriteStore || '—',                      color: 'rgba(17,17,17,0.4)' },
          ].map((card, i) => (
            <motion.div key={card.label}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05, ease: EASE }}
              className="glass rounded-2xl p-4">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
                style={{ background: `${card.color}18` }}>
                <card.Icon className="w-4 h-4" style={{ color: card.color }} />
              </div>
              <p className="text-xl font-extrabold text-graphite truncate">{card.value}</p>
              <p className="text-xs text-graphite/50 mt-0.5">{card.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Achievements */}
        {(unlockedAchievements.length > 0 || lockedAchievements.length > 0) && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, ease: EASE }}
            className="rounded-2xl overflow-hidden bg-white"
            style={{ border: '1px solid rgba(17,17,17,0.07)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(17,17,17,0.06)' }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-graphite/40">Achievements</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(126,217,87,0.12)', color: '#7ed957' }}>
                  {unlockedAchievements.length}/{ACHIEVEMENTS.length}
                </span>
              </div>
            </div>
            <div className="p-4 grid grid-cols-3 gap-3">
              {ACHIEVEMENTS.map((a, i) => {
                const unlocked = a.unlocked(stats.receipts, stats.totalSaved)
                return (
                  <motion.div key={a.id}
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.25 + i * 0.04, type: 'spring', stiffness: 400, damping: 25 }}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl text-center"
                    style={{
                      background: unlocked ? 'rgba(126,217,87,0.06)' : 'rgba(17,17,17,0.03)',
                      border: unlocked ? '1px solid rgba(126,217,87,0.2)' : '1px solid rgba(17,17,17,0.06)',
                      opacity: unlocked ? 1 : 0.45,
                    }}>
                    <span className="text-2xl leading-none">{unlocked ? a.emoji : '🔒'}</span>
                    <p className="text-[9px] font-bold text-graphite/60 leading-tight">{a.label}</p>
                    {unlocked && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                        transition={{ delay: 0.5 + i * 0.03, type: 'spring', stiffness: 500, damping: 20 }}
                        className="w-1.5 h-1.5 rounded-full" style={{ background: '#7ed957' }} />
                    )}
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Settings */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, ease: EASE }}
          className="rounded-2xl overflow-hidden bg-white"
          style={{ border: '1px solid rgba(17,17,17,0.07)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(17,17,17,0.06)' }}>
            <p className="text-xs font-bold uppercase tracking-wider text-graphite/40">Paramètres</p>
          </div>

          {/* Postcode */}
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid rgba(17,17,17,0.06)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(17,17,17,0.05)' }}>
                <MapPin className="w-4 h-4 text-graphite/40" />
              </div>
              <div>
                <p className="text-sm font-medium text-graphite">Code postal</p>
                {editingPostcode ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input type="text" value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                      className="h-7 w-24 rounded-lg px-2 text-xs text-graphite focus:outline-none"
                      style={{ background: 'rgba(17,17,17,0.06)', border: '1px solid rgba(17,17,17,0.12)' }}
                      autoFocus
                      onFocus={(e) => (e.currentTarget.style.borderColor = '#7ed957')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(17,17,17,0.12)')} />
                    <button onClick={handlePostcodeSave} className="text-xs font-semibold" style={{ color: '#7ed957' }}>Sauver</button>
                    <button onClick={() => setEditingPostcode(false)} className="text-xs text-graphite/35">Annuler</button>
                  </div>
                ) : (
                  <p className="text-xs text-graphite/50 mt-0.5">{postcode || 'Non défini'}</p>
                )}
              </div>
            </div>
            {!editingPostcode && (
              <button onClick={() => setEditingPostcode(true)} className="text-xs font-semibold" style={{ color: '#7ed957' }}>
                Modifier
              </button>
            )}
          </div>

          {/* Notifications toggle */}
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(17,17,17,0.05)' }}>
                <Bell className="w-4 h-4 text-graphite/40" />
              </div>
              <div>
                <p className="text-sm font-medium text-graphite">Notifications</p>
                <p className="text-xs text-graphite/50 mt-0.5">Alertes de baisse de prix</p>
              </div>
            </div>
            <motion.button onClick={() => setNotifications(!notifications)}
              className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
              style={{ background: notifications ? '#7ed957' : 'rgba(17,17,17,0.12)' }}>
              <motion.div className="absolute top-0.5 bottom-0.5 w-5 h-5 bg-white rounded-full shadow"
                animate={{ left: notifications ? '22px' : '2px' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
            </motion.button>
          </div>
        </motion.div>

        {/* Links */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, ease: EASE }}
          className="rounded-2xl overflow-hidden bg-white"
          style={{ border: '1px solid rgba(17,17,17,0.07)' }}>
          {[
            { label: 'Politique de confidentialité', href: '/privacy' },
            { label: 'Conditions générales', href: '/terms' },
            { label: 'Contact', href: '/contact' },
          ].map((link, i) => (
            <Link key={link.href} href={link.href}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-black/[0.02] transition-colors"
              style={{ borderBottom: i < 2 ? '1px solid rgba(17,17,17,0.05)' : 'none', textDecoration: 'none' }}>
              <span className="text-sm text-graphite/70">{link.label}</span>
              <ChevronRight className="w-3.5 h-3.5 text-graphite/25" />
            </Link>
          ))}
        </motion.div>

        {/* Logout */}
        <motion.button initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, ease: EASE }}
          onClick={handleLogout} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          className="w-full h-12 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 glass text-graphite">
          <LogOut className="w-4 h-4" />
          Déconnexion
        </motion.button>

        {/* Delete account */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }} className="text-center pb-4">
          <button onClick={() => setShowDeleteConfirm(true)}
            className="text-xs text-graphite/30 hover:text-red-500 transition-colors flex items-center gap-1.5 mx-auto">
            <Trash2 className="w-3 h-3" />
            Supprimer mon compte
          </button>
        </motion.div>

        {/* Delete modal */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
              onClick={(e) => { if (e.target === e.currentTarget && !deleting) setShowDeleteConfirm(false) }}>
              <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="bg-paper rounded-3xl p-6 w-full max-w-sm shadow-2xl">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <h2 className="text-lg font-bold text-graphite text-center mb-2">Supprimer mon compte ?</h2>
                <p className="text-sm text-graphite/55 text-center leading-relaxed mb-6">
                  Cette action est <strong>irréversible</strong>. Tous vos tickets, articles et données personnelles seront définitivement supprimés.
                </p>
                {deleteError && (
                  <p className="text-xs text-red-500 text-center mb-4 px-2 py-2 rounded-xl"
                    style={{ background: 'rgba(239,68,68,0.08)' }}>{deleteError}</p>
                )}
                <div className="flex flex-col gap-3">
                  <button onClick={handleDeleteAccount} disabled={deleting}
                    className="h-12 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 text-white disabled:opacity-60"
                    style={{ background: '#EF4444' }}>
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    {deleting ? 'Suppression…' : 'Oui, supprimer définitivement'}
                  </button>
                  <button onClick={() => { setShowDeleteConfirm(false); setDeleteError('') }} disabled={deleting}
                    className="h-12 rounded-2xl font-semibold text-sm text-graphite/60 glass">
                    Annuler
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav active="profile" />
    </div>
  )
}
