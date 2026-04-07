/**
 * POST /api/cron/sync-community-prices
 *
 * Scrapes public French receipt posts from Reddit and Dealabs.
 * Uses Claude Haiku to extract structured price data from post text.
 * Applies a PII scrubbing pipeline before any data is written to the DB.
 *
 * Self-contained — no local imports to ensure clean Vercel builds.
 *
 * Sources:
 *   - Reddit: r/france, r/BudgetFrancais, r/consommation (public JSON API)
 *   - Dealabs: courses-supermarche group (public deal listings)
 *
 * Privacy (CNIL LIA):
 *   - PII stripped before LLM call
 *   - Only dept (2 chars) kept from postcodes, never full address
 *   - No Reddit user IDs stored
 *   - Raw text never written to disk or DB
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const UA = 'Basket-App/1.0 (basket.fr; contact@basket.fr; free grocery price tool)'

// ── PII scrubber ─────────────────────────────────────────────────────────────

function scrubPII(raw: string): string {
  return raw
    .replace(/FR\d{2}[\s]?[\d\s]{23,27}/gi, '[redacted]')             // IBAN
    .replace(/\b(?:\d[\s\-*x]{0,2}){13,19}\b/g, '[redacted]')         // card numbers
    .replace(/(?:n[°o]?\.?\s*)?(?:client|membre|carte|fidelite|fidélité|loyalty|card|member)[^\d]{0,10}\d{6,}/gi, '[redacted]') // member numbers
    .replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '[redacted]') // email
    .replace(/(?:(?:\+33|0033|0)[\s.-]?)(?:[1-9][\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2})/g, '[redacted]') // FR phone
    .replace(/\b\d{1,4}[\s,]+(?:rue|avenue|boulevard|impasse|allée|voie|chemin|place|passage|square|résidence|villa)[^\n,]{3,60}/gi, '[redacted]') // address lines
    .replace(/\b(?:Mme?\.?|M\.?|Monsieur|Madame|Mademoiselle|Dr\.?|Me\.?)\s+[A-ZÀ-Ÿ][a-zà-ÿ\-]{1,30}(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ\-]{1,30})?/g, '[redacted]') // civility+name
    .replace(/\b[A-Z]{2,6}[\s\-]?\d{6,20}\b/g, '[redacted]')          // transaction refs
    .replace(/\b\d{10,}\b/g, '[redacted]')                             // loyalty card numbers
    .replace(/(\[redacted\]\s*){2,}/g, '[redacted] ')
    .trim()
}

function depersonalizePostcode(postcode: string | null): string | null {
  if (!postcode) return null
  return postcode.replace(/\s/g, '').slice(0, 2)
}

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

// ── Claude Haiku extraction ──────────────────────────────────────────────────

const EXTRACT_PROMPT = `You are a grocery price extractor. Analyse this French receipt or shopping post and extract structured data.

Return a JSON object with this exact shape:
{
  "store_name": "store name or null",
  "postcode": "5-digit French postcode or null",
  "items": [
    { "name": "product name in French", "price": 1.23 }
  ]
}

Rules:
- Only include grocery/food items with a clear numeric price
- Ignore subtotals, taxes, loyalty discounts, delivery fees
- Prices must be between 0.10 and 200 euros
- If no clear items found, return { "store_name": null, "postcode": null, "items": [] }
- Respond ONLY with valid JSON, no markdown, no explanation`

interface ExtractedReceipt {
  storeName: string | null
  postcode: string | null
  items: Array<{ name: string; price: number }>
}

async function extractFromText(rawText: string): Promise<ExtractedReceipt | null> {
  const scrubbed = scrubPII(rawText)
  if (scrubbed.length < 30) return null

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: `${EXTRACT_PROMPT}\n\nTEXT:\n${scrubbed.slice(0, 3000)}` }],
      }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) return null
    const data = await res.json() as { content?: Array<{ type: string; text: string }> }
    const text = data.content?.[0]?.type === 'text' ? data.content[0].text.trim() : ''
    if (!text) return null

    const json = JSON.parse(text) as {
      store_name?: string | null
      postcode?: string | null
      items?: Array<{ name?: string; price?: unknown }>
    }

    return {
      storeName: json.store_name ?? null,
      postcode: json.postcode ?? null,
      items: (json.items ?? [])
        .filter(i => i.name && typeof i.price === 'number' && (i.price as number) > 0.10 && (i.price as number) < 200)
        .map(i => ({ name: String(i.name), price: Number(i.price) })),
    }
  } catch {
    return null
  }
}

// ── Dealabs scraper (regex — no AI needed) ───────────────────────────────────

interface DealabsDeal {
  title: string
  description?: string
  published_at?: string
  publishedAt?: string
  merchant?: { name?: string }
  store_name?: string
}

async function fetchDealabsDeals(limit = 50): Promise<DealabsDeal[]> {
  const url = `https://www.dealabs.com/groupe/courses-supermarche?format=json&order=new&limit=${limit}`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return []
    const data = await res.json() as { data?: DealabsDeal[]; threads?: DealabsDeal[] }
    return data.data ?? data.threads ?? []
  } catch { return [] }
}

// Extract "product name X,XX€" or "X,XX€ product name" patterns from deal text
function extractPricesFromText(text: string): Array<{ name: string; price: number }> {
  const results: Array<{ name: string; price: number }> = []
  const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

  // Pattern: "Nom du produit 1,99€" or "Nom du produit à 1,99 €"
  const afterName = /([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s\-']{3,40})\s+(?:à\s+)?(\d{1,3}[,\.]\d{2})\s*€/g
  let m: RegExpExecArray | null
  while ((m = afterName.exec(clean)) !== null) {
    const price = parseFloat(m[2].replace(',', '.'))
    if (price > 0.10 && price < 150) results.push({ name: m[1].trim(), price })
  }

  // Pattern: "1,99€ Nom du produit"
  const beforeName = /(\d{1,3}[,\.]\d{2})\s*€\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s\-']{3,40})/g
  while ((m = beforeName.exec(clean)) !== null) {
    const price = parseFloat(m[1].replace(',', '.'))
    if (price > 0.10 && price < 150) results.push({ name: m[2].trim(), price })
  }

  return results.slice(0, 10) // cap per deal
}

// ── Open Food Facts Prices API ───────────────────────────────────────────────
// Community-submitted real prices from French stores. No auth, no IP block.

async function fetchOFFPrices(page = 1): Promise<Array<{ name: string; price: number; store: string | null; date: string | null }>> {
  // Fetch recent EUR prices — no category filter (that filter returns 0 results)
  const url = `https://prices.openfoodfacts.org/api/v1/prices?currency=EUR&page=${page}&size=100`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) return []
    const raw = await res.json() as Record<string, unknown>

    // Handle both {items:[]} and {results:[]} response shapes
    const list = (Array.isArray(raw.items) ? raw.items : Array.isArray(raw.results) ? raw.results : []) as Array<{
      price?: unknown
      currency?: string
      date?: string | null
      product_name?: string
      product?: { product_name_fr?: string; product_name?: string }
      location?: { osm_name?: string; name?: string }
    }>

    return list
      .filter(i => i.currency === 'EUR' && typeof i.price === 'number' && (i.price as number) > 0.10 && (i.price as number) < 200)
      .map(i => ({
        name: i.product?.product_name_fr ?? i.product?.product_name ?? i.product_name ?? '',
        price: i.price as number,
        store: i.location?.osm_name ?? i.location?.name ?? null,
        date: i.date ?? null,
      }))
      .filter(i => i.name.length > 2)
  } catch { return [] }
}

// ── Auth ─────────────────────────────────────────────────────────────────────

function authorizeCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  return req.headers.get('authorization') === `Bearer ${secret}`
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const mode = new URL(request.url).searchParams.get('mode')

  if (mode === 'test') {
    const dealabsRes = await fetch('https://www.dealabs.com/groupe/courses-supermarche?format=json&order=new&limit=3', {
      headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8_000),
    }).then(async r => {
      const j = await r.json() as Record<string, unknown>
      return { status: r.status, ok: r.ok, keys: Object.keys(j), sample_count: Array.isArray(j.data) ? j.data.length : Array.isArray(j.threads) ? j.threads.length : 0 }
    }).catch(e => ({ status: 0, ok: false, error: String(e) }))

    const offRes = await fetch('https://prices.openfoodfacts.org/api/v1/prices?currency=EUR&page=1&size=5', {
      headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8_000),
    }).then(async r => {
      const j = await r.json() as Record<string, unknown>
      const list = Array.isArray(j.items) ? j.items : Array.isArray(j.results) ? j.results : []
      return { status: r.status, ok: r.ok, keys: Object.keys(j), sample_count: list.length, first: list[0] }
    }).catch(e => ({ status: 0, ok: false, error: String(e) }))

    return NextResponse.json({ dealabs: dealabsRes, open_food_facts_prices: offRes })
  }

  return POST(request)
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
  const rows: Array<{
    store_chain: string | null
    postcode_dept: string | null
    item_name: string
    item_name_normalised: string
    unit_price: number
    source: string
    source_date: string | null
    processed_at: string
  }> = []

  let postsProcessed = 0

  // ── Open Food Facts Prices API (works from any IP, no auth) ─────────────
  // ── Open Food Facts Prices (pages 1–5 = up to 500 real FR prices) ─────────
  const offPages = await Promise.all([1, 2, 3, 4, 5].map(p => fetchOFFPrices(p)))
  for (const items of offPages) {
    for (const item of items) {
      rows.push({
        store_chain: normalizeChain(item.store),
        postcode_dept: null,
        item_name: item.name,
        item_name_normalised: normaliseProductName(item.name),
        unit_price: item.price,
        source: 'open_food_facts_prices',
        source_date: item.date?.split('T')[0] ?? null,
        processed_at: new Date().toISOString(),
      })
      postsProcessed++
    }
  }
  console.log(`[sync-community-prices] OFF prices: ${rows.length} items`)

  // ── Dealabs (regex extraction — no AI key required) ──────────────────────
  const deals = await fetchDealabsDeals(50)
  for (const deal of deals) {
    const text = scrubPII([deal.title, deal.description ?? ''].join(' '))
    const items = extractPricesFromText(text)
    if (items.length === 0) continue

    postsProcessed++
    const storeName = deal.merchant?.name ?? deal.store_name ?? null
    const chain = normalizeChain(storeName)
    const date = (deal.published_at ?? deal.publishedAt ?? '').split('T')[0] || null

    for (const item of items) {
      rows.push({
        store_chain: chain,
        postcode_dept: null,
        item_name: item.name,
        item_name_normalised: normaliseProductName(item.name),
        unit_price: item.price,
        source: 'dealabs',
        source_date: date,
        processed_at: new Date().toISOString(),
      })
    }
  }
  console.log(`[sync-community-prices] Dealabs: ${deals.length} deals processed`)

  console.log(`[sync-community-prices] ${postsProcessed} posts → ${rows.length} items`)

  let inserted = 0
  for (let i = 0; i < rows.length; i += 100) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('community_prices') as any)
      .insert(rows.slice(i, i + 100))
    if (error) console.error('[sync-community-prices] insert error:', error.message)
    else inserted += Math.min(100, rows.length - i)
  }

  return NextResponse.json({
    ok: true,
    posts_processed: postsProcessed,
    items_extracted: rows.length,
    inserted,
    elapsed_s: Math.round((Date.now() - startedAt) / 1000),
  })
}

