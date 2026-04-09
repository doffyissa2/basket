'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Camera, Upload, ArrowLeft, X, Share2, CheckCircle2, AlertCircle, MessageSquare, Copy, Store, Plus, Bell, Zap, Pencil, Check } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import BottomNav from '@/components/BottomNav'
import LocationGateModal from '@/components/LocationGateModal'
import { normalizeStoreChain, isKnownStore } from '@/lib/store-chains'
import { normalizeProductName } from '@/lib/normalize'
import type { XPAwardResult } from '@/lib/gamification'
import { getFrameStyle, LEGENDARY_GRADIENT } from '@/lib/gamification'
import { EASE, useCountUp } from '@/lib/hooks'
import type { ParsedReceipt, ComparisonItem, BestStore } from '@/types/api'

// ── XP float "+N XP" ─────────────────────────────────────────────────────────
function XPFloat({ amount, onDone }: { amount: number; onDone: () => void }) {
  return (
    <motion.div
      className="fixed bottom-40 left-1/2 z-50 pointer-events-none select-none"
      style={{ translateX: '-50%' }}
      initial={{ opacity: 0, y: 0, scale: 0.8 }}
      animate={{ opacity: [0, 1, 1, 0], y: [0, -60, -80, -100], scale: [0.8, 1.1, 1, 0.9] }}
      transition={{ duration: 1.8, ease: EASE, times: [0, 0.2, 0.7, 1] }}
      onAnimationComplete={onDone}
    >
      <div
        className="flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm"
        style={{ background: '#111', color: '#7ed957', boxShadow: '0 4px 20px rgba(126,217,87,0.4)' }}
      >
        <Zap className="w-3.5 h-3.5" />
        +{amount} XP
      </div>
    </motion.div>
  )
}

// ── Level-up celebration modal ───────────────────────────────────────────────
function LevelUpModal({ result, onClose }: { result: XPAwardResult; onClose: () => void }) {
  const frame = getFrameStyle(result.new_frame)
  const isLegendary = result.new_frame === 'legendary' || result.new_frame === 'legendary_elite'

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center px-6"
      style={{ background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(12px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      {/* Confetti layer */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        {Array.from({ length: 30 }, (_, i) => ({
          id: i,
          x: (Math.random() - 0.5) * 320,
          y: -(Math.random() * 240 + 80),
          color: ['#7ed957', '#00D09C', '#FFD700', '#a3f07a', '#B9F2FF'][i % 5],
          size: Math.random() * 7 + 4,
          delay: Math.random() * 0.5,
        })).map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-sm"
            style={{ width: p.size, height: p.size, background: p.color }}
            initial={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
            animate={{ opacity: 0, x: p.x, y: p.y, scale: 0, rotate: Math.random() * 360 }}
            transition={{ duration: 1.6, delay: p.delay, ease: 'easeOut' }}
          />
        ))}
      </div>

      <motion.div
        className="relative w-full max-w-sm rounded-3xl p-8 text-center"
        style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}
        initial={{ scale: 0.85, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.1 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Level badge */}
        <motion.div
          className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-5 relative"
          style={{
            background: isLegendary ? LEGENDARY_GRADIENT : '#1a1a1a',
            boxShadow: frame.glow,
            border: isLegendary ? 'none' : frame.border,
          }}
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.2 }}
        >
          <span className="text-3xl font-extrabold text-white">{result.new_level}</span>
        </motion.div>

        <motion.p
          className="text-xs font-bold uppercase tracking-widest mb-2"
          style={{ color: '#7ed957' }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          Niveau supérieur
        </motion.p>

        <motion.h2
          className="text-2xl font-extrabold text-white mb-1 tracking-tight"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
        >
          {result.new_title}
        </motion.h2>

        {result.new_unlocks.length > 0 && (
          <motion.div
            className="mt-4 rounded-2xl px-4 py-3"
            style={{ background: 'rgba(126,217,87,0.1)', border: '1px solid rgba(126,217,87,0.2)' }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.52 }}
          >
            <p className="text-xs text-white/50 mb-0.5">Débloqué</p>
            <p className="text-sm font-semibold" style={{ color: '#7ed957' }}>{result.new_unlocks[0]}</p>
          </motion.div>
        )}

        <motion.button
          onClick={onClose}
          className="mt-6 w-full h-12 rounded-2xl font-bold text-sm text-graphite"
          style={{ background: '#7ed957' }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
        >
          Continuer
        </motion.button>
      </motion.div>
    </motion.div>
  )
}


const PARSE_MESSAGES = [
  'Lecture du ticket...',
  'Détection des articles...',
  'Analyse des prix...',
  'Calcul de vos économies...',
]

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

// ── Client-side image compression ─────────────────────────────────────────────
// Resizes to max 1280px and recompresses as JPEG 0.83 before sending to Claude.
// Reduces token cost ~60–80% on phone photos while preserving OCR readability.
function compressImage(
  file: File,
  maxPx = 1280,
  quality = 0.83
): Promise<{ base64: string; mediaType: 'image/jpeg' }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('canvas unavailable')); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('compression failed')); return }
          const reader = new FileReader()
          reader.onloadend = () => {
            const result = reader.result as string
            resolve({ base64: result.split(',')[1], mediaType: 'image/jpeg' })
          }
          reader.readAsDataURL(blob)
        },
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')) }
    img.src = url
  })
}

function readLocationCache(): { postcode: string; coords?: Coords } | null {
  try {
    const raw = localStorage.getItem('basket_postcode_cached')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed.postcode && Date.now() < parsed.expires) return parsed
  } catch { /* ignore */ }
  return null
}

const PART_LABELS = ['Haut du ticket', 'Milieu', 'Bas du ticket']

export default function ScanPage() {
  const [user, setUser] = useState<User | null>(null)
  const [step, setStep] = useState<'upload' | 'parsing' | 'results' | 'comparison'>('upload')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  // Alias for parsing step preview (first image)
  const imagePreview = imagePreviews[0] ?? null
  const [parsedReceipt, setParsedReceipt] = useState<ParsedReceipt | null>(null)
  const [comparisons, setComparisons] = useState<ComparisonItem[]>([])
  const [bestStore, setBestStore] = useState<BestStore | null>(null)
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [parseMessageIdx, setParseMessageIdx] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  // Gamification
  const [xpFloat,       setXpFloat]       = useState<number | null>(null)
  const [levelUpResult, setLevelUpResult] = useState<XPAwardResult | null>(null)
  const gamificationAwarded = useRef(false)

  // Inline item editing (Risk 2)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState({ name: '', price: '' })

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
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      setAccessToken(session.access_token)
    }
    init()
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

  const addImageFile = (file: File) => {
    if (imageFiles.length >= 3) return
    setError('')
    const reader = new FileReader()
    reader.onloadend = () => {
      setImageFiles(prev => [...prev, file])
      setImagePreviews(prev => [...prev, reader.result as string])
    }
    reader.readAsDataURL(file)
  }

  const removeImageFile = (idx: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== idx))
    setImagePreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    addImageFile(file)
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  const awardScanXP = async (savings: number, store: string) => {
    if (!accessToken || gamificationAwarded.current) return
    gamificationAwarded.current = true
    try {
      const res = await fetch('/api/gamification/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          reason: 'scan_receipt',
          context: {
            savings,
            store,
            postcode: postcode ?? undefined,
            hour: new Date().getHours(),
          },
        }),
      })
      if (!res.ok) return
      const result: XPAwardResult = await res.json()
      setXpFloat(result.xp_gained)
      if (result.leveled_up) setLevelUpResult(result)
      result.new_badges.forEach((b) => {
        toast(b.name, {
          description: b.description,
          icon: b.icon,
          duration: 4000,
        })
      })
      // Persist to localStorage so BottomNav + other pages can read it
      try {
        localStorage.setItem('basket_gam_level', String(result.new_level))
        if (result.new_badges.length > 0) localStorage.setItem('basket_gam_new_badge', '1')
      } catch { /* ignore */ }
    } catch (e) {
      console.warn('[gamification] award failed (non-critical):', e)
    }
  }

  const handleScan = async () => {
    if (imageFiles.length === 0 || !user) return
    setStep('parsing')
    setParseMessageIdx(0)
    setError('')
    gamificationAwarded.current = false

    try {
      // Upload first image to storage for archival (full quality)
      const primaryFile = imageFiles[0]
      const fileName = `${user.id}/${Date.now()}-${primaryFile.name}`
      const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, primaryFile)
      if (uploadError) throw new Error('Erreur upload: ' + uploadError.message)

      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName)

      // Compress all images in parallel
      const compressed = await Promise.all(imageFiles.map(f => compressImage(f)))

      const parseResponse = await fetch('/api/parse-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          images: compressed.map(c => ({ image_base64: c.base64, media_type: c.mediaType })),
          latitude: userCoords?.lat ?? null,
          longitude: userCoords?.lon ?? null,
        }),
      })
      if (!parseResponse.ok) throw new Error('Erreur analyse du ticket')

      const parsed: ParsedReceipt = await parseResponse.json()
      setParsedReceipt(parsed)

      const storeChain = normalizeStoreChain(parsed.store_name)

      // ── Fire-and-forget: log unknown store for CHAIN_MAP expansion ────────
      if (!isKnownStore(parsed.store_name) && accessToken) {
        void fetch('/api/log-unknown-store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({
            raw_name: parsed.store_name,
            lat: userCoords?.lat ?? null,
            lon: userCoords?.lon ?? null,
          }),
        })
      }

      // ── Fire-and-forget: learn receipt format for this store ──────────────
      if (accessToken && parsed.items.length > 0) {
        void fetch('/api/learn-receipt-format', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({
            store_chain: storeChain,
            sample_items: parsed.items.slice(0, 15).map((i) => i.name),
          }),
        })
      }
      const receiptDate = new Date().toISOString().split('T')[0]

      // ── Duplicate detection: same user, store, total, date → skip re-insert ─
      const { data: existing } = await supabase
        .from('receipts')
        .select('id')
        .eq('user_id', user.id)
        .eq('store_name', storeChain)
        .eq('total_amount', parsed.total)
        .eq('receipt_date', receiptDate)
        .limit(1)

      let savedReceiptId: string
      const isNewScan = !(existing && existing.length > 0)

      if (!isNewScan) {
        // Duplicate: reuse existing receipt id, skip DB writes
        savedReceiptId = existing![0].id
        setReceiptId(savedReceiptId)
      } else {
        // New receipt: insert receipt row
        const { data: receiptRow, error: receiptError } = await supabase
          .from('receipts')
          .insert({
            user_id:         user.id,
            store_name:      storeChain,
            store_chain:     storeChain,
            total_amount:    parsed.total,
            receipt_date:    receiptDate,
            image_url:       publicUrl,
            postcode:        postcode || null,
            latitude:        userCoords?.lat ?? null,
            longitude:       userCoords?.lon ?? null,
            raw_ocr_text:    parsed.raw_ocr_text ?? null,
            store_address:   parsed.store_address ?? null,
            store_latitude:  parsed.store_latitude ?? null,
            store_longitude: parsed.store_longitude ?? null,
          })
          .select().single()
        if (receiptError) throw new Error('Erreur sauvegarde: ' + receiptError.message)
        savedReceiptId = receiptRow.id
        setReceiptId(savedReceiptId)

        // ── Atomic: rollback receipt if price_items insert fails ───────────
        const { error: itemsError } = await supabase.from('price_items').insert(
          parsed.items.map((item) => ({
            receipt_id: receiptRow.id,
            user_id: user.id,
            item_name: item.name,
            item_name_normalised: normalizeProductName(item.name),
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.price * item.quantity,
            store_name: storeChain,
            store_chain: storeChain,
            postcode: postcode || null,
            latitude: userCoords?.lat ?? null,
            longitude: userCoords?.lon ?? null,
            is_promo: item.is_promo ?? false,
            is_private_label: item.is_private_label ?? false,
          }))
        )
        if (itemsError) {
          await supabase.from('receipts').delete().eq('id', receiptRow.id)
          throw new Error('Erreur sauvegarde articles')
        }

        // ── Fire-and-forget: keep pricing engine current after every scan ──
        if (accessToken) {
          void fetch('/api/trigger-stats-refresh', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
          })
        }
      }

      setStep('results')

      const compareResponse = await fetch('/api/compare-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          items: parsed.items.map((i) => ({ name: i.name, normalised: normalizeProductName(i.name), price: i.price })),
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
        if (savedReceiptId) {
          await supabase.from('receipts').update({ savings_amount: savings }).eq('id', savedReceiptId)
        }
        if (isNewScan) void awardScanXP(savings, storeChain)
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

  const saveEdit = (idx: number) => {
    if (!parsedReceipt) return
    const original = parsedReceipt.items[idx]
    const correctedName = editDraft.name.trim() || original.name
    const correctedPrice = parseFloat(editDraft.price) || original.price
    setParsedReceipt({
      ...parsedReceipt,
      items: parsedReceipt.items.map((item, i) =>
        i === idx ? { ...item, name: correctedName, price: correctedPrice } : item
      ),
    })
    setEditingIdx(null)
    if (receiptId && accessToken) {
      void fetch('/api/correct-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          receipt_id: receiptId,
          original_name: original.name,
          corrected_name: correctedName,
          original_price: original.price,
          corrected_price: correctedPrice,
        }),
      })
    }
  }

  const handleShare = (method: 'whatsapp' | 'copy' | 'sms') => {
    const levelTitle = levelUpResult?.new_title ?? null
    const levelNum   = levelUpResult?.new_level ?? null
    const levelLine  = levelTitle && levelNum ? `\nNiveau ${levelNum} — ${levelTitle}` : ''
    const text = `🧺 Basket m'a trouvé ${totalSavings.toFixed(2)} € d'économies possibles !${levelLine}\n\nJ'ai scanné mon ticket ${parsedReceipt?.store_name || ''} et découvert que je pouvais payer moins ailleurs.\n\nEssaie aussi → basketbeta.com`
    if (method === 'whatsapp') window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    if (method === 'copy') navigator.clipboard.writeText(text)
    if (method === 'sms') window.open(`sms:?body=${encodeURIComponent(text)}`, '_blank')
    // Award share XP (fire-and-forget, capped once per session by the server's dedup)
    if (accessToken) {
      void fetch('/api/gamification/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ reason: 'share_result' }),
      })
    }
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
              <p className="text-graphite/50 text-sm mb-4">
                {imagePreviews.length === 0
                  ? 'Ticket long ? Prenez jusqu\'à 3 photos du haut vers le bas.'
                  : `${imagePreviews.length}/3 photo${imagePreviews.length > 1 ? 's' : ''} — ${imagePreviews.length < 3 ? 'ajoutez la suite si le ticket est long' : 'maximum atteint'}`}
              </p>

              {/* Privacy trust badge */}
              <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl mb-5" style={{ background: 'rgba(126,217,87,0.07)', border: '1px solid rgba(126,217,87,0.18)' }}>
                <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1.5L2 4v4c0 3.31 2.5 6.41 6 7.16C11.5 14.41 14 11.31 14 8V4L8 1.5z" stroke="#7ed957" strokeWidth="1.3" strokeLinejoin="round" fill="rgba(126,217,87,0.15)" />
                  <path d="M5.5 8l1.75 1.75L10.5 6.5" stroke="#7ed957" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-[11px] leading-relaxed text-graphite/55">
                  <span className="font-semibold text-graphite/75">Nous ne vendons jamais vos données personnelles.</span>{' '}
                  Seuls des prix agrégés et anonymisés contribuent à la base communautaire. Vos tickets restent privés.
                </p>
              </div>

              {/* Thumbnails of added photos */}
              {imagePreviews.length > 0 && (
                <div className="space-y-2 mb-4">
                  {imagePreviews.map((preview, idx) => (
                    <motion.div key={idx}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="relative rounded-2xl overflow-hidden flex items-center gap-3 p-3"
                      style={{ background: 'rgba(17,17,17,0.04)', border: '1px solid rgba(17,17,17,0.08)' }}>
                      <img src={preview} alt={PART_LABELS[idx]} className="w-14 h-14 object-cover rounded-xl flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-graphite">{PART_LABELS[idx]}</p>
                        <p className="text-xs text-graphite/40">Photo {idx + 1}</p>
                      </div>
                      <button onClick={() => removeImageFile(idx)}
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(239,68,68,0.1)' }}>
                        <X className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Add photo buttons */}
              {imagePreviews.length < 3 && (
                <div className="space-y-3 mb-4">
                  <motion.button
                    onClick={() => cameraInputRef.current?.click()}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="w-full rounded-3xl p-6 flex items-center gap-4"
                    style={{ background: '#111111', boxShadow: '0 8px 30px rgba(17,17,17,0.2)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
                    <Camera className="w-8 h-8 text-white flex-shrink-0" />
                    <div className="text-left">
                      <p className="font-bold text-base text-white">
                        {imagePreviews.length === 0 ? 'Photographier le ticket' : 'Ajouter la suite'}
                      </p>
                      <p className="text-white/50 text-xs mt-0.5">
                        {imagePreviews.length === 0 ? 'Plusieurs photos possibles' : PART_LABELS[imagePreviews.length]}
                      </p>
                    </div>
                  </motion.button>
                  <motion.button
                    onClick={() => fileInputRef.current?.click()}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="w-full rounded-3xl p-6 flex items-center gap-4 glass"
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
                    <Upload className="w-8 h-8 text-graphite/50 flex-shrink-0" />
                    <div className="text-left">
                      <p className="font-bold text-base text-graphite">
                        {imagePreviews.length === 0 ? 'Importer depuis la galerie' : 'Importer la suite'}
                      </p>
                      <p className="text-graphite/40 text-xs mt-0.5">Depuis votre galerie</p>
                    </div>
                  </motion.button>
                </div>
              )}

              {/* Analyse button — visible once at least 1 photo added */}
              {imagePreviews.length > 0 && (
                <motion.button
                  onClick={handleScan}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full h-14 rounded-2xl font-bold text-white text-base mb-2"
                  style={{ background: '#111111' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
                  Analyser {imagePreviews.length > 1 ? `les ${imagePreviews.length} photos` : 'ce ticket'}
                </motion.button>
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
              className="flex flex-col items-center justify-center py-16"
            >
              {imagePreview && (
                <div className="relative w-44 rounded-2xl overflow-hidden mb-8" style={{ border: '1px solid rgba(17,17,17,0.1)', boxShadow: '0 12px 40px rgba(17,17,17,0.12)' }}>
                  <img src={imagePreview} alt="Ticket" className="w-full opacity-60" />
                  {/* Scanning line */}
                  <motion.div
                    className="absolute left-0 right-0 h-0.5"
                    style={{ background: 'linear-gradient(90deg, transparent, #7ed957, transparent)' }}
                    animate={{ y: [0, 176, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  {/* Glow overlay */}
                  <motion.div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(126,217,87,0.08) 100%)' }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
              )}

              {/* Cycling message */}
              <div className="h-8 mb-4 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={parseMessageIdx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="text-base font-semibold text-graphite text-center"
                  >
                    {PARSE_MESSAGES[parseMessageIdx]}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* Step progress dots */}
              <div className="flex items-center gap-2 mb-5">
                {PARSE_MESSAGES.map((_, i) => (
                  <motion.div
                    key={i}
                    className="rounded-full"
                    animate={{
                      width: i === parseMessageIdx ? 20 : 6,
                      backgroundColor:
                        i < parseMessageIdx
                          ? '#7ed957'
                          : i === parseMessageIdx
                          ? '#111111'
                          : 'rgba(17,17,17,0.15)',
                    }}
                    style={{ height: 6 }}
                    transition={{ duration: 0.3 }}
                  />
                ))}
              </div>

              <p className="text-graphite/35 text-xs">Cela prend généralement 10–20 secondes</p>
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
              {/* Comparison-in-progress banner (shown during 'results' while compare-prices runs) */}
              {step === 'results' && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl px-4 py-3 mb-4 flex items-center gap-3"
                  style={{ background: 'rgba(17,17,17,0.04)', border: '1px solid rgba(17,17,17,0.07)' }}
                >
                  <motion.div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: '#00D09C' }}
                    animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.1, repeat: Infinity }}
                  />
                  <p className="text-sm text-graphite/55 font-medium">Comparaison des prix en cours…</p>
                </motion.div>
              )}

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
                  const isEditing = editingIdx === idx

                  return (
                    <div key={idx}>
                      {isEditing ? (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-xl px-4 py-3"
                          style={{ background: 'rgba(126,217,87,0.06)', border: '1px solid rgba(126,217,87,0.25)' }}
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-graphite/40 mb-2">Corriger l&apos;article</p>
                          <input
                            value={editDraft.name}
                            onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))}
                            placeholder={item.name}
                            className="w-full rounded-lg px-3 py-2 text-sm font-medium text-graphite mb-2 outline-none"
                            style={{ background: 'rgba(17,17,17,0.05)', border: '1px solid rgba(17,17,17,0.1)' }}
                          />
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs text-graphite/40 flex-shrink-0">Prix :</span>
                            <input
                              value={editDraft.price}
                              onChange={e => setEditDraft(d => ({ ...d, price: e.target.value }))}
                              type="number" step="0.01" min="0"
                              placeholder={String(item.price)}
                              className="w-24 rounded-lg px-3 py-2 text-sm font-bold text-graphite outline-none"
                              style={{ background: 'rgba(17,17,17,0.05)', border: '1px solid rgba(17,17,17,0.1)' }}
                            />
                            <span className="text-xs text-graphite/40">€</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEdit(idx)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                              style={{ background: '#111' }}
                            >
                              <Check className="w-3 h-3" />
                              Valider
                            </button>
                            <button
                              onClick={() => setEditingIdx(null)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold glass"
                              style={{ color: 'rgba(17,17,17,0.5)' }}
                            >
                              Annuler
                            </button>
                          </div>
                        </motion.div>
                      ) : (
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
                          <div className="text-right flex-shrink-0 flex flex-col items-end gap-0.5">
                            <p className="text-sm font-bold text-graphite">{item.price.toFixed(2)} €</p>
                            {comparison?.normalized_price && (
                              <p className="text-[10px] text-graphite/35">{comparison.normalized_price}</p>
                            )}
                            {hasSaving && comparison && (
                              <p className="text-xs font-semibold" style={{ color: '#00D09C' }}>-{comparison.savings.toFixed(2)} €</p>
                            )}
                            {step === 'comparison' && (
                              <button
                                onClick={() => { setEditingIdx(idx); setEditDraft({ name: item.name, price: String(item.price) }) }}
                                className="mt-0.5 w-5 h-5 flex items-center justify-center rounded transition-opacity opacity-25 hover:opacity-70"
                                title="Corriger cet article"
                              >
                                <Pencil className="w-3 h-3 text-graphite" />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                      {!isEditing && step === 'comparison' && (
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

      {/* XP float animation */}
      <AnimatePresence>
        {xpFloat !== null && (
          <XPFloat amount={xpFloat} onDone={() => setXpFloat(null)} />
        )}
      </AnimatePresence>

      {/* Level-up modal */}
      <AnimatePresence>
        {levelUpResult && (
          <LevelUpModal result={levelUpResult} onClose={() => setLevelUpResult(null)} />
        )}
      </AnimatePresence>

      <BottomNav active="scan" />
    </div>
  )
}
