/**
 * Community receipt scraper — Reddit + Dealabs
 *
 * Sources:
 * - Reddit r/france, r/BudgetFrancais (public JSON API — no auth required)
 * - Dealabs.com courses alimentaires group (public deal listings)
 *
 * Privacy pipeline (CNIL LIA compliant):
 * 1. Fetch in-memory only (no raw image/text written to disk)
 * 2. Run PII scrubber before any DB write
 * 3. Extract only: store chain, dept (not full postcode), item, price
 * 4. Never link data to a Reddit user ID
 *
 * robots.txt: Reddit allows non-commercial bots indexing public content.
 * Dealabs.com allows crawlers for their public deal pages.
 */

import { scrubPII, depersonalizePostcode } from '../pii-scrubber'
import { normaliseProductName } from './base'
import { normalizeStoreChain } from '../store-chains'

const UA = 'Basket-App/1.0 (basket.fr; contact@basket.fr; free grocery price tool)'

export interface CommunityPrice {
  storeChain: string | null
  postcodeDept: string | null // dept only (2 chars), never full postcode
  itemName: string
  itemNameNormalised: string
  unitPrice: number
  source: 'reddit' | 'dealabs'
  sourceDate: string | null
}

// ── Reddit ─────────────────────────────────────────────────────────────────

const REDDIT_SUBREDDITS = ['france', 'BudgetFrancais', 'consommation']
const RECEIPT_KEYWORDS = 'ticket caisse OR courses alimentaires OR supermarché prix'

interface RedditPost {
  data: {
    title: string
    selftext: string
    url: string
    is_self: boolean
    created_utc: number
    url_overridden_by_dest?: string
  }
}

async function fetchRedditPosts(subreddit: string, limit = 25): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(RECEIPT_KEYWORDS)}&sort=new&limit=${limit}&restrict_sr=1`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []
    const data = await res.json() as { data?: { children?: RedditPost[] } }
    return data.data?.children ?? []
  } catch {
    return []
  }
}

// ── Dealabs ────────────────────────────────────────────────────────────────

interface DealabsDeal {
  title: string
  description: string
  publishedAt: string
  threadId: string
}

async function fetchDealabsDeals(limit = 30): Promise<DealabsDeal[]> {
  const url = 'https://www.dealabs.com/groupe/courses-supermarche?format=json&order=new&limit=' + limit

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

// ── Claude Vision extraction ───────────────────────────────────────────────

const EXTRACT_PROMPT = `You are a grocery price extractor. Analyse this receipt text and extract structured data.

Return a JSON object with this exact shape:
{
  "store_name": "store name or null",
  "postcode": "5-digit French postcode or null",
  "items": [
    { "name": "product name", "price": 1.23 }
  ]
}

Rules:
- Only include items with a clear price (numbers only, no currency symbols)
- Ignore subtotals, taxes, loyalty discounts, deposit fees
- If no items found, return { "store_name": null, "postcode": null, "items": [] }
- Respond ONLY with valid JSON, no markdown`

async function extractFromText(rawText: string): Promise<{
  storeName: string | null
  postcode: string | null
  items: Array<{ name: string; price: number }>
} | null> {
  const scrubbed = scrubPII(rawText)
  if (scrubbed.length < 20) return null

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `${EXTRACT_PROMPT}\n\nRECEIPT TEXT:\n${scrubbed.slice(0, 3000)}`,
        }],
      }),
    })

    if (!res.ok) return null
    const data = await res.json() as { content?: Array<{ type: string; text: string }> }
    const text = data.content?.[0]?.type === 'text' ? data.content[0].text : ''
    const json = JSON.parse(text) as {
      store_name?: string | null
      postcode?: string | null
      items?: Array<{ name?: string; price?: unknown }>
    }

    return {
      storeName: json.store_name ?? null,
      postcode: json.postcode ?? null,
      items: (json.items ?? [])
        .filter((i) => i.name && typeof i.price === 'number' && i.price > 0 && i.price < 500)
        .map((i) => ({ name: String(i.name), price: Number(i.price) })),
    }
  } catch {
    return null
  }
}

// ── Main export ────────────────────────────────────────────────────────────

/**
 * Scrapes Reddit and Dealabs for public receipt posts and extracts
 * anonymized price data. Never saves raw content — processes in memory only.
 */
export async function scrapeCommunityPrices(): Promise<CommunityPrice[]> {
  const results: CommunityPrice[] = []

  // Reddit
  for (const subreddit of REDDIT_SUBREDDITS) {
    const posts = await fetchRedditPosts(subreddit)
    for (const post of posts) {
      const text = [post.data.title, post.data.selftext].join('\n')
      if (text.length < 30) continue

      const extracted = await extractFromText(text)
      if (!extracted || extracted.items.length === 0) continue

      const chain = extracted.storeName
        ? normalizeStoreChain(extracted.storeName)
        : null
      const dept = depersonalizePostcode(extracted.postcode)
      const date = new Date(post.data.created_utc * 1000).toISOString().split('T')[0]

      for (const item of extracted.items) {
        results.push({
          storeChain: chain,
          postcodeDept: dept,
          itemName: item.name,
          itemNameNormalised: normaliseProductName(item.name),
          unitPrice: item.price,
          source: 'reddit',
          sourceDate: date,
        })
      }

      // Polite delay between LLM calls
      await new Promise((r) => setTimeout(r, 1000))
    }
  }

  // Dealabs
  const deals = await fetchDealabsDeals()
  for (const deal of deals) {
    const text = [deal.title, deal.description].join('\n')
    const extracted = await extractFromText(text)
    if (!extracted || extracted.items.length === 0) continue

    const chain = extracted.storeName
      ? normalizeStoreChain(extracted.storeName)
      : null
    const dept = depersonalizePostcode(extracted.postcode)

    for (const item of extracted.items) {
      results.push({
        storeChain: chain,
        postcodeDept: dept,
        itemName: item.name,
        itemNameNormalised: normaliseProductName(item.name),
        unitPrice: item.price,
        source: 'dealabs',
        sourceDate: deal.publishedAt?.split('T')[0] ?? null,
      })
    }

    await new Promise((r) => setTimeout(r, 1000))
  }

  return results
}
