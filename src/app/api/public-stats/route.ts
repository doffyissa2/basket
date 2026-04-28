/**
 * GET /api/public-stats
 *
 * Public endpoint — no auth required (landing page counters).
 * Returns live counts for: shop locations, scanned receipts, products in DB.
 *
 * Cached at the edge for 1 hour to keep DB hits negligible even under
 * heavy landing-page traffic.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-service'
import { checkRateLimit } from '@/lib/rate-limit'

export const revalidate = 3600

export async function GET(request: NextRequest) {
  const rlResponse = await checkRateLimit(request, 'publicStats')
  if (rlResponse) return rlResponse

  const supabase = getServiceClient()

  const [storesRes, receiptsRes, productsRes] = await Promise.all([
    supabase.from('store_locations').select('id', { count: 'exact', head: true }),
    supabase.from('receipts').select('id', { count: 'exact', head: true }),
    supabase.from('product_price_stats').select('item_name_normalised', { count: 'exact', head: true }),
  ])

  return NextResponse.json(
    {
      stores:   storesRes.count   ?? 0,
      receipts: receiptsRes.count ?? 0,
      products: productsRes.count ?? 0,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  )
}
