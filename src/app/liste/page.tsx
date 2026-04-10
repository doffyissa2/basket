'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
  Plus, X, Check, ShoppingCart, ArrowLeft, Loader2, Store,
  Receipt, Minus, ChevronRight, Share2, Sparkles,
} from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import type { BestStoreResult } from '@/types/api'
import { useUserContext } from '@/lib/user-context'
import { emit } from '@/lib/events'

interface ListItem {
  id: string
  item_name: string
  checked: boolean
  best_store: string | null
  best_price: number | null
  qty: number
}

interface Suggestion {
  name: string
  best_store: string
  best_price: number
}

export default function ListePage() {
  const ctx = useUserContext()
  const { user, session, profile, location, loading: ctxLoading } = ctx
  const accessToken = session?.access_token ?? null
  const postcode    = location?.postcode ?? profile?.postcode ?? null

  const [items, setItems] = useState<ListItem[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [computing, setComputing] = useState(false)
  const [result, setResult] = useState<BestStoreResult | null>(null)
  const [showComparison, setShowComparison] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [recommendation, setRecommendation] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestRef = useRef<HTMLDivElement>(null)

  // Redirect if not authenticated once context resolves
  useEffect(() => {
    if (!ctxLoading && !user) window.location.href = '/login'
  }, [ctxLoading, user])

  // Load list items once we have a user
  useEffect(() => {
    if (!user) return
    supabase
      .from('shopping_list_items')
      .select('id, item_name, checked, best_store, best_price')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setItems(data.map((i) => ({ ...i, qty: 1 })))
        setLoading(false)
      })
  }, [user])

  // Auto-suggest as user types (300ms debounce)
  useEffect(() => {
    if (inputValue.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/shopping-list/suggest?q=${encodeURIComponent(inputValue)}`)
        if (res.ok) {
          const data = await res.json()
          const sugs: Suggestion[] = data.suggestions ?? []
          setSuggestions(sugs)
          setShowSuggestions(sugs.length > 0)
        }
      } catch { /* non-critical */ }
    }, 300)
    return () => clearTimeout(timer)
  }, [inputValue])

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const addItem = async (name?: string) => {
    const n = (name ?? inputValue).trim()
    if (!n || !user) return
    setInputValue('')
    setSuggestions([])
    setShowSuggestions(false)
    inputRef.current?.focus()

    const { data } = await supabase
      .from('shopping_list_items')
      .insert({ user_id: user.id, item_name: n, item_name_normalised: n.toLowerCase().trim() })
      .select('id, item_name, checked, best_store, best_price')
      .single()

    if (data) {
      setItems((prev) => {
        const next = [...prev, { ...data, qty: 1 }]
        emit('list:updated', { count: next.length })
        return next
      })
      setResult(null)
      setRecommendation(null)

      // Fire-and-forget: fetch best price for just this item
      if (accessToken) {
        fetch('/api/shopping-list/best-store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ items: [n], postcode }),
        })
          .then(r => r.ok ? r.json() : null)
          .then((bsResult) => {
            if (!bsResult) return
            const match = bsResult.per_item?.[0]
            if (match?.best_price != null && data.id) {
              setItems(prev => prev.map(i =>
                i.id === data.id
                  ? { ...i, best_store: match.best_store, best_price: match.best_price }
                  : i
              ))
              void supabase.from('shopping_list_items').update({
                best_store: match.best_store,
                best_price: match.best_price,
              }).eq('id', data.id)
            }
          })
          .catch(() => {})
      }
    }
  }

  const toggleItem = async (id: string, checked: boolean) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: !checked } : i)))
    await supabase.from('shopping_list_items').update({ checked: !checked }).eq('id', id)
  }

  const deleteItem = async (id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id)
      emit('list:updated', { count: next.length })
      return next
    })
    await supabase.from('shopping_list_items').delete().eq('id', id)
    setResult(null)
    setRecommendation(null)
  }

  const setQty = (id: string, delta: number) => {
    setItems((prev) => prev.map((i) =>
      i.id === id ? { ...i, qty: Math.max(1, (i.qty || 1) + delta) } : i
    ))
  }

  const clearChecked = async () => {
    const checkedIds = items.filter((i) => i.checked).map((i) => i.id)
    if (checkedIds.length === 0) return
    setItems((prev) => {
      const next = prev.filter((i) => !i.checked)
      emit('list:updated', { count: next.length })
      return next
    })
    await supabase.from('shopping_list_items').delete().in('id', checkedIds)
  }

  const importLastReceipt = async () => {
    if (!user) return
    const { data: receipt } = await supabase
      .from('receipts')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!receipt) return
    const { data: receiptItems } = await supabase
      .from('price_items')
      .select('item_name')
      .eq('receipt_id', receipt.id)

    if (!receiptItems) return
    const existing = new Set(items.map((i) => i.item_name.toLowerCase()))
    const toAdd = receiptItems.filter((r) => !existing.has(r.item_name.toLowerCase()))
    if (toAdd.length === 0) return

    const { data: inserted } = await supabase
      .from('shopping_list_items')
      .insert(toAdd.map((r) => ({
        user_id: user!.id,
        item_name: r.item_name,
        item_name_normalised: r.item_name.toLowerCase().trim(),
      })))
      .select('id, item_name, checked, best_store, best_price')

    if (inserted) setItems((prev) => [...prev, ...inserted.map((i) => ({ ...i, qty: 1 }))])
    setResult(null)
    setRecommendation(null)
  }

  const findBestStore = useCallback(async () => {
    const unchecked = items.filter((i) => !i.checked)
    if (unchecked.length === 0) return
    setComputing(true)
    setResult(null)
    setShowComparison(false)
    setRecommendation(null)

    const res = await fetch('/api/shopping-list/best-store', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ items: unchecked.map((i) => i.item_name), postcode }),
    })

    if (res.ok) {
      const data: BestStoreResult = await res.json()
      setResult(data)
      setShowComparison(true)

      // Build recommendation text client-side
      if (data.best_store && data.estimated_savings > 0.5) {
        const pricier = data.store_comparison[1]
        const cheapCount = data.per_item.filter(p => p.best_store === data.best_store).length
        let rec = `Allez chez ${data.best_store} — vous économiserez €${data.estimated_savings.toFixed(2)}`
        if (pricier) rec += ` vs ${pricier.store} (€${pricier.total.toFixed(2)})`
        rec += `. ${cheapCount} de vos articles y sont les moins chers.`
        setRecommendation(rec)
      }

      // Update per-item best store in local state + DB
      for (const pi of data.per_item) {
        const item = unchecked.find((i) => i.item_name === pi.name)
        if (item && pi.best_store) {
          setItems((prev) => prev.map((i) =>
            i.id === item.id ? { ...i, best_store: pi.best_store, best_price: pi.best_price } : i
          ))
          await supabase
            .from('shopping_list_items')
            .update({ best_store: pi.best_store, best_price: pi.best_price })
            .eq('id', item.id)
        }
      }
    }
    setComputing(false)
  }, [items, postcode, accessToken])

  const shareOnWhatsApp = () => {
    const unchecked = items.filter(i => !i.checked)
    const lines = ['🧺 *Ma liste de courses Basket*', '']
    if (result?.best_store) {
      lines.push(`📍 *Meilleur magasin: ${result.best_store}*`)
      if (result.estimated_savings > 0) {
        lines.push(`💰 Économie estimée: €${result.estimated_savings.toFixed(2)}`)
      }
      lines.push('')
    }
    unchecked.forEach(i => {
      const priceStr = i.best_price != null ? ` — €${(i.best_price * (i.qty || 1)).toFixed(2)} chez ${i.best_store || '?'}` : ''
      lines.push(`• ${(i.qty || 1) > 1 ? `${i.qty}× ` : ''}${i.item_name}${priceStr}`)
    })
    lines.push('', '_Via Basket — basketbeta.com_')
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank')
  }

  const unchecked = items.filter((i) => !i.checked)
  const checked = items.filter((i) => i.checked)
  const pricedItems = unchecked.filter((i) => i.best_price != null)
  const estimatedTotal = pricedItems.reduce((s, i) => s + (i.best_price! * (i.qty || 1)), 0)
  const unpricedCount = unchecked.length - pricedItems.length

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: '#7ed957', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-paper text-graphite flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-3 flex-shrink-0">
        <a href="/dashboard" className="w-9 h-9 rounded-full flex items-center justify-center glass">
          <ArrowLeft className="w-4 h-4 text-graphite/50" />
        </a>
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4" style={{ color: '#7ed957' }} />
          <h1 className="text-base font-bold text-graphite">Ma liste</h1>
          {items.length > 0 && (
            <span className="text-xs text-graphite/35 font-medium">({items.length})</span>
          )}
        </div>
        <button
          onClick={importLastReceipt}
          className="w-9 h-9 rounded-full flex items-center justify-center glass"
          title="Importer le dernier ticket"
        >
          <Receipt className="w-4 h-4 text-graphite/50" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 pb-48">

        {/* Input bar + suggestions */}
        <div ref={suggestRef} className="relative mb-4">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addItem() }}
              placeholder="Ajouter un article…"
              className="flex-1 h-12 rounded-2xl px-4 text-sm text-graphite placeholder:text-graphite/30 focus:outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.85)', border: '1.5px solid rgba(17,17,17,0.1)' }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#7ed957'
                if (suggestions.length > 0) setShowSuggestions(true)
              }}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(17,17,17,0.1)')}
            />
            <motion.button
              onClick={() => addItem()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#111111' }}
            >
              <Plus className="w-5 h-5 text-white" />
            </motion.button>
          </div>

          {/* Suggestions dropdown */}
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-12 top-14 z-30 rounded-2xl overflow-hidden shadow-lg"
                style={{ background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(17,17,17,0.08)' }}
              >
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onMouseDown={() => addItem(s.name)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-black/[0.03] transition-colors"
                    style={{ borderBottom: i < suggestions.length - 1 ? '1px solid rgba(17,17,17,0.05)' : 'none' }}
                  >
                    <span className="text-sm font-medium text-graphite truncate flex-1 pr-3">
                      {s.name}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs font-bold" style={{ color: '#00D09C' }}>
                        €{s.best_price.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-graphite/35">{s.best_store}</span>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Store comparison result */}
        <AnimatePresence>
          {showComparison && result && result.store_comparison.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-2xl overflow-hidden mb-4"
              style={{ border: '1px solid rgba(0,208,156,0.2)', background: 'rgba(0,208,156,0.04)' }}
            >
              <div className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid rgba(0,208,156,0.12)' }}>
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4" style={{ color: '#00D09C' }} />
                  <p className="text-sm font-bold text-graphite">
                    Allez chez <span style={{ color: '#00D09C' }}>{result.best_store}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={shareOnWhatsApp}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold"
                    style={{ background: '#25D366', color: '#fff' }}
                  >
                    <Share2 className="w-3 h-3" />
                    Partager
                  </button>
                  <button onClick={() => setShowComparison(false)}>
                    <X className="w-4 h-4 text-graphite/30" />
                  </button>
                </div>
              </div>

              {/* AI recommendation */}
              {recommendation && (
                <div className="px-4 py-3 flex items-start gap-2.5"
                  style={{ background: 'rgba(126,217,87,0.05)', borderBottom: '1px solid rgba(0,208,156,0.1)' }}>
                  <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#7ed957' }} />
                  <p className="text-xs text-graphite/70 leading-relaxed">
                    {recommendation.replace(/\*\*(.*?)\*\*/g, '$1')}
                  </p>
                </div>
              )}

              {result.store_comparison.slice(0, 4).map((s, i) => {
                const cheapest = result.store_comparison[0].total
                const barPct = cheapest > 0 ? (cheapest / s.total) * 100 : 100
                return (
                  <div key={i} className="px-4 py-2.5"
                    style={{ borderBottom: i < Math.min(3, result.store_comparison.length - 1) ? '1px solid rgba(17,17,17,0.04)' : 'none' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {i === 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(126,217,87,0.15)', color: '#7ed957' }}>
                            MEILLEUR
                          </span>
                        )}
                        <span className="text-xs font-semibold text-graphite">{s.store}</span>
                        <span className="text-[10px] text-graphite/35">
                          {s.items_found} article{s.items_found !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-graphite">€{s.total.toFixed(2)}</span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(17,17,17,0.06)' }}>
                      <div className="h-full rounded-full"
                        style={{ width: `${barPct}%`, background: i === 0 ? '#7ed957' : 'rgba(17,17,17,0.15)' }} />
                    </div>
                  </div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {items.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <div className="w-16 h-16 rounded-3xl glass flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="w-8 h-8 text-graphite/20" />
            </div>
            <p className="text-sm font-semibold text-graphite mb-1">Votre liste est vide</p>
            <p className="text-xs text-graphite/40 mb-5">Tapez un article ou importez votre dernier ticket</p>
            <button
              onClick={importLastReceipt}
              className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl"
              style={{ background: 'rgba(126,217,87,0.12)', color: '#7ed957' }}
            >
              <Receipt className="w-3.5 h-3.5" />
              Importer depuis le dernier ticket
            </button>
          </motion.div>
        )}

        {/* Unchecked items */}
        <AnimatePresence initial={false}>
          {unchecked.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16, height: 0, marginBottom: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="glass rounded-2xl px-3 py-3 flex items-center gap-2.5 mb-2"
            >
              <motion.button
                onClick={() => toggleItem(item.id, item.checked)}
                whileTap={{ scale: 0.85 }}
                className="w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors"
                style={{ borderColor: 'rgba(17,17,17,0.2)' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-graphite truncate">{item.item_name}</p>
                {item.best_store ? (
                  <p className="text-[11px] mt-0.5 font-semibold" style={{ color: '#00D09C' }}>
                    {item.best_store}
                    {item.best_price != null && ` · €${(item.best_price * (item.qty || 1)).toFixed(2)}`}
                    {(item.qty || 1) > 1 && item.best_price != null && (
                      <span className="text-graphite/35"> (€{item.best_price.toFixed(2)}×{item.qty})</span>
                    )}
                  </p>
                ) : (
                  <p className="text-[10px] mt-0.5 text-graphite/30 flex items-center gap-1">
                    <span className="inline-block w-3 h-1 rounded-full bg-graphite/10 animate-pulse" />
                    Recherche du meilleur prix…
                  </p>
                )}
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <motion.button
                  onClick={() => setQty(item.id, -1)}
                  whileTap={{ scale: 0.85 }}
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{
                    background: (item.qty || 1) > 1 ? 'rgba(17,17,17,0.07)' : 'transparent',
                    opacity: (item.qty || 1) > 1 ? 1 : 0.3,
                  }}
                  disabled={(item.qty || 1) <= 1}
                >
                  <Minus className="w-3 h-3 text-graphite" />
                </motion.button>
                <span className="w-5 text-center text-xs font-bold text-graphite">{item.qty || 1}</span>
                <motion.button
                  onClick={() => setQty(item.id, 1)}
                  whileTap={{ scale: 0.85 }}
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(17,17,17,0.07)' }}
                >
                  <Plus className="w-3 h-3 text-graphite" />
                </motion.button>
              </div>
              <motion.button
                onClick={() => deleteItem(item.id)}
                whileTap={{ scale: 0.85 }}
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ color: 'rgba(17,17,17,0.2)' }}
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Checked items */}
        <AnimatePresence initial={false}>
          {checked.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-[11px] text-graphite/35 font-semibold uppercase tracking-wider">
                  Dans le panier ({checked.length})
                </p>
                <button
                  onClick={clearChecked}
                  className="text-[11px] font-semibold"
                  style={{ color: '#EF4444' }}
                >
                  Tout vider
                </button>
              </div>
              {checked.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.45 }}
                  exit={{ opacity: 0 }}
                  className="glass rounded-2xl px-3 py-3 flex items-center gap-2.5 mb-2"
                >
                  <motion.button
                    onClick={() => toggleItem(item.id, item.checked)}
                    whileTap={{ scale: 0.85 }}
                    className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{ background: '#7ed957' }}
                  >
                    <Check className="w-3.5 h-3.5 text-white" />
                  </motion.button>
                  <p className="text-sm text-graphite/50 line-through flex-1 truncate">{item.item_name}</p>
                  <motion.button onClick={() => deleteItem(item.id)} whileTap={{ scale: 0.85 }}>
                    <X className="w-3.5 h-3.5 text-graphite/25" />
                  </motion.button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 flex flex-col gap-2"
        style={{
          background: 'linear-gradient(to top, #E8E4DD 70%, transparent)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)',
        }}
      >
        {unchecked.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 rounded-2xl glass text-xs">
            <span className="text-graphite/50 font-medium">
              {pricedItems.length > 0 ? `Estimation (${pricedItems.length} articles)` : 'Total estimé'}
              {unpricedCount > 0 && <span className="text-graphite/30"> · {unpricedCount} sans prix</span>}
            </span>
            <span className="font-bold text-graphite">
              {pricedItems.length > 0 ? `€${estimatedTotal.toFixed(2)}` : '—'}
            </span>
          </div>
        )}

        {unchecked.length >= 1 && (
          <motion.button
            onClick={findBestStore}
            disabled={computing}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full h-14 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2"
            style={{ background: '#111111', boxShadow: '0 6px 24px rgba(17,17,17,0.2)' }}
          >
            {computing ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Calcul en cours…</>
            ) : result ? (
              <><Store className="w-5 h-5" /> Recalculer le meilleur magasin<ChevronRight className="w-4 h-4 opacity-50 ml-auto" /></>
            ) : (
              <><Store className="w-5 h-5" /> Trouver le meilleur magasin<ChevronRight className="w-4 h-4 opacity-50 ml-auto" /></>
            )}
          </motion.button>
        )}
      </div>

      <BottomNav active="liste" />
    </div>
  )
}
