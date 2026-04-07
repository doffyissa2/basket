/**
 * E.Leclerc Drive price scraper — leclercdrive.fr
 *
 * Leclerc operates hundreds of regional drives, each with its own site.
 * We scrape the national product index (available without choosing a drive).
 *
 * Rate limited to 1 req/2s. Honors robots.txt.
 */

import { politeFetch, normaliseProductName, type ScrapedPrice } from './base'

const CHAIN = 'Leclerc'

// Leclerc's national product search (no drive selection required)
// Found by inspecting public network traffic on leclercdrive.fr
const SEARCH_URL = 'https://www.leclercdrive.fr/api/v1/catalog/search'

const CATEGORIES = [
  'epicerie',
  'produits-frais',
  'surgeles',
  'boissons',
  'fruits-legumes',
  'viandes-poissons',
  'bio',
  'hygiene-beaute',
]

interface LeclercProduct {
  reference?: string
  libelle?: string
  prix?: number
  unite?: string
  rayon?: string
  codeEan?: string
}

function parseProduct(raw: LeclercProduct, category: string): ScrapedPrice | null {
  const name = raw.libelle
  const price = raw.prix
  if (!name || price == null || price <= 0) return null

  return {
    chain: CHAIN,
    productName: name.trim(),
    productNameNormalised: normaliseProductName(name),
    ean: raw.codeEan ?? null,
    unitPrice: Math.round(price * 100) / 100,
    unit: raw.unite ?? null,
    category: raw.rayon ?? category,
    region: null,
    sourceUrl: `https://www.leclercdrive.fr/produit/${raw.reference ?? ''}`,
  }
}

export async function scrapeLeclercCategory(
  category: string,
  maxPages = 5
): Promise<ScrapedPrice[]> {
  const results: ScrapedPrice[] = []

  for (let page = 1; page <= maxPages; page++) {
    const url = `${SEARCH_URL}?categorie=${category}&page=${page}&taille=20`
    const res = await politeFetch(url, { minDelayMs: 2000 })
    if (!res || !res.ok) break

    let body: { produits?: LeclercProduct[]; total?: number }
    try { body = await res.json() } catch { break }

    const products = body.produits ?? []
    if (products.length === 0) break

    for (const p of products) {
      const parsed = parseProduct(p, category)
      if (parsed) results.push(parsed)
    }
  }

  return results
}

export async function scrapeLeclerc(maxPerCategory = 200): Promise<ScrapedPrice[]> {
  const all: ScrapedPrice[] = []
  const maxPages = Math.ceil(maxPerCategory / 20)

  for (const cat of CATEGORIES) {
    try {
      const items = await scrapeLeclercCategory(cat, maxPages)
      all.push(...items)
      console.log(`[leclerc] ${cat}: ${items.length} items`)
    } catch (err) {
      console.error(`[leclerc] error in ${cat}:`, err)
    }
  }

  return all
}
