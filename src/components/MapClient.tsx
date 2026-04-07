'use client'

import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { StorePin } from '@/app/api/price-map/route'

// Fix default icon paths (webpack strips them otherwise)
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: '', shadowUrl: '', iconRetinaUrl: '' })

function pinColor(tier: StorePin['price_tier']): string {
  if (tier === 'cheap') return '#00D09C'
  if (tier === 'mid') return '#E07A5F'
  return '#EF4444'
}

function FlyToUser({ coords }: { coords: { lat: number; lon: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (coords) map.flyTo([coords.lat, coords.lon], 12, { duration: 1.5 })
  }, [map, coords])
  return null
}

interface MapClientProps {
  userCoords?: { lat: number; lon: number } | null
  accessToken?: string | null
}

export default function MapClient({ userCoords, accessToken }: MapClientProps) {
  const [pins, setPins] = useState<StorePin[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('Tous')

  useEffect(() => {
    if (!accessToken) return
    fetch('/api/price-map', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => setPins(d.pins ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [accessToken])

  const chains = useMemo(() => {
    const set = new Set(pins.map((p) => p.store_chain))
    return ['Tous', ...Array.from(set).sort()]
  }, [pins])

  const visible = filter === 'Tous' ? pins : pins.filter((p) => p.store_chain === filter)

  return (
    <div className="flex flex-col h-full">
      {/* Filter chips */}
      <div
        className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {chains.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-colors"
            style={
              filter === c
                ? { background: '#E07A5F', color: '#fff' }
                : { background: 'rgba(255,255,255,0.07)', color: '#6B7280' }
            }
          >
            {c}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {([['cheap', '#00D09C', 'Moins cher'], ['mid', '#E07A5F', 'Prix moyen'], ['expensive', '#EF4444', 'Plus cher']] as const).map(([, color, label]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-[10px] text-[#6B7280]">{label}</span>
          </div>
        ))}
        <span className="ml-auto text-[10px] text-[#4B5563]">{visible.length} enseignes</span>
      </div>

      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: 'rgba(10,10,10,0.8)' }}>
            <div className="w-8 h-8 rounded-full border-2 border-[#E07A5F] border-t-transparent animate-spin" />
          </div>
        )}

        {!loading && visible.length === 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-8"
            style={{ background: 'rgba(10,10,10,0.85)', pointerEvents: 'none' }}>
            <p className="text-white font-semibold mb-2">Aucune donnée de prix dans votre secteur</p>
            <p className="text-sm text-[#6B7280]">Scannez vos tickets pour alimenter la carte et aider la communauté.</p>
          </div>
        )}

        <MapContainer
          center={[46.603354, 1.888334]}
          zoom={6}
          style={{ height: '100%', width: '100%', background: '#1a1a2e' }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            subdomains="abcd"
            maxZoom={20}
          />
          <FlyToUser coords={userCoords ?? null} />

          {userCoords && (
            <CircleMarker
              center={[userCoords.lat, userCoords.lon]}
              radius={8}
              pathOptions={{ color: '#fff', fillColor: '#E07A5F', fillOpacity: 1, weight: 2 }}
            >
              <Popup>
                <div style={{ background: '#1A1A1A', color: '#fff', borderRadius: 8, padding: '8px 10px', minWidth: 100 }}>
                  <p style={{ fontWeight: 700, fontSize: 12, margin: 0 }}>Votre position</p>
                </div>
              </Popup>
            </CircleMarker>
          )}

          {visible.map((pin, i) => (
            <CircleMarker
              key={i}
              center={[pin.lat, pin.lon]}
              radius={Math.min(6 + Math.sqrt(pin.receipt_count) * 2, 20)}
              pathOptions={{
                color: pinColor(pin.price_tier),
                fillColor: pinColor(pin.price_tier),
                fillOpacity: 0.75,
                weight: 1.5,
              }}
            >
              <Popup>
                <div style={{ background: '#1A1A1A', color: '#fff', borderRadius: 10, padding: '12px 14px', minWidth: 180, maxWidth: 220 }}>
                  <p style={{ fontWeight: 800, fontSize: 13, margin: '0 0 2px' }}>{pin.store_chain}</p>
                  <p style={{ color: '#6B7280', fontSize: 11, margin: '0 0 8px' }}>
                    {pin.receipt_count} ticket{pin.receipt_count !== 1 ? 's' : ''} · {pin.item_count} articles
                  </p>
                  <div style={{ fontSize: 12, marginBottom: 8 }}>
                    Prix moyen : <strong style={{ color: pinColor(pin.price_tier) }}>{pin.avg_price.toFixed(2)} €</strong>
                  </div>
                  {pin.top_items.length > 0 && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>
                      <p style={{ fontSize: 10, color: '#4B5563', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                        Moins chers ici
                      </p>
                      {pin.top_items.map((item, j) => (
                        <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                          <span style={{ color: '#D1D5DB', flex: 1, marginRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.name}
                          </span>
                          <span style={{ color: '#00D09C', fontWeight: 700, flexShrink: 0 }}>{item.avg_price.toFixed(2)} €</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}
