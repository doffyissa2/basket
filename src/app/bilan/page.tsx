'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft, Share2, Download, TrendingDown, Receipt,
  Flame, ShoppingBag, ChevronDown, Camera, ChevronRight,
  Sparkles,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'
import { EASE, useCountUp } from '@/lib/hooks'

function getCurrentWeekRange(): [Date, Date] {
  const now = new Date()
  const dow = (now.getDay() + 6) % 7
  const start = new Date(now); start.setDate(now.getDate() - dow); start.setHours(0, 0, 0, 0)
  const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999)
  return [start, end]
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

interface WeekReceipt {
  id: string; store_name: string | null; total_amount: number | null
  savings_amount: number | null; receipt_date: string | null; created_at: string
}

function DayDots({ receipts, weekStart }: { receipts: WeekReceipt[]; weekStart: Date }) {
  const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  const has = Array(7).fill(false)
  for (const r of receipts) {
    const idx = (new Date(r.created_at).getDay() + 6) % 7
    has[idx] = true
  }
  return (
    <div className="flex gap-2">
      {DAYS.map((lbl, i) => {
        const day = new Date(weekStart); day.setDate(weekStart.getDate() + i)
        const isToday = day.toDateString() === new Date().toDateString()
        return (
          <motion.div key={i}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.04, ease: EASE }}
            className="flex flex-col items-center gap-1.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
              style={{
                background: has[i] ? '#7ed957' : isToday ? 'rgba(17,17,17,0.08)' : 'transparent',
                color: has[i] ? '#111' : isToday ? '#111' : 'rgba(17,17,17,0.25)',
                border: isToday && !has[i] ? '1.5px solid rgba(17,17,17,0.15)' : 'none',
                boxShadow: has[i] ? '0 2px 8px rgba(126,217,87,0.35)' : 'none',
              }}>
              {lbl}
            </div>
            {has[i] && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 0.5 + i * 0.04, type: 'spring', stiffness: 400, damping: 20 }}
                className="w-1 h-1 rounded-full" style={{ background: '#7ed957' }} />
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

function ReceiptItemsLoader({ receiptId }: { receiptId: string }) {
  const [items, setItems] = useState<{ item_name: string; unit_price: number }[] | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabase.from('price_items').select('item_name, unit_price')
      .eq('receipt_id', receiptId).order('unit_price', { ascending: false }).limit(20)
      .then(({ data }) => { setItems(data ?? []); setLoading(false) })
  }, [receiptId])
  if (loading) return <p className="text-xs text-graphite/30 py-2 text-center">Chargement…</p>
  if (!items || items.length === 0) return <p className="text-xs text-graphite/30 py-2 text-center">Aucun article</p>
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <motion.div key={i}
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.03, ease: EASE }}
          className="flex items-center justify-between">
          <p className="text-xs text-graphite/70 truncate flex-1 pr-3">{item.item_name}</p>
          <p className="text-xs font-semibold text-graphite flex-shrink-0">{item.unit_price.toFixed(2)} €</p>
        </motion.div>
      ))}
      <div className="flex items-center justify-between pt-1.5" style={{ borderTop: '1px solid rgba(17,17,17,0.05)' }}>
        <p className="text-[10px] font-semibold text-graphite/35">{items.length} articles affichés</p>
        <TrendingDown className="w-3 h-3 text-graphite/20" />
      </div>
    </div>
  )
}

export default function BilanPage() {
  const [user,          setUser]         = useState<User | null>(null)
  const [weekReceipts,  setWeekReceipts] = useState<WeekReceipt[]>([])
  const [prevWeekTotal, setPrevWeek]     = useState(0)
  const [streak,        setStreak]       = useState(0)
  const [loading,       setLoading]      = useState(true)
  const [sharing,       setSharing]      = useState(false)
  const [expandedId,    setExpanded]     = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const [weekStart, weekEnd] = getCurrentWeekRange()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)

      const prevStart = new Date(weekStart); prevStart.setDate(weekStart.getDate() - 7)
      const prevEnd   = new Date(weekEnd);   prevEnd.setDate(weekEnd.getDate() - 7)

      const [{ data: wk }, { data: all }, { data: prev }] = await Promise.all([
        supabase.from('receipts')
          .select('id, store_name, total_amount, savings_amount, receipt_date, created_at')
          .eq('user_id', user.id)
          .gte('receipt_date', weekStart.toISOString().split('T')[0])
          .lte('receipt_date', weekEnd.toISOString().split('T')[0])
          .order('created_at', { ascending: false }),
        supabase.from('receipts').select('created_at').eq('user_id', user.id),
        supabase.from('receipts').select('total_amount').eq('user_id', user.id)
          .gte('receipt_date', prevStart.toISOString().split('T')[0])
          .lte('receipt_date', prevEnd.toISOString().split('T')[0]),
      ])

      if (wk)   setWeekReceipts(wk)
      if (all)  setStreak(computeStreak(all))
      if (prev) setPrevWeek(prev.reduce((s, r) => s + (r.total_amount || 0), 0))
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalSpent   = weekReceipts.reduce((s, r) => s + (r.total_amount || 0), 0)
  const totalSavings = weekReceipts.reduce((s, r) => s + (r.savings_amount || 0), 0)
  const scanCount    = weekReceipts.length
  const savingsRatio = totalSpent > 0 ? (totalSavings / (totalSpent + totalSavings)) * 100 : 0
  const weekVsPrev   = prevWeekTotal > 0 ? ((totalSpent - prevWeekTotal) / prevWeekTotal * 100) : null

  const spentVal   = useCountUp(totalSpent)
  const savingsVal = useCountUp(totalSavings)

  const storeBreakdown = Object.entries(
    weekReceipts.reduce<Record<string, { total: number; savings: number; count: number }>>((acc, r) => {
      const key = r.store_name || 'Autre'
      if (!acc[key]) acc[key] = { total: 0, savings: 0, count: 0 }
      acc[key].total   += r.total_amount || 0
      acc[key].savings += r.savings_amount || 0
      acc[key].count   += 1
      return acc
    }, {})
  ).sort((a, b) => b[1].total - a[1].total)

  const fmt       = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  const weekLabel = `${fmt(weekStart)} – ${fmt(weekEnd)}`

  const shareAsText = () => {
    const lines = [
      `📊 Mon bilan Basket — ${weekLabel}`, '',
      `💰 Dépensé : €${totalSpent.toFixed(2)}`,
      totalSavings > 0 ? `✅ Économisé : €${totalSavings.toFixed(2)} (${savingsRatio.toFixed(0)}%)` : '',
      `🧾 ${scanCount} ticket${scanCount !== 1 ? 's' : ''} scannés`,
      streak > 1 ? `🔥 ${streak} semaines de suite` : '',
      '', 'Essaie Basket → basketbeta.com',
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
    }
    ctx.fillStyle = '#7ed957'; ctx.font = 'bold 15px sans-serif'
    ctx.textAlign = 'right'; ctx.fillText('Basket', 572, 360)
    canvas.toBlob((blob) => {
      if (!blob) { setSharing(false); return }
      const file = new File([blob], 'bilan-basket.png', { type: 'image/png' })
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files: [file] })) {
        navigator.share({ files: [file], title: 'Mon bilan Basket' }).finally(() => setSharing(false))
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = 'bilan-basket.png'; a.click()
        URL.revokeObjectURL(url); setSharing(false)
      }
    })
  }

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
    <div className="min-h-screen text-graphite pb-28" style={{ background: '#F5F3EE' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-5">
        <Link href="/dashboard"
          className="w-9 h-9 rounded-full flex items-center justify-center glass"
          style={{ textDecoration: 'none' }}>
          <ArrowLeft className="w-4 h-4 text-graphite/50" />
        </Link>
        <h1 className="text-base font-bold text-graphite">Bilan de la semaine</h1>
        <div className="w-9" />
      </div>

      <main className="max-w-lg mx-auto px-5 space-y-4">

        {/* Hero card */}
        <motion.div ref={cardRef}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="rounded-3xl p-6 relative overflow-hidden"
          style={{ background: '#111' }}>
          <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(126,217,87,0.10) 0%, transparent 70%)' }} />
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(126,217,87,0.3), transparent)' }} />

          <div className="flex items-center justify-between mb-5">
            <p className="text-[11px] font-semibold text-white/40">{weekLabel}</p>
            {streak > 1 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-bold text-amber-400">{streak} sem. 🔥</span>
              </div>
            )}
          </div>

          <DayDots receipts={weekReceipts} weekStart={weekStart} />

          <div className="flex items-end gap-8 mt-6">
            <div>
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mb-1">Dépensé</p>
              <motion.p className="text-4xl font-extrabold text-white"
                style={{ fontVariantNumeric: 'tabular-nums' }}>
                €{spentVal.toFixed(2)}
              </motion.p>
              {weekVsPrev !== null && (
                <p className="text-[11px] mt-1 font-semibold"
                  style={{ color: weekVsPrev > 0 ? '#EF4444' : '#00D09C' }}>
                  {weekVsPrev > 0 ? '▲' : '▼'} {Math.abs(weekVsPrev).toFixed(0)}% vs semaine préc.
                </p>
              )}
            </div>
            {totalSavings > 0 && (
              <div>
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mb-1">Économisé</p>
                <motion.p className="text-2xl font-extrabold"
                  style={{ color: '#00D09C', fontVariantNumeric: 'tabular-nums' }}>
                  €{savingsVal.toFixed(2)}
                </motion.p>
                <p className="text-[11px] mt-1 text-white/35">{savingsRatio.toFixed(0)}% du panier</p>
              </div>
            )}
          </div>

          <p className="text-xs text-white/25 mt-4">
            {scanCount === 0 ? 'Aucun ticket cette semaine' : `${scanCount} ticket${scanCount !== 1 ? 's' : ''} scanné${scanCount !== 1 ? 's' : ''}`}
          </p>
        </motion.div>

        {/* No receipts */}
        {scanCount === 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, ease: EASE }}>
            <Link href="/scan"
              className="flex items-center gap-4 rounded-2xl p-5"
              style={{ background: 'rgba(126,217,87,0.08)', border: '1px solid rgba(126,217,87,0.2)', textDecoration: 'none' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(126,217,87,0.15)' }}>
                <Camera className="w-5 h-5" style={{ color: '#7ed957' }} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-graphite">Scanner un ticket</p>
                <p className="text-xs text-graphite/45 mt-0.5">Démarrez votre bilan cette semaine</p>
              </div>
              <ChevronRight className="w-4 h-4 text-graphite/30" />
            </Link>
          </motion.div>
        )}

        {/* Savings celebration */}
        {totalSavings > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, ease: EASE }}
            className="rounded-2xl p-4 flex items-center gap-4"
            style={{ background: 'rgba(0,208,156,0.06)', border: '1px solid rgba(0,208,156,0.18)', borderLeft: '3px solid #00D09C' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(0,208,156,0.12)' }}>
              <Sparkles className="w-5 h-5" style={{ color: '#00D09C' }} />
            </div>
            <div>
              <p className="text-sm font-bold text-graphite">
                Vous avez économisé <span style={{ color: '#00D09C' }}>€{totalSavings.toFixed(2)}</span> cette semaine
              </p>
              <p className="text-xs text-graphite/45 mt-0.5">
                Soit {savingsRatio.toFixed(0)}% de votre panier total
              </p>
            </div>
          </motion.div>
        )}

        {/* Store breakdown */}
        {storeBreakdown.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, ease: EASE }}
            className="rounded-2xl overflow-hidden bg-white"
            style={{ border: '1px solid rgba(17,17,17,0.07)' }}>
            <div className="px-4 py-3.5" style={{ borderBottom: '1px solid rgba(17,17,17,0.06)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-graphite/40">Par enseigne</p>
            </div>
            {storeBreakdown.map(([store, data], i) => {
              const barPct = storeBreakdown[0]?.[1].total > 0
                ? (data.total / storeBreakdown[0][1].total) * 100 : 0
              return (
                <div key={i} className="px-4 py-3.5"
                  style={{ borderBottom: i < storeBreakdown.length - 1 ? '1px solid rgba(17,17,17,0.05)' : 'none' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-3.5 h-3.5 text-graphite/30" />
                      <span className="text-sm font-semibold text-graphite">{store}</span>
                      <span className="text-[10px] text-graphite/35 bg-black/5 px-1.5 py-0.5 rounded-full">
                        {data.count} ticket{data.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {data.savings > 0 && (
                        <span className="text-[11px] font-bold" style={{ color: '#00D09C' }}>
                          −€{data.savings.toFixed(2)}
                        </span>
                      )}
                      <span className="text-sm font-bold text-graphite">€{data.total.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(17,17,17,0.06)' }}>
                    <motion.div className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${barPct}%` }}
                      transition={{ delay: 0.4 + i * 0.08, duration: 0.9, ease: EASE }}
                      style={{ background: i === 0 ? '#7ed957' : 'rgba(17,17,17,0.18)' }} />
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}

        {/* Receipt list */}
        {weekReceipts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, ease: EASE }}
            className="rounded-2xl overflow-hidden bg-white"
            style={{ border: '1px solid rgba(17,17,17,0.07)' }}>
            <div className="px-4 py-3.5" style={{ borderBottom: '1px solid rgba(17,17,17,0.06)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-graphite/40">
                Tickets ({scanCount})
              </p>
            </div>
            <AnimatePresence>
              {weekReceipts.map((r, i) => (
                <div key={r.id}
                  style={{ borderBottom: i < weekReceipts.length - 1 ? '1px solid rgba(17,17,17,0.05)' : 'none' }}>
                  <button onClick={() => setExpanded(expandedId === r.id ? null : r.id)}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-black/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(126,217,87,0.10)' }}>
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
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold text-graphite">
                          {r.total_amount ? `${r.total_amount.toFixed(2)} €` : '—'}
                        </p>
                        {(r.savings_amount ?? 0) > 0 && (
                          <p className="text-[11px] font-semibold" style={{ color: '#00D09C' }}>
                            −{r.savings_amount?.toFixed(2)} €
                          </p>
                        )}
                      </div>
                      <ChevronDown className="w-4 h-4 text-graphite/25 transition-transform"
                        style={{ transform: expandedId === r.id ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                    </div>
                  </button>
                  <AnimatePresence>
                    {expandedId === r.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
                        className="overflow-hidden"
                        style={{ borderTop: '1px solid rgba(17,17,17,0.05)', background: 'rgba(17,17,17,0.02)' }}>
                        <div className="px-4 py-3">
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
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, ease: EASE }}
          className="grid grid-cols-2 gap-3 pb-4">
          <motion.button onClick={shareAsText} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            className="h-12 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2"
            style={{ background: '#25D366', color: '#fff' }}>
            <Share2 className="w-4 h-4" />
            Partager
          </motion.button>
          <motion.button onClick={downloadCard} disabled={sharing}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            className="h-12 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 glass text-graphite disabled:opacity-60">
            <Download className="w-4 h-4" />
            {sharing ? 'Génération…' : 'Image'}
          </motion.button>
        </motion.div>
      </main>

      <BottomNav active="home" />
    </div>
  )
}
