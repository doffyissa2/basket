import { NextRequest, NextResponse } from 'next/server'
import { requireBetaAccess } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getServiceClient } from '@/lib/supabase-service'

/**
 * POST /api/learn-receipt-format
 *
 * Called fire-and-forget after a successful receipt parse.
 * If no format hint exists yet for this store chain (or it's older than
 * 30 days), uses Claude to generate a concise format description from the
 * sample item names, then stores it in receipt_formats.
 *
 * These hints are injected into future parse-receipt prompts so Claude
 * knows what to expect from each store's POS format.
 *
 * Body: { store_chain: string, sample_items: string[] }
 */
export async function POST(request: NextRequest) {
  const authResult = await requireBetaAccess(request)
  if (authResult instanceof NextResponse) return authResult

  const rlResponse = await checkRateLimit(request, 'learnReceiptFormat', authResult.userId)
  if (rlResponse) return rlResponse

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ skipped: true })

  try {
    const { store_chain, sample_items } = await request.json()

    if (!store_chain || !Array.isArray(sample_items) || sample_items.length === 0) {
      return NextResponse.json({ error: 'store_chain and sample_items required' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // Skip if we already have a recent format (< 30 days old)
    const { data: existing } = await supabase
      .from('receipt_formats')
      .select('updated_at')
      .eq('store_chain', store_chain)
      .single()

    if (existing?.updated_at) {
      const age = Date.now() - new Date(existing.updated_at).getTime()
      const thirtyDays = 30 * 24 * 60 * 60 * 1000
      if (age < thirtyDays) {
        return NextResponse.json({ skipped: true, reason: 'recent format exists' })
      }
    }

    // Ask Claude to infer the receipt format from sample item names
    const sampleList = sample_items.slice(0, 20).map((s: string) => `- ${s}`).join('\n')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `Tu analyses les noms d'articles extraits d'un ticket de caisse de "${store_chain}".

Exemples d'articles du ticket :
${sampleList}

Génère UNE SEULE ligne décrivant le format de ce ticket pour aider à l'analyse future, par exemple :
- le style de troncature des noms (ex: "articles tronqués à 20 chars")
- les majuscules ou minuscules
- les codes articles présents
- la présence de codes-barres ou références
- tout schéma de formatage notable

Réponds UNIQUEMENT avec la description concise du format (1-2 phrases, pas de préambule, pas de liste).`,
          },
        ],
      }),
    })

    if (!response.ok) return NextResponse.json({ skipped: true, reason: 'Claude error' })

    const data = await response.json()
    const formatHints = (data.content?.[0]?.text ?? '').trim().slice(0, 500)

    if (!formatHints) return NextResponse.json({ skipped: true, reason: 'empty hints' })

    await supabase
      .from('receipt_formats')
      .upsert(
        {
          store_chain,
          format_hints: formatHints,
          sample_items: sample_items.slice(0, 10),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'store_chain' }
      )

    return NextResponse.json({ learned: true, store_chain, format_hints: formatHints })
  } catch (err) {
    console.error('[learn-receipt-format] error:', err)
    return NextResponse.json({ error: 'Failed to learn format' }, { status: 500 })
  }
}
