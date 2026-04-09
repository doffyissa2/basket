/**
 * E.Leclerc price scraper — via Open Food Facts Prices API
 *
 * The private leclercdrive.fr API is blocked by robots.txt.
 * Instead we pull from Open Food Facts community prices filtered to Leclerc
 * stores — same underlying data (real French receipts + user submissions).
 */

import { normaliseProductName, type ScrapedPrice } from './base'

const CHAIN = 'Leclerc'
const UA = 'Basket-App/1.0 (basket.fr; contact@basket.fr; free grocery price tool)'

interface OFFPriceItem {
  price?: number
  currency?: string
  date?: string | null
  product_name?: string | null
  product?: {
    product_name_fr?: string | null
    product_name?: string | null
    code?: string | null
    brands?: string | null
    categories_tags?: string[] | null
  } | null
  location?: {
    osm_name?: string | null
    osm_address_country_code?: string | null
  } | null
}

export async function scrapeLeclerc(maxItems = 500): Promise<ScrapedPrice[]> {
  const results: ScrapedPrice[] = []
  const seen = new Set<string>()
  const pages = Math.ceil(maxItems / 100)

  for (let page = 1; page <= pages; page++) {
    const url = `https://prices.openfoodfacts.org/api/v1/prices?currency=EUR&order_by=-date&page=${page}&size=100`
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        signal: AbortSignal.timeout(12_000),
      })
      if (!res.ok) break

      const raw = await res.json() as Record<string, unknown>
      const list = (Array.isArray(raw.items) ? raw.items : []) as OFFPriceItem[]

      for (const item of list) {
        if (item.currency !== 'EUR') continue
        if (typeof item.price !== 'number' || item.price <= 0.10 || item.price > 500) continue
        if (item.location?.osm_address_country_code !== 'FR') continue

        const storeName = item.location?.osm_name ?? ''
        if (!/leclerc/i.test(storeName)) continue

        const name = (item.product_name ?? item.product?.product_name_fr ?? item.product?.product_name ?? '').trim()
        if (name.length < 3) continue

        const normName = normaliseProductName(name)
        if (seen.has(normName)) continue
        seen.add(normName)

        const rawCats = item.product?.categories_tags ?? []
        const category = rawCats
          .map((t: string) => t.replace(/^[a-z]{2}:/, ''))
          .find((t: string) => !t.includes(':')) ?? null

        results.push({
          chain: CHAIN,
          productName: name,
          productNameNormalised: normName,
          ean: item.product?.code ?? null,
          unitPrice: Math.round((item.price as number) * 100) / 100,
          unit: null,
          category,
          region: null,
          sourceUrl: 'https://prices.openfoodfacts.org',
        })

        if (results.length >= maxItems) break
      }

      if (results.length >= maxItems) break
    } catch (err) {
      console.error(`[leclerc] OFF fetch error page ${page}:`, err)
      break
    }
  }

  console.log(`[leclerc] ${results.length} unique Leclerc prices from OFF`)
  return results
}
