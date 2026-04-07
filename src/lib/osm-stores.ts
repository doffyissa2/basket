/**
 * OpenStreetMap Overpass API — fetch real store locations for French supermarkets.
 *
 * This is the canonical fix for the carte: instead of using the user's GPS position
 * at scan time (which gave wrong locations), we fetch actual store coordinates from
 * the crowdsourced OSM database. It's free, legal, and accurate.
 *
 * Rate limit: Overpass asks for ≤2 requests/min from a single IP.
 * We batch all chains in one query to respect this.
 */

export interface OSMStore {
  osmId: string
  chain: string          // canonical Basket chain name
  name: string           // raw OSM name tag
  lat: number
  lon: number
  address: string | null
  postcode: string | null
  city: string | null
}

// Map OSM brand tags → Basket canonical chain names
const OSM_CHAIN_BRANDS: Record<string, string> = {
  Carrefour: 'Carrefour',
  'Carrefour Market': 'Carrefour',
  'Carrefour City': 'Carrefour',
  'Carrefour Contact': 'Carrefour',
  'Carrefour Express': 'Carrefour',
  'E.Leclerc': 'Leclerc',
  'Leclerc': 'Leclerc',
  'Intermarché': 'Intermarché',
  Lidl: 'Lidl',
  Aldi: 'Aldi',
  Auchan: 'Auchan',
  'Super U': 'Super U',
  'Hyper U': 'Super U',
  'U Express': 'Super U',
  Casino: 'Casino',
  Monoprix: 'Monoprix',
  Franprix: 'Franprix',
  Picard: 'Picard',
  Biocoop: 'Biocoop',
  Netto: 'Netto',
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const USER_AGENT = 'Basket-App/1.0 (basket.fr; open-source grocery price tracker)'

/**
 * Builds an Overpass QL query that fetches all supermarket nodes + ways
 * matching any of our known chains within metropolitan France.
 */
function buildOverpassQuery(): string {
  const brandFilter = Object.keys(OSM_CHAIN_BRANDS)
    .map((b) => `"brand"="${b}"`)
    .join('|')

  // Use the France boundary relation (ID 2202162) for geographic scope
  return `[out:json][timeout:60];
area["ISO3166-1"="FR"]["admin_level"="2"]->.fr;
(
  node["shop"~"supermarket|convenience"]["brand"~"${Object.keys(OSM_CHAIN_BRANDS).join('|')}"](area.fr);
  way["shop"~"supermarket|convenience"]["brand"~"${Object.keys(OSM_CHAIN_BRANDS).join('|')}"](area.fr);
);
out center tags;`
}

/**
 * Fetches all known supermarket locations in France from OpenStreetMap.
 * Returns up to ~10,000 stores (all major chains combined).
 *
 * Call this from the cron job once a week — results are cached in store_locations.
 */
export async function fetchFrenchStores(): Promise<OSMStore[]> {
  const query = buildOverpassQuery()

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: `data=${encodeURIComponent(query)}`,
    // Allow up to 90s for the large query
    signal: AbortSignal.timeout(90_000),
  })

  if (!res.ok) {
    throw new Error(`Overpass API error: ${res.status} ${res.statusText}`)
  }

  const data = await res.json() as {
    elements: Array<{
      type: string
      id: number
      lat?: number
      lon?: number
      center?: { lat: number; lon: number }
      tags?: Record<string, string>
    }>
  }

  const stores: OSMStore[] = []

  for (const el of data.elements) {
    const tags = el.tags ?? {}
    const brand = tags['brand'] ?? tags['name'] ?? ''
    const chain = OSM_CHAIN_BRANDS[brand]
    if (!chain) continue

    const lat = el.lat ?? el.center?.lat
    const lon = el.lon ?? el.center?.lon
    if (!lat || !lon) continue

    const postcode = tags['addr:postcode'] ?? null
    const city = tags['addr:city'] ?? tags['addr:town'] ?? null
    const street = tags['addr:street'] ?? null
    const housenumber = tags['addr:housenumber'] ?? null
    const address = [housenumber, street, city].filter(Boolean).join(' ') || null

    stores.push({
      osmId: `${el.type}/${el.id}`,
      chain,
      name: tags['name'] ?? brand,
      lat,
      lon,
      address,
      postcode,
      city,
    })
  }

  return stores
}

/**
 * Convenience: look up the nearest store matching a given chain + postcode.
 * Used to enrich scanned receipts when we have an approximate postcode.
 */
export function findNearestStore(
  stores: OSMStore[],
  chain: string,
  postcode: string
): OSMStore | null {
  const dept = postcode.slice(0, 2)
  const candidates = stores.filter(
    (s) => s.chain === chain && s.postcode?.startsWith(dept)
  )
  if (candidates.length === 0) return null

  // Sort by full postcode match first, then by dept match
  candidates.sort((a, b) => {
    const aFull = a.postcode === postcode ? 0 : 1
    const bFull = b.postcode === postcode ? 0 : 1
    return aFull - bFull
  })

  return candidates[0]
}
