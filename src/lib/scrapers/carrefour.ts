/**
 * Carrefour price scraper — carrefour.fr/courses
 *
 * Uses Carrefour's public product search API (same one their web app calls).
 * Honors robots.txt via the base politeFetch wrapper.
 * Rate limited to 1 request per 2 seconds.
 *
 * Legal basis: EU 2019/1024 Directive on Open Data + CNIL Legitimate Interest.
 * Data scraped: product name, price, unit, category only.
 * No personal data is present in product catalog endpoints.
 */

import { politeFetch, normaliseProductName, type ScrapedPrice } from './base'

const CHAIN = 'Carrefour'

// Carrefour's product search API (used by their React web app, publicly accessible)
// This endpoint requires no authentication and appears in the public network traffic.
// URL pattern may change — monitor for 4xx/5xx and update accordingly.
const SEARCH_URL = 'https://www.carrefour.fr/api/openapi/v1/products/search'

// Category slugs to sweep for prices
const CATEGORIES = [
  'epicerie-salee',
  'epicerie-sucree',
  'produits-laitiers-oeufs',
  'viandes-poissons',
  'fruits-et-legumes',
  'surgeles',
  'boissons',
  'bio-et-ecologie',
  'hygiene-beaute',
  'bebe',
]

interface CarrefourProduct {
  id?: string
  label?: string
  description?: string
  price?: { value?: number; currency?: string }
  unit?: { label?: string }
  categories?: Array<{ label?: string }>
  ean?: string
}

function parseProduct(raw: CarrefourProduct, category: string): ScrapedPrice | null {
  const name = raw.label ?? raw.description
  const price = raw.price?.value
  if (!name || price == null || price <= 0) return null

  return {
    chain: CHAIN,
    productName: name.trim(),
    productNameNormalised: normaliseProductName(name),
    ean: raw.ean ?? null,
    unitPrice: Math.round(price * 100) / 100,
    unit: raw.unit?.label ?? null,
    category: raw.categories?.[0]?.label ?? category,
    region: null, // Carrefour shows national prices
    sourceUrl: `https://www.carrefour.fr/courses/p/${raw.id ?? ''}`,
  }
}

/**
 * Scrapes one category from Carrefour's catalog.
 * Returns scraped price rows (already normalised).
 */
export async function scrapeCarrefourCategory(
  category: string,
  maxPages = 5
): Promise<ScrapedPrice[]> {
  const results: ScrapedPrice[] = []

  for (let page = 0; page < maxPages; page++) {
    const url = `${SEARCH_URL}?category=${category}&from=${page * 20}&size=20`
    const res = await politeFetch(url, { minDelayMs: 2000 })
    if (!res || !res.ok) break

    let body: { products?: CarrefourProduct[]; total?: number }
    try { body = await res.json() } catch { break }

    const products = body.products ?? []
    if (products.length === 0) break

    for (const p of products) {
      const parsed = parseProduct(p, category)
      if (parsed) results.push(parsed)
    }

    // Stop early if we've seen all results
    if (results.length >= (body.total ?? Infinity)) break
  }

  return results
}

/**
 * Full Carrefour sweep — all categories, paginated.
 * Designed to run in a cron job (takes ~5–10 min with polite delays).
 *
 * @param maxPerCategory — cap items per category to control runtime
 */
export async function scrapeCarrefour(maxPerCategory = 200): Promise<ScrapedPrice[]> {
  const all: ScrapedPrice[] = []
  const maxPages = Math.ceil(maxPerCategory / 20)

  for (const cat of CATEGORIES) {
    try {
      const items = await scrapeCarrefourCategory(cat, maxPages)
      all.push(...items)
      console.log(`[carrefour] ${cat}: ${items.length} items`)
    } catch (err) {
      console.error(`[carrefour] error in ${cat}:`, err)
    }
  }

  return all
}
