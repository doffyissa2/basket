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

// ── Reddit scraper ───────────────────────────────────────────────────────────

const SUBREDDITS = ['france', 'BudgetFrancais', 'consommation', 'vegan_france']
const SEARCH_TERMS = ['ticket caisse', 'courses supermarché', 'prix supermarché', 'faire ses courses']

interface RedditPost {
  title: string
  selftext: string
  created_utc: number
  permalink: string
}

async function fetchRedditPosts(subreddit: string, query: string, limit = 15): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&sort=new&limit=${limit}&restrict_sr=1`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []
    const data = await res.json() as { data?: { children?: Array<{ data: RedditPost }> } }
    return (data.data?.children ?? []).map(c => c.data)
  } catch {
    return []
  }
}

// ── Dealabs scraper ──────────────────────────────────────────────────────────

interface DealabsDeal {
  title: string
  description: string
  publishedAt: string
}

async function fetchDealabsDeals(limit = 25): Promise<DealabsDeal[]> {
  const url = `https://www.dealabs.com/groupe/courses-supermarche?format=json&order=new&limit=${limit}`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []
    const data = await res.json() as { data?: DealabsDeal[] }
    return data.data ?? []
  } catch {
    return []
  }
}

// ── Open Food Facts — public French product prices ───────────────────────────
// No auth, no IP restrictions, 3M+ products, free forever.

interface OFFProduct {
  product_name_fr?: string
  product_name?: string
  categories_tags?: string[]
  stores?: string
  price?: number
  prices?: Array<{ price: number; currency: string; date: string; location_osm_id?: string }>
}

async function fetchOFFPrices(category: string, page = 1): Promise<Array<{ name: string; price: number; store: string | null; date: string | null }>> {
  const url = `https://prices.openfoodfacts.org/api/v1/prices?category_tag=${encodeURIComponent(category)}&currency=EUR&page=${page}&page_size=50`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []
    const data = await res.json() as {
      items?: Array<{
        price: number
        currency: string
        date: string | null
        product?: { product_name?: string; product_name_fr?: string; stores_tags?: string[] }
        location?: { osm_name?: string }
      }>
    }
    return (data.items ?? [])
      .filter(i => i.currency === 'EUR' && i.price > 0.10 && i.price < 200 && i.product?.product_name_fr)
      .map(i => ({
        name: i.product!.product_name_fr ?? i.product!.product_name ?? '',
        price: i.price,
        store: i.location?.osm_name ?? null,
        date: i.date ?? null,
      }))
  } catch {
    return []
  }
}

const OFF_CATEGORIES = [
  'en:fresh-foods', 'en:dairy-products', 'en:meats', 'en:fruits',
  'en:vegetables', 'en:breads', 'en:beverages', 'en:frozen-foods',
  'en:snacks', 'en:cereals-and-potatoes',
]

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
    // Test each source individually to see which ones work from Vercel's IP
    const redditRes = await fetch('https://www.reddit.com/r/france/search.json?q=courses&sort=new&limit=3&restrict_sr=1', {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(8_000),
    }).then(r => ({ status: r.status, ok: r.ok })).catch(e => ({ status: 0, ok: false, error: String(e) }))

    const dealabsRes = await fetch('https://www.dealabs.com/groupe/courses-supermarche?format=json&order=new&limit=3', {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(8_000),
    }).then(r => ({ status: r.status, ok: r.ok })).catch(e => ({ status: 0, ok: false, error: String(e) }))

    const offRes = await fetch('https://prices.openfoodfacts.org/api/v1/prices?category_tag=en:dairy-products&currency=EUR&page_size=3', {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(8_000),
    }).then(async r => ({ status: r.status, ok: r.ok, sample: r.ok ? (await r.json() as { items?: unknown[] }).items?.length : 0 }))
      .catch(e => ({ status: 0, ok: false, error: String(e) }))

    return NextResponse.json({ reddit: redditRes, dealabs: dealabsRes, open_food_facts_prices: offRes })
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
  for (const category of OFF_CATEGORIES) {
    const items = await fetchOFFPrices(category)
    for (const item of items) {
      if (!item.name) continue
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

  console.log(`[sync-community-prices] OFF: ${rows.length} items`)

  // ── Reddit ──────────────────────────────────────────────────────────────
  for (const subreddit of SUBREDDITS) {
    for (const term of SEARCH_TERMS.slice(0, 2)) { // 2 terms per subreddit to limit volume
      const posts = await fetchRedditPosts(subreddit, term, 10)
      for (const post of posts) {
        const text = [post.title, post.selftext].join('\n').trim()
        if (text.length < 40) continue

        const extracted = await extractFromText(text)
        if (!extracted || extracted.items.length === 0) continue

        postsProcessed++
        const chain = normalizeChain(extracted.storeName)
        const dept = depersonalizePostcode(extracted.postcode)
        const date = new Date(post.created_utc * 1000).toISOString().split('T')[0]

        for (const item of extracted.items) {
          rows.push({
            store_chain: chain,
            postcode_dept: dept,
            item_name: item.name,
            item_name_normalised: normaliseProductName(item.name),
            unit_price: item.price,
            source: `reddit_${subreddit}`,
            source_date: date,
            processed_at: new Date().toISOString(),
          })
        }

        // Polite delay between Haiku calls
        await new Promise(r => setTimeout(r, 800))
      }
    }
  }

  // ── Dealabs ─────────────────────────────────────────────────────────────
  const deals = await fetchDealabsDeals(20)
  for (const deal of deals) {
    const text = [deal.title, deal.description].join('\n').trim()
    if (text.length < 40) continue

    const extracted = await extractFromText(text)
    if (!extracted || extracted.items.length === 0) continue

    postsProcessed++
    const chain = normalizeChain(extracted.storeName)
    const dept = depersonalizePostcode(extracted.postcode)

    for (const item of extracted.items) {
      rows.push({
        store_chain: chain,
        postcode_dept: dept,
        item_name: item.name,
        item_name_normalised: normaliseProductName(item.name),
        unit_price: item.price,
        source: 'dealabs',
        source_date: deal.publishedAt?.split('T')[0] ?? null,
        processed_at: new Date().toISOString(),
      })
    }

    await new Promise(r => setTimeout(r, 800))
  }

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

