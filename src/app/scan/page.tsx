'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Camera, Upload, ArrowLeft, X, Share2, CheckCircle2, AlertCircle, MessageSquare, Copy, Store, Plus, Bell } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import BottomNav from '@/components/BottomNav'
import LocationGateModal from '@/components/LocationGateModal'
import { normalizeStoreChain } from '@/lib/store-chains'

interface ParsedItem {
  name: string
  price: number
  quantity: number
}

interface ParsedReceipt {
  store_name: string
  items: ParsedItem[]
  total: number
}

interface ComparisonItem {
  name: string
  your_price: number
  avg_price: number
  savings: number
  cheaper_store: string | null
  normalized_price: string | null
  avg_normalized_price: string | null
  is_local: boolean
}

interface BestStore {
  name: string
  items_cheaper: number
  total_savings: number
}

const PARSE_MESSAGES = [
  'Lecture du ticket...',
  'Détection des articles...',
  'Analyse des prix...',
  'Calcul de vos économies...',
]

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (target === 0) return
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(target * eased * 100) / 100)
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return count
}

function ConfettiParticles() {
  const particles = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    x: Math.random() * 300 - 150,
    y: -(Math.random() * 200 + 80),
    color: ['#7ed957', '#00D09C', '#111111', '#a3f07a', '#7ed957'][Math.floor(Math.random() * 5)],
    size: Math.random() * 6 + 4,
    delay: Math.random() * 0.4,
  }))

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{ width: p.size, height: p.size, background: p.color }}
          initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          animate={{ opacity: 0, x: p.x, y: p.y, scale: 0 }}
          transition={{ duration: 1.5, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

interface Coords { lat: number; lon: number }

function readLocationCache(): { postcode: string; coords?: Coords } | null {
  try {
    const raw = localStorage.getItem('basket_postcode_cached')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed.postcode && Date.now() < parsed.expires) return parsed
  } catch { /* ignore */ }
  return null
}

export default function ScanPage() {
  const [user, setUser] = useState<User | null>(null)
  const [step, setStep] = useState<'upload' | 'parsing' | 'results' | 'comparison'>('upload')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [parsedReceipt, setParsedReceipt] = useState<ParsedReceipt | null>(null)
  const [comparisons, setComparisons] = useState<ComparisonItem[]>([])
  const [bestStore, setBestStore] = useState<BestStore | null>(null)
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [parseMessageIdx, setParseMessageIdx] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Location gate
  const [postcode, setPostcode] = useState<string | null>(null)
  const [userCoords, setUserCoords] = useState<Coords | null>(null)
  const [locationReady, setLocationReady] = useState(() => {
    if (typeof window === 'undefined') return false
    return readLocationCache() !== null
  })

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)
    }
    getUser()
    const cached = readLocationCache()
    if (cached) {
      setPostcode(cached.postcode)
      if (cached.coords) setUserCoords(cached.coords)
    }
  }, [])

  // Cycle parse messages
  useEffect(() => {
    if (step !== 'parsing') return
    const interval = setInterval(() => {
      setParseMessageIdx((i) => (i + 1) % PARSE_MESSAGES.length)
    }, 1800)
    return () => clearInterval(interval)
  }, [step])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setError('')
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleScan = async () => {
    if (!imageFile || !user) return
    setStep('parsing')
    setParseMessageIdx(0)
    setError('')

    try {
      const fileName = `${user.id}/${Date.now()}-${imageFile.name}`
      const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, imageFile)
      if (uploadError) throw new Error('Erreur upload: ' + uploadError.message)

      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName)

      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve((reader.result as string).split(',')[1])
        reader.readAsDataURL(imageFile)
      })

      const parseResponse = await fetch('/api/parse-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64, media_type: imageFile.type }),
      })
      if (!parseResponse.ok) throw new Error('Erreur analyse du ticket')

      const parsed: ParsedReceipt = await parseResponse.json()
      setParsedReceipt(parsed)

      const storeChain = normalizeStoreChain(parsed.store_name)

      const { data: receiptRow, error: receiptError } = await supabase
        .from('receipts')
        .insert({
          user_id: user.id,
          store_name: storeChain,
          store_chain: storeChain,
          total_amount: parsed.total,
          receipt_date: new Date().toISOString().split('T')[0],
          image_url: publicUrl,
          postcode: postcode || null,
          latitude: userCoords?.lat ?? null,
          longitude: userCoords?.lon ?? null,
        })
        .select().single()
      if (receiptError) throw new Error('Erreur sauvegarde: ' + receiptError.message)
      setReceiptId(receiptRow.id)

      await supabase.from('price_items').insert(
        parsed.items.map((item) => ({
          receipt_id: receiptRow.id, user_id: user.id, item_name: item.name,
          item_name_normalised: item.name.toLowerCase().trim(), quantity: item.quantity,
          unit_price: item.price, total_price: item.price * item.quantity,
          store_name: storeChain,
          store_chain: storeChain,
          postcode: postcode || null,
          latitude: userCoords?.lat ?? null,
          longitude: userCoords?.lon ?? null,
        }))
      )

      setStep('results')

      const compareResponse = await fetch('/api/compare-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: parsed.items.map((i) => ({ name: i.name, normalised: i.name.toLowerCase().trim(), price: i.price })),
          postcode: postcode || null, store_name: storeChain,
        }),
      })

      if (compareResponse.ok) {
        const comparisonData = await compareResponse.json()
        setComparisons(comparisonData.comparisons || [])
        setBestStore(comparisonData.best_store || null)
        setStep('comparison')
        const savings = (comparisonData.comparisons || []).reduce((s: number, c: ComparisonItem) => s + Math.max(0, c.savings), 0)
        if (savings > 5) setTimeout(() => setShowConfetti(true), 300)
        if (receiptRow.id && savings > 0) {
          await supabase.from('receipts').update({ savings_amount: savings }).eq('id', receiptRow.id)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      setStep('upload')
    }
  }

  const totalSavings = comparisons.reduce((sum, item) => sum + Math.max(0, item.savings), 0)
  const animatedSavings = useCountUp(totalSavings)

  const addToList = async (itemName: string) => {
    if (!user) return
    await supabase.from('shopping_list_items').upsert(
      { user_id: user.id, item_name: itemName, item_name_normalised: itemName.toLowerCase().trim() },
      { onConflict: 'user_id,item_name_normalised' }
    )
  }

  const watchItem = async (itemName: string, price: number) => {
    if (!user) return
    await supabase.from('price_watches').upsert(
      {
        user_id: user.id,
        item_name: itemName,
        item_name_normalised: itemName.toLowerCase().trim(),
        last_seen_price: price,
        last_seen_store: parsedReceipt?.store_name ?? null,
      },
      { onConflict: 'user_id,item_name_normalised' }
    )
  }

  const handleShare = (method: 'whatsapp' | 'copy' | 'sms') => {
    const text = `Basket m'a trouvé ${totalSavings.toFixed(2)}€ d'économies possibles cette semaine !\n\nJ'ai scanné mon ticket ${parsedReceipt?.store_name || ''} et découvert que je pouvais payer moins ailleurs.\n\nEssaie aussi → basket.fr`
    if (method === 'whatsapp') window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    if (method === 'copy') navigator.clipboard.writeText(text)
    if (method === 'sms') window.open(`sms:?body=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-paper text-graphite pb-28 md:pb-0">
      {/* Location gate */}
      {!locationReady && user && (
        <LocationGateModal
          userId={user.id}
          onComplete={(pc, coords) => {
            setPostcode(pc)
            if (coords) setUserCoords(coords)
            setLocationReady(true)
            try {
              localStorage.setItem('basket_postcode_cached', JSON.stringify({
                postcode: pc,
                coords: coords ?? null,
                expires: Date.now() + 86_400_000,
              }))
            } catch { /* ignore */ }
          }}
        />
      )}

      {/* Nav */}
      <div className="flex items-center justify-between px-5 pt-14 pb-6">
        <a href="/dashboard" className="flex items-center gap-2 text-graphite/50 hover:text-graphite transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </a>
        <p className="text-sm font-semibold text-graphite">Scanner</p>
        <div className="w-16" />
      </div>

      <main className="max-w-lg mx-auto px-5 pb-10">
        <AnimatePresence mode="wait">

          {/* Upload step */}
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
            >
              <h1 className="text-2xl font-extrabold mb-1 text-graphite">Scanner un ticket</h1>
              <p className="text-graphite/50 text-sm mb-8">Prenez en photo ou importez votre ticket de caisse</p>

              {imagePreview ? (
                <div>
                  <div className="relative rounded-2xl overflow-hidden mb-4" style={{ border: '1px solid rgba(17,17,17,0.1)' }}>
                    <img src={imagePreview} alt="Ticket" className="w-full" />
                    <button
                      onClick={() => { setImageFile(null); setImagePreview(null) }}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.85)' }}
                    >
                      <X className="w-4 h-4 text-graphite" />
                    </button>
                  </div>
                  <motion.button
                    onClick={handleScan}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full h-14 rounded-2xl font-bold text-white text-base"
                    style={{ background: '#111111' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    Analyser ce ticket
                  </motion.button>
                </div>
              ) : (
                <div className="space-y-3">
                  <motion.button
                    onClick={() => cameraInputRef.current?.click()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full rounded-3xl p-8 flex flex-col items-center gap-3 text-center"
                    style={{ background: '#111111', boxShadow: '0 8px 30px rgba(17,17,17,0.2)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <Camera className="w-10 h-10 text-white" />
                    <div>
                      <p className="font-bold text-lg text-white">Prendre une photo</p>
                      <p className="text-white/60 text-sm mt-0.5">Utilisez votre caméra</p>
                    </div>
                  </motion.button>

                  <motion.button
                    onClick={() => fileInputRef.current?.click()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full rounded-3xl p-8 flex flex-col items-center gap-3 text-center glass"
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <Upload className="w-10 h-10 text-graphite/50" />
                    <div>
                      <p className="font-bold text-lg text-graphite">Importer une image</p>
                      <p className="text-graphite/40 text-sm mt-0.5">Depuis votre galerie</p>
                    </div>
                  </motion.button>
                </div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 mt-4 px-4 py-3 rounded-xl text-red-500 text-sm"
                  style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            </motion.div>
          )}

          {/* Parsing step */}
          {step === 'parsing' && (
            <motion.div
              key="parsing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              {imagePreview && (
                <div className="relative w-48 rounded-2xl overflow-hidden mb-8" style={{ border: '1px solid rgba(17,17,17,0.1)' }}>
                  <img src={imagePreview} alt="Ticket" className="w-full opacity-50" />
                  {/* Scanning line */}
                  <motion.div
                    className="absolute left-0 right-0 h-0.5"
                    style={{ background: 'linear-gradient(90deg, transparent, #7ed957, transparent)' }}
                    animate={{ y: [0, 192, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
              )}
              <div className="h-8 mb-3 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={parseMessageIdx}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3 }}
                    className="text-lg font-semibold text-graphite text-center"
                  >
                    {PARSE_MESSAGES[parseMessageIdx]}
                  </motion.p>
                </AnimatePresence>
              </div>
              <p className="text-graphite/40 text-sm">Notre IA analyse votre ticket</p>
            </motion.div>
          )}

          {/* Results / Comparison */}
          {(step === 'results' || step === 'comparison') && parsedReceipt && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Savings banner */}
              {step === 'comparison' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="relative rounded-3xl p-6 mb-5 text-center overflow-hidden bg-white"
                  style={{
                    border: totalSavings > 0 ? '1px solid rgba(0,208,156,0.25)' : '1px solid rgba(17,17,17,0.08)',
                  }}
                >
                  {showConfetti && <ConfettiParticles />}
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: totalSavings > 0 ? '#00D09C' : 'rgba(17,17,17,0.4)' }}>
                    {totalSavings > 0 ? 'Économies possibles' : 'Prix analysés'}
                  </p>
                  <p className="text-5xl font-extrabold mb-1" style={{ color: totalSavings > 0 ? '#00D09C' : '#111111', fontVariantNumeric: 'tabular-nums' }}>
                    {totalSavings > 0 ? `${animatedSavings.toFixed(2)} €` : '—'}
                  </p>
                  {totalSavings > 0 && (
                    <p className="text-sm mt-1 text-graphite/50">en achetant ailleurs cette semaine</p>
                  )}
                </motion.div>
              )}

              {/* Best store recommendation */}
              {step === 'comparison' && bestStore && bestStore.items_cheaper >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass rounded-2xl p-4 mb-4 flex items-center gap-4"
                  style={{ borderLeft: '3px solid #7ed957' }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(126,217,87,0.12)' }}>
                    <Store className="w-5 h-5" style={{ color: '#7ed957' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-graphite">Chez {bestStore.name}</p>
                    <p className="text-xs text-graphite/50">
                      vous auriez économisé{' '}
                      <span style={{ color: '#00D09C' }}>€{bestStore.total_savings.toFixed(2)}</span>
                      {' '}sur {bestStore.items_cheaper} articles
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Receipt header */}
              <div className="glass rounded-2xl p-5 mb-4">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-bold text-lg text-graphite">{parsedReceipt.store_name}</h2>
                  <p className="text-xl font-extrabold text-graphite">{parsedReceipt.total.toFixed(2)} €</p>
                </div>
                <p className="text-xs text-graphite/40">{parsedReceipt.items.length} articles détectés</p>
              </div>

              {/* Items */}
              <div className="space-y-2 mb-5">
                {parsedReceipt.items.map((item, idx) => {
                  const comparison = comparisons.find((c) => c.name.toLowerCase() === item.name.toLowerCase())
                  const hasSaving = comparison && comparison.savings > 0.01

                  return (
                    <div key={idx}>
                      <motion.div
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.06, duration: 0.35 }}
                        className="flex items-center justify-between rounded-xl px-4 py-3"
                        style={{
                          background: hasSaving ? 'rgba(0,208,156,0.06)' : 'rgba(17,17,17,0.04)',
                          border: hasSaving ? '1px solid rgba(0,208,156,0.2)' : '1px solid rgba(17,17,17,0.06)',
                          borderLeft: hasSaving ? '3px solid #00D09C' : undefined,
                        }}
                      >
                        <div className="flex-1 min-w-0 pr-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-graphite truncate">{item.name}</p>
                            {step === 'comparison' && comparison && (
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
                                style={{
                                  background: comparison.is_local ? 'rgba(0,208,156,0.12)' : 'rgba(17,17,17,0.08)',
                                  color: comparison.is_local ? '#00D09C' : 'rgba(17,17,17,0.5)',
                                }}
                              >
                                {comparison.is_local ? 'Région' : 'National'}
                              </span>
                            )}
                          </div>
                          {hasSaving && comparison && (
                            <p className="text-xs mt-0.5" style={{ color: '#00D09C' }}>
                              Moins cher chez {comparison.cheaper_store || 'une autre enseigne'} · {comparison.avg_price.toFixed(2)} €
                              {comparison.avg_normalized_price && (
                                <span className="text-graphite/35"> · {comparison.avg_normalized_price}</span>
                              )}
                            </p>
                          )}
                          {!hasSaving && step === 'comparison' && (
                            <p className="text-xs mt-0.5 text-graphite/35 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" style={{ color: '#00D09C' }} />
                              Bon prix
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-graphite">{item.price.toFixed(2)} €</p>
                          {comparison?.normalized_price && (
                            <p className="text-[10px] text-graphite/35">{comparison.normalized_price}</p>
                          )}
                          {hasSaving && comparison && (
                            <p className="text-xs font-semibold" style={{ color: '#00D09C' }}>-{comparison.savings.toFixed(2)} €</p>
                          )}
                        </div>
                      </motion.div>
                      {step === 'comparison' && (
                        <div className="flex gap-2 px-1 pt-1">
                          <button
                            onClick={() => addToList(item.name)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold glass"
                            style={{ color: '#7ed957' }}
                          >
                            <Plus className="w-3 h-3" />
                            Liste
                          </button>
                          <button
                            onClick={() => watchItem(item.name, item.price)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold glass"
                            style={{ color: 'rgba(17,17,17,0.5)' }}
                          >
                            <Bell className="w-3 h-3" />
                            Surveiller
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Share card */}
              {step === 'comparison' && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="glass rounded-2xl p-5 mb-4"
                >
                  <p className="text-sm font-semibold text-graphite mb-3">Partager vos résultats</p>
                  <div className="grid grid-cols-3 gap-2">
                    <motion.button
                      onClick={() => handleShare('whatsapp')}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-white font-semibold text-xs"
                      style={{ background: '#25D366' }}
                    >
                      <Share2 className="w-4 h-4" />
                      WhatsApp
                    </motion.button>
                    <motion.button
                      onClick={() => handleShare('copy')}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-xl font-semibold text-xs glass text-graphite"
                    >
                      <Copy className="w-4 h-4" />
                      Copier
                    </motion.button>
                    <motion.button
                      onClick={() => handleShare('sms')}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-xl font-semibold text-xs glass text-graphite"
                    >
                      <MessageSquare className="w-4 h-4" />
                      SMS
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <a href="/scan" className="flex-1">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full h-12 rounded-2xl font-semibold text-sm text-graphite glass"
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    Nouveau ticket
                  </motion.button>
                </a>
                <a href="/dashboard" className="flex-1">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full h-12 rounded-2xl font-semibold text-sm text-white"
                    style={{ background: '#111111' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    Tableau de bord
                  </motion.button>
                </a>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <BottomNav active="scan" />
    </div>
  )
}
