import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase-service'

const BETA_CAP = 100

export async function POST(request: NextRequest) {
  const adminResult = await requireAdmin(request)
  if (adminResult instanceof NextResponse) return adminResult

  const { targetUserId } = await request.json()
  if (!targetUserId || typeof targetUserId !== 'string') {
    return NextResponse.json({ error: 'targetUserId required' }, { status: 400 })
  }

  const supabase = getServiceClient()

  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('beta_approved', true)

  if ((count ?? 0) >= BETA_CAP) {
    return NextResponse.json(
      { error: 'Beta cap reached', approved_count: count },
      { status: 409 }
    )
  }

  const { error } = await supabase
    .from('profiles')
    .update({ beta_approved: true, beta_approved_at: new Date().toISOString() })
    .eq('id', targetUserId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, approved_count: (count ?? 0) + 1 })
}
