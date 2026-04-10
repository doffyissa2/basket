/**
 * POST /api/cron/sync-market-prices
 *
 * Fetches community prices from Open Food Facts filtered to French stores,
 * groups them by chain, and upserts into market_prices.
 *
 * Chains covered: Carrefour, Leclerc, Lidl, Aldi, Intermarché,
 *                 Super U / Système U, Monoprix, Casino, Franprix, Auchan.
 *
 * Strategy: fetch 100 pages (≤10,000 items) from OFF in parallel batches,
 * filter to French EUR prices, detect chain from store name, dedup per chain.
 */

import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual, createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(createHash('sha256').update(a).digest())
  const bufB = Buffer.from(createHash('sha256').update(b).digest())
  return timingSafeEqual(bufA, bufB)
}

const UA = 'Basket-App/1.0 (basket.fr; contact@basket.fr; free grocery price tool)'

// ── Chain detection ───────────────────────────────────────────────────────────

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

const SUPPORTED_CHAINS = new Set(CHAIN_PATTERNS.map(([, name]) => name))

function detectChain(storeName: string | null): string | null {
  if (!storeName) return null
  for (const [pattern, name] of CHAIN_PATTERNS) {
    if (pattern.test(storeName)) return name
  }
  return null
}

// ── Normalise product name ────────────────────────────────────────────────────

function normaliseProductName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── OFF API types ─────────────────────────────────────────────────────────────

interface OFFItem {
  price?: unknown
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

async function fetchPage(page: number): Promise<OFFItem[]> {
  const url = `https://prices.openfoodfacts.org/api/v1/prices?currency=EUR&order_by=-date&page=${page}&size=100`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return []
    const raw = await res.json() as Record<string, unknown>
    return Array.isArray(raw.items) ? raw.items as OFFItem[] : []
  } catch {
    return []
  }
}

// ── Auth ─────────────────────────────────────────────────────────────────────

function authorizeCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const provided = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  return safeCompare(provided, secret)
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch 100 pages in parallel batches of 10
  const TOTAL_PAGES = 100
  const BATCH_SIZE = 10
  const allItems: OFFItem[] = []

  for (let start = 1; start <= TOTAL_PAGES; start += BATCH_SIZE) {
    const pages = Array.from({ length: BATCH_SIZE }, (_, i) => start + i)
    const batches = await Promise.all(pages.map(p => fetchPage(p)))
    for (const b of batches) allItems.push(...b)
  }

  // Group by chain — one dedup set per chain keyed by normalised name
  type MarketRow = {
    store_chain: string
    product_name: string
    product_name_normalised: string
    ean: string | null
    unit_price: number
    unit: null
    category: string | null
    region: null
    source: string
    source_url: string
    scraped_at: string
  }

  const byChain = new Map<string, Map<string, MarketRow>>()
  const now = new Date().toISOString()

  for (const item of allItems) {
    if (item.currency !== 'EUR') continue
    if (typeof item.price !== 'number' || (item.price as number) <= 0.10 || (item.price as number) > 500) continue
    if (item.location?.osm_address_country_code !== 'FR') continue

    const chain = detectChain(item.location?.osm_name ?? null)
    if (!chain || !SUPPORTED_CHAINS.has(chain)) continue

    const name = (
      item.product_name ?? item.product?.product_name_fr ?? item.product?.product_name ?? ''
    ).trim()
    if (name.length < 3) continue

    const normName = normaliseProductName(name)

    if (!byChain.has(chain)) byChain.set(chain, new Map())
    const chainMap = byChain.get(chain)!
    if (chainMap.has(normName)) continue // dedup within chain

    const rawCats = item.product?.categories_tags ?? []
    const category = rawCats
      .map((t: string) => t.replace(/^[a-z]{2}:/, ''))
      .find((t: string) => !t.includes(':')) ?? null

    chainMap.set(normName, {
      store_chain: chain,
      product_name: name,
      product_name_normalised: normName,
      ean: item.product?.code ?? null,
      unit_price: Math.round((item.price as number) * 100) / 100,
      unit: null,
      category,
      region: null,
      source: chain.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_off',
      source_url: 'https://prices.openfoodfacts.org',
      scraped_at: now,
    })
  }

  // Upsert each chain
  const report: Record<string, number> = {}

  for (const [chain, rowMap] of byChain) {
    const rows = [...rowMap.values()]
    let upserted = 0

    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await supabase
        .from('market_prices')
        .upsert(rows.slice(i, i + 200), {
          onConflict: 'store_chain,product_name_normalised,region',
          ignoreDuplicates: false,
        })
      if (error) {
        console.error(`[sync-market-prices] ${chain} upsert error:`, error.message)
      } else {
        upserted += Math.min(200, rows.length - i)
      }
    }

    report[chain] = upserted
    console.log(`[sync-market-prices] ${chain}: ${rows.length} unique → ${upserted} upserted`)
  }

  // Zero out any supported chains that weren't seen in this run
  for (const chain of SUPPORTED_CHAINS) {
    if (!report[chain]) report[chain] = 0
  }

  return NextResponse.json({
    ok: true,
    report,
    total_upserted: Object.values(report).reduce((s, n) => s + n, 0),
    raw_items_fetched: allItems.length,
    elapsed_s: Math.round((Date.now() - startedAt) / 1000),
  })
}

export const GET = POST
