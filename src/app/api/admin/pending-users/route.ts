import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-service'

const ADMIN_EMAILS = ['angelo.maniraguha@gmail.com']

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

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = getServiceClient()

  const [{ count: approvedCount }, { data: pending }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('beta_approved', true),
    supabase
      .from('profiles')
      .select('id, postcode, beta_approved, beta_approved_at, created_at')
      .order('created_at', { ascending: false }),
  ])

  const userIds = (pending ?? []).map((p: { id: string }) => p.id)

  let emailMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    for (const u of users ?? []) {
      if (userIds.includes(u.id)) {
        emailMap[u.id] = u.email ?? ''
      }
    }
  }

  const users = (pending ?? []).map((p: { id: string; postcode: string | null; beta_approved: boolean; beta_approved_at: string | null; created_at: string }) => ({
    id: p.id,
    email: emailMap[p.id] ?? '',
    postcode: p.postcode,
    beta_approved: p.beta_approved,
    beta_approved_at: p.beta_approved_at,
    created_at: p.created_at,
  }))

  return NextResponse.json({
    approved_count: approvedCount ?? 0,
    beta_cap: 100,
    users,
  })
}
