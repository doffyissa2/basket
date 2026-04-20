'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Camera, Upload, ArrowLeft, X, Share2, CheckCircle2, AlertCircle, MessageSquare, Copy, Store, Plus, Bell, Zap, Pencil, Check, ShoppingCart, MapPin } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { useUserContext } from '@/lib/user-context'
import { emit } from '@/lib/events'
import LocationGateModal from '@/components/LocationGateModal'
import { normalizeStoreChain, isKnownStore } from '@/lib/store-chains'
import { normalizeProductName } from '@/lib/normalize'
import type { XPAwardResult } from '@/lib/gamification'
import { getFrameStyle, LEGENDARY_GRADIENT } from '@/lib/gamification'
import { EASE, useCountUp } from '@/lib/hooks'
import type { ParsedReceipt, ComparisonItem, BestStore, ScanResult } from '@/types/api'
import { haptic } from '@/lib/haptic'

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
  'Compression de l\u2019image\u2026',
  'Analyse par l\u2019IA\u2026',
  'Recherche des prix\u2026',
  'Calcul de vos économies\u2026',
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
// Resizes to max 1200px and recompresses as JPEG 0.85 before sending to Claude.
// Falls back to raw base64 (no canvas) for formats the browser can't decode (e.g. HEIC on Chrome).
const CLAUDE_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function readFileAsBase64(file: File): Promise<{ base64: string; mediaType: 'image/jpeg' }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      if (!base64) { reject(new Error('FileReader produced no data')); return }
      resolve({ base64, mediaType: 'image/jpeg' })
    }
    reader.onerror = () => reject(new Error('FileReader error'))
    reader.readAsDataURL(file)
  })
}

function compressImage(
  file: File,
  maxPx = 1568,
  quality = 0.80
): Promise<{ base64: string; mediaType: 'image/jpeg' | 'image/webp' }> {
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

      // Try WebP first (smaller payload, same quality), fall back to JPEG
      const tryFormat = (format: 'image/webp' | 'image/jpeg') => {
        canvas.toBlob(
          (blob) => {
            if (!blob && format === 'image/webp') {
              // Browser doesn't support WebP encoding — fall back to JPEG
              tryFormat('image/jpeg')
              return
            }
            if (!blob) { reject(new Error('compression failed')); return }
            const reader = new FileReader()
            reader.onloadend = () => {
              const result = reader.result as string
              const mediaType = format === 'image/webp' ? 'image/webp' as const : 'image/jpeg' as const
              resolve({ base64: result.split(',')[1], mediaType })
            }
            reader.readAsDataURL(blob)
          },
          format,
          quality
        )
      }
      tryFormat('image/webp')
    }
    img.onerror = () => {
      // Browser can't decode this format (e.g. HEIC on Chrome) — send raw bytes
      URL.revokeObjectURL(url)
      if (!CLAUDE_ACCEPTED_TYPES.includes(file.type)) {
        reject(new Error('Format non supporté. Utilisez JPEG, PNG ou WebP.'))
        return
      }
      readFileAsBase64(file).then(resolve).catch(reject)
    }
    img.src = url
  })
}

// ── Receipt image preprocessing ───────────────────────────────────────────────
// Converts to grayscale, boosts contrast and brightness before JPEG compression.
// Dramatically improves OCR on faded thermal receipts — runs before compressImage.
function preprocessReceiptImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(file); return }
      ctx.filter = 'contrast(1.4) grayscale(1) brightness(1.1)'
      ctx.drawImage(img, 0, 0)
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          resolve(new File([blob], file.name, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        1.0 // full quality — compressImage handles final compression
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

const PART_LABELS = ['Haut du ticket', 'Milieu', 'Bas du ticket']

export default function ScanPage() {
  const ctx = useUserContext()
  const { user, session, location, profile, shoppingListItems } = ctx
  const accessToken = session?.access_token ?? null

  const [step, setStep] = useState<'upload' | 'parsing' | 'results' | 'comparison'>('upload')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  // Alias for parsing step preview (first image)
  const imagePreview = imagePreviews[0] ?? null
  const [parsedReceipt, setParsedReceipt] = useState<ParsedReceipt | null>(null)
  const [comparisons, setComparisons] = useState<ComparisonItem[]>([])
  const [bestStore, setBestStore] = useState<BestStore | null>(null)
  const [dataAsOf, setDataAsOf]   = useState<string | null>(null)
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [parseMessageIdx, setParseMessageIdx] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  // Gamification
  const [xpFloat,       setXpFloat]       = useState<number | null>(null)
  const [levelUpResult, setLevelUpResult] = useState<XPAwardResult | null>(null)
  const gamificationAwarded = useRef(false)

  // Add to list bottom sheet
  const [showAddToListSheet, setShowAddToListSheet] = useState(false)
  const [selectedForList, setSelectedForList] = useState<Set<string>>(new Set())
  const [addingToList, setAddingToList] = useState(false)
  const addToListShownRef = useRef(false)

  // Inline item editing
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState({ name: '', price: '' })

  // Scan quality + manual add-item
  const [lowQualityWarning, setLowQualityWarning] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', price: '' })

  // Micro-interaction states
  const [imageFlash, setImageFlash] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)

  // Timer-driven text cycling: advances parseMessageIdx every 2.5s during parsing
  // so the user sees smooth progress even during long API waits.
  // Real stage transitions from the polling loop still override via Math.max in setStage.
  useEffect(() => {
    if (step !== 'parsing') return
    const timer = setInterval(() => {
      setParseMessageIdx(i => (i < PARSE_MESSAGES.length - 1 ? i + 1 : i))
    }, 2500)
    return () => clearInterval(timer)
  }, [step])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Location gate
  const [postcode, setPostcode] = useState<string | null>(null)
  const [userCoords, setUserCoords] = useState<Coords | null>(null)
  const [locationReady, setLocationReady] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      const raw = localStorage.getItem('basket_postcode_cached')
      if (!raw) return false
      const parsed = JSON.parse(raw)
      return !!(parsed.postcode && Date.now() < parsed.expires)
    } catch { return false }
  })

  // Redirect if not authenticated
  useEffect(() => {
    if (!ctx.loading && !user) window.location.href = '/login'
  }, [ctx.loading, user])

  // Listen for offline receipt sync completions from service worker
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) return
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'receipt-synced') {
        toast.success('Votre ticket a été analysé avec succès !', { duration: 4000 })
      }
    }
    navigator.serviceWorker.addEventListener('message', handler)
    // Safari/iOS fallback: replay on reconnect (no Background Sync API)
    const onOnline = () => navigator.serviceWorker.controller?.postMessage('replayReceipts')
    window.addEventListener('online', onOnline)
    return () => {
      navigator.serviceWorker.removeEventListener('message', handler)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  // Seed postcode/coords from context location
  useEffect(() => {
    if (location) {
      setPostcode(location.postcode ?? profile?.postcode ?? null)
      if (location.lat && location.lon) setUserCoords({ lat: location.lat, lon: location.lon })
    }
  }, [location, profile])

  // Auto-open camera on mobile (skips the choose-screen friction)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 768
    if (!isMobile) return
    const timer = setTimeout(() => {
      cameraInputRef.current?.click()
    }, 350) // short delay so the page renders first
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // only on initial mount

  // Auto-show "add to list" sheet 1.5s after comparison step
  useEffect(() => {
    if (step !== 'comparison' || addToListShownRef.current) return
    const timer = setTimeout(() => {
      const unlistedItems = parsedReceipt?.items.filter(item =>
        !shoppingListItems.some(li =>
          li.item_name_normalised === normalizeProductName(item.name) ||
          li.item_name.toLowerCase().trim() === item.name.toLowerCase().trim()
        )
      ) ?? []
      if (unlistedItems.length > 0) {
        setShowAddToListSheet(true)
        addToListShownRef.current = true
      }
    }, 1500)
    return () => clearTimeout(timer)
  }, [step, parsedReceipt, shoppingListItems])

  // Parse message index is now driven by actual scan stages (set in handleSubmit),
  // no longer cycled on a timer.

  const addImageFile = (file: File) => {
    if (imageFiles.length >= 3) return
    setError('')
    setImageFlash(true)
    setTimeout(() => setImageFlash(false), 600)
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Format non supporté', { description: 'Veuillez sélectionner une image.' })
      e.target.value = ''; return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fichier trop volumineux', { description: 'Taille maximale : 10 Mo.' })
      e.target.value = ''; return
    }
    // Layer 3: aspect ratio preflight — receipts are portrait.
    // A strongly landscape image (width > 2× height) is almost certainly not a receipt.
    await new Promise<void>(resolve => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        if (img.width > img.height * 2) {
          toast.warning('Photo en paysage détectée', {
            description: 'Les tickets de caisse sont en portrait. Retournez votre téléphone et reprenez la photo.',
          })
        }
        resolve()
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve() }
      img.src = url
    })
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
    haptic()
    setStep('parsing')
    setParseMessageIdx(0)
    setScanProgress(0)
    setError('')
    gamificationAwarded.current = false

    const setStage = (stage: number, progress: number) => {
      setParseMessageIdx(i => Math.max(i, stage))
      setScanProgress(progress)
    }
    const clearProgress = () => setScanProgress(100)

    try {
      // Stage 0: "Compression de l'image…"
      setStage(0, 5)

      const preprocessed = await Promise.all(imageFiles.map(f => preprocessReceiptImage(f)))

      // Fire-and-forget: upload original to storage
      const primaryFile = imageFiles[0]
      const fileName = `${user.id}/${Date.now()}-${primaryFile.name}`
      void supabase.storage.from('receipts').upload(fileName, primaryFile).catch(() => {})

      const compressed = await Promise.all(preprocessed.map(f => compressImage(f)))

      // Stage 1: "Analyse par l'IA…"
      setStage(1, 25)

      // ── Single synchronous call — returns EVERYTHING ──────────────────
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          images: compressed.map(c => ({ image_base64: c.base64, media_type: c.mediaType })),
          postcode: postcode || null,
        }),
        signal: AbortSignal.timeout(55000),
      })

      if (!response.ok) {
        const errBody = await response.json().catch(() => null)
        throw new Error(errBody?.error ?? 'Erreur analyse du ticket')
      }

      const result: ScanResult = await response.json()

      // Stage 3: "Calcul de vos économies…"
      setStage(3, 85)

      // ── Handle complete result ────────────────────────────────────────
      const parsed: ParsedReceipt = result
      setParsedReceipt(parsed)
      setReceiptId(result.receipt_id ?? null)
      setComparisons(result.comparisons || [])
      setBestStore(result.best_store || null)
      if (result.data_as_of) setDataAsOf(result.data_as_of)

      if (!parsed.items || parsed.items.length === 0) {
        setLowQualityWarning(true)
        clearProgress()
        setStep('comparison')
        return
      }

      const qualityWarning = result.quality_warning === true
      const avgConf = parsed.items.reduce((s, i) => s + (i.confidence ?? 1), 0) / parsed.items.length
      setLowQualityWarning(qualityWarning || parsed.items.length < 3 || avgConf < 0.5)

      const storeChain = normalizeStoreChain(parsed.store_name)

      // Fire-and-forget: log unknown store
      if (!isKnownStore(parsed.store_name) && accessToken) {
        void fetch('/api/log-unknown-store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ raw_name: parsed.store_name, lat: userCoords?.lat ?? null, lon: userCoords?.lon ?? null }),
        }).catch(() => {})
      }

      // Fire-and-forget: learn receipt format
      if (accessToken && parsed.items.length > 0) {
        void fetch('/api/learn-receipt-format', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ store_chain: storeChain, sample_items: parsed.items.slice(0, 15).map(i => i.name) }),
        }).catch(() => {})
      }

      clearProgress()
      setStep('comparison')

      const savings = result.total_savings ?? 0
      if (savings > 5) setTimeout(() => setShowConfetti(true), 300)
      void awardScanXP(savings, storeChain)
      emit('receipt:scanned', { storeChain, savings, itemCount: parsed.items.length })
      void ctx.refresh(['recentStores', 'profile'])
    } catch (err) {
      clearProgress()
      const isAbort = err instanceof DOMException && err.name === 'AbortError'
      const msg = isAbort
        ? 'La connexion a mis trop de temps. Vérifiez votre réseau et réessayez.'
        : err instanceof Error ? err.message : 'Une erreur est survenue'
      setError(msg)
      setStep('upload')
    }
  }

  const totalSavings = comparisons.reduce((sum, item) => sum + Math.max(0, item.savings), 0)
  const animatedSavings = useCountUp(totalSavings)

  const addToList = async (itemName: string) => {
    if (!user) return
    await supabase.from('shopping_list_items').upsert(
      { user_id: user.id, item_name: itemName, item_name_normalised: normalizeProductName(itemName) },
      { onConflict: 'user_id,item_name_normalised' }
    )
    emit('list:updated', { count: shoppingListItems.length + 1 })
    void ctx.refresh(['shoppingList'])
  }

  const confirmAddToListSheet = async () => {
    if (!user || selectedForList.size === 0) { setShowAddToListSheet(false); return }
    setAddingToList(true)
    await supabase.from('shopping_list_items').upsert(
      Array.from(selectedForList).map(name => ({
        user_id: user.id,
        item_name: name,
        item_name_normalised: normalizeProductName(name),
      })),
      { onConflict: 'user_id,item_name_normalised' }
    )
    emit('list:updated', { count: shoppingListItems.length + selectedForList.size })
    void ctx.refresh(['shoppingList'])
    setShowAddToListSheet(false)
    setSelectedForList(new Set())
    setAddingToList(false)
    toast.success(`${selectedForList.size} article${selectedForList.size > 1 ? 's' : ''} ajouté${selectedForList.size > 1 ? 's' : ''} à votre liste`)
  }

  const watchItem = async (itemName: string, price: number) => {
    if (!user) return
    await supabase.from('price_watches').upsert(
      {
        user_id: user.id,
        item_name: itemName,
        item_name_normalised: normalizeProductName(itemName),
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
      }).catch(() => {})
    }
  }

  const handleShare = (method: 'whatsapp' | 'copy' | 'sms') => {
    const levelTitle = levelUpResult?.new_title ?? null
    const levelNum   = levelUpResult?.new_level ?? null
    const levelLine  = levelTitle && levelNum ? `\nNiveau ${levelNum} — ${levelTitle}` : ''
    const text = `🧺 Basket m'a trouvé ${totalSavings.toFixed(2)} € d'économies possibles !${levelLine}\n\nJ'ai scanné mon ticket ${parsedReceipt?.store_name || ''} et découvert que je pouvais payer moins ailleurs.\n\nEssaie aussi → basketbeta.com`
    if (method === 'whatsapp') window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    if (method === 'copy') navigator.clipboard.writeText(text).catch(() => {})
    if (method === 'sms') window.open(`sms:?body=${encodeURIComponent(text)}`, '_blank')
    // Award share XP (fire-and-forget, capped once per session by the server's dedup)
    if (accessToken) {
      void fetch('/api/gamification/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ reason: 'share_result' }),
      }).catch(() => {})
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

              {/* Footer visibility reminder */}
              <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl mb-4" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <span className="text-amber-500 text-sm flex-shrink-0 mt-0.5">&#9888;&#65039;</span>
                <p className="text-[11px] leading-relaxed text-graphite/55">
                  Assurez-vous que le <span className="font-semibold text-graphite/75">bas du ticket</span> (SIRET et code postal) est bien visible pour localiser le magasin.
                </p>
              </div>

              {/* Thumbnails of added photos */}
              {imagePreviews.length > 0 && (
                <div className="space-y-2 mb-4">
                  {imagePreviews.map((preview, idx) => (
                    <motion.div key={idx}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="relative rounded-2xl overflow-hidden flex items-center gap-3 p-3 transition-all"
                      style={{
                        background: 'rgba(17,17,17,0.04)',
                        border: imageFlash && idx === imagePreviews.length - 1
                          ? '1px solid #7ed957'
                          : '1px solid rgba(17,17,17,0.08)',
                        boxShadow: imageFlash && idx === imagePreviews.length - 1
                          ? '0 0 12px rgba(126,217,87,0.25)' : 'none',
                      }}>
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
                    onClick={() => { haptic(30); cameraInputRef.current?.click() }}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className="w-full rounded-3xl p-6 flex items-center gap-4 transition-shadow lg:hover:shadow-lg"
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
                  onClick={() => { haptic(50); handleScan() }}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="w-full h-14 rounded-2xl font-bold text-white text-base mb-2 overflow-hidden relative transition-shadow lg:hover:shadow-[0_0_24px_rgba(126,217,87,0.25)]"
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
                <motion.div
                  className="relative w-44 rounded-2xl overflow-hidden mb-8"
                  style={{ border: '1px solid rgba(17,17,17,0.1)' }}
                  animate={{ boxShadow: ['0 12px 40px rgba(126,217,87,0)', '0 12px 40px rgba(126,217,87,0.25)', '0 12px 40px rgba(126,217,87,0)'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
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
                </motion.div>
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

              {/* Progress bar */}
              <div className="w-48 h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(17,17,17,0.07)' }}>
                <motion.div className="h-full rounded-full" style={{ background: '#7ed957' }}
                  animate={{ width: `${scanProgress}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }} />
              </div>
              <p className="text-graphite/35 text-xs">
                {Math.round(scanProgress)} % · Cela prend généralement 5–10 secondes
              </p>
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
                  <motion.p className="text-5xl font-extrabold mb-1"
                    style={{ color: totalSavings > 0 ? '#00D09C' : '#111111', fontVariantNumeric: 'tabular-nums' }}
                    animate={totalSavings === 0 && step === 'comparison' ? { x: [0, -5, 5, -5, 5, 0] } : {}}
                    transition={{ duration: 0.4, delay: 0.5 }}>
                    {totalSavings > 0 ? `${animatedSavings.toFixed(2)} €` : '—'}
                  </motion.p>
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
                {parsedReceipt.store_address && (
                  <p className="text-xs text-graphite/50 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {parsedReceipt.store_address}
                  </p>
                )}
                <p className="text-xs text-graphite/40 mt-0.5">{parsedReceipt.items.length} articles détectés</p>
              </div>

              {/* No items detected — retry prompt */}
              {parsedReceipt.items.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl px-5 py-4 mb-4 text-center"
                  style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
                >
                  <p className="text-sm font-semibold text-graphite/70 mb-1">Aucun article détecté</p>
                  <p className="text-xs text-graphite/50 mb-3">La photo est peut-être floue ou mal cadrée. Assurez-vous que les articles et prix sont bien lisibles.</p>
                  <button
                    onClick={() => { setStep('upload'); setError(''); setImageFiles([]); setImagePreviews([]) }}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-white"
                    style={{ background: '#111' }}
                  >
                    Réessayer
                  </button>
                </motion.div>
              )}

              {/* Items */}
              <div className="space-y-2 mb-5">
                {/* Low-quality photo warning */}
                {step === 'comparison' && lowQualityWarning && (
                  <div className="rounded-xl px-4 py-3 mb-2 flex items-start gap-2"
                    style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                    <span className="text-amber-500 text-sm flex-shrink-0">📷</span>
                    <p className="text-xs text-graphite/70 leading-relaxed">
                      La qualité de la photo semble faible. Essayez de scanner à nouveau avec plus de lumière.{' '}
                      <button onClick={() => setStep('upload')} className="underline font-semibold">Reprendre</button>
                    </p>
                  </div>
                )}

                {/* No data banner */}
                {step === 'comparison' && comparisons.length > 0 && comparisons.every(c => c.sample_count === 0) && (
                  <div className="rounded-xl px-4 py-3 mb-2 flex items-start gap-2"
                    style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <span className="text-amber-500 text-sm flex-shrink-0">⚠</span>
                    <p className="text-xs text-graphite/60 leading-relaxed">
                      Pas encore assez de données pour ces produits dans votre secteur — revenez dans quelques jours !
                    </p>
                  </div>
                )}

                {parsedReceipt.items.map((item, idx) => {
                  const comparison = comparisons.find((c) => c.name.toLowerCase() === item.name.toLowerCase())
                  const hasSaving = comparison && comparison.savings > 0.01
                  const isEditing = editingIdx === idx
                  const lowConfidence = (item.confidence ?? 1) < 0.7
                  const veryLowConfidence = (item.confidence ?? 1) < 0.5
                  const isOnList = shoppingListItems.some(li =>
                    li.item_name_normalised === normalizeProductName(item.name) ||
                    li.item_name.toLowerCase().trim() === item.name.toLowerCase().trim()
                  )

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
                            background: hasSaving ? 'rgba(0,208,156,0.06)' : veryLowConfidence ? 'rgba(245,158,11,0.05)' : 'rgba(17,17,17,0.04)',
                            border: hasSaving ? '1px solid rgba(0,208,156,0.2)' : '1px solid rgba(17,17,17,0.06)',
                            borderLeft: hasSaving ? '3px solid #00D09C' : veryLowConfidence ? '3px solid #F59E0B' : undefined,
                          }}
                        >
                          <div className="flex-1 min-w-0 pr-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-graphite truncate">{item.name}</p>
                              {lowConfidence && step === 'comparison' && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
                                  style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                                  ⚠ à vérifier
                                </span>
                              )}
                              {isOnList && step === 'comparison' && (
                                <span className="flex-shrink-0"
                                  style={{ background: 'rgba(126,217,87,0.15)', color: '#7ed957', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
                                  ✓ Sur votre liste
                                </span>
                              )}
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
                              <p className="text-xs mt-0.5 flex items-center gap-1"
                                style={{ color: comparison && comparison.sample_count === 0 ? 'rgba(17,17,17,0.25)' : 'rgba(17,17,17,0.35)' }}>
                                {comparison && comparison.sample_count === 0 ? '— Pas de données' : (
                                  <><CheckCircle2 className="w-3 h-3" style={{ color: '#00D09C' }} /> Bon prix</>
                                )}
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

                {/* Add missing item */}
                {step === 'comparison' && (
                  showAddItem ? (
                    <div className="rounded-xl px-4 py-3 glass mt-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-graphite/40 mb-2">Nouvel article</p>
                      <input
                        value={newItem.name}
                        onChange={e => setNewItem(n => ({ ...n, name: e.target.value }))}
                        placeholder="Nom de l'article"
                        className="w-full rounded-lg px-3 py-2 text-sm mb-2 outline-none"
                        style={{ background: 'rgba(17,17,17,0.05)', border: '1px solid rgba(17,17,17,0.1)' }}
                      />
                      <div className="flex gap-2 items-center mb-3">
                        <input
                          value={newItem.price}
                          onChange={e => setNewItem(n => ({ ...n, price: e.target.value }))}
                          type="number" step="0.01" min="0" placeholder="0.00"
                          className="w-24 rounded-lg px-3 py-2 text-sm outline-none"
                          style={{ background: 'rgba(17,17,17,0.05)', border: '1px solid rgba(17,17,17,0.1)' }}
                        />
                        <span className="text-xs text-graphite/40">€</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (!newItem.name.trim()) return
                            const price = parseFloat(newItem.price) || 0
                            setParsedReceipt(r => r ? {
                              ...r,
                              items: [...r.items, { name: newItem.name.trim(), price, quantity: 1, is_promo: false, is_private_label: false }],
                            } : r)
                            setNewItem({ name: '', price: '' })
                            setShowAddItem(false)
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                          style={{ background: '#111' }}
                        >
                          Ajouter
                        </button>
                        <button
                          onClick={() => setShowAddItem(false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold glass"
                          style={{ color: 'rgba(17,17,17,0.5)' }}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddItem(true)}
                      className="w-full py-2.5 rounded-xl text-xs font-semibold glass flex items-center justify-center gap-1.5 mt-2"
                      style={{ color: 'rgba(17,17,17,0.45)' }}
                    >
                      <Plus className="w-3.5 h-3.5" /> Ajouter un article manquant
                    </button>
                  )
                )}
              </div>

              {/* Price date disclaimer */}
              {step === 'comparison' && dataAsOf && (
                <p className="text-[10px] text-graphite/35 text-center mb-3 font-mono">
                  Prix mis à jour le {dataAsOf} · À titre indicatif, les prix peuvent varier selon les magasins.
                </p>
              )}

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

      {/* "Ajouter à ma liste" bottom sheet */}
      <AnimatePresence>
        {showAddToListSheet && parsedReceipt && (
          <>
            <motion.div
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(10,10,10,0.5)', backdropFilter: 'blur(4px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddToListSheet(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl px-5 pt-5 pb-10"
              style={{ background: '#fafaf8', maxHeight: '70dvh', overflowY: 'auto' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-extrabold text-base text-graphite">Ajouter à ma liste</p>
                  <p className="text-xs text-graphite/50 mt-0.5">Articles non encore sur votre liste</p>
                </div>
                <button onClick={() => setShowAddToListSheet(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(17,17,17,0.06)' }}>
                  <X className="w-4 h-4 text-graphite/50" />
                </button>
              </div>

              <div className="space-y-2 mb-5">
                {parsedReceipt.items
                  .filter(item => !shoppingListItems.some(li =>
                    li.item_name_normalised === normalizeProductName(item.name) ||
                    li.item_name.toLowerCase().trim() === item.name.toLowerCase().trim()
                  ))
                  .map((item, idx) => {
                    const selected = selectedForList.has(item.name)
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedForList(prev => {
                            const next = new Set(prev)
                            if (next.has(item.name)) next.delete(item.name)
                            else next.add(item.name)
                            return next
                          })
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                        style={{
                          background: selected ? 'rgba(126,217,87,0.1)' : 'rgba(17,17,17,0.04)',
                          border: selected ? '1px solid rgba(126,217,87,0.35)' : '1px solid rgba(17,17,17,0.07)',
                        }}
                      >
                        <div className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center"
                          style={{ background: selected ? '#7ed957' : 'rgba(17,17,17,0.08)' }}>
                          {selected && <Check className="w-3 h-3 text-graphite" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-graphite truncate">{item.name}</p>
                        </div>
                        <p className="text-sm font-bold text-graphite/50 flex-shrink-0">{item.price.toFixed(2)} €</p>
                      </button>
                    )
                  })}
              </div>

              <motion.button
                onClick={confirmAddToListSheet}
                disabled={selectedForList.size === 0 || addingToList}
                className="w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
                style={{
                  background: selectedForList.size > 0 ? '#111' : 'rgba(17,17,17,0.08)',
                  color: selectedForList.size > 0 ? '#fff' : 'rgba(17,17,17,0.3)',
                }}
                whileTap={selectedForList.size > 0 ? { scale: 0.97 } : {}}
              >
                <ShoppingCart className="w-4 h-4" />
                {selectedForList.size === 0
                  ? 'Sélectionnez des articles'
                  : `Ajouter ${selectedForList.size} article${selectedForList.size > 1 ? 's' : ''}`}
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomNav active="scan" />
    </div>
  )
}
