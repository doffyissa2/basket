import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase-service'

const PROFILES_QUERY_CAP = 1000

export async function GET(request: NextRequest) {
  const adminResult = await requireAdmin(request)
  if (adminResult instanceof NextResponse) return adminResult

  const supabase = getServiceClient()

  const [approvedRes, pendingRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('beta_approved', true),
    supabase
      .from('profiles')
      .select('id, postcode, beta_approved, beta_approved_at, created_at')
      .order('created_at', { ascending: false })
      .limit(PROFILES_QUERY_CAP),
  ])

  const approvedCount = approvedRes.count
  const pending = pendingRes.data
  const userIds = (pending ?? []).map((p: { id: string }) => p.id)

  const emailMap: Record<string, string> = {}
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
