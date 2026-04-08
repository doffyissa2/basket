import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 })
    }

    const cleaned = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
    }

    const supabase = getClient()

    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert({ email: cleaned })

    if (error) {
      // Duplicate — already subscribed
      if (error.code === '23505') {
        return NextResponse.json({ message: 'Déjà inscrit !' })
      }
      console.error('[newsletter] insert error:', error)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Inscription réussie !' })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
