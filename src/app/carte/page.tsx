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
      <div className="w-8 h-8 rounded-full border-2 border-[#E07A5F] border-t-transparent animate-spin" />
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
      <div className="min-h-[100dvh] bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[#E07A5F] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#0A0A0A] text-white pb-20 md:pb-0">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 pt-14 pb-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <motion.a
          href="/dashboard"
          whileTap={{ scale: 0.9 }}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.07)' }}
        >
          <ArrowLeft className="w-4 h-4 text-[#6B7280]" />
        </motion.a>
        <div className="flex items-center gap-2 flex-1">
          <Map className="w-4 h-4 text-[#E07A5F]" />
          <h1 className="font-bold text-base">Carte des prix</h1>
        </div>
        <p className="text-xs text-[#4B5563]">Données communautaires</p>
      </div>

      {/* Map fills remaining space — explicit height so Leaflet renders correctly */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <MapWithNoSSR userCoords={userCoords} />
      </div>

      <BottomNav active="carte" />
    </div>
  )
}
