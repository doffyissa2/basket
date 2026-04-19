import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getServiceClient } from '@/lib/supabase-service'

export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { userId } = authResult

  // Rate limit: 3 attempts per hour per user (prevents automated abuse)
  const rlResponse = await checkRateLimit(request, 'deleteAccount', userId)
  if (rlResponse) return rlResponse

  try {
    const supabase = getServiceClient()

    // Fetch email BEFORE deleting anything (profile will be gone after)
    const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId)
    const email = authUser?.email ?? null

    // Delete all user data in order (children before parents)
    const deletions = await Promise.allSettled([
      supabase.from('price_items').delete().eq('user_id', userId),
      supabase.from('price_watches').delete().eq('user_id', userId),
      supabase.from('notifications').delete().eq('user_id', userId),
    ])

    // Receipts after price_items (FK dependency)
    await supabase.from('receipts').delete().eq('user_id', userId)

    // Shopping list items — try both direct user_id (current schema) and
    // legacy list_id (older schema) so neither schema leaves orphans
    await supabase.from('shopping_list_items').delete().eq('user_id', userId)
    const { data: listRow } = await supabase
      .from('shopping_lists')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    if (listRow) {
      await supabase.from('shopping_list_items').delete().eq('list_id', listRow.id)
      await supabase.from('shopping_lists').delete().eq('id', listRow.id)
    }

    // Profile
    await supabase.from('profiles').delete().eq('id', userId)

    // Newsletter unsubscribe — use email fetched before any deletions
    if (email) {
      await supabase.from('newsletter_subscribers').delete().eq('email', email)
    }

    // Finally delete the auth user (must be last — invalidates session)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)
    if (deleteError) {
      console.error('[delete-account] auth.admin.deleteUser error:', deleteError)
      return NextResponse.json({ error: 'Erreur lors de la suppression du compte' }, { status: 500 })
    }

    // Log that deletions were attempted (non-blocking)
    const failed = deletions.filter(d => d.status === 'rejected')
    if (failed.length > 0) {
      console.warn('[delete-account] some data deletions failed (user auth deleted successfully):', failed)
    }

    return NextResponse.json({ message: 'Compte supprimé avec succès' })
  } catch (err) {
    console.error('[delete-account] unexpected error:', err)
    return NextResponse.json({ error: 'Erreur interne lors de la suppression' }, { status: 500 })
  }
}
