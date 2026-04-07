import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface ParsedItem {
  name: string
  price: number
  quantity: number
  is_promo: boolean
  is_private_label: boolean
  confidence?: number
}

interface ParsedReceipt {
  store_name: string
  items: ParsedItem[]
  total: number
}

// ── Quality check ─────────────────────────────────────────────────────────────
function isParseQualityBad(parsed: ParsedReceipt): boolean {
  if (!parsed.items || parsed.items.length === 0) return true
  if (parsed.total === 0 && parsed.items.length < 2) return true
  const zeroPriceCount = parsed.items.filter((i) => i.price === 0).length
  if (zeroPriceCount > parsed.items.length * 0.4) return true
  return false
}

// ── Build Claude prompt ───────────────────────────────────────────────────────
function buildPrompt(formatHintsSection: string, isRetry = false): string {
  const retryPrefix = isRetry
    ? `⚠️ ATTENTION : La première tentative d'analyse a produit des résultats incomplets (articles manquants ou prix à zéro). Relis TRÈS attentivement l'image. Assure-toi d'extraire CHAQUE article avec son prix exact. Ne laisse aucun article de côté.\n\n`
    : ''

  return `${retryPrefix}Analyse ce ticket de caisse français et extrais les informations suivantes. Réponds UNIQUEMENT avec du JSON valide, sans texte avant ou après, sans backticks markdown.

Format attendu :
{
  "store_name": "Nom du magasin",
  "items": [
    {
      "name": "Nom du produit",
      "price": 2.49,
      "quantity": 1,
      "is_promo": false,
      "is_private_label": false,
      "confidence": 0.95
    }
  ],
  "total": 45.67
}

── RÈGLES GÉNÉRALES ──────────────────────────────────────────────────────────
- Extrais le nom du magasin depuis l'en-tête du ticket
- Pour chaque article, donne le nom lisible (développé, pas abrégé), le prix unitaire et la quantité
- Si la quantité n'est pas visible, mets 1
- Le prix doit être un nombre décimal (ex: 2.49 pas "2,49€")
- Le total doit correspondre au montant total payé sur le ticket
- Ignore les lignes de TVA et les informations de paiement

── RÈGLES POUR LES PRIX ET QUANTITÉS ────────────────────────────────────────
- Format "Qté × Prix unitaire" (ex: "2 x 1,49") → price=1.49, quantity=2
- Format poids "0,543 kg x 12,99 €/kg" → price=12.99 (prix au kg), quantity=0.543 (en kg)
- Prix barrés et remplacés → utiliser toujours le prix final après remise
- Remises séparées (lignes REMISE, OFFRE FIDÉLITÉ, -XX%) → SOUSTRAIRE du prix de l'article précédent et mettre is_promo=true; NE PAS créer un article séparé pour la remise
- Consignes/dépôts → IGNORER les lignes "CAUTION", "CONSIGNE", "ECO-PART", "TAXE EMBALLAGE"
- Retours/avoirs → inclure avec un prix NÉGATIF
- IGNORER COMPLÈTEMENT : "SOUS-TOTAL", "TOTAL", "TVA", "CARTE", "ESPECES", "MONNAIE", "CB", "RENDU"

── RÈGLES POUR is_promo ──────────────────────────────────────────────────────
- true si : PROMO, REMISE, FIDÉLITÉ, FIDELITE, -XX%, LOT DE, OFFRE, SOLDE, BON PRIX, PRIX CHOC, SURGELÉ PROMO, ou prix barré remplacé
- false sinon

── RÈGLES POUR is_private_label ─────────────────────────────────────────────
- true si marque de distributeur (MDD) : Marque Repère, Reflets de France, Casino Bio, Casino, U Bio, U, Auchan, Top Budget, Eco+, Monoprix Gourmet, Carrefour Bio, Carrefour (produit), Leclerc (produit), Jean Bon, Les Tilleuls, Pouce, Bien Vu, Auchan Bio, ou toute marque clairement liée au magasin
- false si marque nationale (Nutella, Coca-Cola, Président, Danone, Barilla…)
- En cas de doute : false

── RÈGLES POUR confidence ────────────────────────────────────────────────────
- 1.0 : nom et prix parfaitement lisibles
- 0.7–0.9 : texte partiellement lisible mais sens clair
- 0.3–0.6 : partie du nom ou prix devinée
- < 0.3 : trop incertain — OMETTRE l'article complètement${formatHintsSection}`
}

// ── Call Claude Vision ────────────────────────────────────────────────────────
async function callClaude(
  apiKey: string,
  imageBase64: string,
  mediaType: string,
  prompt: string
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imageBase64 },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error: ${response.status} ${err}`)
  }

  const data = await response.json()
  return data.content?.[0]?.text ?? ''
}

// ── Normalise raw Claude output ───────────────────────────────────────────────
function normaliseItems(items: ParsedItem[]): ParsedItem[] {
  return items
    .filter((item) => {
      const name = String(item.name ?? '').trim()
      return name.length > 0 && !/^\d+$/.test(name)
    })
    .map((item) => ({
      name: String(item.name).trim(),
      price: Math.max(0, Number(item.price) || 0),
      quantity: Math.max(0.001, Number(item.quantity) || 1),
      is_promo: item.is_promo === true,
      is_private_label: item.is_private_label === true,
      confidence: typeof item.confidence === 'number' ? Math.min(1, Math.max(0, item.confidence)) : 1,
    }))
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await checkRateLimit(request, 'parseReceipt')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { image_base64, media_type } = await request.json()

    if (!image_base64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    // ── Fetch all known receipt format hints ──────────────────────────────
    const supabase = getServiceClient()
    const { data: formats } = await supabase
      .from('receipt_formats')
      .select('store_chain, format_hints')
      .order('store_chain')

    const formatHintsSection =
      formats && formats.length > 0
        ? `\n\n── FORMATS DE TICKETS CONNUS ────────────────────────────────────────────────\nUtilise ces informations si tu reconnais l'enseigne :\n${formats
            .map((f: { store_chain: string; format_hints: string }) => `- ${f.store_chain}: ${f.format_hints}`)
            .join('\n')}`
        : ''

    const safeMediaType = (media_type as string) || 'image/jpeg'

    // ── First parse attempt ───────────────────────────────────────────────
    let textContent = await callClaude(apiKey, image_base64, safeMediaType, buildPrompt(formatHintsSection, false))

    let cleaned = textContent.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    let parsed: ParsedReceipt = JSON.parse(cleaned)

    if (!parsed.store_name || !Array.isArray(parsed.items)) {
      throw new Error('Invalid receipt structure')
    }

    parsed.items = normaliseItems(parsed.items)
    parsed.total = Number(parsed.total) || parsed.items.reduce(
      (s, i) => s + i.price * i.quantity, 0
    )

    // ── Retry if quality is poor ──────────────────────────────────────────
    if (isParseQualityBad(parsed)) {
      console.log('[parse-receipt] Quality check failed, retrying with stricter prompt')

      textContent = await callClaude(apiKey, image_base64, safeMediaType, buildPrompt(formatHintsSection, true))

      cleaned = textContent.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      const retryParsed: ParsedReceipt = JSON.parse(cleaned)

      if (retryParsed.store_name && Array.isArray(retryParsed.items) && retryParsed.items.length > 0) {
        retryParsed.items = normaliseItems(retryParsed.items)
        retryParsed.total = Number(retryParsed.total) || retryParsed.items.reduce(
          (s, i) => s + i.price * i.quantity, 0
        )
        // Use retry result only if it's better (more items or better total)
        if (
          retryParsed.items.length >= parsed.items.length &&
          retryParsed.total > 0
        ) {
          parsed = retryParsed
        }
      }
    }

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Parse receipt error:', error)
    return NextResponse.json(
      { error: 'Failed to parse receipt' },
      { status: 500 }
    )
  }
}
