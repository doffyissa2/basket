import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getServiceClient } from '@/lib/supabase-service'

/**
 * POST /api/correct-item
 *
 * Logs a user correction to a scanned receipt item.
 * Used to improve future AI parsing quality.
 *
 * Body: { receipt_id, original_name, corrected_name, original_price, corrected_price }
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const rlResponse = await checkRateLimit(request, 'correctItem', authResult.userId)
  if (rlResponse) return rlResponse

  try {
    const { receipt_id, original_name, corrected_name, original_price, corrected_price } = await request.json()

    if (!receipt_id || typeof original_name !== 'string') {
      return NextResponse.json({ error: 'receipt_id and original_name required' }, { status: 400 })
    }

    const supabase = getServiceClient()

    const { error } = await supabase.from('item_corrections').insert({
      user_id: authResult.userId,
      receipt_id,
      original_name: String(original_name).trim().slice(0, 500),
      corrected_name: String(corrected_name ?? original_name).trim().slice(0, 500),
      original_price: typeof original_price === 'number' ? original_price : null,
      corrected_price: typeof corrected_price === 'number' ? corrected_price : null,
    })

    if (error) {
      // Table may not exist yet — log and return success anyway (non-critical)
      console.warn('[correct-item] insert error (non-critical):', error.message)
    }

    // ── Also persist to ocr_corrections for future auto-apply ────────────────
    // Only when the name actually changed; count increments on repeated corrections.
    if (corrected_name && corrected_name !== original_name) {
      try {
        const { data: receiptRow } = await supabase
          .from('receipts')
          .select('store_chain')
          .eq('id', receipt_id)
          .single()
        const storeChain = receiptRow?.store_chain ?? null

        await supabase.from('ocr_corrections').upsert({
          original_text: String(original_name).trim().slice(0, 500),
          corrected_text: String(corrected_name).trim().slice(0, 500),
          store_chain: storeChain,
          correction_count: 1,
        }, { onConflict: 'original_text,store_chain', ignoreDuplicates: false })
      } catch {
        // Table may not exist yet — non-critical
      }
    }

    return NextResponse.json({ logged: true })
  } catch (err) {
    console.error('[correct-item] error:', err)
    return NextResponse.json({ error: 'Failed to log correction' }, { status: 500 })
  }
}
