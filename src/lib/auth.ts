import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-service'

/**
 * Verify a Bearer JWT from the Authorization header.
 * Returns the user id on success, or a 401 NextResponse on failure.
 *
 * Usage in a route handler:
 *   const authResult = await requireAuth(request)
 *   if (authResult instanceof NextResponse) return authResult
 *   const { userId } = authResult
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ userId: string } | NextResponse> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim()

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: { user } } = await createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ).auth.getUser(token)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return { userId: user.id }
}

export async function requireBetaAccess(
  request: NextRequest
): Promise<{ userId: string } | NextResponse> {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const { data: profile } = await getServiceClient()
    .from('profiles')
    .select('beta_approved')
    .eq('id', authResult.userId)
    .single()

  if (!profile?.beta_approved) {
    return NextResponse.json(
      { error: 'Beta access required', code: 'BETA_NOT_APPROVED' },
      { status: 403 }
    )
  }

  return { userId: authResult.userId }
}
