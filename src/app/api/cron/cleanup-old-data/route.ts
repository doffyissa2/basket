/**
 * GET /api/cron/cleanup-old-data
 *
 * CNIL-compliant data retention cron. Runs weekly (Sunday 3am UTC).
 *
 * 1. Receipt images older than 30 days → deleted from Supabase Storage, image_url set to NULL
 * 2. raw_ocr_text older than 30 days → NULLed out (metadata kept)
 * 3. Notifications older than 90 days → deleted
 * 4. XP log older than 180 days → deleted
 */

import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual, createHash } from 'crypto'
import { getServiceClient } from '@/lib/supabase-service'
import { checkRateLimit } from '@/lib/rate-limit'

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(createHash('sha256').update(a).digest())
  const bufB = Buffer.from(createHash('sha256').update(b).digest())
  return timingSafeEqual(bufA, bufB)
}

export async function GET(request: NextRequest) {
  // ── Auth: CRON_SECRET header (same pattern as other cron routes) ────────
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !safeCompare(authHeader.replace('Bearer ', ''), cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rlResponse = await checkRateLimit(request, 'cleanupOldData', 'cron')
  if (rlResponse) return rlResponse

  const supabase = getServiceClient()
  const report: Record<string, number> = {}
  const now = Date.now()
  const thirtyDaysAgo = new Date(now - 30 * 24 * 3600 * 1000).toISOString()
  const ninetyDaysAgo = new Date(now - 90 * 24 * 3600 * 1000).toISOString()
  const sixMonthsAgo = new Date(now - 180 * 24 * 3600 * 1000).toISOString()

  // ── 1. Delete receipt images from Supabase Storage (>30 days) ──────────
  try {
    const { data: oldReceipts } = await supabase
      .from('receipts')
      .select('id, image_url, user_id')
      .lt('created_at', thirtyDaysAgo)
      .not('image_url', 'is', null)
      .limit(500)

    let imagesDeleted = 0
    if (oldReceipts && oldReceipts.length > 0) {
      // Extract storage paths from full URLs
      // URL format: https://xxx.supabase.co/storage/v1/object/public/receipts/{userId}/{filename}
      const paths: string[] = []
      const receiptIds: string[] = []
      for (const r of oldReceipts) {
        if (!r.image_url) continue
        try {
          const url = new URL(r.image_url)
          const match = url.pathname.match(/\/receipts\/(.+)$/)
          if (match?.[1]) {
            paths.push(match[1])
            receiptIds.push(r.id)
          } else {
            console.warn('[cleanup] Could not extract storage path from:', r.image_url)
          }
        } catch { /* malformed URL — skip */ }
      }

      // Delete from storage in batches of 100
      for (let i = 0; i < paths.length; i += 100) {
        const batch = paths.slice(i, i + 100)
        const { error } = await supabase.storage.from('receipts').remove(batch)
        if (error) console.error('[cleanup] storage remove error:', error.message)
        else imagesDeleted += batch.length
      }

      // NULL out image_url on cleaned receipts
      if (receiptIds.length > 0) {
        const { error: updateErr } = await supabase
          .from('receipts')
          .update({ image_url: null })
          .in('id', receiptIds)
        if (updateErr) console.error('[cleanup] image_url null error:', updateErr.message)
      }
    }
    report.images_deleted = imagesDeleted
  } catch (err) {
    console.error('[cleanup] image cleanup error:', err)
    report.images_error = 1
  }

  // ── 2. NULL out raw_ocr_text on old receipts (>30 days) ────────────────
  try {
    const { data: ocrRows } = await supabase
      .from('receipts')
      .update({ raw_ocr_text: null })
      .lt('created_at', thirtyDaysAgo)
      .not('raw_ocr_text', 'is', null)
      .select('id')
    report.ocr_text_nulled = ocrRows?.length ?? 0
  } catch (err) {
    console.error('[cleanup] raw_ocr_text cleanup error:', err)
    report.ocr_text_error = 1
  }

  // ── 3. Delete old notifications (>90 days) ─────────────────────────────
  try {
    const { data: notifRows } = await supabase
      .from('notifications')
      .delete()
      .lt('created_at', ninetyDaysAgo)
      .select('id')
    report.notifications_deleted = notifRows?.length ?? 0
  } catch (err) {
    console.error('[cleanup] notifications cleanup error:', err)
    report.notifications_error = 1
  }

  // ── 4. Delete old XP log entries (>180 days) ───────────────────────────
  try {
    const { data: xpRows } = await supabase
      .from('xp_log')
      .delete()
      .lt('created_at', sixMonthsAgo)
      .select('id')
    report.xp_log_deleted = xpRows?.length ?? 0
  } catch (err) {
    // Table may not exist yet — non-critical
    console.warn('[cleanup] xp_log cleanup skipped:', err)
    report.xp_log_skipped = 1
  }

  console.log('[cleanup-old-data] Report:', JSON.stringify(report))
  return NextResponse.json({ ok: true, report })
}
