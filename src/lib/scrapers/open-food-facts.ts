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
