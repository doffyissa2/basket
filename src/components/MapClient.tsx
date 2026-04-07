'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { StorePin } from '@/app/api/price-map/route'

// Fix Leaflet default icon (webpack strips asset paths)
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: '', shadowUrl: '', iconRetinaUrl: '' })

function pinColor(tier: StorePin['price_tier']): string {
  if (tier === 'cheap') return '#7ed957'
  if (tier === 'mid') return '#F59E0B'
  return '#EF4444'
}

function FlyToUser({ coords }: { coords: { lat: number; lon: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (coords) map.flyTo([coords.lat, coords.lon], 13, { duration: 1.5 })
  }, [map, coords])
  return null
}

function StorePopup({ pin }: { pin: StorePin }) {
  const [copied, setCopied] = useState(false)

  const fullAddress = [pin.address, pin.postcode, pin.city].filter(Boolean).join(', ') || null
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [pin.store_name, pin.city, 'France'].filter(Boolean).join(', ')
  )}`

  const handleCopy = useCallback(() => {
    const text = fullAddress ?? `${pin.store_chain}, ${pin.city ?? ''}`
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [fullAddress, pin])

  return (
    <div style={{
      background: '#1A1A1A', color: '#fff', borderRadius: 14,
      padding: '14px 16px', minWidth: 220, maxWidth: 270, fontFamily: 'inherit',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 10 }}>
        <p style={{ fontWeight: 800, fontSize: 15, margin: '0 0 2px' }}>{pin.store_name}</p>
        {fullAddress && (
          <p style={{ color: '#6B7280', fontSize: 11, margin: 0, lineHeight: 1.4 }}>
            {fullAddress}
          </p>
        )}
      </div>

      {/* Price tier badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>Prix moyen :</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: pinColor(pin.price_tier) }}>
          {pin.avg_price.toFixed(2)} €
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99,
          background: pin.price_tier === 'cheap'
            ? 'rgba(126,217,87,0.18)'
            : pin.price_tier === 'mid'
            ? 'rgba(245,158,11,0.18)'
            : 'rgba(239,68,68,0.18)',
          color: pinColor(pin.price_tier), textTransform: 'uppercase',
        }}>
          {pin.price_tier === 'cheap' ? 'Abordable' : pin.price_tier === 'mid' ? 'Moyen' : 'Cher'}
        </span>
      </div>

      {/* Top items */}
      {pin.top_items.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 8, marginBottom: 10 }}>
          <p style={{ fontSize: 9, color: '#4B5563', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>
            Moins chers ici
          </p>
          {pin.top_items.map((item, j) => (
            <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
              <span style={{ color: '#D1D5DB', flex: 1, marginRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}
              </span>
              <span style={{ color: '#7ed957', fontWeight: 700, flexShrink: 0 }}>
                {item.avg_price.toFixed(2)} €
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 6 }}>
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{
          flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 600,
          padding: '7px 0', borderRadius: 8,
          background: 'rgba(126,217,87,0.15)', color: '#7ed957',
          textDecoration: 'none', display: 'block',
        }}>
          Naviguer
        </a>
        <button onClick={handleCopy} style={{
          flex: 1, fontSize: 12, fontWeight: 600, padding: '7px 0', borderRadius: 8,
          background: copied ? 'rgba(126,217,87,0.2)' : 'rgba(255,255,255,0.07)',
          color: copied ? '#7ed957' : '#9CA3AF', border: 'none', cursor: 'pointer',
        }}>
          {copied ? '✓ Copié' : 'Adresse'}
        </button>
      </div>
    </div>
  )
}

interface MapClientProps {
  userCoords?: { lat: number; lon: number } | null
  accessToken?: string | null
}

export default function MapClient({ userCoords, accessToken }: MapClientProps) {
  const [pins, setPins] = useState<StorePin[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('Tous')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return
    fetch('/api/price-map', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setPins(d.pins ?? [])
        if (d.message) setMessage(d.message)
      })
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
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#111' }}>
        {chains.map((c) => (
          <button key={c} onClick={() => setFilter(c)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-colors"
            style={filter === c
              ? { background: '#7ed957', color: '#111' }
              : { background: 'rgba(255,255,255,0.07)', color: '#6B7280' }}>
            {c}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 flex-shrink-0"
        style={{ background: '#111', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {([['cheap', '#7ed957', 'Moins cher'], ['mid', '#F59E0B', 'Moyen'], ['expensive', '#EF4444', 'Cher']] as const).map(([, color, label]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            <span className="text-[11px] text-[#6B7280]">{label}</span>
          </div>
        ))}
        <span className="ml-auto text-[11px] text-[#4B5563]">{visible.length} magasins</span>
      </div>

      {/* Map area */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center"
            style={{ background: 'rgba(10,10,10,0.85)' }}>
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: '#7ed957', borderTopColor: 'transparent' }} />
          </div>
        )}

        {!loading && visible.length === 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-8"
            style={{ background: 'rgba(10,10,10,0.9)', pointerEvents: 'none' }}>
            <p className="text-white font-semibold mb-2">Aucune donnée disponible</p>
            <p className="text-sm text-[#6B7280] max-w-xs">
              {message ?? 'Les prix seront affichés ici une fois le catalogue synchronisé. Lancez le cron sync-store-locations pour démarrer.'}
            </p>
          </div>
        )}

        <MapContainer
          center={[46.603354, 1.888334]}
          zoom={6}
          style={{ height: '100%', width: '100%', background: '#111' }}
          zoomControl
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            subdomains="abcd"
            maxZoom={20}
          />
          <FlyToUser coords={userCoords ?? null} />

          {userCoords && (
            <CircleMarker
              center={[userCoords.lat, userCoords.lon]}
              radius={8}
              pathOptions={{ color: '#fff', fillColor: '#7ed957', fillOpacity: 1, weight: 2 }}
            >
              <Popup closeButton={false}>
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
              radius={Math.min(5 + Math.sqrt(pin.item_count) * 1.5, 18)}
              pathOptions={{
                color: pinColor(pin.price_tier),
                fillColor: pinColor(pin.price_tier),
                fillOpacity: 0.85,
                weight: 1.5,
              }}
            >
              <Popup minWidth={220} maxWidth={280}>
                <StorePopup pin={pin} />
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}
