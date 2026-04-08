'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Receipt, TrendingDown, ShoppingBag, Camera, Share2, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { EASE } from '@/lib/hooks'

interface ReceiptDetail {
  id: string; store_name: string | null; total_amount: number | null
  savings_amount: number | null; receipt_date: string | null; created_at: string
}
interface PriceItem { item_name: string; unit_price: number; quantity: number | null }

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

  const [receipt,   setReceipt]   = useState<ReceiptDetail | null>(null)
  const [items,     setItems]     = useState<PriceItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [notFound,  setNotFound]  = useState(false)
  const [confetti,  setConfetti]  = useState(false)

  useEffect(() => {
    if (!id) return
    const init = async () => {
      setLoading(true); setNotFound(false)
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr) console.error('[receipt] auth error:', authErr)
      if (!user) { window.location.href = '/login'; return }

      const [{ data: receiptData, error: receiptErr }, { data: itemsData, error: itemsErr }] = await Promise.all([
        supabase.from('receipts')
          .select('id, store_name, total_amount, savings_amount, receipt_date, created_at')
          .eq('id', id).single(),
        supabase.from('price_items')
          .select('item_name, unit_price, quantity')
          .eq('receipt_id', id).order('unit_price', { ascending: false }).limit(100),
      ])

      if (receiptErr) console.error('[receipt] query error:', receiptErr)
      if (itemsErr)   console.error('[receipt] items error:', itemsErr)
      if (!receiptData) { setNotFound(true); setLoading(false); return }
      setReceipt(receiptData)
      setItems(itemsData ?? [])
      setLoading(false)
      // Fire confetti if there are savings
      if ((receiptData.savings_amount ?? 0) > 0) {
        setTimeout(() => setConfetti(true), 400)
        setTimeout(() => setConfetti(false), 2200)
      }
    }
    init()
  }, [id])

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
      `🧾 ${receipt.store_name || 'Magasin'}`,
      receipt.total_amount ? `💰 Total : €${receipt.total_amount.toFixed(2)}` : '',
      (receipt.savings_amount ?? 0) > 0 ? `✅ Économisé : €${receipt.savings_amount!.toFixed(2)}` : '',
      `${items.length} articles`,
      '',
      'Via Basket → basketbeta.com',
    ].filter(Boolean).join('\n')
    if (navigator.share) navigator.share({ text: lines, title: 'Mon ticket Basket' })
    else navigator.clipboard?.writeText(lines)
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
            {receipt?.store_name || 'Magasin'}
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
              {receipt?.store_name || 'Magasin'}
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
              {items.map((item, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.03, ease: EASE }}
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: i < items.length - 1 ? '1px solid rgba(17,17,17,0.05)' : 'none' }}>
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-sm text-graphite truncate">{item.item_name}</p>
                    {item.quantity && item.quantity > 1 && (
                      <p className="text-[11px] text-graphite/35">×{item.quantity}</p>
                    )}
                  </div>
                  <p className="text-sm font-bold text-graphite flex-shrink-0">{item.unit_price.toFixed(2)} €</p>
                </motion.div>
              ))}
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
