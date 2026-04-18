/**
 * Open Food Facts — free, open-source food product database.
 * Founded in France, 3M+ products, EAN/barcode lookups, French-first.
 *
 * License: ODbL (Open Database Licence)
 * API docs: https://openfoodfacts.github.io/openfoodfacts-server/api/
 *
 * No API key required. Must set a descriptive User-Agent per their policy.
 */

const BASE = 'https://world.openfoodfacts.org'
const UA = 'Basket-App/1.0 (basket.fr; contact@basket.fr; free grocery price tool)'

// Fields we actually need — keeps responses small
const FIELDS = 'code,product_name,product_name_fr,brands,categories_tags,image_small_url,nutriscore_grade,quantity'

export interface OFFProduct {
  ean: string
  name: string
  brand: string | null
  category: string | null
  imageSmallUrl: string | null
  nutriscore: string | null
  quantity: string | null
}

function parseProduct(p: Record<string, unknown>): OFFProduct {
  return {
    ean: String(p.code ?? ''),
    name: String(p.product_name_fr ?? p.product_name ?? '').trim(),
    brand: (p.brands as string | null)?.split(',')[0].trim() ?? null,
    category: ((p.categories_tags as string[]) ?? [])
      .find((t: string) => t.startsWith('en:'))
      ?.replace('en:', '')
      .replace(/-/g, ' ') ?? null,
    imageSmallUrl: (p.image_small_url as string | null) ?? null,
    nutriscore: (p.nutriscore_grade as string | null)?.toUpperCase() ?? null,
    quantity: (p.quantity as string | null) ?? null,
  }
}

/**
 * Look up a product by EAN/barcode (e.g. "3017620429484" for Nutella).
 * Returns null if not found or on error.
 */
export async function lookupByEAN(ean: string): Promise<OFFProduct | null> {
  try {
    const res = await fetch(
      `${BASE}/api/v2/product/${encodeURIComponent(ean)}?fields=${FIELDS}`,
      { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8_000) }
    )
    if (!res.ok) return null
    const data = await res.json() as { status: number; product?: Record<string, unknown> }
    if (data.status !== 1 || !data.product) return null
    return parseProduct(data.product)
  } catch {
    return null
  }
}

/**
 * Search for products by name (French locale).
 * Best effort — returns up to `limit` results.
 */
export async function searchProducts(
  query: string,
  { limit = 10, countryCode = 'fr' }: { limit?: number; countryCode?: string } = {}
): Promise<OFFProduct[]> {
  try {
    const params = new URLSearchParams({
      search_terms: query,
      action: 'process',
      json: '1',
      page_size: String(limit),
      cc: countryCode,
      fields: FIELDS,
    })
    const res = await fetch(
      `${BASE}/cgi/search.pl?${params}`,
      { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(12_000) }
    )
    if (!res.ok) return []
    const data = await res.json() as { products?: Record<string, unknown>[] }
    return (data.products ?? []).map(parseProduct).filter((p) => p.name && p.ean)
  } catch {
    return []
  }
}

// ── OFF Prices API: per-EAN chain-level pricing ─────────────────────────────

const PRICES_BASE = 'https://prices.openfoodfacts.org/api/v1/prices'

const CHAIN_PATTERNS: [RegExp, string][] = [
  [/carrefour/i,                        'Carrefour'],
  [/leclerc/i,                          'Leclerc'],
  [/lidl/i,                             'Lidl'],
  [/aldi/i,                             'Aldi'],
  [/intermarché|intermarche|itm\b/i,    'Intermarché'],
  [/super\s*u|hyper\s*u|u\s*express|système\s*u|systeme\s*u/i, 'Super U'],
  [/monoprix|monop'/i,                  'Monoprix'],
  [/casino/i,                           'Casino'],
  [/franprix/i,                         'Franprix'],
  [/auchan/i,                           'Auchan'],
]

function detectChain(storeName: string | null): string | null {
  if (!storeName) return null
  for (const [pattern, name] of CHAIN_PATTERNS) {
    if (pattern.test(storeName)) return name
  }
  return null
}

export interface ChainPrice {
  chain:       string
  medianPrice: number
  minPrice:    number
  maxPrice:    number
  sampleCount: number
}

/**
 * Query OFF Prices API for a specific EAN, filtered to French EUR prices.
 * Returns median price per chain. Paginates up to 5 pages (500 prices).
 *
 * Throttled to 1 request per 500ms to respect OFF fair-use.
 */
export async function getChainPricesForEan(ean: string): Promise<ChainPrice[]> {
  const byChain = new Map<string, number[]>()

  for (let page = 1; page <= 5; page++) {
    try {
      const url = `${PRICES_BASE}?product_code=${encodeURIComponent(ean)}&currency=EUR&order_by=-date&page=${page}&size=100`
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        signal: AbortSignal.timeout(12_000),
      })
      if (!res.ok) break

      const raw = await res.json() as Record<string, unknown>
      const items = (Array.isArray(raw.items) ? raw.items : []) as Array<{
        price?: number
        currency?: string
        location?: { osm_name?: string | null; osm_address_country_code?: string | null } | null
      }>

      if (items.length === 0) break

      for (const item of items) {
        if (item.currency !== 'EUR') continue
        if (typeof item.price !== 'number' || item.price <= 0.10 || item.price > 500) continue
        if (item.location?.osm_address_country_code !== 'FR') continue

        const chain = detectChain(item.location?.osm_name ?? null)
        if (!chain) continue

        if (!byChain.has(chain)) byChain.set(chain, [])
        byChain.get(chain)!.push(item.price)
      }

      if (items.length < 100) break // last page
      await new Promise(r => setTimeout(r, 500))
    } catch {
      break
    }
  }

  const results: ChainPrice[] = []

  for (const [chain, prices] of byChain) {
    if (prices.length === 0) continue
    const sorted = prices.sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    const median = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid]

    results.push({
      chain,
      medianPrice: Math.round(median * 100) / 100,
      minPrice:    Math.round(sorted[0] * 100) / 100,
      maxPrice:    Math.round(sorted[sorted.length - 1] * 100) / 100,
      sampleCount: sorted.length,
    })
  }

  return results
}

/**
 * Batch-enrich a list of item names: for each, search OFD and return the
 * best-matching canonical name + EAN. Used after receipt parsing to normalise
 * scanned items against the OFD catalogue.
 *
 * Throttled to 1 request per 500ms to respect OFD's fair-use policy.
 */
export async function enrichItems(
  items: { name: string }[]
): Promise<Map<string, { canonicalName: string; ean: string | null }>> {
  const result = new Map<string, { canonicalName: string; ean: string | null }>()

  for (const item of items) {
    const products = await searchProducts(item.name, { limit: 3 })
    if (products.length > 0) {
      result.set(item.name, {
        canonicalName: products[0].name || item.name,
        ean: products[0].ean || null,
      })
    }
    // Polite delay: 500ms between requests
    await new Promise((r) => setTimeout(r, 500))
  }

  return result
}
