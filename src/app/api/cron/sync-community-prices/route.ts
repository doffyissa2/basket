/**
 * POST /api/cron/sync-community-prices
 *
 * Sources:
 *   - Open Food Facts Prices API (30 pages, ~3000 real FR prices per run)
 *   - User scans: price_items from the last 48 h, anonymised and merged
 *
 * Deduplication:
 *   - In-memory Set within each run
 *   - DB-level: unique index on dedup_key column (app-computed, inserted with each row)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const UA = 'Basket-App/1.0 (basket.fr; contact@basket.fr; free grocery price tool)'

// ── Store chain normaliser ───────────────────────────────────────────────────

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

function normaliseProductName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Open Food Facts Prices API ───────────────────────────────────────────────
// Community-submitted real prices from French stores. No auth, no IP block.
// Returns all fields available from the API including postcode, lat/lon, brand.

interface OFFPriceItem {
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

async function fetchOFFPrices(page = 1): Promise<OFFPriceItem[]> {
  const url = `https://prices.openfoodfacts.org/api/v1/prices?currency=EUR&order_by=-date&page=${page}&size=100`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) return []
    const raw = await res.json() as Record<string, unknown>
    const list = (Array.isArray(raw.items) ? raw.items : []) as Array<{
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
        lat?: number | null
        lon?: number | null
      } | null
    }>

    return list
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
        // Validate French 5-digit postcode
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
          lat: typeof i.location?.lat === 'number' ? i.location.lat : null,
          lon: typeof i.location?.lon === 'number' ? i.location.lon : null,
          brand,
          date: i.date ?? null,
        }
      })
      .filter(i => i.name.length > 2)
  } catch { return [] }
}

// ── Auth ─────────────────────────────────────────────────────────────────────

function authorizeCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) { console.error("[cron] CRON_SECRET not set — rejecting request"); return false }
  return req.headers.get('authorization') === `Bearer ${secret}`
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const mode = new URL(request.url).searchParams.get('mode')

  if (mode === 'test') {
    const offRes = await fetch('https://prices.openfoodfacts.org/api/v1/prices?currency=EUR&order_by=-date&page=1&size=20', {
      headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8_000),
    }).then(async r => {
      const j = await r.json() as Record<string, unknown>
      const list = (Array.isArray(j.items) ? j.items : []) as Array<Record<string, unknown>>
      const fr = list.filter(i => (i.location as Record<string, unknown> | null)?.osm_address_country_code === 'FR')
      const withNames = fr.filter(i => i.product_name || (i.product as Record<string, unknown> | null)?.product_name_fr || (i.product as Record<string, unknown> | null)?.product_name)
      return { status: r.status, ok: r.ok, total_items: list.length, fr_items: fr.length, fr_with_names: withNames.length, sample_name: (withNames[0] as Record<string, unknown> | undefined)?.product_name }
    }).catch(e => ({ status: 0, ok: false, error: String(e) }))

    return NextResponse.json({ open_food_facts_prices: offRes })
  }

  return POST(request)
}

// ── Shared row type for all sources ──────────────────────────────────────────
type CommunityPriceRow = {
  store_chain:          string | null
  postcode:             string | null
  postcode_dept:        string | null
  item_name:            string
  item_name_normalised: string
  unit_price:           number
  ean:                  string | null
  brand:                string | null
  city:                 string | null
  store_address:        string | null
  latitude:             number | null
  longitude:            number | null
  source:               string
  source_date:          string | null
  processed_at:         string
  // Application-computed dedup key (plain column, unique index).
  // Format: item_name_normalised|price|source|source_date|store_chain
  dedup_key:            string
}

// ── Upsert helper — uses dedup_key generated column ──────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertRows(
  supabase: any,
  rows: CommunityPriceRow[]
): Promise<{ inserted: number; errors: string[] }> {
  let inserted = 0
  const errors: string[] = []
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await supabase.from('community_prices')
      .upsert(rows.slice(i, i + 100) as Record<string, unknown>[], { onConflict: 'dedup_key', ignoreDuplicates: true })
    if (error) {
      console.error('[sync-community-prices] upsert error:', error.message)
      if (!errors.includes(error.message)) errors.push(error.message)
    } else {
      inserted += Math.min(100, rows.length - i)
    }
  }
  return { inserted, errors }
}

export async function POST(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const startedAt = Date.now()
  const now = new Date().toISOString()
  const report: Record<string, number> = {}
  const allErrors: string[] = []

  // ── In-memory dedup Set (sentinel '' for nullable fields) ────────────────
  // Prevents exact duplicates within a single cron run before they hit the DB.
  const seen = new Set<string>()
  function dedupKey(normName: string, price: number, source: string, date: string, chain: string) {
    return `${normName}|${price.toFixed(2)}|${source}|${date}|${chain}`
  }

  // ── Source 1: Open Food Facts Prices (30 pages = up to 3000 real FR prices) ─
  {
    const offPages = await Promise.all(
      Array.from({ length: 30 }, (_, i) => i + 1).map(p => fetchOFFPrices(p))
    )
    const rows: CommunityPriceRow[] = []

    for (const items of offPages) {
      for (const item of items) {
        const normName   = normaliseProductName(item.name)
        const chain      = normalizeChain(item.store) ?? ''
        const sourceDate = item.date?.split('T')[0] ?? ''
        const dept       = item.postcode ? item.postcode.slice(0, 2) : null

        const key = dedupKey(normName, item.price, 'open_food_facts_prices', sourceDate, chain)
        if (seen.has(key)) continue
        seen.add(key)

        rows.push({
          store_chain:          chain || null,
          postcode:             item.postcode,
          postcode_dept:        dept,
          item_name:            item.name,
          item_name_normalised: normName,
          unit_price:           item.price,
          ean:                  item.ean,
          brand:                item.brand,
          city:                 item.city,
          store_address:        item.store_address,
          latitude:             item.lat,
          longitude:            item.lon,
          source:               'open_food_facts_prices',
          source_date:          sourceDate || null,
          processed_at:         now,
          dedup_key:            key,
        })
      }
    }

    console.log(`[sync-community-prices] OFF: ${rows.length} unique items from ${offPages.flat().length} raw`)
    const { inserted, errors } = await upsertRows(supabase, rows)
    report.off_prices = inserted
    allErrors.push(...errors)
  }

  // ── Source 2: User scans harvested from price_items (last 48 h) ──────────
  // Real French receipt data — far higher quality than any web scraping.
  // Anonymised: no user_id, no receipt_id. Only price + store + location.
  {
    const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString()
    const { data: recentItems } = await supabase
      .from('price_items')
      .select('item_name, item_name_normalised, unit_price, store_chain, postcode, latitude, longitude, is_promo, created_at')
      .gte('created_at', since)
      .gt('unit_price', 0)
      .limit(2000)

    const rows: CommunityPriceRow[] = []

    for (const pi of recentItems ?? []) {
      const normName   = (pi.item_name_normalised as string) || normaliseProductName(pi.item_name as string)
      const chain      = (pi.store_chain as string) ?? ''
      const sourceDate = (pi.created_at as string)?.split('T')[0] ?? ''
      const dept       = (pi.postcode as string) ? (pi.postcode as string).slice(0, 2) : null

      const key = dedupKey(normName, pi.unit_price as number, 'user_scan', sourceDate, chain)
      if (seen.has(key)) continue
      seen.add(key)

      rows.push({
        store_chain:          chain || null,
        postcode:             (pi.postcode as string) || null,
        postcode_dept:        dept,
        item_name:            pi.item_name as string,
        item_name_normalised: normName,
        unit_price:           pi.unit_price as number,
        ean:                  null,
        brand:                null,
        city:                 null,
        store_address:        null,
        latitude:             (pi.latitude as number) || null,
        longitude:            (pi.longitude as number) || null,
        source:               'user_scan',
        source_date:          sourceDate || null,
        processed_at:         now,
        dedup_key:            key,
      })
    }

    console.log(`[sync-community-prices] user_scan: ${rows.length} unique items from ${recentItems?.length ?? 0} price_items`)
    const { inserted, errors } = await upsertRows(supabase, rows)
    report.user_scans = inserted
    allErrors.push(...errors)
  }

  return NextResponse.json({
    ok: true,
    report,
    total_inserted: Object.values(report).reduce((s, n) => s + n, 0),
    insert_errors: allErrors,
    elapsed_s: Math.round((Date.now() - startedAt) / 1000),
  })
}

