'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Receipt, TrendingDown, ShoppingBag, Camera, Share2, Sparkles, Store } from 'lucide-react'
import Link from 'next/link'
import { EASE } from '@/lib/hooks'
import { useUserContext } from '@/lib/user-context'

interface ReceiptDetail {
  id: string; store_chain: string | null; total_amount: number | null
  savings_amount?: number | null; receipt_date: string | null; created_at: string
}
interface PriceItem { item_name: string; unit_price: number; quantity: number | null }
interface ComparisonItem { name: string; your_price: number; avg_price: number; savings: number; cheaper_store: string | null; sample_count: number }
interface BestStore { name: string; items_cheaper: number; total_savings: number }

// Confetti particle for savings celebration
function Confetti({ show }: { show: boolean }) {
  if (!show) return null
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 280,
    y: -(Math.random() * 180 + 60),
    color: ['#7ed957', '#00D09C', '#F59E0B', '#a3f07a', '#111'][i % 5],
    size: Math.random() * 6 + 4,
    delay: Math.random() * 0.4,
    rotate: Math.random() * 360,
  }))
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
      {particles.map(p => (
        <motion.div key={p.id}
          className="absolute rounded-sm"
          style={{ width: p.size, height: p.size, background: p.color }}
          initial={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
          animate={{ opacity: 0, x: p.x, y: p.y, scale: 0, rotate: p.rotate }}
          transition={{ duration: 1.4, delay: p.delay, ease: 'easeOut' }} />
      ))}
    </div>
  )
}

export default function ReceiptDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = (params?.id as string) ?? ''

  const { user, session, profile, recentStores, loading: ctxLoading } = useUserContext()

  const [receipt,     setReceipt]     = useState<ReceiptDetail | null>(null)
  const [items,       setItems]       = useState<PriceItem[]>([])
  const [loading,     setLoading]     = useState(true)
  const [notFound,    setNotFound]    = useState(false)
  const [confetti,    setConfetti]    = useState(false)
  const [comparisons, setComparisons] = useState<ComparisonItem[]>([])
  const [bestStore,   setBestStore]   = useState<BestStore | null>(null)
  const [cmpLoading,  setCmpLoading]  = useState(false)

  useEffect(() => {
    if (!ctxLoading && !user) { window.location.href = '/login'; return }
  }, [ctxLoading, user])

  useEffect(() => {
    if (!id || ctxLoading || !user) return
    const init = async () => {
      setLoading(true); setNotFound(false)

      const [{ data: receiptData, error: receiptErr }, { data: itemsData, error: itemsErr }, { data: savingsRow }] = await Promise.all([
        supabase.from('receipts')
          .select('id, store_chain, total_amount, receipt_date, created_at')
          .eq('id', id)
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase.from('price_items')
          .select('item_name, unit_price, quantity')
          .eq('receipt_id', id).order('unit_price', { ascending: false }).limit(100),
        // Separate query so a missing savings_amount column doesn't break the main fetch
        supabase.from('receipts')
          .select('savings_amount')
          .eq('id', id)
          .eq('user_id', user.id)
          .maybeSingle(),
      ])

      if (receiptErr) console.error('[receipt] query error:', receiptErr)
      if (itemsErr)   console.error('[receipt] items error:', itemsErr)
      if (!receiptData) { setNotFound(true); setLoading(false); return }
      setReceipt({ ...receiptData, savings_amount: savingsRow?.savings_amount ?? null })
      setItems(itemsData ?? [])
      setLoading(false)
      // Fire confetti if there are savings
      if (((savingsRow?.savings_amount) ?? 0) > 0) {
        setTimeout(() => setConfetti(true), 400)
        setTimeout(() => setConfetti(false), 2200)
      }

      // Fetch price comparison using session + postcode from context (no extra queries)
      if (itemsData && itemsData.length > 0 && session) {
        setCmpLoading(true)
        try {
          const res = await fetch('/api/compare-prices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({
              items:       itemsData.map(i => ({ name: i.item_name, price: i.unit_price })),
              store_chain: receiptData.store_chain,
              postcode:    profile?.postcode ?? null,
            }),
          })
          if (res.ok) {
            const cmp = await res.json()
            setComparisons(cmp.comparisons ?? [])
            setBestStore(cmp.best_store ?? null)
          }
        } catch { /* non-critical, ignore */ }
        setCmpLoading(false)
      }
    }
    init()
  }, [id, ctxLoading, user, session, profile])

  // Not found → toast + redirect
  useEffect(() => {
    if (!notFound) return
    toast.error('Ce ticket n\'est pas disponible')
    const t = setTimeout(() => router.push('/dashboard'), 2500)
    return () => clearTimeout(t)
  }, [notFound, router])

  const shareReceipt = () => {
    if (!receipt) return
    const lines = [
      `🧾 ${receipt.store_chain || 'Magasin'}`,
      receipt.total_amount ? `💰 Total : €${receipt.total_amount.toFixed(2)}` : '',
      (receipt.savings_amount ?? 0) > 0 ? `✅ Économisé : €${receipt.savings_amount!.toFixed(2)}` : '',
      `${items.length} articles`,
      '',
      'Via Basket → basketbeta.com',
    ].filter(Boolean).join('\n')
    if (navigator.share) navigator.share({ text: lines, title: 'Mon ticket Basket' }).catch(() => {})
    else navigator.clipboard?.writeText(lines).catch(() => {})
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-paper flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 rounded-full border-2 border-t-transparent"
          style={{ borderColor: '#7ed957', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-[100dvh] bg-paper text-graphite flex flex-col items-center justify-center px-8 text-center">
        <Receipt className="w-12 h-12 text-graphite/20 mb-4" />
        <p className="font-bold text-graphite mb-2">Ticket introuvable</p>
        <p className="text-sm text-graphite/40 mb-6">Redirection vers le tableau de bord…</p>
        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#7ed957', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const dateDisplay = receipt?.receipt_date
    ? new Date(receipt.receipt_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : new Date(receipt!.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const savingsRatio = receipt?.total_amount && receipt.savings_amount
    ? (receipt.savings_amount / (receipt.total_amount + receipt.savings_amount)) * 100 : 0

  const hasSavings = (receipt?.savings_amount ?? 0) > 0

  return (
    <div className="min-h-[100dvh] bg-paper text-graphite pb-16">
      {/* Sticky header */}
      <div className="flex items-center gap-3 px-5 pt-14 pb-4 bg-paper sticky top-0 z-10"
        style={{ borderBottom: '1px solid rgba(17,17,17,0.08)' }}>
        <motion.div whileTap={{ scale: 0.9 }}>
          <Link href="/dashboard"
            className="w-9 h-9 rounded-full flex items-center justify-center glass"
            style={{ textDecoration: 'none' }}>
            <ArrowLeft className="w-4 h-4 text-graphite/50" />
          </Link>
        </motion.div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base text-graphite truncate">
            {receipt?.store_chain || 'Magasin'}
          </p>
          <p className="text-xs text-graphite/40 capitalize">{dateDisplay}</p>
        </div>
        <motion.button onClick={shareReceipt} whileTap={{ scale: 0.9 }}
          className="w-9 h-9 rounded-full flex items-center justify-center glass">
          <Share2 className="w-4 h-4 text-graphite/50" />
        </motion.button>
      </div>

      <main className="max-w-lg mx-auto px-5 py-5 space-y-4">

        {/* Hero total card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ ease: EASE }}
          className="rounded-3xl p-6 relative overflow-hidden"
          style={{
            background: hasSavings ? '#111' : 'white',
            border: hasSavings ? 'none' : '1px solid rgba(17,17,17,0.07)',
            borderLeft: hasSavings ? 'none' : '4px solid #7ed957',
          }}>
          <Confetti show={confetti} />

          {hasSavings && (
            <>
              <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(0,208,156,0.12) 0%, transparent 70%)' }} />
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(0,208,156,0.4), transparent)' }} />
            </>
          )}

          {!hasSavings && (
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10 pointer-events-none"
              style={{ background: 'radial-gradient(circle, #7ed957 0%, transparent 70%)', transform: 'translate(40%,-40%)' }} />
          )}

          {hasSavings && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, ease: EASE }}
              className="flex items-center gap-1.5 mb-4">
              <Sparkles className="w-4 h-4" style={{ color: '#00D09C' }} />
              <span className="text-xs font-bold" style={{ color: '#00D09C' }}>
                Vous avez économisé sur cette course !
              </span>
            </motion.div>
          )}

          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: hasSavings ? 'rgba(126,217,87,0.15)' : 'rgba(126,217,87,0.12)' }}>
              <ShoppingBag className="w-4 h-4" style={{ color: '#7ed957' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: hasSavings ? 'rgba(255,255,255,0.7)' : '#111' }}>
              {receipt?.store_chain || 'Magasin'}
            </p>
          </div>

          <div className="flex items-end gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1"
                style={{ color: hasSavings ? 'rgba(255,255,255,0.3)' : 'rgba(17,17,17,0.4)' }}>Total</p>
              <p className="text-4xl font-extrabold" style={{ color: hasSavings ? '#fff' : '#111', fontVariantNumeric: 'tabular-nums' }}>
                {receipt?.total_amount ? `€${receipt.total_amount.toFixed(2)}` : '—'}
              </p>
            </div>
            {hasSavings && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35, type: 'spring', stiffness: 400, damping: 20 }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-white/30">Économisé</p>
                <p className="text-2xl font-extrabold" style={{ color: '#00D09C', fontVariantNumeric: 'tabular-nums' }}>
                  €{receipt!.savings_amount!.toFixed(2)}
                </p>
                {savingsRatio > 0 && (
                  <p className="text-[11px] mt-0.5 text-white/40">{savingsRatio.toFixed(0)}% du panier</p>
                )}
              </motion.div>
            )}
          </div>

          <p className="text-xs mt-3" style={{ color: hasSavings ? 'rgba(255,255,255,0.25)' : 'rgba(17,17,17,0.35)' }}>
            {items.length} article{items.length !== 1 ? 's' : ''}
          </p>
        </motion.div>

        {/* Items list */}
        <AnimatePresence>
          {items.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, ease: EASE }}
              className="rounded-2xl overflow-hidden bg-white"
              style={{ border: '1px solid rgba(17,17,17,0.07)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-graphite/40 px-4 py-3.5"
                style={{ borderBottom: '1px solid rgba(17,17,17,0.06)' }}>
                Articles ({items.length})
              </p>
              {items.map((item, i) => {
                const cmp = comparisons.find(c => c.name.toLowerCase() === item.item_name.toLowerCase())
                const hasCheaper = cmp && cmp.savings > 0.01
                return (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.03, ease: EASE }}
                    className="px-4 py-3"
                    style={{
                      borderBottom: i < items.length - 1 ? '1px solid rgba(17,17,17,0.05)' : 'none',
                      borderLeft: hasCheaper ? '3px solid #00D09C' : undefined,
                      background: hasCheaper ? 'rgba(0,208,156,0.03)' : undefined,
                    }}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-3">
                        <p className="text-sm text-graphite truncate">{item.item_name}</p>
                        {item.quantity && item.quantity > 1 && (
                          <p className="text-[11px] text-graphite/35">×{item.quantity}</p>
                        )}
                        {hasCheaper && cmp && (
                          <p className="text-[11px] mt-0.5 font-medium" style={{ color: '#00D09C' }}>
                            Moins cher chez {cmp.cheaper_store} · {cmp.avg_price.toFixed(2)} €
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-graphite">{item.unit_price.toFixed(2)} €</p>
                        {hasCheaper && cmp && (
                          <p className="text-[11px] font-semibold" style={{ color: '#00D09C' }}>
                            −{cmp.savings.toFixed(2)} €
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
              {receipt?.total_amount && (
                <div className="flex items-center justify-between px-4 py-3.5"
                  style={{ borderTop: '2px solid rgba(17,17,17,0.08)', background: 'rgba(126,217,87,0.04)' }}>
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-3.5 h-3.5" style={{ color: '#7ed957' }} />
                    <p className="text-sm font-bold text-graphite">Total</p>
                  </div>
                  <p className="text-sm font-extrabold text-graphite">{receipt.total_amount.toFixed(2)} €</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* No items */}
        {items.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.12, ease: EASE }}
            className="glass rounded-2xl p-8 text-center">
            <Receipt className="w-8 h-8 text-graphite/20 mx-auto mb-2" />
            <p className="text-sm text-graphite/50">Aucun article enregistré pour ce ticket</p>
          </motion.div>
        )}

        {/* Comparison loading skeleton */}
        {cmpLoading && (
          <div className="rounded-2xl p-4 animate-pulse" style={{ background: 'rgba(17,17,17,0.04)', height: 72 }} />
        )}

        {/* Best store recommendation */}
        {!cmpLoading && bestStore && bestStore.items_cheaper >= 2 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ ease: EASE }}
            className="rounded-2xl p-4 flex items-center gap-4"
            style={{ background: '#111', borderLeft: '3px solid #7ed957' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(126,217,87,0.15)' }}>
              <Store className="w-5 h-5" style={{ color: '#7ed957' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">
                Prochaine fois, allez chez{' '}
                <span style={{ color: '#7ed957' }}>{bestStore.name}</span>
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Économisez{' '}
                <span style={{ color: '#00D09C' }}>€{bestStore.total_savings.toFixed(2)}</span>
                {' '}sur {bestStore.items_cheaper} articles
              </p>
            </div>
          </motion.div>
        )}

        {/* Store history badge */}
        {receipt?.store_chain && recentStores.includes(receipt.store_chain) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, ease: EASE }}
            className="rounded-2xl p-4 flex items-center gap-4"
            style={{ background: 'white', border: '1px solid rgba(17,17,17,0.07)', borderLeft: '3px solid rgba(126,217,87,0.5)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(126,217,87,0.1)' }}>
              <Store className="w-5 h-5" style={{ color: '#7ed957' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-graphite">
                Votre historique chez <strong>{receipt.store_chain}</strong>
              </p>
              <p className="text-xs mt-0.5 text-graphite/50">Vous avez déjà scanné chez ce magasin</p>
            </div>
          </motion.div>
        )}

        {/* Scan again CTA */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, ease: EASE }}>
          <Link href="/scan"
            className="flex items-center gap-4 rounded-2xl p-4 hover:opacity-90 active:scale-[0.99] transition-all"
            style={{ background: '#111', textDecoration: 'none' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(126,217,87,0.15)' }}>
              <Camera className="w-5 h-5" style={{ color: '#7ed957' }} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-white">Scanner un autre ticket</p>
              <p className="text-xs text-white/40 mt-0.5">Continuez à suivre vos dépenses</p>
            </div>
          </Link>
        </motion.div>
      </main>
    </div>
  )
}
