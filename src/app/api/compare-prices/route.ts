import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { getRequestContextWithBody } from '@/lib/request-context'
import { getServiceClient } from '@/lib/supabase-service'
import { comparePrices } from '@/lib/compare-prices'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const ctx = await getRequestContextWithBody(request, body)
  if (ctx instanceof NextResponse) return ctx

  const rateLimitResponse = await checkRateLimit(request, 'comparePrices', ctx.userId)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { items, store_chain } = body
    const { dept } = ctx

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 })
    }

    if (items.length > 50) {
      return NextResponse.json({ error: 'Too many items (max 50)' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const result = await comparePrices(supabase, items, store_chain, dept)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Compare prices error:', error)
    return NextResponse.json(
      { error: 'Failed to compare prices' },
      { status: 500 },
    )
  }
}
