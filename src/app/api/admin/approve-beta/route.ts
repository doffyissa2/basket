import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-service'

const ADMIN_EMAILS = ['angelo.maniraguha@gmail.com']
const BETA_CAP = 100

async function verifyAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim()
  if (!token) return null

  const { data: { user } } = await createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ).auth.getUser(token)

  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) return null
  return user
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { targetUserId } = await request.json()
  if (!targetUserId) {
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
