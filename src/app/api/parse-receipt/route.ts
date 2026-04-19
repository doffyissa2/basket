import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { Redis } from '@upstash/redis'
import { checkRateLimit } from '@/lib/rate-limit'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase-service'

// ── Phase 1: Fast Path ──────────────────────────────────────────────────────
// Auth → rate limit → image validation → dedup check → Haiku gatekeeper
// → create scan_jobs row → trigger background worker → return job_id
//
// Target: <3 seconds. All heavy processing (Sonnet, location, DB inserts)
// happens in /api/process-scan (Phase 2).

function getScanRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

// ── Haiku receipt gatekeeper ────────────────────────────────────────────────
// Cheap yes/no check before committing to Sonnet.
// Fails open — a gatekeeper error never blocks a legitimate user.
async function isReceiptImage(
  apiKey: string,
  image: { base64: string; mediaType: string }
): Promise<boolean> {
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
        max_tokens: 5,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
            { type: 'text', text: 'Is this a grocery or retail store receipt? Reply ONLY "yes" or "no".' },
          ],
        }],
      }),
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return true  // fail open
    const data = await res.json()
    const answer = (data.content?.[0]?.text ?? '').trim().toLowerCase()
    return answer.startsWith('yes')
  } catch {
    return true  // fail open — gatekeeper errors must never block real scans
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  // Layer 1: daily cap (10/day) + burst cap (3/min) — checked in parallel
  const [dailyLimit, burstLimit] = await Promise.all([
    checkRateLimit(request, 'parseReceipt', authResult.userId),
    checkRateLimit(request, 'parseReceiptBurst', authResult.userId),
  ])
  if (dailyLimit) return dailyLimit
  if (burstLimit) return burstLimit

  // Layer 2: block users with ≥5 consecutive failed scans (abuse signal)
  const redis = getScanRedis()
  const failKey = `basket_scan_fails:${authResult.userId}`
  if (redis) {
    const consecutiveFails = await redis.get<number>(failKey).catch(() => null)
    if ((consecutiveFails ?? 0) >= 5) {
      return NextResponse.json(
        { error: 'Trop de tentatives invalides. Contactez le support si c\'est une erreur.' },
        { status: 429 }
      )
    }
  }

  try {
    const body = await request.json()

    // Support both single image (legacy) and multi-part arrays
    const images: Array<{ base64: string; mediaType: string }> = Array.isArray(body.images)
      ? body.images.map((img: { image_base64: string; media_type?: string }) => ({
          base64: img.image_base64,
          mediaType: img.media_type ?? 'image/jpeg',
        }))
      : [{ base64: body.image_base64, mediaType: body.media_type ?? 'image/jpeg' }]

    if (images.length === 0 || !images[0].base64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }
    if (images.length > 3) {
      return NextResponse.json({ error: 'Maximum 3 images per receipt' }, { status: 400 })
    }

    const MAX_BASE64_BYTES = 12 * 1024 * 1024 // ~9 MB file → ~12 MB base64
    const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    for (const img of images) {
      if (img.base64.length > MAX_BASE64_BYTES) {
        return NextResponse.json({ error: 'Image trop grande (max 9 Mo)' }, { status: 413 })
      }
      if (!ALLOWED_MEDIA_TYPES.includes(img.mediaType)) {
        return NextResponse.json({ error: 'Format non supporté' }, { status: 400 })
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    // ── Image hash dedup — return cached result instantly ────────────────
    const imageHash = createHash('sha256').update(images[0].base64).digest('hex')
    const supabase = getServiceClient()

    const { data: cachedReceipt } = await supabase
      .from('receipts')
      .select('id, store_chain, total_amount, raw_ocr_text, store_address, receipt_date, image_url')
      .eq('user_id', authResult.userId)
      .eq('image_hash', imageHash)
      .maybeSingle()

    if (cachedReceipt) {
      const { data: cachedItems } = await supabase
        .from('price_items')
        .select('item_name, unit_price, quantity, is_promo, is_private_label, brand, volume_weight')
        .eq('receipt_id', cachedReceipt.id)

      console.log(`[parse-receipt] cache hit for user ${authResult.userId} (hash ${imageHash.slice(0, 8)}…)`)
      return NextResponse.json({
        cached: true,
        receipt_id: cachedReceipt.id,
        store_name: cachedReceipt.store_chain,
        total: cachedReceipt.total_amount,
        items: (cachedItems ?? []).map(i => ({
          name: i.item_name,
          price: i.unit_price,
          quantity: i.quantity,
          is_promo: i.is_promo ?? false,
          is_private_label: i.is_private_label ?? false,
          brand: i.brand ?? null,
          volume_weight: i.volume_weight ?? null,
        })),
        raw_ocr_text: cachedReceipt.raw_ocr_text,
        store_address: cachedReceipt.store_address,
        image_hash: imageHash,
      })
    }

    // ── Haiku gatekeeper (4s timeout) ───────────────────────────────────
    const isReceipt = await isReceiptImage(apiKey, images[0])

    if (!isReceipt) {
      if (redis) void redis.incr(failKey).then(n => { if (n === 1) void redis.expire(failKey, 86400) }).catch(() => null)
      return NextResponse.json(
        { error: 'Cette image ne ressemble pas à un ticket de caisse.' },
        { status: 400 }
      )
    }

    // ── Create scan job — return immediately ────────────────────────────
    const { data: job, error: jobErr } = await supabase
      .from('scan_jobs')
      .insert({
        user_id: authResult.userId,
        status: 'pending',
        image_hash: imageHash,
        image_data: images.map(img => ({ base64: img.base64, mediaType: img.mediaType })),
      })
      .select('id')
      .single()

    if (jobErr || !job) {
      console.error('[parse-receipt] Failed to create scan job:', jobErr?.message)
      return NextResponse.json({ error: 'Failed to create scan job' }, { status: 500 })
    }

    // ── Fire-and-forget: trigger Phase 2 background worker ──────────────
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
    const internalSecret = process.env.INTERNAL_API_SECRET ?? process.env.CRON_SECRET

    void fetch(`${siteUrl}/api/process-scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(internalSecret ? { 'x-internal-secret': internalSecret } : {}),
      },
      body: JSON.stringify({ job_id: job.id, user_id: authResult.userId }),
    }).catch(err => {
      console.error('[parse-receipt] Failed to trigger process-scan:', err)
    })

    // Success — reset consecutive failure counter
    if (redis) void redis.del(failKey).catch(() => null)

    return NextResponse.json({ job_id: job.id, status: 'pending' })
  } catch (error) {
    if (redis) void redis.incr(failKey).then(n => { if (n === 1) void redis.expire(failKey, 86400) }).catch(() => null)
    console.error('Parse receipt error:', error)
    return NextResponse.json(
      { error: 'Failed to parse receipt' },
      { status: 500 }
    )
  }
}
