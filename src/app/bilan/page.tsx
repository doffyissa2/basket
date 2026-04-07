'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Share2, Download, TrendingDown, Receipt, Flame } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import BottomNav from '@/components/BottomNav'

interface WeekReceipt {
  store_name: string | null
  total_amount: number | null
  savings_amount: number | null
  created_at: string
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function computeStreak(allReceipts: { created_at: string }[]): number {
  if (allReceipts.length === 0) return 0
  const weeks = new Set(allReceipts.map((r) => {
    const d = new Date(r.created_at)
    return `${d.getFullYear()}-${getISOWeek(d)}`
  }))
  const sorted = [...weeks].sort().reverse()
  const thisWeek = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${getISOWeek(d)}`
  })()

  let streak = 0
  let current = thisWeek
  for (const w of sorted) {
    if (w === current) {
      streak++
      const [year, week] = w.split('-').map(Number)
      const prev = week === 1 ? `${year - 1}-52` : `${year}-${week - 1}`
      current = prev
    } else break
  }
  return streak
}

export default function BilanPage() {
  const [user, setUser] = useState<User | null>(null)
  const [weekReceipts, setWeekReceipts] = useState<WeekReceipt[]>([])
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const [{ data: weekData }, { data: allData }] = await Promise.all([
        supabase.from('receipts')
          .select('store_name, total_amount, savings_amount, created_at')
          .eq('user_id', user.id)
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false }),
        supabase.from('receipts')
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ])

      if (weekData) setWeekReceipts(weekData)
      if (allData) setStreak(computeStreak(allData))
      setLoading(false)
    }
    init()
  }, [])

  const totalSavings = weekReceipts.reduce((s, r) => s + (r.savings_amount || 0), 0)
  const scanCount = weekReceipts.length
  const bestDeal = weekReceipts.reduce((best, r) => Math.max(best, r.savings_amount || 0), 0)
  const bestStore = weekReceipts
    .filter((r) => r.store_name)
    .reduce<Record<string, number>>((acc, r) => {
      acc[r.store_name!] = (acc[r.store_name!] || 0) + 1
      return acc
    }, {})
  const topStore = Object.entries(bestStore).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  const weekLabel = `${fmt(weekStart)} – ${fmt(weekEnd)}`

  const shareAsText = () => {
    const text = `Mon bilan Basket cette semaine :\n\n€${totalSavings.toFixed(2)} économisés\n${scanCount} ticket${scanCount !== 1 ? 's' : ''} scannés${streak > 1 ? `\n${streak} semaines de suite` : ''}\n\nEssaie Basket → basket.fr`
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ text, title: 'Mon bilan Basket' })
    } else {
      navigator.clipboard?.writeText(text)
    }
  }

  const downloadCard = () => {
    setSharing(true)
    const canvas = document.createElement('canvas')
    canvas.width = 600
    canvas.height = 340
    const ctx = canvas.getContext('2d')!

    // Background
    ctx.fillStyle = '#F5F3EE'
    ctx.fillRect(0, 0, 600, 340)

    // Accent strip
    ctx.fillStyle = '#7ed957'
    ctx.fillRect(0, 0, 6, 340)

    // Week label
    ctx.fillStyle = 'rgba(17,17,17,0.45)'
    ctx.font = '500 14px sans-serif'
    ctx.fillText(weekLabel, 28, 40)

    // Big savings number
    ctx.fillStyle = totalSavings > 0 ? '#00D09C' : '#111111'
    ctx.font = 'bold 72px sans-serif'
    ctx.fillText(`€${totalSavings.toFixed(2)}`, 28, 110)

    // Sub label
    ctx.fillStyle = 'rgba(17,17,17,0.45)'
    ctx.font = '500 16px sans-serif'
    ctx.fillText('économisés cette semaine', 28, 138)

    // Stats row
    ctx.fillStyle = '#111111'
    ctx.font = '600 15px sans-serif'
    const stats = [
      `${scanCount} ticket${scanCount !== 1 ? 's' : ''}`,
      streak > 1 ? `${streak} semaines` : '',
      topStore ? topStore : '',
    ].filter(Boolean).join('   ·   ')
    ctx.fillText(stats, 28, 178)

    // Divider
    ctx.fillStyle = 'rgba(17,17,17,0.08)'
    ctx.fillRect(28, 200, 544, 1)

    // Best deal
    if (bestDeal > 0) {
      ctx.fillStyle = 'rgba(17,17,17,0.4)'
      ctx.font = '500 13px sans-serif'
      ctx.fillText('Meilleure économie de la semaine', 28, 228)
      ctx.fillStyle = '#111111'
      ctx.font = '600 15px sans-serif'
      ctx.fillText(`€${bestDeal.toFixed(2)} sur un ticket`, 28, 252)
    }

    // Branding
    ctx.fillStyle = '#7ed957'
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText('Basket', 572, 320)
    ctx.fillStyle = 'rgba(17,17,17,0.4)'
    ctx.font = '500 13px sans-serif'
    ctx.fillText('basket.fr', 572, 338)

    canvas.toBlob((blob) => {
      if (!blob) { setSharing(false); return }
      const file = new File([blob], 'bilan-basket.png', { type: 'image/png' })
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files: [file] })) {
        navigator.share({ files: [file], title: 'Mon bilan Basket' }).finally(() => setSharing(false))
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = 'bilan-basket.png'; a.click()
        URL.revokeObjectURL(url)
        setSharing(false)
      }
    })
  }

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
        <h1 className="text-lg font-bold text-graphite">Bilan de la semaine</h1>
        <div className="w-16" />
      </div>

      <main className="max-w-lg mx-auto px-5 space-y-4">
        {/* The shareable card */}
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-6 relative overflow-hidden bg-white"
          style={{
            border: '1px solid rgba(17,17,17,0.08)',
            borderLeft: '4px solid #7ed957',
          }}
        >
          {/* Glow */}
          <div className="absolute top-0 right-0 w-56 h-56 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #00D09C 0%, transparent 70%)', transform: 'translate(30%,-30%)' }} />

          <p className="text-xs text-graphite/40 mb-3">{weekLabel}</p>

          {/* Big savings */}
          <p className="font-extrabold mb-1" style={{ fontSize: 56, lineHeight: 1, color: totalSavings > 0 ? '#00D09C' : '#111111', fontVariantNumeric: 'tabular-nums' }}>
            €{totalSavings.toFixed(2)}
          </p>
          <p className="text-sm text-graphite/50 mb-5">économisés cette semaine</p>

          {/* Stats row */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Receipt className="w-4 h-4" style={{ color: '#7ed957' }} />
              <span className="text-sm font-semibold text-graphite">{scanCount} ticket{scanCount !== 1 ? 's' : ''}</span>
            </div>
            {streak > 1 && (
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-semibold text-graphite">{streak} semaines</span>
              </div>
            )}
            {topStore && (
              <div className="flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4" style={{ color: '#00D09C' }} />
                <span className="text-sm font-semibold text-graphite">{topStore}</span>
              </div>
            )}
          </div>

          {/* Branding */}
          <p className="absolute bottom-4 right-5 text-xs font-bold opacity-50" style={{ color: '#7ed957' }}>basket.fr</p>
        </motion.div>

        {/* No data state */}
        {scanCount === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8 glass rounded-2xl px-6">
            <p className="text-sm font-semibold text-graphite mb-1">Aucun ticket cette semaine</p>
            <p className="text-xs text-graphite/40">Scannez un ticket pour voir votre bilan</p>
          </motion.div>
        )}

        {/* Best deal */}
        {bestDeal > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,208,156,0.12)' }}>
              <TrendingDown className="w-5 h-5" style={{ color: '#00D09C' }} />
            </div>
            <div>
              <p className="text-xs text-graphite/50">Meilleure économie</p>
              <p className="text-sm font-bold text-graphite">€{bestDeal.toFixed(2)} sur un ticket</p>
            </div>
          </motion.div>
        )}

        {/* Recent receipts this week */}
        {weekReceipts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass rounded-2xl overflow-hidden">
            <p className="text-xs font-semibold text-graphite/40 uppercase tracking-wider px-4 py-3 border-b" style={{ borderColor: 'rgba(17,17,17,0.06)' }}>
              Tickets cette semaine
            </p>
            {weekReceipts.map((r, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 border-b last:border-0" style={{ borderColor: 'rgba(17,17,17,0.06)' }}>
                <div>
                  <p className="text-sm font-medium text-graphite">{r.store_name || 'Magasin'}</p>
                  <p className="text-xs text-graphite/40">{new Date(r.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-graphite">{r.total_amount ? `${r.total_amount.toFixed(2)} €` : '—'}</p>
                  {(r.savings_amount ?? 0) > 0 && (
                    <p className="text-xs font-semibold" style={{ color: '#00D09C' }}>-{r.savings_amount?.toFixed(2)} €</p>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Share buttons */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 gap-3">
          <motion.button
            onClick={shareAsText}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="h-12 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2"
            style={{ background: '#25D366', color: '#fff' }}
          >
            <Share2 className="w-4 h-4" />
            Partager
          </motion.button>
          <motion.button
            onClick={downloadCard}
            disabled={sharing}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="h-12 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 glass text-graphite"
          >
            <Download className="w-4 h-4" />
            {sharing ? 'Génération…' : 'Image'}
          </motion.button>
        </motion.div>
      </main>

      <BottomNav active="home" />
    </div>
  )
}
