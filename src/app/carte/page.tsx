'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import BottomNav from '@/components/BottomNav'
import { useUserContext } from '@/lib/user-context'

const MapWithNoSSR = dynamic(() => import('@/components/MapClient'), {
  ssr: false,
  loading: () => (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: '#7ed957', borderTopColor: 'transparent' }} />
    </div>
  ),
})

export default function CartePage() {
  const { user, session, location, recentStores, loading: ctxLoading } = useUserContext()

  useEffect(() => {
    if (!ctxLoading && !user) window.location.href = '/login'
  }, [ctxLoading, user])

  if (ctxLoading || !user) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#111' }}>
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#7ed957', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const userCoords = location?.lat && location?.lon
    ? { lat: location.lat, lon: location.lon }
    : null

  return (
    <div style={{ height: '100dvh', background: '#111', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <MapWithNoSSR
          userCoords={userCoords}
          accessToken={session?.access_token ?? null}
          visitedChains={recentStores}
        />
      </div>
      <BottomNav active="carte" />
    </div>
  )
}
