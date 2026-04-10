import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { getServiceClient } from '@/lib/supabase-service'

function getClient() {
  return getServiceClient()
}

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit(request, 'newsletter')
  if (rl) return rl

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
