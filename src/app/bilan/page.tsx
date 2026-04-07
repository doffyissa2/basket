'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft, Share2, Download, TrendingDown, Receipt,
  Flame, ShoppingBag, ChevronRight, ChevronDown, Camera
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import BottomNav from '@/components/BottomNav'

interface WeekReceipt {
  id: string
  store_name: string | null
  total_amount: number | null
  savings_amount: number | null
  receipt_date: string | null
  created_at: string
}

// Returns [weekStart (Mon 00:00), weekEnd (Sun 23:59)] for the current calendar week
function getCurrentWeekRange(): [Date, Date] {
  const now = new Date()
  const dayOfWeek = (now.getDay() + 6) % 7 // 0=Mon … 6=Sun
  const start = new Date(now)
  start.setDate(now.getDate() - dayOfWeek)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return [start, end]
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
      current = week === 1 ? `${year - 1}-52` : `${year}-${week - 1}`
    } else break
  }
  return streak
}

function DayDots({ receipts, weekStart }: { receipts: WeekReceipt[]; weekStart: Date }) {
  const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  const dayHasReceipt = Array(7).fill(false)
  for (const r of receipts) {
    const d = new Date(r.created_at)
    const idx = (d.getDay() + 6) % 7
    dayHasReceipt[idx] = true
  }
  return (
    <div className="flex gap-2 items-center">
      {DAYS.map((label, i) => {
        const day = new Date(weekStart)
        day.setDate(weekStart.getDate() + i)
        const isToday = day.toDateString() === new Date().toDateString()
        return (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{
                background: dayHasReceipt[i] ? '#7ed957' : isToday ? 'rgba(17,17,17,0.08)' : 'transparent',
                color: dayHasReceipt[i] ? '#111' : isToday ? '#111' : 'rgba(17,17,17,0.25)',
                border: isToday && !dayHasReceipt[i] ? '1px solid rgba(17,17,17,0.15)' : 'none',
              }}
            >
              {label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function BilanPage() {
  const [user, setUser] = useState<User | null>(null)
  const [weekReceipts, setWeekReceipts] = useState<WeekReceipt[]>([])
  const [prevWeekTotal, setPrevWeekTotal] = useState<number>(0)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const [weekStart, weekEnd] = getCurrentWeekRange()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)

      // Previous week range
      const prevStart = new Date(weekStart)
      prevStart.setDate(weekStart.getDate() - 7)
      const prevEnd = new Date(weekEnd)
      prevEnd.setDate(weekEnd.getDate() - 7)

      const [{ data: weekData }, { data: allData }, { data: prevData }] = await Promise.all([
        supabase.from('receipts')
          .select('id, store_name, total_amount, savings_amount, receipt_date, created_at')
          .eq('user_id', user.id)
          .gte('receipt_date', weekStart.toISOString().split('T')[0])
          .lte('receipt_date', weekEnd.toISOString().split('T')[0])
          .order('created_at', { ascending: false }),
        supabase.from('receipts')
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('receipts')
          .select('total_amount')
          .eq('user_id', user.id)
          .gte('receipt_date', prevStart.toISOString().split('T')[0])
          .lte('receipt_date', prevEnd.toISOString().split('T')[0]),
      ])

      if (weekData) setWeekReceipts(weekData)
      if (allData) setStreak(computeStreak(allData))
      if (prevData) setPrevWeekTotal(prevData.reduce((s, r) => s + (r.total_amount || 0), 0))
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalSpent = weekReceipts.reduce((s, r) => s + (r.total_amount || 0), 0)
  const totalSavings = weekReceipts.reduce((s, r) => s + (r.savings_amount || 0), 0)
  const scanCount = weekReceipts.length
  const savingsRatio = totalSpent > 0 ? (totalSavings / (totalSpent + totalSavings)) * 100 : 0

  // Per-store breakdown
  const storeBreakdown = Object.entries(
    weekReceipts.reduce<Record<string, { total: number; savings: number; count: number }>>((acc, r) => {
      const key = r.store_name || 'Autre'
      if (!acc[key]) acc[key] = { total: 0, savings: 0, count: 0 }
      acc[key].total += r.total_amount || 0
      acc[key].savings += r.savings_amount || 0
      acc[key].count += 1
      return acc
    }, {})
  ).sort((a, b) => b[1].total - a[1].total)

  const weekVsPrev = prevWeekTotal > 0
    ? ((totalSpent - prevWeekTotal) / prevWeekTotal) * 100
    : null

  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  const weekLabel = `${fmt(weekStart)} – ${fmt(weekEnd)}`

  const shareAsText = () => {
    const lines = [
      `📊 Mon bilan Basket — ${weekLabel}`,
      '',
      `💰 Dépensé : €${totalSpent.toFixed(2)}`,
      totalSavings > 0 ? `✅ Économisé : €${totalSavings.toFixed(2)} (${savingsRatio.toFixed(0)}%)` : '',
      `🧾 ${scanCount} ticket${scanCount !== 1 ? 's' : ''} scannés`,
      streak > 1 ? `🔥 ${streak} semaines de suite` : '',
      '',
      'Essaie Basket → basket.fr',
    ].filter(Boolean).join('\n')

    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ text: lines, title: 'Mon bilan Basket' })
    } else {
      navigator.clipboard?.writeText(lines)
    }
  }

  const downloadCard = () => {
    setSharing(true)
    const canvas = document.createElement('canvas')
    canvas.width = 600; canvas.height = 380
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = '#F5F3EE'; ctx.fillRect(0, 0, 600, 380)
    ctx.fillStyle = '#7ed957'; ctx.fillRect(0, 0, 6, 380)

    ctx.fillStyle = 'rgba(17,17,17,0.4)'; ctx.font = '500 13px sans-serif'
    ctx.fillText(weekLabel, 28, 38)

    ctx.fillStyle = '#111'; ctx.font = 'bold 52px sans-serif'
    ctx.fillText(`€${totalSpent.toFixed(2)}`, 28, 98)
    ctx.fillStyle = 'rgba(17,17,17,0.4)'; ctx.font = '500 14px sans-serif'
    ctx.fillText('dépensés cette semaine', 28, 122)

    if (totalSavings > 0) {
      ctx.fillStyle = '#00D09C'; ctx.font = 'bold 28px sans-serif'
      ctx.fillText(`€${totalSavings.toFixed(2)} économisés`, 28, 168)
      ctx.fillStyle = 'rgba(17,17,17,0.4)'; ctx.font = '500 13px sans-serif'
      ctx.fillText(`soit ${savingsRatio.toFixed(0)}% de votre panier`, 28, 190)
    }

    ctx.fillStyle = 'rgba(17,17,17,0.08)'; ctx.fillRect(28, 210, 544, 1)

    ctx.fillStyle = '#111'; ctx.font = '600 14px sans-serif'
    const stats = [
      `${scanCount} ticket${scanCount !== 1 ? 's' : ''}`,
      streak > 1 ? `${streak} semaines 🔥` : '',
      storeBreakdown[0]?.[0] || '',
    ].filter(Boolean).join('   ·   ')
    ctx.fillText(stats, 28, 236)

    ctx.fillStyle = '#7ed957'; ctx.font = 'bold 15px sans-serif'
    ctx.textAlign = 'right'; ctx.fillText('Basket', 572, 360)
    ctx.fillStyle = 'rgba(17,17,17,0.35)'; ctx.font = '500 12px sans-serif'
    ctx.fillText('basket.fr', 572, 376)

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
      <div className="flex items-center justify-between px-5 pt-14 pb-5">
        <a href="/dashboard" className="w-9 h-9 rounded-full flex items-center justify-center glass">
          <ArrowLeft className="w-4 h-4 text-graphite/50" />
        </a>
        <h1 className="text-base font-bold text-graphite">Bilan de la semaine</h1>
        <div className="w-9" />
      </div>

      <main className="max-w-lg mx-auto px-5 space-y-4">

        {/* Hero card */}
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-6 relative overflow-hidden bg-white"
          style={{ border: '1px solid rgba(17,17,17,0.07)', borderLeft: '4px solid #7ed957' }}
        >
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #7ed957 0%, transparent 70%)', transform: 'translate(40%,-40%)' }} />

          {/* Week label + day dots */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] text-graphite/40 font-semibold">{weekLabel}</p>
            {streak > 1 && (
              <div className="flex items-center gap-1 text-xs font-bold text-orange-400">
                <Flame className="w-3.5 h-3.5" />
                {streak} sem.
              </div>
            )}
          </div>

          <DayDots receipts={weekReceipts} weekStart={weekStart} />

          {/* Spent + Saved */}
          <div className="flex items-end gap-6 mt-5">
            <div>
              <p className="text-[10px] text-graphite/40 font-semibold uppercase tracking-wider mb-1">Dépensé</p>
              <p className="text-4xl font-extrabold text-graphite" style={{ fontVariantNumeric: 'tabular-nums' }}>
                €{totalSpent.toFixed(2)}
              </p>
              {weekVsPrev !== null && (
                <p className="text-[11px] mt-1" style={{ color: weekVsPrev > 0 ? '#EF4444' : '#00D09C' }}>
                  {weekVsPrev > 0 ? '▲' : '▼'} {Math.abs(weekVsPrev).toFixed(0)}% vs sem. préc.
                </p>
              )}
            </div>
            {totalSavings > 0 && (
              <div>
                <p className="text-[10px] text-graphite/40 font-semibold uppercase tracking-wider mb-1">Économisé</p>
                <p className="text-2xl font-extrabold" style={{ color: '#00D09C', fontVariantNumeric: 'tabular-nums' }}>
                  €{totalSavings.toFixed(2)}
                </p>
                <p className="text-[11px] mt-1 text-graphite/40">{savingsRatio.toFixed(0)}% du panier</p>
              </div>
            )}
          </div>

          <p className="text-xs text-graphite/35 mt-3">
            {scanCount === 0 ? 'Aucun ticket cette semaine' : `${scanCount} ticket${scanCount !== 1 ? 's' : ''} scanné${scanCount !== 1 ? 's' : ''}`}
          </p>
        </motion.div>

        {/* No receipts CTA */}
        {scanCount === 0 && (
          <motion.a
            href="/scan"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="block rounded-2xl p-5 flex items-center gap-4"
            style={{ background: '#111', textDecoration: 'none' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(126,217,87,0.15)' }}>
              <Camera className="w-5 h-5" style={{ color: '#7ed957' }} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-white">Scanner un ticket</p>
              <p className="text-xs text-white/40 mt-0.5">Démarrez votre bilan cette semaine</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30" />
          </motion.a>
        )}

        {/* Per-store breakdown */}
        {storeBreakdown.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl overflow-hidden"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-graphite/40 px-4 py-3"
              style={{ borderBottom: '1px solid rgba(17,17,17,0.06)' }}>
              Par enseigne
            </p>
            {storeBreakdown.map(([store, data], i) => {
              const barWidth = storeBreakdown[0]?.[1].total > 0
                ? (data.total / storeBreakdown[0][1].total) * 100
                : 0
              return (
                <div key={i} className="px-4 py-3" style={{ borderBottom: i < storeBreakdown.length - 1 ? '1px solid rgba(17,17,17,0.05)' : 'none' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-3.5 h-3.5 text-graphite/30" />
                      <span className="text-sm font-semibold text-graphite">{store}</span>
                      <span className="text-[10px] text-graphite/35">{data.count} ticket{data.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-graphite">€{data.total.toFixed(2)}</span>
                      {data.savings > 0 && (
                        <span className="text-[11px] font-semibold ml-2" style={{ color: '#00D09C' }}>-€{data.savings.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(17,17,17,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${barWidth}%`, background: i === 0 ? '#7ed957' : 'rgba(17,17,17,0.2)' }}
                    />
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}

        {/* Per-receipt list */}
        {weekReceipts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass rounded-2xl overflow-hidden"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-graphite/40 px-4 py-3"
              style={{ borderBottom: '1px solid rgba(17,17,17,0.06)' }}>
              Tickets ({scanCount})
            </p>
            <AnimatePresence>
              {weekReceipts.map((r, i) => (
                <div key={r.id} style={{ borderBottom: i < weekReceipts.length - 1 ? '1px solid rgba(17,17,17,0.05)' : 'none' }}>
                  <button
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(126,217,87,0.1)' }}>
                        <Receipt className="w-3.5 h-3.5" style={{ color: '#7ed957' }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-graphite">{r.store_name || 'Magasin'}</p>
                        <p className="text-[11px] text-graphite/40">
                          {r.receipt_date
                            ? new Date(r.receipt_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
                            : new Date(r.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-bold text-graphite">{r.total_amount ? `${r.total_amount.toFixed(2)} €` : '—'}</p>
                        {(r.savings_amount ?? 0) > 0 && (
                          <p className="text-[11px] font-semibold" style={{ color: '#00D09C' }}>-{r.savings_amount?.toFixed(2)} €</p>
                        )}
                      </div>
                      <ChevronDown
                        className="w-4 h-4 text-graphite/25 transition-transform"
                        style={{ transform: expandedId === r.id ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      />
                    </div>
                  </button>
                  <AnimatePresence>
                    {expandedId === r.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                        style={{ borderTop: '1px solid rgba(17,17,17,0.05)' }}
                      >
                        <div className="px-4 py-3 space-y-1.5">
                          <ReceiptItemsLoader receiptId={r.id} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Share buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-3 pb-4"
        >
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

// Lazy-loads items for a receipt when the row is expanded
function ReceiptItemsLoader({ receiptId }: { receiptId: string }) {
  const [items, setItems] = useState<{ item_name: string; unit_price: number; savings?: number }[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('price_items')
      .select('item_name, unit_price')
      .eq('receipt_id', receiptId)
      .order('unit_price', { ascending: false })
      .limit(20)
      .then(({ data }) => { setItems(data ?? []); setLoading(false) })
  }, [receiptId])

  if (loading) return <p className="text-xs text-graphite/30 py-2">Chargement…</p>
  if (!items || items.length === 0) return <p className="text-xs text-graphite/30 py-2">Aucun article</p>

  return (
    <>
      {items.map((item, i) => (
        <div key={i} className="flex items-center justify-between">
          <p className="text-xs text-graphite/70 truncate flex-1 pr-3">{item.item_name}</p>
          <p className="text-xs font-semibold text-graphite flex-shrink-0">{item.unit_price.toFixed(2)} €</p>
        </div>
      ))}
      <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid rgba(17,17,17,0.05)' }}>
        <p className="text-[11px] font-semibold text-graphite/40">{items.length} articles affichés</p>
        <TrendingDown className="w-3 h-3 text-graphite/25" />
      </div>
    </>
  )
}
