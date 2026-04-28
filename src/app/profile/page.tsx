'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import BetaGate from '@/components/BetaGate'
import {
  LogOut, MapPin, Bell, Trash2, Receipt, Package, TrendingDown,
  Store, AlertTriangle, Loader2, Lock, Check, ChevronRight, Trophy,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'
import {
  BADGES, LEGENDARY_GRADIENT, LEGENDARY_ELITE_GRADIENT,
  getFrameStyle, RARITY_COLOR,
  type AvatarFrame, type BadgeRarity, type LevelProgress,
} from '@/lib/gamification'
import { EASE, useCountUp } from '@/lib/hooks'
import type { GamificationState, LeaderboardRow } from '@/types/api'

// ── Rarity style maps ─────────────────────────────────────────────────────────
const RARITY_BG: Record<BadgeRarity, string> = {
  common:    'rgba(17,17,17,0.06)',
  rare:      'rgba(126,217,87,0.08)',
  epic:      'rgba(185,242,255,0.1)',
  legendary: 'rgba(255,215,0,0.1)',
}
const RARITY_BORDER: Record<BadgeRarity, string> = {
  common:    '1px solid rgba(17,17,17,0.1)',
  rare:      '1px solid rgba(126,217,87,0.2)',
  epic:      '1px solid rgba(185,242,255,0.25)',
  legendary: '1px solid rgba(255,215,0,0.3)',
}
const RARITY_LABEL: Record<BadgeRarity, string> = {
  common:    'Commun',
  rare:      'Rare',
  epic:      'Épique',
  legendary: 'Légendaire',
}


interface ProfileStats { receipts: number; items: number; favoriteStore: string | null; totalSaved: number }

// ── Avatar frame ring component ───────────────────────────────────────────────
function AvatarRing({ frame, size = 80, children }: { frame: AvatarFrame; size?: number; children: React.ReactNode }) {
  const isLegendary = frame === 'legendary' || frame === 'legendary_elite'
  const gradient    = frame === 'legendary_elite' ? LEGENDARY_ELITE_GRADIENT : LEGENDARY_GRADIENT
  const style       = getFrameStyle(frame)

  if (isLegendary) {
    return (
      <div className="relative" style={{ width: size, height: size }}>
        {/* Animated gradient ring */}
        <div className="absolute inset-0 rounded-full animate-spin"
          style={{ background: gradient, animationDuration: '4s', padding: 3 }}>
          <div className="w-full h-full rounded-full" style={{ background: '#111' }} />
        </div>
        <div className="absolute inset-[3px] rounded-full overflow-hidden">{children}</div>
      </div>
    )
  }

  return (
    <div className="relative rounded-full overflow-hidden"
      style={{ width: size, height: size, border: style.border, boxShadow: style.glow }}>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [user,              setUser]             = useState<User | null>(null)
  const [stats,             setStats]            = useState<ProfileStats>({ receipts: 0, items: 0, favoriteStore: null, totalSaved: 0 })
  const [gam,               setGam]              = useState<GamificationState | null>(null)
  const [leaderboard,       setLeaderboard]      = useState<LeaderboardRow[]>([])
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
  const xpVal       = useCountUp(gam?.xp ?? 0)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const { user: u, access_token: token } = session
      setUser(u)

      // Clear badge notification now that the user is on the profile page
      try { localStorage.removeItem('basket_gam_new_badge') } catch { /* ignore */ }

      // Phase 1: profile data + gamification in parallel
      const [
        { count: rc },
        { count: ic },
        { data: profileRow },
        { data: topStore },
        { data: savingsData },
        gamRes,
      ] = await Promise.all([
        supabase.from('receipts').select('*', { count: 'exact', head: true }).eq('user_id', u.id),
        supabase.from('price_items').select('*', { count: 'exact', head: true }).eq('user_id', u.id),
        supabase.from('profiles').select('postcode, display_name').eq('id', u.id).single(),
        supabase.from('receipts').select('store_chain').eq('user_id', u.id).not('store_chain', 'is', null),
        supabase.from('receipts').select('savings_amount').eq('user_id', u.id),
        fetch('/api/gamification', { headers: { Authorization: `Bearer ${token}` } }),
      ])

      const pc       = (profileRow?.postcode as string) ?? ''
      const dept     = pc.slice(0, 2)
      if (pc) setPostcode(pc)

      let favStore: string | null = null
      if (topStore && topStore.length > 0) {
        const counts: Record<string, number> = {}
        topStore.forEach((r: { store_chain: string | null }) => {
          if (r.store_chain) counts[r.store_chain] = (counts[r.store_chain] || 0) + 1
        })
        favStore = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
      }
      const totalSaved = savingsData?.reduce((s, r) => s + (r.savings_amount || 0), 0) ?? 0
      setStats({ receipts: rc || 0, items: ic || 0, favoriteStore: favStore, totalSaved })

      if (gamRes.ok) {
        const gamData: GamificationState = await gamRes.json()
        setGam(gamData)
        // Update localStorage streak for BottomNav
        try { localStorage.setItem('basket_gam_streak', String(gamData.scan_streak)) } catch { /* ignore */ }
      }

      setLoading(false)

      // Phase 2: leaderboard (dept needed)
      if (dept && token) {
        const lbRes = await fetch(`/api/leaderboard?type=savings&dept=${dept}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (lbRes.ok) {
          const lbData = await lbRes.json()
          setLeaderboard(lbData.top?.slice(0, 5) ?? [])
        }
      }
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

  const username    = user?.user_metadata?.display_name ?? user?.email?.split('@')[0] ?? ''
  const initial     = username[0]?.toUpperCase() ?? '?'
  const frame       = gam?.frame ?? 'default'
  const earnedIds   = new Set((gam?.badges ?? []).map((b) => b.id))
  const earnedCount = earnedIds.size

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-paper px-5 pt-14">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-20 h-20 rounded-full skeleton" />
          <div className="skeleton" style={{ width: 140, height: 16 }} />
          <div className="skeleton" style={{ width: 100, height: 12 }} />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="glass-card p-4" style={{ borderRadius: 20 }}>
              <div className="skeleton" style={{ width: 40, height: 24, marginBottom: 8 }} />
              <div className="skeleton skeleton-text-sm" style={{ width: '60%' }} />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="glass-card p-4" style={{ borderRadius: 20 }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl skeleton" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton skeleton-text" style={{ width: `${50 + i * 15}%` }} />
                  <div className="skeleton skeleton-text-sm" style={{ width: `${30 + i * 10}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <BottomNav active="profile" />
      </div>
    )
  }

  return (
    <BetaGate>
    <div className="min-h-screen bg-paper text-graphite pb-28">

      {/* ── Profile header (Waze-style light) ──────────────────────────── */}
      <div className="relative overflow-hidden pt-14 pb-8 px-5 text-center" style={{ background: '#fff', borderBottom: '1px solid rgba(17,17,17,0.06)' }}>
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(126,217,87,0.06) 0%, transparent 70%)' }} />

        {/* Avatar */}
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="inline-flex mb-4 relative">
          <AvatarRing frame={frame} size={80}>
            <div className="w-full h-full rounded-full flex items-center justify-center text-3xl font-extrabold text-white"
              style={{ background: 'linear-gradient(135deg, #7ed957, #5bc43a)' }}>
              {initial}
            </div>
          </AvatarRing>
          {/* Level bubble */}
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 400, damping: 20 }}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold"
            style={{ background: '#111', color: '#7ed957', border: '2px solid #fff' }}>
            {gam?.level ?? 1}
          </motion.div>
        </motion.div>

        <h1 className="text-xl font-extrabold text-graphite">{username}</h1>
        <p className="text-sm mt-0.5 font-semibold" style={{ color: '#7ed957' }}>{gam?.title ?? 'Débutant'}</p>

        {/* Streak */}
        {(gam?.scan_streak ?? 0) > 0 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex items-center justify-center gap-1.5 mt-3">
            <span className="text-base">🔥</span>
            <span className="text-sm font-bold" style={{ color: '#F59E0B' }}>
              {gam!.scan_streak} semaine{gam!.scan_streak > 1 ? 's' : ''} consécutive{gam!.scan_streak > 1 ? 's' : ''}
            </span>
          </motion.div>
        )}

        {/* XP progress bar */}
        <div className="mt-4 max-w-xs mx-auto">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold" style={{ color: '#7ed957' }}>
              {Math.round(xpVal).toLocaleString('fr-FR')} XP
            </span>
            {gam?.next_level ? (
              <span className="text-[10px] text-graphite/30 font-medium">
                {(gam.next_level.xp_required - (gam.xp ?? 0)).toLocaleString('fr-FR')} XP → Nv.{gam.next_level.level}
              </span>
            ) : (
              <span className="text-[10px] text-graphite/30">Niveau max</span>
            )}
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(17,17,17,0.06)' }}>
            <motion.div className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #7ed957, #00D09C)' }}
              initial={{ width: 0 }}
              animate={{ width: `${gam?.progress.percent ?? 0}%` }}
              transition={{ delay: 0.4, duration: 1.2, ease: EASE }} />
          </div>
        </div>

        <p className="text-[10px] text-graphite/20 mt-3">
          Membre depuis {user?.created_at
            ? new Date(user.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
            : '—'}
        </p>
      </div>

      <main className="max-w-lg mx-auto px-5 space-y-4 pt-4">

        {/* ── Stats grid ───────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, ease: EASE }}
          className="grid grid-cols-2 gap-3">
          {[
            { Icon: Receipt,      label: 'Tickets scannés',   value: Math.round(receiptsVal).toLocaleString('fr-FR'), color: '#7ed957' },
            { Icon: Package,      label: 'Produits analysés', value: Math.round(itemsVal).toLocaleString('fr-FR'),    color: '#a3f07a' },
            { Icon: TrendingDown, label: 'Économies totales', value: `€${savedVal.toFixed(2)}`,                      color: '#00D09C' },
            { Icon: Store,        label: 'Magasin favori',    value: stats.favoriteStore || '—',                     color: 'rgba(17,17,17,0.4)' },
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

        {/* ── Next level teaser ────────────────────────────────────────── */}
        {gam?.next_level && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, ease: EASE }}
            className="rounded-2xl p-4 flex items-center gap-4"
            style={{ background: '#fff', border: '1px solid rgba(17,17,17,0.07)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(126,217,87,0.1)' }}>
              <Lock className="w-5 h-5" style={{ color: '#7ed957' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-graphite/35 uppercase tracking-wider font-bold mb-0.5">
                Prochaine récompense — Nv.{gam.next_level.level}
              </p>
              <p className="text-sm font-semibold text-graphite truncate">{gam.next_level.unlock}</p>
              <p className="text-[10px] text-graphite/30 mt-0.5">{gam.next_level.title}</p>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="text-sm font-extrabold" style={{ color: '#7ed957' }}>
                {(gam.next_level.xp_required - (gam.xp ?? 0)).toLocaleString('fr-FR')}
              </p>
              <p className="text-[9px] text-graphite/30">XP restants</p>
            </div>
          </motion.div>
        )}

        {/* ── Weekly challenges ─────────────────────────────────────────── */}
        {gam && gam.weekly_challenges.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, ease: EASE }}
            className="rounded-2xl overflow-hidden bg-white"
            style={{ border: '1px solid rgba(17,17,17,0.07)' }}>
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid rgba(17,17,17,0.06)' }}>
              <p className="text-xs font-bold uppercase tracking-wider text-graphite/40">Défis de la semaine</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(126,217,87,0.1)', color: '#7ed957' }}>
                {gam.weekly_challenges.filter((c) => c.completed).length}/{gam.weekly_challenges.length}
              </span>
            </div>
            <div>
              {gam.weekly_challenges.map((c, i) => (
                <div key={c.id}
                  className="flex items-center gap-3 px-5 py-4"
                  style={{ borderBottom: i < gam.weekly_challenges.length - 1 ? '1px solid rgba(17,17,17,0.05)' : 'none' }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{ background: c.completed ? '#7ed957' : 'rgba(17,17,17,0.08)' }}>
                    {c.completed && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <p className={`text-sm flex-1 ${c.completed ? 'line-through text-graphite/35' : 'text-graphite'}`}>
                    {c.text}
                  </p>
                  <span className="text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0"
                    style={{ background: c.completed ? 'rgba(0,208,156,0.1)' : 'rgba(126,217,87,0.1)', color: c.completed ? '#00D09C' : '#7ed957' }}>
                    +{c.xp} XP
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Badge collection ─────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26, ease: EASE }}
          className="rounded-2xl overflow-hidden bg-white"
          style={{ border: '1px solid rgba(17,17,17,0.07)' }}>
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid rgba(17,17,17,0.06)' }}>
            <p className="text-xs font-bold uppercase tracking-wider text-graphite/40">Collection</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(126,217,87,0.1)', color: '#7ed957' }}>
              {earnedCount}/{BADGES.length}
            </span>
          </div>
          <div className="p-4 grid grid-cols-4 gap-2.5">
            {BADGES.map((badge, i) => {
              const earned = earnedIds.has(badge.id)
              return (
                <motion.div key={badge.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: earned ? 1 : 0.38, scale: 1 }}
                  transition={{ delay: 0.28 + i * 0.03, type: 'spring', stiffness: 400, damping: 25 }}
                  className="flex flex-col items-center gap-1 p-2.5 rounded-2xl text-center"
                  style={{
                    background: earned ? RARITY_BG[badge.rarity] : 'rgba(17,17,17,0.03)',
                    border:     earned ? RARITY_BORDER[badge.rarity] : '1px solid rgba(17,17,17,0.06)',
                  }}>
                  <span className="text-2xl leading-none">{earned ? badge.icon : '🔒'}</span>
                  <p className="text-[8px] font-bold text-graphite/60 leading-tight text-center">{badge.name}</p>
                  {earned ? (
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: RARITY_COLOR[badge.rarity] }} />
                  ) : (
                    <p className="text-[7px] text-graphite/30 leading-tight text-center line-clamp-2">
                      {RARITY_LABEL[badge.rarity]}
                    </p>
                  )}
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* ── Leaderboard mini ─────────────────────────────────────────── */}
        {(leaderboard.length > 0 || gam?.dept_rank) && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, ease: EASE }}
            className="rounded-2xl overflow-hidden bg-white"
            style={{ border: '1px solid rgba(17,17,17,0.07)' }}>
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid rgba(17,17,17,0.06)' }}>
              <div className="flex items-center gap-2">
                <Trophy className="w-3.5 h-3.5" style={{ color: '#F59E0B' }} />
                <p className="text-xs font-bold uppercase tracking-wider text-graphite/40">
                  Classement — Dépt. {postcode.slice(0, 2) || '—'}
                </p>
              </div>
              {gam?.dept_rank && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
                  #{gam.dept_rank}
                </span>
              )}
            </div>
            {leaderboard.length > 0 ? (
              leaderboard.map((row, i) => (
                <div key={row.id}
                  className="flex items-center gap-3 px-5 py-3.5"
                  style={{
                    borderBottom: i < leaderboard.length - 1 ? '1px solid rgba(17,17,17,0.05)' : 'none',
                    background:   row.is_me ? 'rgba(126,217,87,0.04)' : undefined,
                  }}>
                  <span className="w-5 text-xs font-extrabold text-graphite/30 text-right flex-shrink-0">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-graphite truncate">
                      {row.is_me ? 'Vous' : row.display_name}
                    </p>
                    <p className="text-[10px] text-graphite/40">{row.title}</p>
                  </div>
                  <p className="text-sm font-bold text-graphite flex-shrink-0">
                    €{Number(row.total_savings).toFixed(0)}
                  </p>
                </div>
              ))
            ) : (
              <div className="px-5 py-6 text-center">
                <p className="text-xs text-graphite/40">Scannez plus de tickets pour apparaître dans le classement.</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Settings ─────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34, ease: EASE }}
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
                      onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(17,17,17,0.12)')} />
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
              className="relative w-11 h-6 rounded-full flex-shrink-0"
              style={{ background: notifications ? '#7ed957' : 'rgba(17,17,17,0.12)' }}>
              <motion.div className="absolute top-0.5 bottom-0.5 w-5 h-5 bg-white rounded-full shadow"
                animate={{ left: notifications ? '22px' : '2px' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
            </motion.button>
          </div>
        </motion.div>

        {/* ── Links ────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, ease: EASE }}
          className="rounded-2xl overflow-hidden bg-white"
          style={{ border: '1px solid rgba(17,17,17,0.07)' }}>
          {[
            { label: 'Politique de confidentialité', href: '/privacy' },
            { label: "Conditions d'utilisation",     href: '/terms' },
            { label: 'Contact',                       href: '/contact' },
          ].map((link, i) => (
            <Link key={link.href} href={link.href}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-black/[0.02] transition-colors"
              style={{ borderBottom: i < 2 ? '1px solid rgba(17,17,17,0.05)' : 'none', textDecoration: 'none' }}>
              <span className="text-sm text-graphite/70">{link.label}</span>
              <ChevronRight className="w-3.5 h-3.5 text-graphite/25" />
            </Link>
          ))}
        </motion.div>

        {/* ── Logout ───────────────────────────────────────────────────── */}
        <motion.button initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42, ease: EASE }}
          onClick={handleLogout} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          className="w-full h-12 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 glass text-graphite">
          <LogOut className="w-4 h-4" />
          Déconnexion
        </motion.button>

        {/* ── Delete account ───────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.46 }} className="text-center pb-4">
          <button onClick={() => setShowDeleteConfirm(true)}
            className="text-xs text-graphite/30 hover:text-red-500 transition-colors flex items-center gap-1.5 mx-auto">
            <Trash2 className="w-3 h-3" />
            Supprimer mon compte
          </button>
        </motion.div>

        {/* ── Delete confirm modal ─────────────────────────────────────── */}
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

      <BottomNav
        active="profile"
        profileMeta={{
          level:       gam?.level ?? 1,
          streak:      gam?.scan_streak ?? 0,
          hasNewBadge: false,   // cleared on mount above
        }}
      />
    </div>
    </BetaGate>
  )
}
