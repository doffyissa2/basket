'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import Map, { Source, Layer, NavigationControl } from 'react-map-gl/mapbox'
import type { MapRef, MapMouseEvent } from 'react-map-gl/mapbox'
import type { GeoJSONSource } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import Link from 'next/link'
import type { PublicStorePin } from '@/app/api/public-map/route'

const CHAIN_COLORS: Record<string, string> = {
  'Lidl':         '#7ed957',
  'E.Leclerc':    '#4ECDC4',
  'Carrefour':    '#F59E0B',
  'Auchan':       '#EF4444',
  'Intermarché':  '#EC4899',
  'Système U':    '#8B5CF6',
  'Monoprix':     '#F97316',
  'Aldi':         '#06B6D4',
  'Franprix':     '#D946EF',
  'Casino':       '#14B8A6',
  'Cora':         '#F43F5E',
  'Picard':       '#3B82F6',
  'Biocoop':      '#22C55E',
  'Grand Frais':  '#A3E635',
  'Netto':        '#FBBF24',
}

function chainColor(chain: string): string {
  return CHAIN_COLORS[chain] ?? '#9CA3AF'
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768 || 'ontouchstart' in window)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return mobile
}

export default function PublicMapPreview({ ctaHref = '/carte-info', ctaLabel = 'Explorer' }: { ctaHref?: string; ctaLabel?: string }) {
  const mapRef = useRef<MapRef>(null)
  const [pins, setPins] = useState<PublicStorePin[]>([])
  const [loaded, setLoaded] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    fetch('/api/public-map')
      .then(r => r.json())
      .then(d => setPins(d.pins ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    return () => { try { mapRef.current?.getMap().remove() } catch { /* */ } }
  }, [])

  const geojson = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: pins.map(pin => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [pin.lon, pin.lat] as [number, number] },
      properties: {
        store_chain: pin.store_chain,
        store_name:  pin.store_name,
        city:        pin.city ?? '',
        color:       chainColor(pin.store_chain),
      },
    })),
  }), [pins])

  const handleClick = useCallback((e: MapMouseEvent) => {
    if (!mapRef.current) return
    const clusterHits = mapRef.current.queryRenderedFeatures(e.point, { layers: ['pub-clusters'] })
    if (clusterHits.length > 0) {
      const clusterId = clusterHits[0].properties?.cluster_id as number
      const coords = (clusterHits[0].geometry as unknown as { coordinates: [number, number] }).coordinates
      const source = mapRef.current.getSource('pub-stores') as unknown as GeoJSONSource
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err || zoom == null || !mapRef.current) return
        mapRef.current.flyTo({ center: coords, zoom, duration: 600 })
      })
    }
  }, [])

  const mobileInteractive = isMobile && unlocked

  return (
    <div className="relative w-full h-full rounded-[2rem] md:rounded-[3rem] overflow-hidden">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 2.3522, latitude: 46.6, zoom: 5.2 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/standard"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        onClick={!isMobile || mobileInteractive ? handleClick : undefined}
        onLoad={() => setLoaded(true)}
        interactiveLayerIds={!isMobile || mobileInteractive ? ['pub-clusters'] : []}
        attributionControl={false}
        dragRotate={false}
        pitchWithRotate={false}
        dragPan={!isMobile || mobileInteractive}
        scrollZoom={!isMobile || mobileInteractive}
        touchZoomRotate={!isMobile || mobileInteractive}
        touchPitch={false}
        doubleClickZoom={!isMobile || mobileInteractive}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {loaded && pins.length > 0 && (
          <Source id="pub-stores" type="geojson" data={geojson} cluster clusterMaxZoom={12} clusterRadius={50}>
            <Layer id="pub-clusters" type="circle" filter={['has', 'point_count']} paint={{
              'circle-color': ['step', ['get', 'point_count'], '#7ed957', 20, '#F59E0B', 80, '#EF4444'],
              'circle-radius': ['step', ['get', 'point_count'], 18, 20, 26, 80, 34],
              'circle-stroke-width': 2,
              'circle-stroke-color': 'rgba(255,255,255,0.25)',
            }} />
            <Layer id="pub-cluster-count" type="symbol" filter={['has', 'point_count']}
              layout={{ 'text-field': '{point_count_abbreviated}', 'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'], 'text-size': 12 }}
              paint={{ 'text-color': '#111' }} />
            <Layer id="pub-unclustered" type="circle" filter={['!', ['has', 'point_count']]} paint={{
              'circle-color': ['get', 'color'],
              'circle-radius': 6,
              'circle-stroke-width': 1.5,
              'circle-stroke-color': 'rgba(255,255,255,0.3)',
            }} />
          </Source>
        )}
      </Map>

      {/* Mobile touch shield — tap to unlock map interaction */}
      {isMobile && !unlocked && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center"
          onClick={() => setUnlocked(true)}
        >
          <div className="bg-graphite/70 backdrop-blur-sm text-white font-sans text-xs font-semibold px-4 py-2 rounded-full shadow-lg">
            Appuyez pour explorer la carte
          </div>
        </div>
      )}

      {/* Re-lock after scrolling away */}
      {isMobile && unlocked && (
        <button
          className="absolute top-3 left-3 z-20 bg-graphite/70 backdrop-blur-sm text-white font-mono text-[10px] font-bold px-3 py-1.5 rounded-full"
          onClick={() => setUnlocked(false)}
        >
          Verrouiller
        </button>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-5 z-10" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-sans text-sm font-bold text-white drop-shadow-sm">
              {pins.length > 0 ? `${pins.length.toLocaleString('fr-FR')} magasins` : 'Chargement...'}
            </p>
            <p className="font-mono text-[10px] text-white/70 mt-0.5">15 enseignes en France</p>
          </div>
          <Link
            href={ctaHref}
            className="flex items-center gap-2 rounded-full px-4 py-2 font-sans text-sm font-bold text-graphite transition-all hover:scale-105 active:scale-95"
            style={{ background: '#7ed957', boxShadow: '0 2px 12px rgba(126,217,87,0.4)' }}
          >
            {ctaLabel}
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10m0 0L9.5 4.5M13 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>

      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-offwhite">
          <div className="w-6 h-6 rounded-full border-2 border-graphite/10 border-t-graphite/40 animate-spin" />
        </div>
      )}
    </div>
  )
}
