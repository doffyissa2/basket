'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { ArrowLeft, Map } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

const MapWithNoSSR = dynamic(() => import('@/components/MapClient'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center" style={{ background: '#111' }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#7ed957', borderTopColor: 'transparent' }} />
    </div>
  ),
})

interface Coords { lat: number; lon: number }

function getCachedCoords(): Coords | null {
  try {
    const raw = localStorage.getItem('basket_postcode_cached')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed.coords && Date.now() < parsed.expires) return parsed.coords
  } catch { /* ignore */ }
  return null
}

export default function CartePage() {
  const [authed, setAuthed] = useState(false)
  const [userCoords, setUserCoords] = useState<Coords | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      setAuthed(true)
    })
    setUserCoords(getCachedCoords())
  }, [])

  if (!authed) {
    return (
      <div className="min-h-[100dvh] bg-paper flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#7ed957', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col text-graphite pb-20 md:pb-0 overflow-hidden" style={{ height: '100dvh', background: '#E8E4DD' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 pt-14 pb-4 flex-shrink-0 bg-paper"
        style={{ borderBottom: '1px solid rgba(17,17,17,0.08)' }}
      >
        <motion.a
          href="/dashboard"
          whileTap={{ scale: 0.9 }}
          className="w-9 h-9 rounded-full flex items-center justify-center glass"
        >
          <ArrowLeft className="w-4 h-4 text-graphite/50" />
        </motion.a>
        <div className="flex items-center gap-2 flex-1">
          <Map className="w-4 h-4" style={{ color: '#7ed957' }} />
          <h1 className="font-bold text-base text-graphite">Carte des prix</h1>
        </div>
        <p className="text-xs text-graphite/35">Données communautaires</p>
      </div>

      {/* Map fills remaining space */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <MapWithNoSSR userCoords={userCoords} />
      </div>

      <BottomNav active="carte" />
    </div>
  )
}
