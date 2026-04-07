'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Plus, X, Check, ShoppingCart, ArrowLeft, Loader2, Store, Receipt } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import BottomNav from '@/components/BottomNav'

interface ListItem {
  id: string
  item_name: string
  checked: boolean
  best_store: string | null
  best_price: number | null
}

interface BestStoreResult {
  best_store: string | null
  estimated_savings: number
  items_count: number
  per_item: { name: string; best_store: string | null; best_price: number | null }[]
}

export default function ListePage() {
  const [user, setUser] = useState<User | null>(null)
  const [items, setItems] = useState<ListItem[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [computing, setComputing] = useState(false)
  const [result, setResult] = useState<BestStoreResult | null>(null)
  const [postcode, setPostcode] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)

      const [{ data: listData }, { data: profile }] = await Promise.all([
        supabase.from('shopping_list_items').select('id, item_name, checked, best_store, best_price').eq('user_id', user.id).order('created_at', { ascending: true }),
        supabase.from('profiles').select('postcode').eq('id', user.id).single(),
      ])

      if (listData) setItems(listData)
      if (profile?.postcode) setPostcode(profile.postcode)
      setLoading(false)
    }
    init()
  }, [])

  const addItem = async () => {
    const name = inputValue.trim()
    if (!name || !user) return
    setInputValue('')

    const { data } = await supabase
      .from('shopping_list_items')
      .insert({ user_id: user.id, item_name: name, item_name_normalised: name.toLowerCase().trim() })
      .select('id, item_name, checked, best_store, best_price')
      .single()

    if (data) setItems((prev) => [...prev, data])
    setResult(null)
  }

  const toggleItem = async (id: string, checked: boolean) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: !checked } : i)))
    await supabase.from('shopping_list_items').update({ checked: !checked }).eq('id', id)
  }

  const deleteItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    await supabase.from('shopping_list_items').delete().eq('id', id)
    setResult(null)
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
      .insert(toAdd.map((r) => ({ user_id: user.id, item_name: r.item_name, item_name_normalised: r.item_name.toLowerCase().trim() })))
      .select('id, item_name, checked, best_store, best_price')

    if (inserted) setItems((prev) => [...prev, ...inserted])
    setResult(null)
  }

  const findBestStore = async () => {
    const unchecked = items.filter((i) => !i.checked)
    if (unchecked.length === 0) return
    setComputing(true)
    setResult(null)

    const res = await fetch('/api/shopping-list/best-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: unchecked.map((i) => i.item_name), postcode }),
    })

    if (res.ok) {
      const data: BestStoreResult = await res.json()
      setResult(data)

      for (const pi of data.per_item) {
        const item = unchecked.find((i) => i.item_name === pi.name)
        if (item && pi.best_store) {
          await supabase
            .from('shopping_list_items')
            .update({ best_store: pi.best_store, best_price: pi.best_price })
            .eq('id', item.id)
          setItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, best_store: pi.best_store, best_price: pi.best_price } : i))
          )
        }
      }
    }
    setComputing(false)
  }

  const unchecked = items.filter((i) => !i.checked)
  const checked = items.filter((i) => i.checked)

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
      <div className="flex items-center justify-between px-5 pt-14 pb-4">
        <a href="/dashboard" className="flex items-center gap-2 text-graphite/50 hover:text-graphite transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
        </a>
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" style={{ color: '#7ed957' }} />
          <h1 className="text-lg font-bold text-graphite">Ma liste de courses</h1>
        </div>
        <button onClick={importLastReceipt} className="text-xs font-semibold flex items-center gap-1" style={{ color: '#7ed957' }}>
          <Receipt className="w-3.5 h-3.5" />
          Importer
        </button>
      </div>

      <main className="max-w-lg mx-auto px-5 space-y-4">
        {/* Input */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addItem() }}
            placeholder="Ajouter un article…"
            className="flex-1 h-12 rounded-2xl px-4 text-sm text-graphite placeholder:text-graphite/30 focus:outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.8)',
              border: '1px solid rgba(17,17,17,0.1)',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#7ed957')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(17,17,17,0.1)')}
          />
          <motion.button
            onClick={addItem}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#111111' }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Plus className="w-5 h-5 text-white" />
          </motion.button>
        </div>

        {/* Best store result banner */}
        <AnimatePresence>
          {result && result.best_store && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              className="rounded-2xl p-4 flex items-center gap-4"
              style={{ background: 'rgba(0,208,156,0.08)', border: '1px solid rgba(0,208,156,0.2)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,208,156,0.15)' }}>
                <Store className="w-5 h-5" style={{ color: '#00D09C' }} />
              </div>
              <div>
                <p className="font-bold text-sm text-graphite">Allez chez {result.best_store}</p>
                <p className="text-xs mt-0.5" style={{ color: '#00D09C' }}>
                  Économie estimée <span className="font-bold">€{result.estimated_savings.toFixed(2)}</span> sur {result.items_count} article{result.items_count !== 1 ? 's' : ''}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {items.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-3xl glass flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="w-8 h-8 text-graphite/25" />
            </div>
            <p className="text-sm font-medium text-graphite mb-1">Votre liste est vide</p>
            <p className="text-xs text-graphite/40">Ajoutez des articles pour comparer les prix avant de faire vos courses</p>
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
              className="glass rounded-2xl px-4 py-3 flex items-center gap-3"
            >
              <motion.button
                onClick={() => toggleItem(item.id, item.checked)}
                whileTap={{ scale: 0.85 }}
                className="w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors"
                style={{ borderColor: 'rgba(17,17,17,0.2)' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-graphite truncate">{item.item_name}</p>
                {item.best_store && (
                  <p className="text-xs mt-0.5" style={{ color: '#00D09C' }}>
                    {item.best_store} · {item.best_price != null ? `€${item.best_price.toFixed(2)}` : ''}
                  </p>
                )}
              </div>
              <motion.button
                onClick={() => deleteItem(item.id)}
                whileTap={{ scale: 0.85 }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-graphite/30 hover:text-graphite transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Checked items */}
        <AnimatePresence initial={false}>
          {checked.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              <p className="text-xs text-graphite/35 font-semibold uppercase tracking-wider px-1">
                Dans le panier ({checked.length})
              </p>
              {checked.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  exit={{ opacity: 0 }}
                  className="glass rounded-2xl px-4 py-3 flex items-center gap-3"
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
                  <motion.button onClick={() => deleteItem(item.id)} whileTap={{ scale: 0.85 }} className="text-graphite/30 flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </motion.button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Find best store CTA */}
        {unchecked.length >= 2 && (
          <motion.button
            onClick={findBestStore}
            disabled={computing}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full h-14 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2"
            style={{ background: '#111111', boxShadow: '0 6px 24px rgba(17,17,17,0.15)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            {computing ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Calcul en cours…</>
            ) : (
              <><Store className="w-5 h-5" /> Trouver le meilleur magasin</>
            )}
          </motion.button>
        )}
      </main>

      <BottomNav active="liste" />
    </div>
  )
}
