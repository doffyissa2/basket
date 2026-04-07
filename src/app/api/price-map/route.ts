import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

export interface StorePin {
  store_chain: string
  store_name: string
  lat: number
  lon: number
  avg_price: number
  item_count: number
  receipt_count: number
  top_items: { name: string; avg_price: number }[]
  price_tier: 'cheap' | 'mid' | 'expensive'
}

// Map feature temporarily disabled — returns empty pin set
export async function GET(request: NextRequest) {
  const rlResponse = await checkRateLimit(request, 'priceMap')
  if (rlResponse) return rlResponse

  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  return NextResponse.json({ pins: [] })
}
