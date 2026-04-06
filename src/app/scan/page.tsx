'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { ShoppingBasket, Camera, Upload, ArrowLeft, Loader2, Check, X, Share2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

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
}

export default function ScanPage() {
  const [user, setUser] = useState<User | null>(null)
  const [step, setStep] = useState<'upload' | 'parsing' | 'results' | 'comparison'>('upload')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [parsedReceipt, setParsedReceipt] = useState<ParsedReceipt | null>(null)
  const [comparisons, setComparisons] = useState<ComparisonItem[]>([])
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setUser(user)
    }
    getUser()
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageFile(file)
    setError('')

    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleScan = async () => {
    if (!imageFile || !user) return

    setStep('parsing')
    setError('')

    try {
      // Upload image to Supabase Storage
      const fileName = `${user.id}/${Date.now()}-${imageFile.name}`
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, imageFile)

      if (uploadError) throw new Error('Erreur upload: ' + uploadError.message)

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName)

      // Convert image to base64 for Claude
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          resolve(result.split(',')[1])
        }
        reader.readAsDataURL(imageFile)
      })

      // Send to our API route for Claude parsing
      const parseResponse = await fetch('/api/parse-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: base64,
          media_type: imageFile.type,
        }),
      })

      if (!parseResponse.ok) throw new Error('Erreur analyse du ticket')

      const parsed: ParsedReceipt = await parseResponse.json()
      setParsedReceipt(parsed)

      // Get user postcode
      const { data: profile } = await supabase
        .from('profiles')
        .select('postcode')
        .eq('id', user.id)
        .single()

      // Save receipt to database
      const { data: receiptRow, error: receiptError } = await supabase
        .from('receipts')
        .insert({
          user_id: user.id,
          store_name: parsed.store_name,
          total_amount: parsed.total,
          receipt_date: new Date().toISOString().split('T')[0],
          image_url: publicUrl,
          postcode: profile?.postcode || null,
        })
        .select()
        .single()

      if (receiptError) throw new Error('Erreur sauvegarde: ' + receiptError.message)

      // Save individual items
      const itemsToInsert = parsed.items.map((item) => ({
        receipt_id: receiptRow.id,
        user_id: user.id,
        item_name: item.name,
        item_name_normalised: item.name.toLowerCase().trim(),
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        store_name: parsed.store_name,
        postcode: profile?.postcode || null,
      }))

      await supabase.from('price_items').insert(itemsToInsert)

      setStep('results')

      // Now get price comparisons
      const compareResponse = await fetch('/api/compare-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: parsed.items.map((i) => ({
            name: i.name,
            normalised: i.name.toLowerCase().trim(),
            price: i.price,
          })),
          postcode: profile?.postcode || null,
          store_name: parsed.store_name,
        }),
      })

      if (compareResponse.ok) {
        const comparisonData = await compareResponse.json()
        setComparisons(comparisonData.comparisons || [])
        setStep('comparison')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      setStep('upload')
    }
  }

  const totalSavings = comparisons.reduce((sum, item) => sum + Math.max(0, item.savings), 0)

  const handleShare = () => {
    const text = `🧺 Basket m'a trouvé ${totalSavings.toFixed(2)}€ d'économies possibles cette semaine !\n\nJ'ai scanné mon ticket ${parsedReceipt?.store_name || ''} et découvert que je pouvais payer moins ailleurs.\n\nEssaie aussi → basket.fr`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(whatsappUrl, '_blank')
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-4xl mx-auto">
        <a href="/dashboard" className="flex items-center gap-2 text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </a>
        <div className="flex items-center gap-2">
          <ShoppingBasket className="w-6 h-6 text-[#E07A5F]" strokeWidth={2.5} />
          <span className="text-lg font-bold">Basket</span>
        </div>
        <div className="w-16" />
      </nav>

      <main className="max-w-lg mx-auto px-6 pb-20">
        {/* Upload step */}
        {step === 'upload' && (
          <div>
            <h1 className="text-2xl font-bold mb-2 text-center">Scanner un ticket</h1>
            <p className="text-[#6B6B6B] text-center mb-8 text-sm">
              Prenez en photo ou importez votre ticket de caisse
            </p>

            {imagePreview ? (
              <div className="mb-6">
                <div className="relative rounded-2xl overflow-hidden border border-[#EDECE8]">
                  <img src={imagePreview} alt="Ticket" className="w-full" />
                  <button
                    onClick={() => {
                      setImageFile(null)
                      setImagePreview(null)
                    }}
                    className="absolute top-3 right-3 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <Button
                  onClick={handleScan}
                  className="w-full h-12 mt-4 rounded-xl bg-[#E07A5F] hover:bg-[#C96A52] text-white font-semibold text-base"
                >
                  Analyser ce ticket
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Camera button */}
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full bg-[#E07A5F] text-white rounded-2xl p-8 hover:bg-[#C96A52] transition-all text-center"
                >
                  <Camera className="w-10 h-10 mx-auto mb-3" />
                  <p className="font-bold text-lg">Prendre une photo</p>
                  <p className="text-white/70 text-sm mt-1">Utilisez votre caméra</p>
                </button>

                {/* Upload button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-white text-[#1A1A1A] rounded-2xl p-8 border border-[#EDECE8] hover:shadow-md transition-all text-center"
                >
                  <Upload className="w-10 h-10 mx-auto mb-3 text-[#6B6B6B]" />
                  <p className="font-bold text-lg">Importer une image</p>
                  <p className="text-[#6B6B6B] text-sm mt-1">Depuis votre galerie</p>
                </button>
              </div>
            )}

            {error && (
              <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl mt-4">{error}</p>
            )}

            {/* Hidden file inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* Parsing step */}
        {step === 'parsing' && (
          <div className="text-center py-20">
            <Loader2 className="w-12 h-12 text-[#E07A5F] animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Analyse en cours...</h2>
            <p className="text-[#6B6B6B] text-sm">Notre IA lit votre ticket de caisse</p>
          </div>
        )}

        {/* Results / Comparison step */}
        {(step === 'results' || step === 'comparison') && parsedReceipt && (
          <div>
            {/* Savings banner */}
            {step === 'comparison' && totalSavings > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-6 text-center">
                <p className="text-sm text-emerald-600 font-medium mb-1">Économies possibles</p>
                <p className="text-4xl font-extrabold text-emerald-700">{totalSavings.toFixed(2)} €</p>
                <p className="text-sm text-emerald-600 mt-2">
                  en achetant ces produits ailleurs cette semaine
                </p>
                <Button
                  onClick={handleShare}
                  className="mt-4 bg-[#25D366] hover:bg-[#1DA851] text-white rounded-xl px-6 h-10 text-sm font-semibold"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Partager sur WhatsApp
                </Button>
              </div>
            )}

            {/* Receipt summary */}
            <div className="bg-white rounded-2xl border border-[#EDECE8] p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-lg">{parsedReceipt.store_name}</h2>
                  <p className="text-xs text-[#9B9B9B]">
                    {parsedReceipt.items.length} articles détectés
                  </p>
                </div>
                <p className="text-xl font-bold">{parsedReceipt.total.toFixed(2)} €</p>
              </div>

              <div className="space-y-2">
                {parsedReceipt.items.map((item, idx) => {
                  const comparison = comparisons.find(
                    (c) => c.name.toLowerCase() === item.name.toLowerCase()
                  )
                  const hasSaving = comparison && comparison.savings > 0

                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between py-2.5 px-3 rounded-lg ${
                        hasSaving ? 'bg-emerald-50' : 'bg-[#FAFAF8]'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        {hasSaving && comparison && (
                          <p className="text-xs text-emerald-600">
                            {comparison.avg_price.toFixed(2)} € en moyenne
                            {comparison.cheaper_store && ` chez ${comparison.cheaper_store}`}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-sm font-bold">{item.price.toFixed(2)} €</p>
                        {hasSaving && comparison && (
                          <p className="text-xs font-medium text-emerald-600">
                            -{comparison.savings.toFixed(2)} €
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <a href="/scan" className="flex-1">
                <Button variant="outline" className="w-full h-11 rounded-xl border-[#E0DDD8]">
                  Scanner un autre ticket
                </Button>
              </a>
              <a href="/dashboard" className="flex-1">
                <Button className="w-full h-11 rounded-xl bg-[#E07A5F] hover:bg-[#C96A52] text-white">
                  Tableau de bord
                </Button>
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}