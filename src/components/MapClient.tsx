'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import Map, { Source, Layer, Popup, NavigationControl, Marker } from 'react-map-gl/mapbox'
import type { MapRef, MapMouseEvent } from 'react-map-gl/mapbox'
import type { GeoJSONSource } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Navigation2, X, Clock, Bookmark, MapPin } from 'lucide-react'
import type { StorePin } from '@/app/api/price-map/route'

// ── Helpers ───────────────────────────────────────────────────────────────────

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
const MAX_RECENTS = 8
const MAX_SAVED   = 50

function storeKey(pin: StorePin) {
  return `${pin.store_chain}|${pin.lat.toFixed(4)}|${pin.lon.toFixed(4)}`
}

// ── localStorage helpers ──────────────────────────────────────────────────────

function loadSaved(): StorePin[] {
  try { return JSON.parse(localStorage.getItem('basket_saved_stores') ?? '[]') } catch { return [] }
}
function saveSaved(pins: StorePin[]) {
  try { localStorage.setItem('basket_saved_stores', JSON.stringify(pins.slice(0, MAX_SAVED))) } catch { /* ignore */ }
}
function loadRecents(): StorePin[] {
  try { return JSON.parse(localStorage.getItem('basket_recent_stores') ?? '[]') } catch { return [] }
}
function saveRecents(pins: StorePin[]) {
  try { localStorage.setItem('basket_recent_stores', JSON.stringify(pins.slice(0, MAX_RECENTS))) } catch { /* ignore */ }
}

// ── Store bottom-sheet ────────────────────────────────────────────────────────

function StoreSheet({
  pin, saved, onClose, onSave, onNavigate,
}: {
  pin: StorePin
  saved: boolean
  onClose: () => void
  onSave: () => void
  onNavigate: () => void
}) {
  const fullAddress = [pin.address, pin.postcode, pin.city].filter(Boolean).join(', ') || null

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
        background: '#1a1a1a',
        borderRadius: '20px 20px 0 0',
        padding: '0 0 env(safe-area-inset-bottom)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
        maxHeight: '55vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Drag handle */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
      </div>

      <div style={{ padding: '0 20px 20px', overflowY: 'auto', flex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: 17, color: '#fff', margin: '0 0 3px', lineHeight: 1.25 }}>
              {pin.store_name}
            </p>
            {fullAddress && (
              <p style={{ fontSize: 12, color: '#6B7280', margin: 0, lineHeight: 1.4 }}>{fullAddress}</p>
            )}
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.07)', border: 'none', color: '#6B7280',
            borderRadius: '50%', width: 28, height: 28, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <X size={14} />
          </button>
        </div>

        {/* Price badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '6px 12px',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: pinColor(pin.price_tier) }} />
            <span style={{ color: '#9CA3AF', fontSize: 12 }}>
              {pin.has_local_data ? 'Prix local moyen' : 'Prix national moyen'}
            </span>
            <span style={{ fontWeight: 800, fontSize: 15, color: pinColor(pin.price_tier) }}>
              {pin.avg_price != null ? `${pin.avg_price.toFixed(2)} €` : '—'}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99,
              background: pin.price_tier === 'cheap' ? 'rgba(126,217,87,0.15)'
                : pin.price_tier === 'mid' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
              color: pinColor(pin.price_tier), textTransform: 'uppercase',
            }}>
              {TIER_LABELS[pin.price_tier]}
            </span>
          </div>
        </div>

        {/* Top items */}
        {pin.top_items.length > 0 ? (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 10, color: '#4B5563', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, margin: '0 0 8px' }}>
              Articles les moins chers ici
            </p>
            {pin.top_items.map((item, j) => (
              <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6, marginBottom: 6, borderBottom: j < pin.top_items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <span style={{ color: '#D1D5DB', fontSize: 13, flex: 1, marginRight: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                </span>
                <span style={{ color: '#7ed957', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  {item.avg_price.toFixed(2)} €
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: '#4B5563', fontStyle: 'italic', marginBottom: 14 }}>
            {pin.has_local_data
              ? 'Aucun article local disponible.'
              : 'Pas encore de données locales. Scannez un ticket ici pour contribuer !'}
          </p>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onNavigate} style={{
            flex: 1, padding: '10px 0', borderRadius: 12, border: 'none',
            background: '#7ed957', color: '#111', fontWeight: 700, fontSize: 13,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Navigation2 size={14} />
            Naviguer
          </button>
          <button onClick={onSave} style={{
            padding: '10px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: saved ? 'rgba(126,217,87,0.2)' : 'rgba(255,255,255,0.07)',
            color: saved ? '#7ed957' : '#9CA3AF',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontWeight: 600, fontSize: 13,
          }}>
            <Star size={14} fill={saved ? '#7ed957' : 'none'} />
            {saved ? 'Sauvegardé' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Recents / Saved panel ─────────────────────────────────────────────────────

function StoreListPanel({
  title, stores, icon, onSelect, onClose, emptyMsg,
}: {
  title: string
  stores: StorePin[]
  icon: React.ReactNode
  onSelect: (pin: StorePin) => void
  onClose: () => void
  emptyMsg: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      style={{
        position: 'absolute', top: 120, left: 12, right: 12, zIndex: 25,
        background: '#1a1a1a', borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        maxHeight: '55vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ color: '#7ed957' }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#fff', flex: 1 }}>{title}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', padding: 4 }}>
          <X size={16} />
        </button>
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {stores.length === 0 ? (
          <p style={{ color: '#4B5563', fontSize: 13, textAlign: 'center', padding: '20px 16px' }}>{emptyMsg}</p>
        ) : stores.map((pin, i) => (
          <button key={i} onClick={() => { onSelect(pin); onClose() }} style={{
            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
            borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'left',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: pinColor(pin.price_tier), flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pin.store_name}</p>
              {pin.city && <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>{pin.city}</p>}
            </div>
            {pin.avg_price != null && (
              <span style={{ fontSize: 12, fontWeight: 700, color: pinColor(pin.price_tier), flexShrink: 0 }}>
                {pin.avg_price.toFixed(2)} €
              </span>
            )}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface MapClientProps {
  userCoords?: { lat: number; lon: number } | null
  accessToken?: string | null
}

export default function MapClient({ userCoords, accessToken }: MapClientProps) {
  const mapRef        = useRef<MapRef>(null)
  const [pins, setPins] = useState<StorePin[]>([])
  const [loading, setLoading]       = useState(true)
  const [chainFilter, setChainFilter] = useState('Tous')
  const [tierFilter, setTierFilter]   = useState('Tous')
  const [selectedPin, setSelectedPin] = useState<StorePin | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [mapLoaded, setMapLoaded]     = useState(false)
  const [show3d, setShow3d]           = useState(true)
  const [savedPins, setSavedPins]     = useState<StorePin[]>([])
  const [recentPins, setRecentPins]   = useState<StorePin[]>([])
  const [panel, setPanel]             = useState<'none' | 'saved' | 'recents'>('none')
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Load saved + recents from localStorage
  useEffect(() => {
    setSavedPins(loadSaved())
    setRecentPins(loadRecents())
    setDisclaimerDismissed(localStorage.getItem('basket_map_disclaimer') === '1')
  }, [])

  // Fetch pins
  useEffect(() => {
    if (!accessToken) return
    fetch('/api/price-map', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.json())
      .then(d => setPins(d.pins ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [accessToken])

  // Fly to user on mount
  useEffect(() => {
    if (!userCoords || !mapRef.current) return
    mapRef.current.flyTo({ center: [userCoords.lon, userCoords.lat], zoom: 12, duration: 1500 })
  }, [userCoords])

  // 3D buildings toggle
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    try { mapRef.current.getMap().setConfigProperty('basemap', 'show3dObjects', show3d) } catch { /* ignore */ }
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

  const cheapestNearby = useMemo(() => {
    if (!userCoords) return null
    const nearby = pins.filter(p => p.avg_price != null && haversineKm(userCoords.lat, userCoords.lon, p.lat, p.lon) <= 10)
    if (!nearby.length) return null
    return nearby.sort((a, b) => (a.avg_price ?? 999) - (b.avg_price ?? 999))[0]
  }, [pins, userCoords])

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
        radius:         pin.has_local_data ? Math.min(10 + Math.sqrt(pin.item_count) * 2, 22) : 7,
      },
    })),
  }), [visible])

  const handleMapClick = useCallback((e: MapMouseEvent) => {
    if (!mapRef.current) return
    setPanel('none')

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
      const pin: StorePin = {
        store_name:     p.store_name,
        store_chain:    p.store_chain,
        address:        p.address ?? null,
        city:           p.city ?? null,
        postcode:       p.postcode ?? null,
        avg_price:      p.avg_price != null ? Number(p.avg_price) : null,
        price_tier:     p.price_tier as StorePin['price_tier'],
        item_count:     Number(p.item_count),
        receipt_count:  Number(p.receipt_count),
        lat:            Number(p.lat),
        lon:            Number(p.lon),
        top_items:      JSON.parse(p.top_items || '[]'),
        has_local_data: p.has_local_data === true || p.has_local_data === 'true',
      }
      setSelectedPin(pin)
      // Track in recents
      setRecentPins(prev => {
        const filtered = prev.filter(r => storeKey(r) !== storeKey(pin))
        const next = [pin, ...filtered].slice(0, MAX_RECENTS)
        saveRecents(next)
        return next
      })
      return
    }

    setSelectedPin(null)
  }, [])

  const handleSearch = useCallback(async (e: React.FormEvent) => {
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
      if (center) mapRef.current.flyTo({ center, zoom: 12, duration: 1500 })
    } catch { /* silent */ }
  }, [searchQuery])

  const toggleSave = useCallback(() => {
    if (!selectedPin) return
    setSavedPins(prev => {
      const key = storeKey(selectedPin)
      const exists = prev.some(p => storeKey(p) === key)
      const next = exists ? prev.filter(p => storeKey(p) !== key) : [selectedPin, ...prev]
      saveSaved(next)
      return next
    })
  }, [selectedPin])

  const flyTo = useCallback((pin: StorePin) => {
    mapRef.current?.flyTo({ center: [pin.lon, pin.lat], zoom: 15, duration: 1000 })
    setSelectedPin(pin)
  }, [])

  const flyToUser = useCallback(() => {
    if (userCoords && mapRef.current)
      mapRef.current.flyTo({ center: [userCoords.lon, userCoords.lat], zoom: 14, duration: 800 })
  }, [userCoords])

  const isSaved = selectedPin ? savedPins.some(p => storeKey(p) === storeKey(selectedPin)) : false

  const navigateTo = useCallback(() => {
    if (!selectedPin) return
    const q = encodeURIComponent([selectedPin.store_name, selectedPin.city, 'France'].filter(Boolean).join(', '))
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank')
  }, [selectedPin])

  return (
    <div style={{ position: 'relative', flex: 1, height: '100%', minHeight: 0, overflow: 'hidden' }}>

      {/* ── Map — fills full space ──────────────────────────────────────────── */}
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 1.888334, latitude: 46.603354, zoom: 6 }}
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
        mapStyle="mapbox://styles/mapbox/standard"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        onClick={handleMapClick}
        onLoad={() => setMapLoaded(true)}
        interactiveLayerIds={['clusters', 'unclustered-point']}
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        <Source id="stores" type="geojson" data={geojson} cluster clusterMaxZoom={13} clusterRadius={45}>
          <Layer id="clusters" type="circle" filter={['has', 'point_count']} paint={{
            'circle-color': ['step', ['get', 'point_count'], '#7ed957', 10, '#F59E0B', 30, '#EF4444'],
            'circle-radius': ['step', ['get', 'point_count'], 20, 10, 28, 30, 36],
            'circle-stroke-width': 2,
            'circle-stroke-color': 'rgba(255,255,255,0.2)',
          }} />
          <Layer id="cluster-count" type="symbol" filter={['has', 'point_count']}
            layout={{ 'text-field': '{point_count_abbreviated}', 'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'], 'text-size': 13 }}
            paint={{ 'text-color': '#111' }} />
          <Layer id="unclustered-point" type="circle" filter={['!', ['has', 'point_count']]} paint={{
            'circle-color': ['get', 'color'],
            'circle-radius': ['get', 'radius'],
            'circle-stroke-width': 2,
            'circle-stroke-color': 'rgba(255,255,255,0.25)',
          }} />
        </Source>

        {/* User location */}
        {userCoords && (
          <Marker longitude={userCoords.lon} latitude={userCoords.lat}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#7ed957', border: '3px solid #fff', boxShadow: '0 0 12px rgba(126,217,87,0.6)' }} />
          </Marker>
        )}

        {/* Popup for cheapest nearby */}
        {cheapestNearby && !selectedPin && (
          <Popup longitude={cheapestNearby.lon} latitude={cheapestNearby.lat}
            closeButton={false} closeOnClick={false} offset={14} style={{ padding: 0 }}>
            <div style={{ background: '#1a1a1a', color: '#7ed957', fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>
              📍 Moins cher près de vous
            </div>
          </Popup>
        )}
      </Map>

      {/* ── Overlay: search + filters ──────────────────────────────────────── */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, pointerEvents: 'none' }}>

        {/* Search bar row (back button + input) */}
        <div style={{ padding: 'calc(env(safe-area-inset-top) + 10px) 12px 8px', display: 'flex', gap: 8, alignItems: 'center', pointerEvents: 'auto' }}>
          <a href="/dashboard" style={{
            flexShrink: 0, width: 40, height: 40, borderRadius: 12,
            background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#9CA3AF', textDecoration: 'none', fontSize: 18,
          }}>‹</a>
          <form onSubmit={handleSearch} style={{ flex: 1, minWidth: 0 }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15, pointerEvents: 'none' }}>🔍</span>
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher une ville ou un code postal…"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 14, padding: '11px 100px 11px 40px',
                  color: '#fff', fontSize: 14, outline: 'none',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                }}
              />
              {/* Right side actions */}
              <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4 }}>
                <button type="button" onClick={() => setPanel(p => p === 'saved' ? 'none' : 'saved')}
                  title="Mes magasins sauvegardés"
                  style={{
                    background: panel === 'saved' ? 'rgba(126,217,87,0.2)' : 'rgba(255,255,255,0.07)',
                    border: 'none', borderRadius: 8, padding: '4px 7px', cursor: 'pointer',
                    color: panel === 'saved' ? '#7ed957' : '#6B7280', display: 'flex', alignItems: 'center', gap: 3,
                  }}>
                  <Star size={13} fill={savedPins.length > 0 ? 'currentColor' : 'none'} />
                  {savedPins.length > 0 && <span style={{ fontSize: 10, fontWeight: 700 }}>{savedPins.length}</span>}
                </button>
                <button type="button" onClick={() => setPanel(p => p === 'recents' ? 'none' : 'recents')}
                  title="Magasins récents"
                  style={{
                    background: panel === 'recents' ? 'rgba(126,217,87,0.2)' : 'rgba(255,255,255,0.07)',
                    border: 'none', borderRadius: 8, padding: '4px 7px', cursor: 'pointer',
                    color: panel === 'recents' ? '#7ed957' : '#6B7280',
                  }}>
                  <Clock size={13} />
                </button>
                <button type="submit" style={{
                  background: '#7ed957', color: '#111', border: 'none', borderRadius: 8,
                  padding: '4px 10px', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                }}>
                  Aller
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Chain filter pills — overlaid */}
        <div style={{ display: 'flex', gap: 6, padding: '0 12px 8px', overflowX: 'auto', pointerEvents: 'auto' }}>
          {chains.slice(0, 12).map(c => (
            <button key={c} onClick={() => setChainFilter(c)}
              style={{
                flexShrink: 0, padding: '6px 13px', borderRadius: 99, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap',
                boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                background: chainFilter === c ? '#7ed957' : '#1a1a1a',
                color: chainFilter === c ? '#111' : '#D1D5DB',
              }}>
              {c}
            </button>
          ))}
          {/* Price tier pills */}
          {(['cheap', 'mid', 'expensive'] as const).map(tier => (
            <button key={tier} onClick={() => setTierFilter(t => t === tier ? 'Tous' : tier)}
              style={{
                flexShrink: 0, padding: '6px 12px', borderRadius: 99, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5,
                boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                background: tierFilter === tier ? pinColor(tier) : '#1a1a1a',
                color: tierFilter === tier ? '#111' : '#6B7280',
              }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: tierFilter === tier ? '#111' : pinColor(tier), display: 'inline-block' }} />
              {TIER_LABELS[tier]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Store count badge ──────────────────────────────────────────────── */}
      <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top) + 116px)', right: 12, zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ background: 'rgba(26,26,26,0.9)', borderRadius: 8, padding: '4px 9px', boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
          <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>{visible.length.toLocaleString()} magasins</span>
        </div>
      </div>

      {/* ── Floating right buttons ─────────────────────────────────────────── */}
      <div style={{ position: 'absolute', bottom: 100, right: 10, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {userCoords && (
          <button onClick={flyToUser} title="Ma position"
            style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: '#1a1a1a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
            <MapPin size={16} color="#7ed957" />
          </button>
        )}
        <button onClick={() => setShow3d(v => !v)} title={show3d ? 'Désactiver 3D' : 'Activer 3D'}
          style={{ width: 36, height: 36, borderRadius: 8, border: show3d ? 'none' : '1px solid rgba(255,255,255,0.12)', background: show3d ? '#7ed957' : '#1a1a1a', cursor: 'pointer', fontWeight: 800, fontSize: 10, color: show3d ? '#111' : '#6B7280', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
          3D
        </button>
      </div>

      {/* ── Disclaimer banner ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {!disclaimerDismissed && !selectedPin && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'absolute', bottom: 100, left: 12, right: 52, zIndex: 10,
              background: 'rgba(26,26,26,0.95)', borderRadius: 12, padding: '10px 14px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)', border: '1px solid rgba(126,217,87,0.2)',
            }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>🧺</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 12, color: '#D1D5DB', lineHeight: 1.5 }}>
                  <span style={{ color: '#7ed957', fontWeight: 700 }}>Plus vous scannez, plus la communauté en profite.</span>{' '}
                  Chaque ticket scanné enrichit la carte avec des prix réels et locaux pour tous.
                </p>
              </div>
              <button onClick={() => { setDisclaimerDismissed(true); localStorage.setItem('basket_map_disclaimer', '1') }}
                style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Saved / Recents panels ─────────────────────────────────────────── */}
      <AnimatePresence>
        {panel === 'saved' && (
          <StoreListPanel
            key="saved"
            title="Magasins sauvegardés"
            stores={savedPins}
            icon={<Bookmark size={15} />}
            onSelect={flyTo}
            onClose={() => setPanel('none')}
            emptyMsg="Aucun magasin sauvegardé. Appuyez sur ⭐ dans la fiche d'un magasin."
          />
        )}
        {panel === 'recents' && (
          <StoreListPanel
            key="recents"
            title="Magasins récents"
            stores={recentPins}
            icon={<Clock size={15} />}
            onSelect={flyTo}
            onClose={() => setPanel('none')}
            emptyMsg="Aucun magasin récent. Appuyez sur un magasin sur la carte."
          />
        )}
      </AnimatePresence>

      {/* ── Store bottom sheet ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedPin && (
          <StoreSheet
            key="sheet"
            pin={selectedPin}
            saved={isSaved}
            onClose={() => setSelectedPin(null)}
            onSave={toggleSave}
            onNavigate={navigateTo}
          />
        )}
      </AnimatePresence>

      {/* ── Loading overlay ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'rgba(10,10,10,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #7ed957', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
