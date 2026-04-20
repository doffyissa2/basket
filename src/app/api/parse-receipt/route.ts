import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { checkRateLimit } from '@/lib/rate-limit'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase-service'

export const maxDuration = 10

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const userId = authResult.userId

  const [dailyLimit, burstLimit] = await Promise.all([
    checkRateLimit(request, 'parseReceipt', userId),
    checkRateLimit(request, 'parseReceiptBurst', userId),
  ])
  if (dailyLimit) return dailyLimit
  if (burstLimit) return burstLimit

  const body = await request.json()
  const images: Array<{ base64: string; mediaType: string }> = Array.isArray(body.images)
    ? body.images.map((img: { image_base64: string; media_type?: string }) => ({
        base64: img.image_base64,
        mediaType: img.media_type ?? 'image/jpeg',
      }))
    : body.image_base64
      ? [{ base64: body.image_base64, mediaType: body.media_type ?? 'image/jpeg' }]
      : []

  if (images.length === 0 || !images[0].base64) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  }
  if (images.length > 3) {
    return NextResponse.json({ error: 'Maximum 3 images per receipt' }, { status: 400 })
  }

  const MAX_BASE64_BYTES = 12 * 1024 * 1024
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  for (const img of images) {
    if (img.base64.length > MAX_BASE64_BYTES) {
      return NextResponse.json({ error: 'Image trop grande (max 9 Mo)' }, { status: 413 })
    }
    if (!ALLOWED_TYPES.includes(img.mediaType)) {
      return NextResponse.json({ error: 'Format non supporté' }, { status: 400 })
    }
  }

  const imageHash = createHash('sha256').update(images[0].base64).digest('hex')
  const supabase = getServiceClient()
  const postcode: string | null = typeof body.postcode === 'string' && body.postcode.length === 5
    ? body.postcode : null

  // Dedup: return cached result if same image was scanned before
  const { data: cachedReceipt } = await supabase
    .from('receipts')
    .select('id, store_chain, total_amount, store_address')
    .eq('user_id', userId)
    .eq('image_hash', imageHash)
    .maybeSingle()

  if (cachedReceipt) {
    const { data: cachedItems } = await supabase
      .from('price_items')
      .select('item_name, unit_price, quantity, is_promo, is_private_label, brand, volume_weight')
      .eq('receipt_id', cachedReceipt.id)

    if (cachedItems && cachedItems.length > 0) {
      return NextResponse.json({
        jobId: null,
        status: 'done',
        cached: true,
        receipt_id: cachedReceipt.id,
      })
    }

    // Stale cache entry — clean up
    await supabase.from('price_items').delete().eq('receipt_id', cachedReceipt.id)
    await supabase.from('receipts').delete().eq('id', cachedReceipt.id)
  }

  // Create scan job
  const jobId = crypto.randomUUID()
  const { error: jobErr } = await supabase.from('scan_jobs').insert({
    id: jobId,
    user_id: userId,
    status: 'pending',
    image_hash: imageHash,
    image_data: images.map(img => ({ base64: img.base64, mediaType: img.mediaType })),
    postcode: postcode,
  })

  if (jobErr) {
    console.error('[parse-receipt] Failed to create job:', jobErr.message)
    return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 })
  }

  // Trigger background worker (fire-and-forget)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const workerUrl = `${appUrl}/api/process-scan`
  console.log(`[parse-receipt] Job ${jobId} created. Triggering worker at ${workerUrl}`)

  fetch(workerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.INTERNAL_API_SECRET}`,
    },
    body: JSON.stringify({ jobId }),
  }).catch(err => {
    console.error('[parse-receipt] Failed to trigger worker:', err)
  })

  return NextResponse.json({ jobId, status: 'pending' })
}
