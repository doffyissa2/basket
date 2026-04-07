'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { StorePin } from '@/app/api/price-map/route'

// Fix default icon paths (webpack strips them otherwise)
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: '', shadowUrl: '', iconRetinaUrl: '' })

function pinColor(tier: StorePin['price_tier']): string {
  if (tier === 'cheap') return '#7ed957'   // signal green
  if (tier === 'mid') return '#F59E0B'     // amber
  return '#EF4444'                          // red
}

function FlyToUser({ coords }: { coords: { lat: number; lon: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (coords) map.flyTo([coords.lat, coords.lon], 13, { duration: 1.5 })
  }, [map, coords])
  return null
}

// Reverse geocode cache: key = "lat,lon" → address string
const geocodeCache = new Map<string, string>()

function useReverseGeocode(lat: number, lon: number, enabled: boolean) {
  const [address, setAddress] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    const key = `${lat.toFixed(3)},${lon.toFixed(3)}`
    if (geocodeCache.has(key)) { setAddress(geocodeCache.get(key)!); return }

    fetch(`/api/reverse-geocode?lat=${lat}&lon=${lon}`)
      .then((r) => r.json())
      .then((d) => {
        const addr = d.display_name ?? null
        if (addr) { geocodeCache.set(key, addr); setAddress(addr) }
      })
      .catch(() => {})
  }, [lat, lon, enabled])

  return address
}

function StorePopup({ pin, onCopy }: { pin: StorePin; onCopy: (text: string) => void }) {
  const [showAddress, setShowAddress] = useState(false)
  const [copied, setCopied] = useState(false)
  const address = useReverseGeocode(pin.lat, pin.lon, showAddress)

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${pin.lat},${pin.lon}`

  const handleCopy = useCallback(() => {
    const text = address ?? `${pin.store_chain} (${pin.lat.toFixed(5)}, ${pin.lon.toFixed(5)})`
    navigator.clipboard?.writeText(text).then(() => {
      onCopy(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [address, pin, onCopy])

  return (
    <div style={{
      background: '#1A1A1A', color: '#fff', borderRadius: 12,
      padding: '14px 16px', minWidth: 210, maxWidth: 260,
    }}>
      <p style={{ fontWeight: 800, fontSize: 14, margin: '0 0 2px' }}>{pin.store_chain}</p>
      <p style={{ color: '#6B7280', fontSize: 11, margin: '0 0 10px' }}>
        {pin.receipt_count} ticket{pin.receipt_count !== 1 ? 's' : ''} · {pin.item_count} articles
      </p>

      {/* Price */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>Prix moyen :</span>
        <span style={{ fontWeight: 700, fontSize: 13, color: pinColor(pin.price_tier) }}>
          {pin.avg_price.toFixed(2)} €
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 99,
          background: pin.price_tier === 'cheap' ? 'rgba(126,217,87,0.18)' : pin.price_tier === 'mid' ? 'rgba(245,158,11,0.18)' : 'rgba(239,68,68,0.18)',
          color: pinColor(pin.price_tier), textTransform: 'uppercase',
        }}>
          {pin.price_tier === 'cheap' ? 'Abordable' : pin.price_tier === 'mid' ? 'Moyen' : 'Cher'}
        </span>
      </div>

      {/* Top items */}
      {pin.top_items.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 8, marginBottom: 10 }}>
          <p style={{ fontSize: 9, color: '#4B5563', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 }}>
            Moins chers ici
          </p>
          {pin.top_items.map((item, j) => (
            <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
              <span style={{ color: '#D1D5DB', flex: 1, marginRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}
              </span>
              <span style={{ color: '#7ed957', fontWeight: 700, flexShrink: 0 }}>{item.avg_price.toFixed(2)} €</span>
            </div>
          ))}
        </div>
      )}

      {/* Address reveal */}
      {!showAddress ? (
        <button
          onClick={() => setShowAddress(true)}
          style={{
            width: '100%', fontSize: 11, fontWeight: 600, padding: '6px 0',
            background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 7,
            color: '#9CA3AF', cursor: 'pointer', marginBottom: 6,
          }}
        >
          📍 Afficher l'adresse
        </button>
      ) : address ? (
        <p style={{ fontSize: 10, color: '#9CA3AF', lineHeight: 1.5, marginBottom: 6, background: 'rgba(255,255,255,0.05)', padding: '5px 7px', borderRadius: 6 }}>
          {address.split(', ').slice(0, 4).join(', ')}
        </p>
      ) : (
        <p style={{ fontSize: 10, color: '#6B7280', marginBottom: 6 }}>Chargement…</p>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 6 }}>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 600,
            padding: '6px 0', borderRadius: 7,
            background: 'rgba(126,217,87,0.15)', color: '#7ed957',
            textDecoration: 'none', display: 'block',
          }}
        >
          🗺 Naviguer
        </a>
        <button
          onClick={handleCopy}
          style={{
            flex: 1, fontSize: 11, fontWeight: 600, padding: '6px 0', borderRadius: 7,
            background: copied ? 'rgba(126,217,87,0.2)' : 'rgba(255,255,255,0.07)',
            color: copied ? '#7ed957' : '#9CA3AF', border: 'none', cursor: 'pointer',
          }}
        >
          {copied ? '✓ Copié' : '📋 Copier'}
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
  const [, setCopiedText] = useState('')

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
                ? { background: '#7ed957', color: '#111' }
                : { background: 'rgba(255,255,255,0.07)', color: '#6B7280' }
            }
          >
            {c}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {([['cheap', '#7ed957', 'Moins cher'], ['mid', '#F59E0B', 'Prix moyen'], ['expensive', '#EF4444', 'Plus cher']] as const).map(([, color, label]) => (
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
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#7ed957', borderTopColor: 'transparent' }} />
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
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
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
                fillOpacity: 0.8,
                weight: 1.5,
              }}
            >
              <Popup minWidth={210} maxWidth={280}>
                <StorePopup pin={pin} onCopy={setCopiedText} />
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}
