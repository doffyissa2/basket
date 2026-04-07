/**
 * Base scraper utilities — robots.txt checking, rate limiting, fetch wrapper.
 *
 * All chain-specific scrapers extend these helpers to stay legal and polite.
 * robots.txt compliance is mandatory. We cache results per host to avoid
 * refetching the file on every product request.
 */

const UA = 'Basket-App/1.0 (basket.fr; contact@basket.fr; free grocery price tool)'

// In-memory robots.txt cache (process-lifetime, ~per cold start)
const robotsCache = new Map<string, { disallowed: RegExp[]; fetchedAt: number }>()
const ROBOTS_TTL_MS = 60 * 60 * 1000 // 1 hour

async function fetchRobots(origin: string): Promise<{ disallowed: RegExp[] }> {
  const cached = robotsCache.get(origin)
  if (cached && Date.now() - cached.fetchedAt < ROBOTS_TTL_MS) return cached

  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(6_000),
    })
    if (!res.ok) return { disallowed: [] }
    const text = await res.text()

    let inOurBlock = false
    const disallowed: RegExp[] = []

    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.toLowerCase().startsWith('user-agent:')) {
        const agent = trimmed.split(':')[1].trim()
        inOurBlock = agent === '*' || agent.toLowerCase().includes('basket')
      }
      if (inOurBlock && trimmed.toLowerCase().startsWith('disallow:')) {
        const path = trimmed.split(':')[1].trim()
        if (path) {
          // Convert robots glob to regex
          const escaped = path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
          disallowed.push(new RegExp(`^${escaped}`))
        }
      }
    }

    const entry = { disallowed, fetchedAt: Date.now() }
    robotsCache.set(origin, entry)
    return entry
  } catch {
    // If we can't fetch robots.txt, assume permissive
    return { disallowed: [] }
  }
}

export async function isAllowed(url: string): Promise<boolean> {
  try {
    const { origin, pathname } = new URL(url)
    const { disallowed } = await fetchRobots(origin)
    return !disallowed.some((re) => re.test(pathname))
  } catch {
    return false
  }
}

// Simple in-process rate limiter: one slot per (host, delay_ms)
const lastFetchAt = new Map<string, number>()

async function politeWait(host: string, minDelayMs: number): Promise<void> {
  const last = lastFetchAt.get(host) ?? 0
  const wait = Math.max(0, last + minDelayMs - Date.now())
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastFetchAt.set(host, Date.now())
}

/**
 * Polite fetch: checks robots.txt, rate-limits, sets proper User-Agent.
 * Returns null if robots.txt disallows the path or on network error.
 */
export async function politeFetch(
  url: string,
  {
    minDelayMs = 2000,
    extraHeaders = {},
  }: { minDelayMs?: number; extraHeaders?: Record<string, string> } = {}
): Promise<Response | null> {
  const allowed = await isAllowed(url)
  if (!allowed) {
    console.warn(`[scraper] robots.txt disallows: ${url}`)
    return null
  }

  const { hostname } = new URL(url)
  await politeWait(hostname, minDelayMs)

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'application/json, text/html;q=0.9',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        ...extraHeaders,
      },
      signal: AbortSignal.timeout(15_000),
    })
    return res
  } catch (err) {
    console.error(`[scraper] fetch error for ${url}:`, err)
    return null
  }
}

export interface ScrapedPrice {
  chain: string
  productName: string
  productNameNormalised: string
  ean: string | null
  unitPrice: number
  unit: string | null
  category: string | null
  region: string | null
  sourceUrl: string
}

export function normaliseProductName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s]/g, ' ')   // keep alphanumeric
    .replace(/\s+/g, ' ')
    .trim()
}
