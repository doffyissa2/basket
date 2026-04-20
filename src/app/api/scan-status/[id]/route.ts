import { NextRequest, NextResponse, after } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase-service'

export const maxDuration = 10

// Polling endpoint for async scan jobs.
// Client calls GET /api/scan-status/{job_id} every 1.5s until status is 'done' or 'failed'.
//
// Retry safety: if a job is still 'pending' >4s after creation, re-trigger process-scan
// in case the initial fire-and-forget from parse-receipt was lost (Vercel cold start, etc).

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const { id } = await params

  if (!id || id.length < 10) {
    return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 })
  }

  const supabase = getServiceClient()

  const { data: job, error } = await supabase
    .from('scan_jobs')
    .select('status, result, error_msg, user_id, created_at')
    .eq('id', id)
    .eq('user_id', authResult.userId)
    .maybeSingle()

  if (error || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // Retry: if job is still 'pending' and was created >4s ago, re-trigger process-scan.
  // This handles the case where the initial trigger from parse-receipt was lost.
  if (job.status === 'pending' && job.created_at) {
    const ageMs = Date.now() - new Date(job.created_at).getTime()
    if (ageMs > 4000) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
        ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
      const internalSecret = process.env.INTERNAL_API_SECRET ?? process.env.CRON_SECRET

      after(async () => {
        try {
          await fetch(`${siteUrl}/api/process-scan`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(internalSecret ? { 'x-internal-secret': internalSecret } : {}),
            },
            body: JSON.stringify({ job_id: id, user_id: authResult.userId }),
          })
        } catch { /* best effort retry */ }
      })
    }
  }

  return NextResponse.json({
    status: job.status,
    ...(job.status === 'done' && job.result ? { result: job.result } : {}),
    ...(job.status === 'failed' && job.error_msg ? { error_msg: job.error_msg } : {}),
  })
}
