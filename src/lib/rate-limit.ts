import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

// ── Lazy-initialised Redis client ──────────────────────────────────────────
// Returns null if env vars are not configured — rate limiting is skipped
// gracefully rather than crashing the app.
function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

// ── Rate limiter factory ────────────────────────────────────────────────────
// Creates a sliding-window limiter for a given route.
// Returns null if Redis is unavailable.
function makeLimiter(requests: number, windowSeconds: number): Ratelimit | null {
  const redis = getRedis()
  if (!redis) return null
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
    prefix: 'basket_rl',
  })
}

// Pre-configured limiters — instantiated once at module level
const limiters = {
  // 10 scans/min per IP — Claude Vision is expensive
  parseReceipt: makeLimiter(10, 60),
  // 30 comparisons/min per IP — DB heavy but cheaper
  comparePrices: makeLimiter(30, 60),
  // 20 geocode/min per IP — proxies Nominatim
  reverseGeocode: makeLimiter(20, 60),
  // 30 trend queries/min per IP
  priceTrend: makeLimiter(30, 60),
  // 20 basket-index queries/min per IP
  basketIndex: makeLimiter(20, 60),
  // 20 map pin queries/min per IP
  priceMap: makeLimiter(20, 60),
  // 10 best-store computations/min per IP — per-item DB queries
  shoppingListBestStore: makeLimiter(10, 60),
  // 30 stats refresh triggers/min per IP (fire-and-forget post-scan)
  triggerStatsRefresh: makeLimiter(30, 60),
  // 20 unknown-store logs/min per IP
  logUnknownStore: makeLimiter(20, 60),
  // 10 receipt format learning calls/min per IP
  learnReceiptFormat: makeLimiter(10, 60),
  // Cron jobs — 5/min (should be 1 call per run, protects against abuse)
  syncStoreLocations: makeLimiter(5, 60),
  syncMarketPrices: makeLimiter(5, 60),
  syncCommunityPrices: makeLimiter(5, 60),
  // Public forms — tight limits to prevent spam/flooding
  contact: makeLimiter(5, 3600),      // 5 messages per hour per IP
  newsletter: makeLimiter(3, 3600),   // 3 attempts per hour per IP
  deleteAccount: makeLimiter(3, 3600), // 3 attempts per hour per user
} as const

export type LimiterKey = keyof typeof limiters

// ── Identifier helper ────────────────────────────────────────────────────────
// Prefers an explicit userId (stable across IPs, VPNs, mobile networks).
// Falls back to the real client IP when no userId is available.
function getIdentifier(request: NextRequest, userId?: string): string {
  if (userId) return `user:${userId}`
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

// ── Main check function ──────────────────────────────────────────────────────
// Returns null if the request is allowed, or a 429 NextResponse if it is not.
// If Upstash is not configured, always returns null (allow).
// Pass userId (from requireAuth) to enforce per-user limits instead of per-IP.
export async function checkRateLimit(
  request: NextRequest,
  limiterKey: LimiterKey,
  userId?: string
): Promise<NextResponse | null> {
  const limiter = limiters[limiterKey]

  // No Redis configured — skip gracefully
  if (!limiter) return null

  const identifier = getIdentifier(request, userId)

  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier)

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000)
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(reset),
            'Retry-After': String(retryAfter),
          },
        }
      )
    }

    // Request is within limits — caller continues normally
    return null
  } catch (err) {
    // Upstash unreachable — fail open (don't block users due to Redis outage)
    console.error('[rate-limit] Redis error, skipping limit:', err)
    return null
  }
}
