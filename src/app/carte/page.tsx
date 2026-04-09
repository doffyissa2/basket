'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

const MapWithNoSSR = dynamic(() => import('@/components/MapClient'), {
  ssr: false,
  loading: () => (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
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
    <div style={{ height: '100dvh', background: '#111', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <MapWithNoSSR userCoords={userCoords} accessToken={accessToken} />
      </div>
      <BottomNav active="carte" />
    </div>
  )
}
