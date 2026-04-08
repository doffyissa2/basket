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
    const { name, email, subject, message } = await request.json()

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message trop long (max 2000 caractères)' }, { status: 400 })
    }

    const supabase = getClient()

    const { error } = await supabase
      .from('contact_messages')
      .insert({
        name: String(name).trim().slice(0, 100),
        email: cleanEmail,
        subject: subject ? String(subject).trim().slice(0, 200) : null,
        message: String(message).trim(),
      })

    if (error) {
      console.error('[contact] insert error:', error)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Message envoyé !' })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
