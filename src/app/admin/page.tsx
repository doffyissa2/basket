'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Shield, UserCheck, UserX, Loader2, ArrowLeft, Users } from 'lucide-react'

interface BetaUser {
  id: string
  email: string
  postcode: string | null
  beta_approved: boolean
  beta_approved_at: string | null
  created_at: string
}

export default function AdminPage() {
  const [users, setUsers] = useState<BetaUser[]>([])
  const [approvedCount, setApprovedCount] = useState(0)
  const [betaCap, setBetaCap] = useState(100)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [tab, setTab] = useState<'pending' | 'approved'>('pending')

  const fetchUsers = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      window.location.href = '/login'
      return
    }

    const res = await fetch('/api/admin/pending-users', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })

    if (res.status === 403) {
      setIsAdmin(false)
      setLoading(false)
      return
    }

    const data = await res.json()
    setUsers(data.users ?? [])
    setApprovedCount(data.approved_count ?? 0)
    setBetaCap(data.beta_cap ?? 100)
    setIsAdmin(true)
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const approve = async (userId: string) => {
    setApproving(userId)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch('/api/admin/approve-beta', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ targetUserId: userId }),
    })

    if (res.ok) {
      await fetchUsers()
    }
    setApproving(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-graphite/40" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-6">
        <div className="text-center">
          <Shield className="w-12 h-12 text-graphite/20 mx-auto mb-4" />
          <p className="text-graphite/50">Acces reserve a l'administrateur.</p>
          <a href="/dashboard" className="text-sm mt-4 inline-block" style={{ color: '#7ed957' }}>
            Retour au dashboard
          </a>
        </div>
      </div>
    )
  }

  const pending = users.filter(u => !u.beta_approved)
  const approved = users.filter(u => u.beta_approved)
  const displayed = tab === 'pending' ? pending : approved

  return (
    <div className="min-h-screen bg-paper text-graphite">
      <div className="max-w-2xl mx-auto px-5 py-14">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <a href="/dashboard" className="w-9 h-9 rounded-full flex items-center justify-center glass">
            <ArrowLeft className="w-4 h-4 text-graphite/50" />
          </a>
          <div>
            <h1 className="text-xl font-bold">Beta Admin</h1>
            <p className="text-sm text-graphite/50">Gestion des beta testeurs</p>
          </div>
        </div>

        {/* Counter */}
        <div
          className="rounded-2xl p-5 mb-6 flex items-center gap-4"
          style={{ background: 'rgba(126,217,87,0.08)', border: '1px solid rgba(126,217,87,0.15)' }}
        >
          <Users className="w-8 h-8 flex-shrink-0" style={{ color: '#7ed957' }} />
          <div>
            <p className="text-2xl font-bold text-graphite">
              {approvedCount}<span className="text-graphite/30 font-normal">/{betaCap}</span>
            </p>
            <p className="text-sm text-graphite/50">places beta utilisees</p>
          </div>
          <div className="flex-1">
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(17,17,17,0.06)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: '#7ed957' }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((approvedCount / betaCap) * 100, 100)}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="relative flex rounded-xl p-1 mb-6"
          style={{ background: 'rgba(17,17,17,0.06)' }}
        >
          <motion.div
            className="absolute top-1 bottom-1 rounded-lg"
            style={{ background: '#111', width: 'calc(50% - 4px)' }}
            animate={{ left: tab === 'approved' ? 'calc(50%)' : '4px' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
          <button
            onClick={() => setTab('pending')}
            className="relative z-10 flex-1 py-2 text-sm font-semibold transition-colors"
            style={{ color: tab === 'pending' ? '#fff' : 'rgba(17,17,17,0.45)' }}
          >
            En attente ({pending.length})
          </button>
          <button
            onClick={() => setTab('approved')}
            className="relative z-10 flex-1 py-2 text-sm font-semibold transition-colors"
            style={{ color: tab === 'approved' ? '#fff' : 'rgba(17,17,17,0.45)' }}
          >
            Approuves ({approved.length})
          </button>
        </div>

        {/* User list */}
        <div className="space-y-3">
          {displayed.length === 0 && (
            <p className="text-center text-graphite/40 text-sm py-8">
              {tab === 'pending' ? 'Aucune demande en attente' : 'Aucun utilisateur approuve'}
            </p>
          )}

          {displayed.map(user => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-strong rounded-xl p-4 flex items-center gap-4"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: user.beta_approved ? 'rgba(126,217,87,0.12)' : 'rgba(17,17,17,0.06)',
                }}
              >
                {user.beta_approved
                  ? <UserCheck className="w-5 h-5" style={{ color: '#7ed957' }} />
                  : <UserX className="w-5 h-5 text-graphite/40" />
                }
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-graphite truncate">{user.email}</p>
                <p className="text-xs text-graphite/40">
                  {user.postcode ? `CP ${user.postcode}` : 'Pas de code postal'}
                  {' · '}
                  Inscrit le {new Date(user.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>

              {!user.beta_approved && (
                <motion.button
                  onClick={() => approve(user.id)}
                  disabled={approving === user.id || approvedCount >= betaCap}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 rounded-lg text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40"
                  style={{ background: '#111' }}
                >
                  {approving === user.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : 'Approuver'
                  }
                </motion.button>
              )}

              {user.beta_approved && user.beta_approved_at && (
                <p className="text-xs text-graphite/30 flex-shrink-0">
                  {new Date(user.beta_approved_at).toLocaleDateString('fr-FR')}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
