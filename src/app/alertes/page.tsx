'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  Bell, BellOff, Trash2, Plus, TrendingDown, TrendingUp,
  Minus, Search, ArrowLeft, Loader2,
} from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'
import { EASE } from '@/lib/hooks'

const SPRING = { type: 'spring', stiffness: 400, damping: 30 } as const

interface Watch {
  id: string
  item_name: string
  item_name_normalised: string
  last_seen_price: number | null
  last_seen_store: string | null
  is_active: boolean | null
  created_at: string
  // enriched client-side
  best_price?: number | null
  best_store?: string | null
}

interface Suggestion {
  name: string
  best_store: string
  best_price: number
}

export default function AlertesPage() {
  const [watches, setWatches] = useState<Watch[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [adding, setAdding] = useState(false)
  const suggestRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch best price for a single item from product_price_stats
  const fetchBestPrice = useCallback(async (itemName: string): Promise<{ price: number | null; store: string | null }> => {
    const { data } = await supabase
      .from('product_price_stats')
      .select('avg_price, store_chain')
      .ilike('item_name_normalised', `%${itemName.toLowerCase().trim()}%`)
      .order('avg_price', { ascending: true })
      .limit(1)
    if (data?.[0]) return { price: Math.round(data[0].avg_price * 100) / 100, store: data[0].store_chain }
    return { price: null, store: null }
  }, [])

  const loadWatches = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('price_watches')
      .select('id, item_name, item_name_normalised, last_seen_price, last_seen_store, is_active, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })

    if (error) { toast.error('Erreur de chargement'); return }
    const rows = (data ?? []) as Watch[]
    setWatches(rows)

    // Enrich with best prices (fire-and-forget per item)
    for (const w of rows) {
      fetchBestPrice(w.item_name_normalised ?? w.item_name).then(({ price, store }) => {
        setWatches(prev => prev.map(p => p.id === w.id ? { ...p, best_price: price, best_store: store } : p))
      })
    }
  }, [fetchBestPrice])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUserId(user.id)
      await loadWatches(user.id)
      setLoading(false)
    }
    init()
  }, [loadWatches])

  // Autocomplete suggestions with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (inputValue.length < 2) { setSuggestions([]); setShowSuggestions(false); return }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/shopping-list/suggest?q=${encodeURIComponent(inputValue)}`)
      if (res.ok) {
        const { suggestions: s } = await res.json()
        setSuggestions(s ?? [])
        setShowSuggestions(s?.length > 0)
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
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

  const addWatch = async (name: string) => {
    if (!userId || !name.trim()) return
    setAdding(true)
    setInputValue('')
    setShowSuggestions(false)
    const normalised = name.toLowerCase().trim().slice(0, 200)
    const { data, error } = await supabase
      .from('price_watches')
      .upsert({ user_id: userId, item_name: name.trim(), item_name_normalised: normalised, is_active: true },
        { onConflict: 'user_id,item_name_normalised' })
      .select()
      .single()
    if (error) { toast.error('Erreur lors de l\'ajout'); setAdding(false); return }
    const newWatch: Watch = data as Watch
    setWatches(prev => [newWatch, ...prev])
    toast.success(`"${name.trim()}" ajouté aux alertes`)
    // Enrich best price
    fetchBestPrice(normalised).then(({ price, store }) => {
      setWatches(prev => prev.map(p => p.id === newWatch.id ? { ...p, best_price: price, best_store: store } : p))
    })
    setAdding(false)
  }

  const toggleActive = async (watch: Watch) => {
    const next = !(watch.is_active ?? true)
    setWatches(prev => prev.map(p => p.id === watch.id ? { ...p, is_active: next } : p))
    const { error } = await supabase.from('price_watches').update({ is_active: next }).eq('id', watch.id)
    if (error) {
      setWatches(prev => prev.map(p => p.id === watch.id ? { ...p, is_active: watch.is_active } : p))
      toast.error('Erreur de mise à jour')
    }
  }

  const deleteWatch = async (id: string, name: string) => {
    setWatches(prev => prev.filter(p => p.id !== id))
    const { error } = await supabase.from('price_watches').delete().eq('id', id)
    if (error) { toast.error('Erreur de suppression'); loadWatches(userId!) }
    else toast.success(`"${name}" supprimé`)
  }

  const getTrend = (watch: Watch): 'down' | 'up' | 'neutral' => {
    if (!watch.best_price || !watch.last_seen_price) return 'neutral'
    if (watch.best_price < watch.last_seen_price - 0.01) return 'down'
    if (watch.best_price > watch.last_seen_price + 0.01) return 'up'
    return 'neutral'
  }

  return (
    <div className="min-h-screen bg-paper text-graphite pb-28">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-graphite/50 hover:text-graphite transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>
        <p className="text-sm font-semibold text-graphite">Mes alertes prix</p>
        <div className="w-16" />
      </div>

      <main className="max-w-lg mx-auto px-5 space-y-4">

        {/* Add alert input */}
        <div ref={suggestRef} className="relative">
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-white"
            style={{ border: '1px solid rgba(17,17,17,0.08)', boxShadow: '0 2px 12px rgba(17,17,17,0.05)' }}>
            <Search className="w-4 h-4 text-graphite/30 flex-shrink-0" />
            <input
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onKeyDown={e => { if (e.key === 'Enter' && inputValue.trim()) addWatch(inputValue) }}
              placeholder="Surveiller un produit…"
              className="flex-1 outline-none text-sm text-graphite bg-transparent"
            />
            {adding ? (
              <Loader2 className="w-4 h-4 text-graphite/30 animate-spin" />
            ) : inputValue.trim() ? (
              <motion.button whileTap={{ scale: 0.9 }} transition={SPRING}
                onClick={() => addWatch(inputValue)}
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: '#111' }}>
                <Plus className="w-3.5 h-3.5 text-white" />
              </motion.button>
            ) : null}
          </div>

          {/* Suggestions dropdown */}
          <AnimatePresence>
            {showSuggestions && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={SPRING}
                className="absolute left-0 right-0 top-full mt-2 rounded-2xl overflow-hidden z-20 bg-white"
                style={{ border: '1px solid rgba(17,17,17,0.08)', boxShadow: '0 8px 30px rgba(17,17,17,0.1)' }}>
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => addWatch(s.name)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-black/[0.03] transition-colors"
                    style={{ borderBottom: i < suggestions.length - 1 ? '1px solid rgba(17,17,17,0.05)' : 'none' }}>
                    <span className="text-sm font-medium text-graphite truncate flex-1 pr-3">{s.name}</span>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs font-bold text-graphite">{s.best_price.toFixed(2)} €</span>
                      <span className="block text-[10px] text-graphite/40">{s.best_store}</span>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {!loading && watches.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: EASE }}
            className="py-16 flex flex-col items-center text-center px-8">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(126,217,87,0.08)', border: '1px solid rgba(126,217,87,0.15)' }}>
              <Bell className="w-8 h-8" style={{ color: '#7ed957', opacity: 0.6 }} />
            </div>
            <p className="font-bold text-graphite mb-1">Aucune alerte</p>
            <p className="text-sm text-graphite/40 max-w-xs">
              Surveillez vos produits préférés et soyez alerté quand les prix baissent dans votre région.
            </p>
          </motion.div>
        )}

        {/* Skeleton while loading */}
        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="rounded-2xl p-4 bg-white flex items-center gap-3"
                style={{ border: '1px solid rgba(17,17,17,0.07)' }}>
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 rounded-full animate-pulse" style={{ background: 'rgba(17,17,17,0.07)', width: '50%' }} />
                  <div className="h-2.5 rounded-full animate-pulse" style={{ background: 'rgba(17,17,17,0.05)', width: '30%' }} />
                </div>
                <div className="w-16 h-8 rounded-xl animate-pulse" style={{ background: 'rgba(17,17,17,0.05)' }} />
              </div>
            ))}
          </div>
        )}

        {/* Watch list */}
        <AnimatePresence>
          {watches.map((watch, i) => {
            const trend = getTrend(watch)
            const isActive = watch.is_active ?? true
            const hasPrice = watch.best_price != null

            return (
              <motion.div key={watch.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40, height: 0 }}
                transition={{ delay: i * 0.04, ease: EASE }}
                whileTap={{ scale: 0.99 }}
                className="rounded-2xl p-4 bg-white"
                style={{
                  border: '1px solid rgba(17,17,17,0.07)',
                  opacity: isActive ? 1 : 0.5,
                }}>
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: isActive ? 'rgba(126,217,87,0.1)' : 'rgba(17,17,17,0.05)' }}>
                    {isActive
                      ? <Bell className="w-4 h-4" style={{ color: '#7ed957' }} />
                      : <BellOff className="w-4 h-4 text-graphite/30" />
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-graphite truncate">{watch.item_name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {watch.last_seen_price != null && (
                        <span className="text-xs text-graphite/40">
                          Vu à {watch.last_seen_price.toFixed(2)} €
                          {watch.last_seen_store ? ` · ${watch.last_seen_store}` : ''}
                        </span>
                      )}
                    </div>

                    {/* Best price row */}
                    {hasPrice && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {trend === 'down' && <TrendingDown className="w-3.5 h-3.5" style={{ color: '#00D09C' }} />}
                        {trend === 'up'   && <TrendingUp   className="w-3.5 h-3.5 text-red-400" />}
                        {trend === 'neutral' && <Minus className="w-3.5 h-3.5 text-graphite/30" />}
                        <span className="text-xs font-bold"
                          style={{ color: trend === 'down' ? '#00D09C' : trend === 'up' ? '#EF4444' : 'rgba(17,17,17,0.5)' }}>
                          Meilleur prix : {watch.best_price!.toFixed(2)} €
                        </span>
                        {watch.best_store && (
                          <span className="text-[10px] text-graphite/35">· {watch.best_store}</span>
                        )}
                      </div>
                    )}

                    {!hasPrice && !loading && (
                      <p className="text-[10px] text-graphite/30 mt-1">Recherche du prix en cours…</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                    <motion.button whileTap={{ scale: 0.85 }} transition={SPRING}
                      onClick={() => toggleActive(watch)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: isActive ? 'rgba(126,217,87,0.1)' : 'rgba(17,17,17,0.05)' }}
                      title={isActive ? 'Désactiver' : 'Activer'}>
                      {isActive
                        ? <Bell className="w-3.5 h-3.5" style={{ color: '#7ed957' }} />
                        : <BellOff className="w-3.5 h-3.5 text-graphite/30" />
                      }
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.85 }} transition={SPRING}
                      onClick={() => deleteWatch(watch.id, watch.item_name)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(239,68,68,0.07)' }}
                      title="Supprimer">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* Tip */}
        {!loading && watches.length > 0 && (
          <p className="text-xs text-graphite/35 text-center pb-2">
            Les prix sont mis à jour quotidiennement depuis les données communautaires.
          </p>
        )}

      </main>

      <BottomNav active="profile" />
    </div>
  )
}
