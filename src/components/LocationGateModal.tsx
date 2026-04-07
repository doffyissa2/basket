'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Coords { lat: number; lon: number }

interface LocationGateModalProps {
  userId: string
  onComplete: (postcode: string, coords?: Coords) => void
}

type Status = 'initial' | 'requesting' | 'geocoding' | 'manual' | 'error'

export default function LocationGateModal({ userId, onComplete }: LocationGateModalProps) {
  const [status, setStatus] = useState<Status>('initial')
  const [manualPostcode, setManualPostcode] = useState('')
  const [manualError, setManualError] = useState('')

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setStatus('manual')
      return
    }
    setStatus('requesting')

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setStatus('geocoding')
        const { latitude: lat, longitude: lon } = pos.coords
        try {
          const res = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lon}`)
          const data = await res.json()
          if (data.postcode) {
            await supabase.from('profiles').update({ postcode: data.postcode }).eq('id', userId)
            onComplete(data.postcode, { lat, lon })
          } else {
            setStatus('manual')
          }
        } catch {
          setStatus('manual')
        }
      },
      () => {
        // Permission denied or error → fallback to manual
        setStatus('manual')
      },
      { timeout: 10000, enableHighAccuracy: false }
    )
  }

  const confirmManual = async () => {
    const cleaned = manualPostcode.trim()
    if (!/^\d{5}$/.test(cleaned)) {
      setManualError('Code postal invalide (5 chiffres requis)')
      return
    }
    setManualError('')
    await supabase.from('profiles').update({ postcode: cleaned }).eq('id', userId)
    onComplete(cleaned)
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center px-6"
      style={{ background: 'rgba(10,10,10,0.97)' }}
    >
      <AnimatePresence mode="wait">
        {(status === 'initial' || status === 'error') && (
          <motion.div
            key="initial"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="flex flex-col items-center text-center max-w-xs w-full"
          >
            <motion.div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
              style={{ background: 'rgba(224,122,95,0.15)', border: '1px solid rgba(224,122,95,0.3)' }}
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <MapPin className="w-9 h-9 text-[#E07A5F]" />
            </motion.div>

            <h2 className="text-2xl font-extrabold text-white mb-2">Où faites-vous vos courses ?</h2>
            <p className="text-sm text-[#6B7280] leading-relaxed mb-8">
              Votre position nous aide à comparer les prix dans votre secteur et à vous trouver les meilleures offres à proximité.
            </p>

            <motion.button
              onClick={requestLocation}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full h-14 rounded-2xl font-bold text-white text-base mb-3"
              style={{ background: '#E07A5F', boxShadow: '0 8px 24px rgba(224,122,95,0.35)' }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              Utiliser ma position
            </motion.button>

            <button
              onClick={() => setStatus('manual')}
              className="text-sm text-[#6B7280] hover:text-white transition-colors py-2"
            >
              Saisir mon code postal manuellement
            </button>
          </motion.div>
        )}

        {(status === 'requesting' || status === 'geocoding') && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center text-center"
          >
            <Loader2 className="w-12 h-12 text-[#E07A5F] animate-spin mb-4" />
            <p className="text-base font-semibold text-white">
              {status === 'requesting' ? 'Détection en cours...' : 'Recherche du code postal...'}
            </p>
            <p className="text-sm text-[#4B5563] mt-2">Un instant...</p>
          </motion.div>
        )}

        {status === 'manual' && (
          <motion.div
            key="manual"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="flex flex-col items-center text-center max-w-xs w-full"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: 'rgba(224,122,95,0.12)', border: '1px solid rgba(224,122,95,0.25)' }}
            >
              <MapPin className="w-7 h-7 text-[#E07A5F]" />
            </div>

            <h2 className="text-xl font-extrabold text-white mb-2">Votre code postal</h2>
            <p className="text-sm text-[#6B7280] mb-6">Saisissez votre code postal pour localiser les prix de votre secteur.</p>

            <input
              type="text"
              inputMode="numeric"
              pattern="\d{5}"
              maxLength={5}
              placeholder="75001"
              value={manualPostcode}
              onChange={(e) => {
                setManualPostcode(e.target.value.replace(/\D/g, ''))
                setManualError('')
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmManual() }}
              className="w-full h-14 rounded-2xl text-center text-xl font-bold text-white placeholder-[#4B5563] outline-none mb-3"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: manualError ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(255,255,255,0.12)',
                caretColor: '#E07A5F',
              }}
              autoFocus
            />

            {manualError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-xs text-red-400 mb-3"
              >
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {manualError}
              </motion.div>
            )}

            <motion.button
              onClick={confirmManual}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full h-14 rounded-2xl font-bold text-white text-base"
              style={{ background: '#E07A5F' }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              Confirmer
            </motion.button>

            <button
              onClick={() => setStatus('initial')}
              className="text-sm text-[#4B5563] hover:text-[#6B7280] transition-colors py-3 mt-1"
            >
              Retour
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
