'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Receipt, TrendingDown, ShoppingBag, Camera } from 'lucide-react'

interface ReceiptDetail {
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
  quantity: number | null
}

export default function ReceiptDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = (params?.id as string) ?? ''

  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null)
  const [items, setItems] = useState<PriceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    const init = async () => {
      setLoading(true)
      setNotFound(false)

      // Verify auth first — getUser() validates the JWT with Supabase server
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr) console.error('[receipt] auth error:', authErr)
      if (!user) { window.location.href = '/login'; return }

      // RLS policy (auth.uid() = user_id) handles ownership — no need to also
      // filter by user_id here, which can fail if auth.uid() isn't resolved yet
      const [{ data: receiptData, error: receiptErr }, { data: itemsData, error: itemsErr }] = await Promise.all([
        supabase
          .from('receipts')
          .select('id, store_name, total_amount, savings_amount, receipt_date, created_at')
          .eq('id', id)
          .single(),
        supabase
          .from('price_items')
          .select('item_name, unit_price, quantity')
          .eq('receipt_id', id)
          .order('unit_price', { ascending: false })
          .limit(100),
      ])

      if (receiptErr) console.error('[receipt] receipts query error:', receiptErr)
      if (itemsErr) console.error('[receipt] price_items query error:', itemsErr)
      if (!receiptData) { setNotFound(true); setLoading(false); return }
      setReceipt(receiptData)
      setItems(itemsData ?? [])
      setLoading(false)
    }
    init()
  }, [id])

  // When not found: toast immediately, redirect after 2.5 s
  useEffect(() => {
    if (!notFound) return
    toast.error('Ce ticket n\'est pas disponible')
    const t = setTimeout(() => router.push('/dashboard'), 2500)
    return () => clearTimeout(t)
  }, [notFound, router])

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-paper flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#7ed957', borderTopColor: 'transparent' }} />
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
    ? (receipt.savings_amount / (receipt.total_amount + receipt.savings_amount)) * 100
    : 0

  return (
    <div className="min-h-[100dvh] bg-paper text-graphite pb-16">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 pt-14 pb-4 bg-paper sticky top-0 z-10"
        style={{ borderBottom: '1px solid rgba(17,17,17,0.08)' }}
      >
        <motion.a
          href="/dashboard"
          whileTap={{ scale: 0.9 }}
          className="w-9 h-9 rounded-full flex items-center justify-center glass"
        >
          <ArrowLeft className="w-4 h-4 text-graphite/50" />
        </motion.a>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base text-graphite truncate">{receipt?.store_name || 'Magasin'}</p>
          <p className="text-xs text-graphite/40 capitalize">{dateDisplay}</p>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-5 py-5 space-y-4">

        {/* Hero total card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-6 bg-white relative overflow-hidden"
          style={{ border: '1px solid rgba(17,17,17,0.07)', borderLeft: '4px solid #7ed957' }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #7ed957 0%, transparent 70%)', transform: 'translate(40%,-40%)' }} />

          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(126,217,87,0.12)' }}>
              <ShoppingBag className="w-4 h-4" style={{ color: '#7ed957' }} />
            </div>
            <p className="text-sm font-semibold text-graphite">{receipt?.store_name || 'Magasin'}</p>
          </div>

          <div className="flex items-end gap-6">
            <div>
              <p className="text-[10px] text-graphite/40 font-semibold uppercase tracking-wider mb-1">Total</p>
              <p className="text-4xl font-extrabold text-graphite" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {receipt?.total_amount ? `€${receipt.total_amount.toFixed(2)}` : '—'}
              </p>
            </div>
            {receipt?.savings_amount && receipt.savings_amount > 0 ? (
              <div>
                <p className="text-[10px] text-graphite/40 font-semibold uppercase tracking-wider mb-1">Économisé</p>
                <p className="text-2xl font-extrabold" style={{ color: '#00D09C', fontVariantNumeric: 'tabular-nums' }}>
                  €{receipt.savings_amount.toFixed(2)}
                </p>
                {savingsRatio > 0 && (
                  <p className="text-[11px] mt-0.5 text-graphite/40">{savingsRatio.toFixed(0)}% du panier</p>
                )}
              </div>
            ) : null}
          </div>

          <p className="text-xs text-graphite/35 mt-3">{items.length} article{items.length !== 1 ? 's' : ''}</p>
        </motion.div>

        {/* Items list */}
        <AnimatePresence>
          {items.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-2xl overflow-hidden"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-graphite/40 px-4 py-3"
                style={{ borderBottom: '1px solid rgba(17,17,17,0.06)' }}>
                Articles ({items.length})
              </p>
              {items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: i < items.length - 1 ? '1px solid rgba(17,17,17,0.05)' : 'none' }}
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-sm text-graphite truncate">{item.item_name}</p>
                    {item.quantity && item.quantity > 1 && (
                      <p className="text-[11px] text-graphite/35">×{item.quantity}</p>
                    )}
                  </div>
                  <p className="text-sm font-bold text-graphite flex-shrink-0">
                    {item.unit_price.toFixed(2)} €
                  </p>
                </div>
              ))}

              {/* Total row */}
              {receipt?.total_amount && (
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderTop: '2px solid rgba(17,17,17,0.08)', background: 'rgba(126,217,87,0.04)' }}
                >
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-8 text-center"
          >
            <Receipt className="w-8 h-8 text-graphite/20 mx-auto mb-2" />
            <p className="text-sm text-graphite/50">Aucun article enregistré pour ce ticket</p>
          </motion.div>
        )}

        {/* Scan again CTA */}
        <motion.a
          href="/scan"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-4 rounded-2xl p-4"
          style={{ background: '#111', textDecoration: 'none' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(126,217,87,0.15)' }}>
            <Camera className="w-5 h-5" style={{ color: '#7ed957' }} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm text-white">Scanner un autre ticket</p>
            <p className="text-xs text-white/40 mt-0.5">Continuez à suivre vos dépenses</p>
          </div>
        </motion.a>
      </main>
    </div>
  )
}
