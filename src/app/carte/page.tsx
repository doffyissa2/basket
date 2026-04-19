'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import BottomNav from '@/components/BottomNav'
import { useUserContext } from '@/lib/user-context'
import type { StorePin } from '@/app/api/price-map/route'

const MapWithNoSSR = dynamic(() => import('@/components/MapClient'), {
  ssr: false,
  loading: () => (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: '#7ed957', borderTopColor: 'transparent' }} />
    </div>
  ),
})

const TIER_COLORS: Record<string, string> = { cheap: '#7ed957', mid: '#F59E0B', expensive: '#9CA3AF' }
const TIER_LABELS: Record<string, string> = { cheap: 'Données locales', mid: 'Données nationales', expensive: 'Peu de données' }

export default function CartePage() {
  const { user, session, location, recentStores, loading: ctxLoading } = useUserContext()
  const [visibleStores, setVisibleStores] = useState<StorePin[]>([])
  const [selectedStore, setSelectedStore] = useState<StorePin | null>(null)

  useEffect(() => {
    if (!ctxLoading && !user) window.location.href = '/login'
  }, [ctxLoading, user])

  const onVisibleChange = useCallback((stores: StorePin[]) => setVisibleStores(stores), [])
  const onStoreSelect = useCallback((pin: StorePin | null) => setSelectedStore(pin), [])

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

  // Show top 50 stores sorted by data quality for desktop sidebar
  const sidebarStores = visibleStores
    .slice(0, 50)
    .sort((a, b) => {
      const tierOrder = { cheap: 0, mid: 1, expensive: 2 }
      return (tierOrder[a.price_tier] ?? 2) - (tierOrder[b.price_tier] ?? 2)
    })

  return (
    <div style={{ height: '100dvh', background: '#111', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Desktop: side-by-side layout. Mobile: map only. */}
      <div className="flex flex-1 min-h-0">
        {/* Map — full on mobile, left pane on desktop */}
        <div className="flex-1 relative min-h-0">
          <MapWithNoSSR
            userCoords={userCoords}
            accessToken={session?.access_token ?? null}
            visitedChains={recentStores}
            onVisibleStoresChange={onVisibleChange}
            onStoreSelect={onStoreSelect}
          />
        </div>

        {/* Desktop sidebar — hidden on mobile, visible on lg+ */}
        <aside className="hidden lg:flex flex-col w-[380px] border-l border-white/[0.06] bg-[#141414]">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Magasins visibles</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">{visibleStores.length.toLocaleString()} résultats</p>
            </div>
            {selectedStore && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(126,217,87,0.1)', color: '#7ed957' }}>
                {selectedStore.store_name}
              </span>
            )}
          </div>

          {/* Store list */}
          <div className="flex-1 overflow-y-auto">
            {sidebarStores.length === 0 ? (
              <p className="text-gray-500 text-xs text-center py-12">Zoomez sur la carte pour voir les magasins</p>
            ) : sidebarStores.map((pin, i) => {
              const isSelected = selectedStore && pin.lat === selectedStore.lat && pin.lon === selectedStore.lon
              return (
                <div key={`${pin.store_chain}-${pin.lat}-${pin.lon}`}
                  className="px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-default"
                  style={isSelected ? { background: 'rgba(126,217,87,0.06)' } : undefined}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: TIER_COLORS[pin.price_tier] ?? '#9CA3AF' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-white truncate">{pin.store_name}</p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {pin.city ?? pin.address ?? TIER_LABELS[pin.price_tier]}
                        {pin.item_count > 0 && <span className="text-gray-600"> · {pin.item_count} prix</span>}
                      </p>
                    </div>
                    {pin.avg_price != null && (
                      <span className="text-xs font-bold flex-shrink-0"
                        style={{ color: TIER_COLORS[pin.price_tier] }}>
                        {pin.avg_price.toFixed(2)} €
                      </span>
                    )}
                  </div>

                  {/* Top staple items */}
                  {pin.top_items.length > 0 && (
                    <div className="mt-2 ml-5 flex flex-wrap gap-1.5">
                      {pin.top_items.slice(0, 3).map((item, j) => (
                        <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-gray-400">
                          {item.name.length > 20 ? item.name.slice(0, 20) + '…' : item.name} · {item.avg_price.toFixed(2)}€
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </aside>
      </div>
      <BottomNav active="carte" />
    </div>
  )
}
