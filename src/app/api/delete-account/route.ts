import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase-service'

export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { userId } = authResult

  const supabase = getServiceClient()

  // Delete all user data in order (children before parents)
  const deletions = await Promise.allSettled([
    supabase.from('price_items').delete().eq('user_id', userId),
    supabase.from('notifications').delete().eq('user_id', userId),
  ])

  // Receipts after price_items (FK dependency)
  await supabase.from('receipts').delete().eq('user_id', userId)

  // Shopping list items
  const { data: listRow } = await supabase
    .from('shopping_lists')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (listRow) {
    await supabase.from('shopping_list_items').delete().eq('list_id', listRow.id)
    await supabase.from('shopping_lists').delete().eq('id', listRow.id)
  }

  // Profile
  await supabase.from('profiles').delete().eq('id', userId)

  // Newsletter unsubscribe if they signed up
  const { data: profile } = await supabase
    .from('profiles')
    .select('email:id')
    .eq('id', userId)
    .single()
  if (profile) {
    // best-effort — ignore errors
    const { data: { user } } = await supabase.auth.admin.getUserById(userId)
    if (user?.email) {
      await supabase.from('newsletter_subscribers').delete().eq('email', user.email)
    }
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
}
