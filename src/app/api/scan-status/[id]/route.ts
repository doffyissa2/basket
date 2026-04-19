import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase-service'

// Polling endpoint for async scan jobs.
// Client calls GET /api/scan-status/{job_id} every 1.5s until status is 'done' or 'failed'.

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
    .select('status, result, error_msg')
    .eq('id', id)
    .eq('user_id', authResult.userId)
    .maybeSingle()

  if (error || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  return NextResponse.json({
    status: job.status,
    ...(job.status === 'done' && job.result ? { result: job.result } : {}),
    ...(job.status === 'failed' && job.error_msg ? { error_msg: job.error_msg } : {}),
  })
}
