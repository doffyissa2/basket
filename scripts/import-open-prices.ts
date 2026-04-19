// scripts/import-open-prices.ts
//
// Bulk importer for Open Food Facts "Open Prices" data.
// Solves the cold-start problem by ingesting thousands of real French
// grocery prices into community_prices.
//
// Strategy:
//   1. Paginate the OFF Prices API (?currency=EUR, FR only)
//   2. Normalize names, detect chains, validate postcodes
//   3. Optionally match to store_locations via PostGIS RPC (50m radius)
//   4. Batch upsert into community_prices with dedup_key conflict handling
//
// Prerequisites:
//   - .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
//   - postgis-spatial-index-migration.sql applied (for store matching)
//   - match-store-rpc-migration.sql applied (for store matching)
//
// Run: npx tsx scripts/import-open-prices.ts [--pages 100] [--skip-store-match]
//
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const MAX_PAGES = parseInt(args[args.indexOf('--pages') + 1] || '100', 10)
const SKIP_STORE_MATCH = args.includes('--skip-store-match')
const BATCH_SIZE = 1000
const API_PAGE_SIZE = 100
const API_DELAY_MS = 500 // polite 500ms between requests
const UA = 'Basket-App/1.0 (basket.fr; contact@basket.fr; free grocery price tool)'

// ── Chain normaliser (mirrors sync-community-prices) ─────────────────────────

const CHAIN_PATTERNS: [RegExp, string][] = [
  [/leclerc/i, 'Leclerc'],
  [/lidl/i, 'Lidl'],
  [/aldi/i, 'Aldi'],
  [/intermarché|intermarche|itm/i, 'Intermarché'],
  [/carrefour/i, 'Carrefour'],
  [/super\s*u|hyper\s*u|u\s*express|utile/i, 'Super U'],
  [/monoprix|monop/i, 'Monoprix'],
  [/casino/i, 'Casino'],
  [/franprix/i, 'Franprix'],
  [/auchan/i, 'Auchan'],
  [/picard/i, 'Picard'],
  [/biocoop/i, 'Biocoop'],
  [/netto/i, 'Netto'],
  [/grand\s*frais/i, 'Grand Frais'],
]

function normalizeChain(raw: string | null): string | null {
  if (!raw) return null
  for (const [pattern, name] of CHAIN_PATTERNS) {
    if (pattern.test(raw)) return name
  }
  return raw.trim() || null
}

// ── Product name normaliser (inlined from src/lib/normalize.ts) ──────────────

const ACCENT_MAP: Record<string, string> = {
  à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a', å: 'a',
  è: 'e', é: 'e', ê: 'e', ë: 'e',
  ì: 'i', í: 'i', î: 'i', ï: 'i',
  ò: 'o', ó: 'o', ô: 'o', õ: 'o', ö: 'o',
  ù: 'u', ú: 'u', û: 'u', ü: 'u',
  ý: 'y', ÿ: 'y',
  ç: 'c', ñ: 'n', ø: 'o', æ: 'ae', œ: 'oe',
}

function normalizeProductName(str: string): string {
  const stripped = str.toLowerCase()
    .split('')
    .map(ch => ACCENT_MAP[ch] ?? ch)
    .join('')
  return stripped
    .replace(/[^a-z0-9\s.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── OFF Prices API types ─────────────────────────────────────────────────────

interface OFFApiResponse {
  items: Array<{
    price?: unknown
    currency?: string
    date?: string | null
    product_code?: string | null
    product_name?: string | null
    product?: {
      product_name_fr?: string | null
      product_name?: string | null
      code?: string | null
      brands?: string | null
    } | null
    location?: {
      osm_name?: string | null
      osm_display_name?: string | null
      osm_address_city?: string | null
      osm_address_postcode?: string | null
      osm_address_country_code?: string | null
      osm_lat?: number | null
      osm_lon?: number | null
    } | null
  }>
  total?: number
  page?: number
  size?: number
}

interface PriceItem {
  name: string
  price: number
  ean: string | null
  store: string | null
  store_address: string | null
  city: string | null
  postcode: string | null
  lat: number | null
  lon: number | null
  brand: string | null
  date: string | null
}

// ── Fetch a single page from OFF API ─────────────────────────────────────────

async function fetchPage(page: number): Promise<{ items: PriceItem[]; total: number }> {
  const url = `https://prices.openfoodfacts.org/api/v1/prices?currency=EUR&order_by=-date&page=${page}&size=${API_PAGE_SIZE}`
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'application/json' },
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) {
    throw new Error(`OFF API ${res.status}: ${res.statusText}`)
  }

  const raw = (await res.json()) as OFFApiResponse
  const list = raw.items ?? []
  const total = (raw.total as number) ?? 0

  const filtered = list
    .filter(i =>
      i.currency === 'EUR' &&
      typeof i.price === 'number' &&
      (i.price as number) > 0.10 &&
      (i.price as number) < 500 &&
      i.location?.osm_address_country_code === 'FR' &&
      !!(i.product_name ?? i.product?.product_name_fr ?? i.product?.product_name)
    )
    .map(i => {
      const rawPostcode = i.location?.osm_address_postcode ?? null
      const postcode = rawPostcode && /^\d{5}$/.test(rawPostcode.trim()) ? rawPostcode.trim() : null
      const rawBrand = i.product?.brands ?? null
      const brand = rawBrand ? rawBrand.split(',')[0].trim() || null : null
      return {
        name: (i.product_name ?? i.product?.product_name_fr ?? i.product?.product_name ?? '').trim(),
        price: i.price as number,
        ean: i.product?.code ?? i.product_code ?? null,
        store: i.location?.osm_name ?? null,
        store_address: i.location?.osm_display_name ?? null,
        city: i.location?.osm_address_city ?? null,
        postcode,
        lat: typeof i.location?.osm_lat === 'number' ? i.location.osm_lat : null,
        lon: typeof i.location?.osm_lon === 'number' ? i.location.osm_lon : null,
        brand,
        date: i.date ?? null,
      }
    })
    .filter(i => i.name.length > 2)

  return { items: filtered, total }
}

// ── Store matching via PostGIS RPC ───────────────────────────────────────────
// Enriches price items with store chain/postcode from our store_locations table
// when the OFF data has lat/lon but missing chain or postcode.

interface StoreMatch {
  osm_id: string
  siret: string | null
  name: string
  chain: string | null
  address: string | null
  postcode: string | null
  city: string | null
}

// Cache to avoid repeated RPC calls for nearby locations (bounded to 5000 entries)
const STORE_CACHE_MAX = 5000
const storeCache = new Map<string, StoreMatch | null>()

function locationKey(lat: number, lon: number): string {
  // Round to ~11m precision — good enough for same-store dedup
  return `${lat.toFixed(4)},${lon.toFixed(4)}`
}

async function matchStore(
  client: SupabaseClient,
  lat: number,
  lon: number,
): Promise<StoreMatch | null> {
  const key = locationKey(lat, lon)
  if (storeCache.has(key)) return storeCache.get(key)!

  try {
    const { data, error } = await client.rpc('match_store_by_location', {
      p_lat: lat,
      p_lon: lon,
      p_radius_m: 400,
    })

    if (error || !data || (Array.isArray(data) && data.length === 0)) {
      if (storeCache.size < STORE_CACHE_MAX) storeCache.set(key, null)
      return null
    }

    const row = Array.isArray(data) ? data[0] : data
    const match: StoreMatch = {
      osm_id: row.osm_id,
      siret: row.siret ?? null,
      name: row.name,
      chain: row.chain ?? null,
      address: row.address ?? null,
      postcode: row.postcode ?? null,
      city: row.city ?? null,
    }
    if (storeCache.size < STORE_CACHE_MAX) storeCache.set(key, match)
    return match
  } catch {
    if (storeCache.size < STORE_CACHE_MAX) storeCache.set(key, null)
    return null
  }
}

// ── Dedup key (same format as sync-community-prices cron) ────────────────────

function dedupKey(normName: string, price: number, source: string, date: string, chain: string): string {
  return `${normName}|${price.toFixed(2)}|${source}|${date}|${chain}`
}

// ── Community price row type ─────────────────────────────────────────────────

interface CommunityPriceRow {
  store_chain: string | null
  postcode: string | null
  postcode_dept: string | null
  item_name: string
  item_name_normalised: string
  unit_price: number
  ean: string | null
  brand: string | null
  city: string | null
  store_address: string | null
  latitude: number | null
  longitude: number | null
  source: string
  source_date: string | null
  processed_at: string
  dedup_key: string
}

// ── Batch upsert ─────────────────────────────────────────────────────────────

async function upsertBatch(
  client: SupabaseClient,
  rows: CommunityPriceRow[],
): Promise<{ inserted: number; errors: string[] }> {
  let inserted = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100)
    const { error } = await client
      .from('community_prices')
      .upsert(batch as Record<string, unknown>[], {
        onConflict: 'dedup_key',
        ignoreDuplicates: true,
      })

    if (error) {
      if (!errors.includes(error.message)) errors.push(error.message)
    } else {
      inserted += batch.length
    }
  }

  return { inserted, errors }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Open Prices Bulk Importer ===')
  console.log(`  Pages to fetch:    ${MAX_PAGES}`)
  console.log(`  Store matching:    ${SKIP_STORE_MATCH ? 'DISABLED' : 'ENABLED (400m PostGIS)'}`)
  console.log(`  Batch size:        ${BATCH_SIZE}`)
  console.log(`  API delay:         ${API_DELAY_MS}ms`)
  console.log()

  const now = new Date().toISOString()
  const seen = new Set<string>()
  const pendingRows: CommunityPriceRow[] = []

  let totalRaw = 0
  let totalFiltered = 0
  let totalInserted = 0
  let totalSkippedDedup = 0
  let totalStoreMatches = 0
  let totalApiTotal = 0
  const allErrors: string[] = []

  const startedAt = Date.now()

  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const { items, total } = await fetchPage(page)
      if (page === 1) {
        totalApiTotal = total
        console.log(`  Total prices in OFF DB: ${total.toLocaleString()}`)
        console.log()
      }

      totalRaw += API_PAGE_SIZE // approximate raw count
      totalFiltered += items.length

      for (const item of items) {
        const normName = normalizeProductName(item.name)
        let chain = normalizeChain(item.store) ?? ''
        let postcode = item.postcode
        let city = item.city
        let storeAddress = item.store_address

        // Try to enrich from store_locations if we have coordinates
        if (!SKIP_STORE_MATCH && item.lat !== null && item.lon !== null) {
          const match = await matchStore(supabase, item.lat, item.lon)
          if (match) {
            totalStoreMatches++
            // Prefer our store_locations data over OFF data
            if (match.chain) chain = normalizeChain(match.chain) ?? chain
            if (match.postcode && !postcode) postcode = match.postcode
            if (match.city && !city) city = match.city
            if (match.address && !storeAddress) storeAddress = match.address
          }
        }

        const sourceDate = item.date?.split('T')[0] ?? ''
        const key = dedupKey(normName, item.price, 'open_prices_import', sourceDate, chain)

        if (seen.has(key)) {
          totalSkippedDedup++
          continue
        }
        seen.add(key)

        const dept = postcode ? postcode.slice(0, 2) : null

        pendingRows.push({
          store_chain: chain || null,
          postcode: postcode ?? null,
          postcode_dept: dept,
          item_name: item.name,
          item_name_normalised: normName,
          unit_price: item.price,
          ean: item.ean,
          brand: item.brand,
          city: city ?? null,
          store_address: storeAddress ?? null,
          latitude: item.lat,
          longitude: item.lon,
          source: 'open_prices_import',
          source_date: sourceDate || null,
          processed_at: now,
          dedup_key: key,
        })

        // Flush when batch is full
        if (pendingRows.length >= BATCH_SIZE) {
          const { inserted, errors } = await upsertBatch(supabase, pendingRows.splice(0, BATCH_SIZE))
          totalInserted += inserted
          allErrors.push(...errors)
        }
      }

      // Progress
      const pct = ((page / MAX_PAGES) * 100).toFixed(0)
      process.stdout.write(
        `\r  Page ${page}/${MAX_PAGES} (${pct}%) | ${totalFiltered} filtered | ${totalInserted} inserted | ${totalSkippedDedup} deduped | ${totalStoreMatches} store-matched`
      )

      // If the API returned fewer items than page size, we've exhausted results
      if (items.length === 0 && page > 1) {
        console.log(`\n  No more results at page ${page} — stopping early`)
        break
      }
    } catch (err) {
      console.error(`\n  Page ${page} error: ${(err as Error).message}`)
      // Retry once after a longer delay
      await new Promise(r => setTimeout(r, 3000))
      try {
        const { items } = await fetchPage(page)
        totalFiltered += items.length
        for (const item of items) {
          const normName = normalizeProductName(item.name)
          const chain = normalizeChain(item.store) ?? ''
          const sourceDate = item.date?.split('T')[0] ?? ''
          const key = dedupKey(normName, item.price, 'open_prices_import', sourceDate, chain)
          if (seen.has(key)) continue
          seen.add(key)
          const dept = item.postcode ? item.postcode.slice(0, 2) : null
          pendingRows.push({
            store_chain: chain || null,
            postcode: item.postcode ?? null,
            postcode_dept: dept,
            item_name: item.name,
            item_name_normalised: normName,
            unit_price: item.price,
            ean: item.ean,
            brand: item.brand,
            city: item.city ?? null,
            store_address: item.store_address ?? null,
            latitude: item.lat,
            longitude: item.lon,
            source: 'open_prices_import',
            source_date: sourceDate || null,
            processed_at: now,
            dedup_key: key,
          })
        }
      } catch (retryErr) {
        console.error(`  Retry failed: ${(retryErr as Error).message} — skipping page ${page}`)
      }
    }

    // Polite delay between pages
    await new Promise(r => setTimeout(r, API_DELAY_MS))
  }

  // Flush remaining rows
  if (pendingRows.length > 0) {
    const { inserted, errors } = await upsertBatch(supabase, pendingRows)
    totalInserted += inserted
    allErrors.push(...errors)
  }

  const elapsed = Math.round((Date.now() - startedAt) / 1000)

  console.log('\n')
  console.log('=== Import Complete ===')
  console.log(`  OFF total available:  ${totalApiTotal.toLocaleString()}`)
  console.log(`  Pages fetched:        ${Math.min(MAX_PAGES, Math.ceil(totalApiTotal / API_PAGE_SIZE))}`)
  console.log(`  FR items filtered:    ${totalFiltered.toLocaleString()}`)
  console.log(`  In-memory deduped:    ${totalSkippedDedup.toLocaleString()}`)
  console.log(`  Store matches:        ${totalStoreMatches.toLocaleString()}`)
  console.log(`  Rows upserted:        ${totalInserted.toLocaleString()}`)
  console.log(`  Elapsed:              ${elapsed}s`)
  if (allErrors.length > 0) {
    console.log(`  Errors:               ${allErrors.length}`)
    for (const e of allErrors.slice(0, 5)) console.log(`    - ${e}`)
  }
  console.log()
}

main().catch(e => {
  console.error('\nFatal error:', e)
  process.exit(1)
})
