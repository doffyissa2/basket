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
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: '#7ed957', borderTopColor: 'transparent' }} />
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
  const [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setAccessToken(session.access_token)
      setAuthed(true)
    })
    setUserCoords(getCachedCoords())
  }, [])

  if (!authed) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#111' }}>
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#7ed957', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col text-white pb-20 md:pb-0 overflow-hidden"
      style={{ height: '100dvh', background: '#111' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 flex-shrink-0"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 16px)',
          paddingBottom: 12,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: '#111',
        }}>
        <motion.a href="/dashboard" whileTap={{ scale: 0.9 }}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.08)' }}>
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </motion.a>
        <div className="flex items-center gap-2 flex-1">
          <Map className="w-4 h-4" style={{ color: '#7ed957' }} />
          <h1 className="font-bold text-base text-white">Carte des prix</h1>
        </div>
        <p className="text-[11px] text-white/30">Données cartographiques</p>
      </div>

      {/* Map fills remaining space */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <MapWithNoSSR userCoords={userCoords} accessToken={accessToken} />
      </div>

      <BottomNav active="carte" />
    </div>
  )
}
