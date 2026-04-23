import { NextRequest, NextResponse } from 'next/server'
import { requireBetaAccess } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getServiceClient } from '@/lib/supabase-service'
import { normalizeProductName } from '@/lib/normalize'

/**
 * POST /api/trigger-stats-refresh
 *
 * Fire-and-forget endpoint called after each receipt scan.
 *
 * Steps (all in background, returns 202 immediately):
 *  1. Upsert the calling user's price_items from the last 2 h into community_prices
 *     (same anonymisation the nightly cron uses — closes the cron-delay gap)
 *  2. Rebuild product_price_stats so compare-prices reflects the fresh data
 *  3. Rebuild price_weekly for trend charts
 */

function dedupKey(
  normName: string,
  price: number,
  source: string,
  date: string,
  chain: string
): string {
  return `${normName}|${price.toFixed(2)}|${source}|${date}|${chain}`
}

export async function POST(request: NextRequest) {
  const authResult = await requireBetaAccess(request)
  if (authResult instanceof NextResponse) return authResult

  const rlResponse = await checkRateLimit(request, 'triggerStatsRefresh', authResult.userId)
  if (rlResponse) return rlResponse

  const supabase = getServiceClient()
  const userId = authResult.userId

  // Return 202 immediately — all DB work is fire-and-forget
  void (async () => {
    try {
      // ── Step 1: Push this user's recent price_items → community_prices ──
      // Last 2 hours to catch any scan that just happened.
      const since = new Date(Date.now() - 2 * 3600 * 1000).toISOString()
      const now = new Date().toISOString()

      const { data: recentItems } = await supabase
        .from('price_items')
        .select('item_name, item_name_normalised, unit_price, store_chain, postcode, latitude, longitude, created_at')
        .eq('user_id', userId)
        .gte('created_at', since)
        .gt('unit_price', 0)
        .limit(200)

      if (recentItems && recentItems.length > 0) {
        type CommunityRow = {
          store_chain: string | null
          postcode: string | null
          postcode_dept: string | null
          item_name: string
          item_name_normalised: string
          unit_price: number
          ean: null
          brand: null
          city: null
          store_address: null
          latitude: number | null
          longitude: number | null
          source: string
          source_date: string | null
          processed_at: string
          dedup_key: string
        }

        const rows: CommunityRow[] = []
        for (const pi of recentItems) {
          const normName = (pi.item_name_normalised as string) || normalizeProductName(pi.item_name as string)
          const chain = (pi.store_chain as string) ?? ''
          const sourceDate = (pi.created_at as string)?.split('T')[0] ?? ''
          const dept = (pi.postcode as string) ? (pi.postcode as string).slice(0, 2) : null
          const key = dedupKey(normName, pi.unit_price as number, 'user_scan', sourceDate, chain)

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

        if (rows.length > 0) {
          const { error } = await supabase
            .from('community_prices')
            .upsert(rows, { onConflict: 'dedup_key', ignoreDuplicates: true })
          if (error) console.error('[trigger-stats-refresh] community upsert error:', error.message)
        }
      }

      // ── Step 2 & 3: Rebuild stats so compare-prices sees the new data ───
      const results = await Promise.allSettled([
        supabase.rpc('rebuild_price_stats'),
        supabase.rpc('rebuild_weekly_trends'),
      ])
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.error) {
          console.error('[trigger-stats-refresh] RPC error:', r.value.error.message)
        }
      }
    } catch (err) {
      console.error('[trigger-stats-refresh] background error:', err)
    }
  })()

  return NextResponse.json({ queued: true }, { status: 202 })
}
