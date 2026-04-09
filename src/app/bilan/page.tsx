'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft, Share2, TrendingDown, TrendingUp, ShoppingBag,
  Sparkles, Receipt, ChevronDown,
} from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'
import { EASE, useCountUp } from '@/lib/hooks'

// ── Category keyword mapping ──────────────────────────────────────────────────
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Produits laitiers': ['lait', 'beurre', 'crème', 'yaourt', 'fromage', 'emmental', 'gouda', 'camembert', 'gruyère', 'mozzarella'],
  'Viandes & Poissons': ['poulet', 'boeuf', 'porc', 'veau', 'agneau', 'saumon', 'thon', 'cabillaud', 'crevette', 'jambon', 'steak', 'escalope'],
  'Fruits & Légumes': ['pomme', 'banane', 'tomate', 'carotte', 'salade', 'oignon', 'poireau', 'courgette', 'aubergine', 'orange', 'citron', 'fraise'],
  'Épicerie': ['pâtes', 'riz', 'farine', 'sucre', 'sel', 'huile', 'sauce', 'confiture', 'miel', 'céréales', 'biscuit', 'chocolat', 'chips'],
  'Boissons': ['eau', 'jus', 'café', 'thé', 'coca', 'bière', 'vin', 'sodas', 'limonade', 'javel', 'lait végétal'],
  'Hygiène & Beauté': ['shampooing', 'savon', 'dentifrice', 'rasoir', 'déodorant', 'crème', 'gel douche', 'coton'],
  'Entretien': ['lessive', 'vaisselle', 'éponge', 'nettoyant', 'spray', 'balai', 'sac poubelle'],
}

function categoriseItem(name: string): string {
  const n = name.toLowerCase()
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some(k => n.includes(k))) return cat
  }
  return 'Autres'
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function getMonthRange(offset = 0): [Date, Date] {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)
  end.setHours(23, 59, 59, 999)
  return [start, end]
}

function getWeekKey(d: Date): string {
  const t = new Date(d)
  t.setHours(0, 0, 0, 0)
  t.setDate(t.getDate() - ((t.getDay() + 6) % 7)) // Monday
  return t.toISOString().split('T')[0]
}

// ── SVG bar chart ─────────────────────────────────────────────────────────────
function SpendingChart({ weeks }: { weeks: { label: string; amount: number; isCurrentMonth: boolean }[] }) {
  const max = Math.max(...weeks.map(w => w.amount), 1)
  const H = 80
  return (
    <svg width="100%" height={H + 24} viewBox={`0 0 ${weeks.length * 28} ${H + 24}`} preserveAspectRatio="none">
      {weeks.map((w, i) => {
        const barH = Math.max(4, (w.amount / max) * H)
        const x = i * 28 + 4
        const y = H - barH
        return (
          <g key={i}>
            <motion.rect
              x={x} y={y} width={20} height={barH} rx={4}
              fill={w.isCurrentMonth ? '#7ed957' : 'rgba(17,17,17,0.1)'}
              initial={{ height: 0, y: H }}
              animate={{ height: barH, y }}
              transition={{ delay: i * 0.04, duration: 0.6, ease: 'easeOut' }}
            />
            {w.isCurrentMonth && (
              <text x={x + 10} y={H + 16} textAnchor="middle"
                fontSize={7} fill="rgba(17,17,17,0.4)" fontWeight="600">
                S{i % 4 + 1}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

interface MonthReceipt {
  id: string
  store_name: string | null
  total_amount: number | null
  savings_amount: number | null
  receipt_date: string | null
  created_at: string
}

interface PriceItem {
  item_name: string
  unit_price: number
  receipt_id: string
}

function ReceiptItemsLoader({ receiptId }: { receiptId: string }) {
  const [items, setItems] = useState<{ item_name: string; unit_price: number }[] | null>(null)
  const [open, setOpen] = useState(false)

  const load = async () => {
    if (items !== null) return
    const { data } = await supabase
      .from('price_items').select('item_name, unit_price')
      .eq('receipt_id', receiptId)
      .order('unit_price', { ascending: false }).limit(15)
    setItems(data ?? [])
  }

  return (
    <div>
      <button onClick={() => { setOpen(!open); if (!open) load() }}
        className="flex items-center gap-1 text-[10px] text-graphite/35 font-semibold py-1">
        <ChevronDown className="w-3 h-3 transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
        {open ? 'Masquer' : 'Voir les articles'}
      </button>
      <AnimatePresence>
        {open && items !== null && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-1 pb-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <p className="text-xs text-graphite/60 truncate flex-1 pr-3">{item.item_name}</p>
                  <p className="text-xs font-semibold text-graphite">{item.unit_price.toFixed(2)} €</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function BilanPage() {
  const [monthReceipts, setMonthReceipts] = useState<MonthReceipt[]>([])
  const [prevMonthTotal, setPrevMonthTotal] = useState(0)
  const [weeklyData, setWeeklyData] = useState<{ label: string; amount: number; isCurrentMonth: boolean }[]>([])
  const [categoryData, setCategoryData] = useState<{ name: string; amount: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [bestDecision, setBestDecision] = useState<{ item: string; store: string; saved: number } | null>(null)

  const [monthStart, monthEnd] = getMonthRange(0)
  const [prevStart, prevEnd] = getMonthRange(-1)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      // Fetch last 3 months of receipts + current month items in parallel
      const threeMonthsAgo = new Date(monthStart)
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 2)
      threeMonthsAgo.setDate(1)

      const [{ data: allRecent }, { data: prev }, { data: monthItems }] = await Promise.all([
        supabase.from('receipts')
          .select('id, store_name, total_amount, savings_amount, receipt_date, created_at')
          .eq('user_id', user.id)
          .gte('receipt_date', threeMonthsAgo.toISOString().split('T')[0])
          .order('receipt_date', { ascending: true }),
        supabase.from('receipts').select('total_amount')
          .eq('user_id', user.id)
          .gte('receipt_date', prevStart.toISOString().split('T')[0])
          .lte('receipt_date', prevEnd.toISOString().split('T')[0]),
        supabase.from('price_items').select('item_name, unit_price, receipt_id')
          .eq('user_id', user.id)
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString()),
      ])

      const all = allRecent ?? []

      // Split receipts into current month vs previous
      const currentMonthReceipts = all.filter(r => {
        const d = r.receipt_date ? new Date(r.receipt_date) : new Date(r.created_at)
        return d >= monthStart && d <= monthEnd
      })
      setMonthReceipts(currentMonthReceipts)
      setPrevMonthTotal(prev?.reduce((s, r) => s + (r.total_amount || 0), 0) ?? 0)

      // Build weekly spending chart (last 12 weeks)
      const weekMap = new Map<string, { amount: number; isCurrentMonth: boolean }>()
      for (const r of all) {
        const d = r.receipt_date ? new Date(r.receipt_date) : new Date(r.created_at)
        const key = getWeekKey(d)
        const prev = weekMap.get(key) ?? { amount: 0, isCurrentMonth: d >= monthStart }
        weekMap.set(key, { amount: prev.amount + (r.total_amount || 0), isCurrentMonth: d >= monthStart })
      }
      const weeks = [...weekMap.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-12)
        .map(([key, v]) => ({
          label: key,
          amount: v.amount,
          isCurrentMonth: v.isCurrentMonth,
        }))
      setWeeklyData(weeks)

      // Category breakdown from this month's items
      if (monthItems && monthItems.length > 0) {
        const catMap: Record<string, number> = {}
        for (const item of monthItems as PriceItem[]) {
          const cat = categoriseItem(item.item_name)
          catMap[cat] = (catMap[cat] ?? 0) + (item.unit_price || 0)
        }
        const cats = Object.entries(catMap)
          .sort((a, b) => b[1] - a[1])
          .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }))
        setCategoryData(cats)

        // Best decision: item with biggest savings (savings = receipts with savings_amount)
        const topSavingsReceipt = currentMonthReceipts
          .filter(r => (r.savings_amount ?? 0) > 0)
          .sort((a, b) => (b.savings_amount ?? 0) - (a.savings_amount ?? 0))[0]
        if (topSavingsReceipt) {
          setBestDecision({
            item: topSavingsReceipt.store_name ?? 'ce magasin',
            store: topSavingsReceipt.store_name ?? '?',
            saved: topSavingsReceipt.savings_amount ?? 0,
          })
        }
      }

      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalSpent = monthReceipts.reduce((s, r) => s + (r.total_amount || 0), 0)
  const totalSavings = monthReceipts.reduce((s, r) => s + (r.savings_amount || 0), 0)
  const scanCount = monthReceipts.length
  const savingsRatio = totalSpent > 0 ? (totalSavings / (totalSpent + totalSavings)) * 100 : 0
  const monthVsPrev = prevMonthTotal > 0 ? ((totalSpent - prevMonthTotal) / prevMonthTotal * 100) : null

  const spentVal = useCountUp(totalSpent)
  const savingsVal = useCountUp(totalSavings)

  const storeBreakdown = Object.entries(
    monthReceipts.reduce<Record<string, { total: number; savings: number; count: number }>>((acc, r) => {
      const key = r.store_name || 'Autre'
      if (!acc[key]) acc[key] = { total: 0, savings: 0, count: 0 }
      acc[key].total += r.total_amount || 0
      acc[key].savings += r.savings_amount || 0
      acc[key].count += 1
      return acc
    }, {})
  ).sort((a, b) => b[1].total - a[1].total)

  const monthLabel = monthStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const shareAsText = () => {
    const lines = [
      `📊 Mon bilan Basket — ${monthLabel}`,
      '',
      `💰 Dépensé : €${totalSpent.toFixed(2)}`,
      totalSavings > 0 ? `✅ Économisé : €${totalSavings.toFixed(2)} (${savingsRatio.toFixed(0)}%)` : '',
      `🧾 ${scanCount} ticket${scanCount !== 1 ? 's' : ''} scannés`,
      monthVsPrev !== null ? `📈 ${monthVsPrev > 0 ? '+' : ''}${monthVsPrev.toFixed(0)}% vs mois dernier` : '',
      '',
      'Essaie Basket → basketbeta.com',
    ].filter(Boolean).join('\n')
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ text: lines, title: 'Mon bilan Basket' })
    } else {
      navigator.clipboard?.writeText(lines)
    }
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

  const catMax = categoryData[0]?.amount ?? 1

  return (
    <div className="min-h-screen text-graphite pb-28" style={{ background: '#F5F3EE' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-5">
        <Link href="/dashboard"
          className="w-9 h-9 rounded-full flex items-center justify-center glass"
          style={{ textDecoration: 'none' }}>
          <ArrowLeft className="w-4 h-4 text-graphite/50" />
        </Link>
        <h1 className="text-base font-bold text-graphite">Bilan du mois</h1>
        <motion.button
          onClick={shareAsText}
          whileTap={{ scale: 0.93 }}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: '#25D366' }}
        >
          <Share2 className="w-4 h-4 text-white" />
        </motion.button>
      </div>

      <main className="max-w-lg mx-auto px-5 space-y-4">

        {/* Hero card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="rounded-3xl p-6 relative overflow-hidden"
          style={{ background: '#111' }}>
          <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(126,217,87,0.10) 0%, transparent 70%)' }} />
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(126,217,87,0.3), transparent)' }} />

          <p className="text-[11px] font-semibold text-white/40 mb-4 capitalize">{monthLabel}</p>

          <div className="flex items-end gap-8 mb-4">
            <div>
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mb-1">Dépensé</p>
              <p className="text-4xl font-extrabold text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                €{spentVal.toFixed(2)}
              </p>
              {monthVsPrev !== null && (
                <p className="text-[11px] mt-1 font-semibold flex items-center gap-1"
                  style={{ color: monthVsPrev > 0 ? '#EF4444' : '#00D09C' }}>
                  {monthVsPrev > 0
                    ? <TrendingUp className="w-3 h-3" />
                    : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(monthVsPrev).toFixed(0)}% vs mois dernier
                </p>
              )}
            </div>
            {totalSavings > 0 && (
              <div>
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mb-1">Économisé</p>
                <p className="text-2xl font-extrabold" style={{ color: '#00D09C', fontVariantNumeric: 'tabular-nums' }}>
                  €{savingsVal.toFixed(2)}
                </p>
                <p className="text-[11px] mt-1 text-white/35">{savingsRatio.toFixed(0)}% du panier</p>
              </div>
            )}
          </div>

          <p className="text-xs text-white/25">
            {scanCount === 0 ? 'Aucun ticket ce mois-ci' : `${scanCount} ticket${scanCount !== 1 ? 's' : ''} scanné${scanCount !== 1 ? 's' : ''}`}
          </p>
        </motion.div>

        {/* No receipts CTA */}
        {scanCount === 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, ease: EASE }}>
            <Link href="/scan"
              className="flex items-center gap-4 rounded-2xl p-5"
              style={{ background: 'rgba(126,217,87,0.08)', border: '1px solid rgba(126,217,87,0.2)', textDecoration: 'none' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(126,217,87,0.15)' }}>
                <Receipt className="w-5 h-5" style={{ color: '#7ed957' }} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-graphite">Scanner votre premier ticket</p>
                <p className="text-xs text-graphite/45 mt-0.5">Commencez votre bilan de {monthLabel}</p>
              </div>
            </Link>
          </motion.div>
        )}

        {/* Spending chart */}
        {weeklyData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, ease: EASE }}
            className="rounded-2xl p-5 bg-white"
            style={{ border: '1px solid rgba(17,17,17,0.07)' }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-graphite/40">Dépenses par semaine</p>
              <p className="text-[10px] text-graphite/30">3 derniers mois</p>
            </div>
            <div className="mt-3">
              <SpendingChart weeks={weeklyData} />
            </div>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#7ed957' }} />
                <span className="text-[10px] text-graphite/50">Ce mois</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(17,17,17,0.1)' }} />
                <span className="text-[10px] text-graphite/50">Mois précédents</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Savings score card */}
        {totalSavings > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, ease: EASE }}
            className="rounded-2xl p-4 flex items-center gap-4"
            style={{ background: 'rgba(0,208,156,0.06)', border: '1px solid rgba(0,208,156,0.18)', borderLeft: '3px solid #00D09C' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(0,208,156,0.12)' }}>
              <Sparkles className="w-5 h-5" style={{ color: '#00D09C' }} />
            </div>
            <div>
              <p className="text-sm font-bold text-graphite">
                Score économies : <span style={{ color: '#00D09C' }}>{savingsRatio.toFixed(0)}%</span>
              </p>
              <p className="text-xs text-graphite/45 mt-0.5">
                Vous avez économisé €{totalSavings.toFixed(2)} ce mois — {
                  savingsRatio >= 15 ? 'excellent résultat !' :
                  savingsRatio >= 8 ? 'bon travail !' : 'continuez à scanner !'
                }
              </p>
            </div>
          </motion.div>
        )}

        {/* Store breakdown */}
        {storeBreakdown.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26, ease: EASE }}
            className="rounded-2xl overflow-hidden bg-white"
            style={{ border: '1px solid rgba(17,17,17,0.07)' }}>
            <div className="px-4 py-3.5" style={{ borderBottom: '1px solid rgba(17,17,17,0.06)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-graphite/40">Par enseigne</p>
            </div>
            {storeBreakdown.map(([store, data], i) => {
              const barPct = storeBreakdown[0]?.[1].total > 0
                ? (data.total / storeBreakdown[0][1].total) * 100 : 0
              const sharePct = totalSpent > 0 ? (data.total / totalSpent) * 100 : 0
              return (
                <div key={i} className="px-4 py-3.5"
                  style={{ borderBottom: i < storeBreakdown.length - 1 ? '1px solid rgba(17,17,17,0.05)' : 'none' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-3.5 h-3.5 text-graphite/30" />
                      <span className="text-sm font-semibold text-graphite">{store}</span>
                      <span className="text-[10px] text-graphite/35 bg-black/5 px-1.5 py-0.5 rounded-full">
                        {sharePct.toFixed(0)}%
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

        {/* Category breakdown */}
        {categoryData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, ease: EASE }}
            className="rounded-2xl overflow-hidden bg-white"
            style={{ border: '1px solid rgba(17,17,17,0.07)' }}>
            <div className="px-4 py-3.5" style={{ borderBottom: '1px solid rgba(17,17,17,0.06)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-graphite/40">Par catégorie</p>
            </div>
            {categoryData.slice(0, 6).map((cat, i) => {
              const barPct = (cat.amount / catMax) * 100
              const COLORS = ['#7ed957', '#00D09C', '#60a5fa', '#f59e0b', '#a78bfa', '#f97316']
              return (
                <div key={i} className="px-4 py-3"
                  style={{ borderBottom: i < Math.min(5, categoryData.length - 1) ? '1px solid rgba(17,17,17,0.05)' : 'none' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-graphite">{cat.name}</span>
                    <span className="text-xs font-bold text-graphite">€{cat.amount.toFixed(2)}</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(17,17,17,0.06)' }}>
                    <motion.div className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${barPct}%` }}
                      transition={{ delay: 0.5 + i * 0.06, duration: 0.8, ease: EASE }}
                      style={{ background: COLORS[i] ?? '#111' }} />
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}

        {/* Best decision */}
        {bestDecision && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34, ease: EASE }}
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: 'rgba(126,217,87,0.07)', border: '1px solid rgba(126,217,87,0.2)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(126,217,87,0.15)' }}>
              <span className="text-base">🏆</span>
            </div>
            <div>
              <p className="text-xs font-bold text-graphite">Meilleur choix du mois</p>
              <p className="text-xs text-graphite/55 mt-0.5 leading-relaxed">
                Scanner chez <strong>{bestDecision.store}</strong> vous a fait économiser{' '}
                <span style={{ color: '#7ed957' }}>€{bestDecision.saved.toFixed(2)}</span>
              </p>
            </div>
          </motion.div>
        )}

        {/* Month-over-month insight */}
        {monthVsPrev !== null && prevMonthTotal > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, ease: EASE }}
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{
              background: monthVsPrev < 0 ? 'rgba(0,208,156,0.06)' : 'rgba(239,68,68,0.06)',
              border: `1px solid ${monthVsPrev < 0 ? 'rgba(0,208,156,0.18)' : 'rgba(239,68,68,0.15)'}`,
            }}>
            {monthVsPrev < 0
              ? <TrendingDown className="w-5 h-5 flex-shrink-0" style={{ color: '#00D09C' }} />
              : <TrendingUp className="w-5 h-5 flex-shrink-0" style={{ color: '#EF4444' }} />
            }
            <p className="text-xs text-graphite/70 leading-relaxed">
              {monthVsPrev < 0
                ? `Vos courses ont coûté ${Math.abs(monthVsPrev).toFixed(0)}% moins cher que le mois dernier. Continue comme ça !`
                : `Vos courses ont coûté ${Math.abs(monthVsPrev).toFixed(0)}% de plus que le mois dernier (€${prevMonthTotal.toFixed(2)}).`}
            </p>
          </motion.div>
        )}

        {/* Receipt list */}
        {monthReceipts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, ease: EASE }}
            className="rounded-2xl overflow-hidden bg-white"
            style={{ border: '1px solid rgba(17,17,17,0.07)' }}>
            <div className="px-4 py-3.5" style={{ borderBottom: '1px solid rgba(17,17,17,0.06)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-graphite/40">
                Tickets ({scanCount})
              </p>
            </div>
            {monthReceipts.map((r, i) => (
              <div key={r.id}
                style={{ borderBottom: i < monthReceipts.length - 1 ? '1px solid rgba(17,17,17,0.05)' : 'none' }}>
                <div className="px-4 py-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-graphite">{r.store_name || 'Magasin'}</p>
                      <p className="text-[11px] text-graphite/40">
                        {(r.receipt_date ? new Date(r.receipt_date) : new Date(r.created_at))
                          .toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
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
                  </div>
                  <ReceiptItemsLoader receiptId={r.id} />
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </main>

      <BottomNav active="home" />
    </div>
  )
}
