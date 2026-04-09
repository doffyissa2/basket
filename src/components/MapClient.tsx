'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import Map, { Source, Layer, Popup, NavigationControl, Marker } from 'react-map-gl/mapbox'
import type { MapRef, MapMouseEvent } from 'react-map-gl/mapbox'
import type { GeoJSONSource } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { StorePin } from '@/app/api/price-map/route'

function pinColor(tier: StorePin['price_tier']): string {
  if (tier === 'cheap') return '#7ed957'
  if (tier === 'mid') return '#F59E0B'
  return '#EF4444'
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const TIER_LABELS: Record<string, string> = { cheap: 'Moins cher', mid: 'Moyen', expensive: 'Cher' }

function StorePopup({ pin, onClose }: { pin: StorePin; onClose: () => void }) {
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
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    }}>
      <button onClick={onClose} style={{
        position: 'absolute', top: 8, right: 8,
        background: 'rgba(255,255,255,0.08)', border: 'none',
        color: '#9CA3AF', borderRadius: '50%', width: 20, height: 20,
        cursor: 'pointer', fontSize: 12, lineHeight: '20px', textAlign: 'center',
      }}>×</button>

      <div style={{ marginBottom: 10, paddingRight: 16 }}>
        <p style={{ fontWeight: 800, fontSize: 15, margin: '0 0 2px' }}>{pin.store_name}</p>
        {fullAddress && (
          <p style={{ color: '#6B7280', fontSize: 11, margin: 0, lineHeight: 1.4 }}>{fullAddress}</p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>Prix moyen :</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: pinColor(pin.price_tier) }}>
          {pin.avg_price.toFixed(2)} €
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99,
          background: pin.price_tier === 'cheap' ? 'rgba(126,217,87,0.18)' : pin.price_tier === 'mid' ? 'rgba(245,158,11,0.18)' : 'rgba(239,68,68,0.18)',
          color: pinColor(pin.price_tier), textTransform: 'uppercase',
        }}>
          {TIER_LABELS[pin.price_tier]}
        </span>
      </div>

      {pin.top_items.length > 0 ? (
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
      ) : (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 8, marginBottom: 10 }}>
          <p style={{ fontSize: 10, color: '#4B5563', fontStyle: 'italic' }}>
            Prix moyens nationaux — aucun prix local disponible pour ce magasin
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{
          flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 600,
          padding: '7px 0', borderRadius: 8,
          background: 'rgba(126,217,87,0.15)', color: '#7ed957',
          textDecoration: 'none', display: 'block',
        }}>Naviguer</a>
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
  const mapRef = useRef<MapRef>(null)
  const [pins, setPins] = useState<StorePin[]>([])
  const [loading, setLoading] = useState(true)
  const [chainFilter, setChainFilter] = useState('Tous')
  const [tierFilter, setTierFilter] = useState('Tous')
  const [message, setMessage] = useState<string | null>(null)
  const [selectedPin, setSelectedPin] = useState<StorePin | null>(null)
  const [show3d, setShow3d] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [mapLoaded, setMapLoaded] = useState(false)

  // Fetch pins
  useEffect(() => {
    if (!accessToken) return
    fetch('/api/price-map', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.json())
      .then(d => { setPins(d.pins ?? []); if (d.message) setMessage(d.message) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [accessToken])

  // Fly to user on load
  useEffect(() => {
    if (!userCoords || !mapRef.current) return
    mapRef.current.flyTo({ center: [userCoords.lon, userCoords.lat], zoom: 13, duration: 1500 })
  }, [userCoords])

  // Toggle 3D buildings (Mapbox Standard style config)
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    try {
      mapRef.current.getMap().setConfigProperty('basemap', 'show3dObjects', show3d)
    } catch { /* style may not support property */ }
  }, [show3d, mapLoaded])

  const chains = useMemo(() => {
    const set = new Set(pins.map(p => p.store_chain))
    return ['Tous', ...Array.from(set).sort()]
  }, [pins])

  const visible = useMemo(() =>
    pins.filter(p => {
      if (chainFilter !== 'Tous' && p.store_chain !== chainFilter) return false
      if (tierFilter !== 'Tous' && p.price_tier !== tierFilter) return false
      return true
    }),
    [pins, chainFilter, tierFilter]
  )

  // Cheapest store within 10 km of user
  const cheapestNearby = useMemo(() => {
    if (!userCoords) return null
    const nearby = pins.filter(p => haversineKm(userCoords.lat, userCoords.lon, p.lat, p.lon) <= 10)
    if (nearby.length === 0) return null
    return nearby.sort((a, b) => a.avg_price - b.avg_price)[0]
  }, [pins, userCoords])

  // GeoJSON feature collection for clustering
  const geojson = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: visible.map(pin => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [pin.lon, pin.lat] as [number, number] },
      properties: {
        store_name:     pin.store_name,
        store_chain:    pin.store_chain,
        address:        pin.address ?? null,
        city:           pin.city ?? null,
        postcode:       pin.postcode ?? null,
        avg_price:      pin.avg_price,
        price_tier:     pin.price_tier,
        item_count:     pin.item_count,
        receipt_count:  pin.receipt_count,
        lat:            pin.lat,
        lon:            pin.lon,
        top_items:      JSON.stringify(pin.top_items),
        has_local_data: pin.has_local_data,
        color:          pinColor(pin.price_tier),
        radius:         Math.min(8 + Math.sqrt(pin.item_count) * 2, 18),
      },
    })),
  }), [visible])

  // Search a city / postcode via Mapbox Geocoding
  const handleSearch = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!searchQuery.trim() || !mapRef.current) return
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json` +
        `?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&country=fr&language=fr&types=place,postcode,region`,
        { signal: AbortSignal.timeout(8_000) }
      )
      const data = await res.json()
      const center = data.features?.[0]?.center as [number, number] | undefined
      if (center) mapRef.current.flyTo({ center, zoom: 11, duration: 1500 })
    } catch { /* silent */ }
  }, [searchQuery])

  // Map click: expand cluster or open pin popup
  const handleMapClick = useCallback((e: MapMouseEvent) => {
    if (!mapRef.current) return

    const clusterHits = mapRef.current.queryRenderedFeatures(e.point, { layers: ['clusters'] })
    if (clusterHits.length > 0) {
      const clusterId = clusterHits[0].properties?.cluster_id as number
      const coords = (clusterHits[0].geometry as unknown as { coordinates: [number, number] }).coordinates
      const source = mapRef.current.getSource('stores') as unknown as GeoJSONSource
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err || zoom == null || !mapRef.current) return
        mapRef.current.flyTo({ center: coords, zoom, duration: 600 })
      })
      return
    }

    const pinHits = mapRef.current.queryRenderedFeatures(e.point, { layers: ['unclustered-point'] })
    if (pinHits.length > 0) {
      const p = pinHits[0].properties!
      setSelectedPin({
        store_name:     p.store_name,
        store_chain:    p.store_chain,
        address:        p.address ?? null,
        city:           p.city ?? null,
        postcode:       p.postcode ?? null,
        avg_price:      Number(p.avg_price),
        price_tier:     p.price_tier as StorePin['price_tier'],
        item_count:     Number(p.item_count),
        receipt_count:  Number(p.receipt_count),
        lat:            Number(p.lat),
        lon:            Number(p.lon),
        top_items:      JSON.parse(p.top_items || '[]'),
        has_local_data: p.has_local_data === true || p.has_local_data === 'true',
      })
      return
    }

    setSelectedPin(null)
  }, [])

  const flyToUser = useCallback(() => {
    if (userCoords && mapRef.current)
      mapRef.current.flyTo({ center: [userCoords.lon, userCoords.lat], zoom: 14, duration: 800 })
  }, [userCoords])

  return (
    <div className="flex flex-col h-full">

      {/* ── Search bar ─────────────────────────────────────────────────────── */}
      <form onSubmit={handleSearch}
        style={{ background: '#111', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '10px 16px' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#4B5563', fontSize: 14, pointerEvents: 'none' }}>
              🔍
            </span>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher une ville ou un code postal…"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, padding: '8px 12px 8px 34px',
                color: '#fff', fontSize: 13, outline: 'none',
              }}
            />
          </div>
          <button type="submit" style={{
            background: '#7ed957', color: '#111', border: 'none', borderRadius: 10,
            padding: '8px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0,
          }}>
            Aller
          </button>
        </div>
      </form>

      {/* ── Filter chips ────────────────────────────────────────────────────── */}
      <div style={{ background: '#111', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Chain chips */}
        <div className="flex gap-2 px-4 pt-2.5 pb-1 overflow-x-auto scrollbar-hide">
          {chains.map(c => (
            <button key={c} onClick={() => setChainFilter(c)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-colors"
              style={chainFilter === c
                ? { background: '#7ed957', color: '#111' }
                : { background: 'rgba(255,255,255,0.07)', color: '#6B7280' }}>
              {c}
            </button>
          ))}
        </div>
        {/* Price tier chips */}
        <div className="flex gap-2 px-4 pb-2.5 overflow-x-auto scrollbar-hide">
          {(['Tous', 'cheap', 'mid', 'expensive'] as const).map(tier => {
            const active = tierFilter === tier
            const color  = tier === 'Tous' ? '#6B7280' : pinColor(tier)
            return (
              <button key={tier} onClick={() => setTierFilter(tier)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 transition-colors"
                style={active
                  ? { background: color, color: tier === 'Tous' ? '#fff' : '#111' }
                  : { background: 'rgba(255,255,255,0.05)', color: '#6B7280' }}>
                {tier !== 'Tous' && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                )}
                {tier === 'Tous' ? 'Tous prix' : TIER_LABELS[tier]}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Cheapest nearby banner + legend ─────────────────────────────────── */}
      <div style={{ background: '#111', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {cheapestNearby && (
          <div className="flex items-center gap-2 px-4 py-1.5"
            style={{ background: 'rgba(126,217,87,0.08)', borderBottom: '1px solid rgba(126,217,87,0.1)' }}>
            <span className="text-xs font-bold flex-shrink-0" style={{ color: '#7ed957' }}>
              📍 Moins cher près de vous
            </span>
            <span className="text-xs text-white font-semibold truncate flex-1 min-w-0">
              {cheapestNearby.store_name}
            </span>
            <span className="text-xs font-bold flex-shrink-0" style={{ color: '#7ed957' }}>
              {cheapestNearby.avg_price.toFixed(2)} €
            </span>
            <button
              onClick={() => {
                setSelectedPin(cheapestNearby)
                mapRef.current?.flyTo({ center: [cheapestNearby.lon, cheapestNearby.lat], zoom: 15, duration: 1000 })
              }}
              style={{
                background: 'rgba(126,217,87,0.2)', border: 'none', color: '#7ed957',
                borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                cursor: 'pointer', flexShrink: 0,
              }}>
              Voir
            </button>
          </div>
        )}
        <div className="flex items-center gap-4 px-4 py-2">
          {([['cheap', '#7ed957', 'Moins cher'], ['mid', '#F59E0B', 'Moyen'], ['expensive', '#EF4444', 'Cher']] as const).map(([, color, label]) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
              <span className="text-[11px] text-[#6B7280]">{label}</span>
            </div>
          ))}
          <span className="ml-auto text-[11px] text-[#4B5563]">{visible.length} magasins</span>
        </div>
      </div>

      {/* ── Map ─────────────────────────────────────────────────────────────── */}
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
            <p className="text-sm text-[#6B7280]">
              {message ?? 'Les prix seront affichés ici une fois le catalogue synchronisé.'}
            </p>
          </div>
        )}

        <Map
          ref={mapRef}
          initialViewState={{ longitude: 1.888334, latitude: 46.603354, zoom: 6 }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/standard"
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          onClick={handleMapClick}
          onMouseEnter={() => { if (mapRef.current) mapRef.current.getCanvas().style.cursor = 'pointer' }}
          onMouseLeave={() => { if (mapRef.current) mapRef.current.getCanvas().style.cursor = '' }}
          onLoad={() => setMapLoaded(true)}
          interactiveLayerIds={['clusters', 'unclustered-point']}
        >
          <NavigationControl position="bottom-right" showCompass={false} />

          {/* ── Clustered store pins (GeoJSON Source + Layers) ─────────────── */}
          <Source id="stores" type="geojson" data={geojson} cluster clusterMaxZoom={13} clusterRadius={45}>
            {/* Cluster bubble */}
            <Layer id="clusters" type="circle" filter={['has', 'point_count']} paint={{
              'circle-color': ['step', ['get', 'point_count'], '#7ed957', 10, '#F59E0B', 30, '#EF4444'],
              'circle-radius': ['step', ['get', 'point_count'], 20, 10, 28, 30, 36],
              'circle-stroke-width': 2,
              'circle-stroke-color': 'rgba(255,255,255,0.2)',
            }} />
            {/* Cluster count label */}
            <Layer id="cluster-count" type="symbol" filter={['has', 'point_count']}
              layout={{
                'text-field': '{point_count_abbreviated}',
                'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
                'text-size': 13,
              }}
              paint={{ 'text-color': '#111' }} />
            {/* Individual store dot */}
            <Layer id="unclustered-point" type="circle" filter={['!', ['has', 'point_count']]} paint={{
              'circle-color': ['get', 'color'],
              'circle-radius': ['get', 'radius'],
              'circle-stroke-width': 2,
              'circle-stroke-color': 'rgba(255,255,255,0.25)',
            }} />
          </Source>

          {/* ── User location dot ──────────────────────────────────────────── */}
          {userCoords && (
            <Marker longitude={userCoords.lon} latitude={userCoords.lat}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%',
                background: '#7ed957', border: '3px solid #fff',
                boxShadow: '0 0 12px rgba(126,217,87,0.6)',
              }} />
            </Marker>
          )}

          {/* ── Cheapest nearby pulsing ring ────────────────────────────────── */}
          {cheapestNearby && (
            <Marker longitude={cheapestNearby.lon} latitude={cheapestNearby.lat}>
              <div className="map-pulse-ring" />
            </Marker>
          )}

          {/* ── Popup ──────────────────────────────────────────────────────── */}
          {selectedPin && (
            <Popup
              longitude={selectedPin.lon}
              latitude={selectedPin.lat}
              closeButton={false}
              closeOnClick={false}
              onClose={() => setSelectedPin(null)}
              offset={20}
              style={{ padding: 0 }}
            >
              <StorePopup pin={selectedPin} onClose={() => setSelectedPin(null)} />
            </Popup>
          )}
        </Map>

        {/* ── Locate me button ───────────────────────────────────────────────── */}
        {userCoords && (
          <button onClick={flyToUser} title="Ma position"
            className="absolute z-10 flex items-center justify-center"
            style={{
              bottom: 128, right: 10, width: 29, height: 29, borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.15)',
              background: '#1a1a1a', color: '#7ed957',
              cursor: 'pointer', fontSize: 16,
              boxShadow: '0 0 0 2px rgba(0,0,0,0.3)',
            }}>
            ⊕
          </button>
        )}

        {/* ── 3D toggle ──────────────────────────────────────────────────────── */}
        <button
          onClick={() => setShow3d(v => !v)}
          title={show3d ? 'Désactiver 3D' : 'Activer 3D'}
          className="absolute z-10"
          style={{
            bottom: 91, right: 10, width: 29, height: 29, borderRadius: 4,
            border: show3d ? 'none' : '1px solid rgba(255,255,255,0.15)',
            background: show3d ? '#7ed957' : '#1a1a1a',
            color: show3d ? '#111' : '#6B7280',
            cursor: 'pointer', fontSize: 10, fontWeight: 800,
            boxShadow: '0 0 0 2px rgba(0,0,0,0.3)',
          }}>
          3D
        </button>
      </div>
    </div>
  )
}
