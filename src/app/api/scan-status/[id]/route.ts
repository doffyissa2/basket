import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const { id: jobId } = await params

  const supabase = getServiceClient()
  const { data: job, error } = await supabase
    .from('scan_jobs')
    .select('status, result, error_msg, user_id')
    .eq('id', jobId)
    .single()

  if (error || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  if (job.user_id !== authResult.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  if (job.status === 'done') {
    return NextResponse.json({ status: 'done', result: job.result })
  }

  if (job.status === 'failed') {
    return NextResponse.json({ status: 'failed', error: job.error_msg ?? 'Erreur inconnue' })
  }

  return NextResponse.json({ status: job.status })
}
