import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

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

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: media_type || 'image/jpeg',
                  data: image_base64,
                },
              },
              {
                type: 'text',
                text: `Analyse ce ticket de caisse français et extrais les informations suivantes. Réponds UNIQUEMENT avec du JSON valide, sans texte avant ou après, sans backticks markdown.

Format attendu :
{
  "store_name": "Nom du magasin",
  "items": [
    {
      "name": "Nom du produit",
      "price": 2.49,
      "quantity": 1,
      "is_promo": false,
      "is_private_label": false
    }
  ],
  "total": 45.67
}

Règles générales :
- Extrais le nom du magasin depuis l'en-tête du ticket
- Pour chaque article, donne le nom lisible, le prix unitaire et la quantité
- Si la quantité n'est pas visible, mets 1
- Le prix doit être un nombre décimal (ex: 2.49 pas "2,49€")
- Le total doit correspondre au montant total du ticket
- Si tu ne peux pas lire certaines parties, fais de ton mieux avec ce qui est lisible
- Ignore les lignes de TVA et les informations de paiement

Règles pour is_promo :
- Mets true si l'article montre un indicateur promotionnel : PROMO, REMISE, FIDÉLITÉ, FIDELITE, -XX%, LOT DE, OFFRE, SOLDE, BON PRIX, PRIX CHOC, ECO, SURGELÉ PROMO, ou si le prix est barré et remplacé
- Mets false sinon

Règles pour is_private_label :
- Mets true si l'article est une marque de distributeur (MDD) : Marque Repère, Reflets de France, Casino Bio, Casino, U Bio, U, Auchan, Top Budget, Eco+, Monoprix Gourmet, Carrefour Bio, Carrefour, Leclerc, Jean Bon, Les Tilleuls, Pouce, ou toute marque clairement liée au magasin
- Mets false si c'est une marque nationale (Nutella, Coca-Cola, Président, Danone, etc.)
- En cas de doute, mets false`,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Claude API error:', errorData)
      return NextResponse.json({ error: 'AI parsing failed' }, { status: 500 })
    }

    const data = await response.json()
    const textContent = data.content?.[0]?.text || ''

    // Clean and parse JSON response
    let cleaned = textContent.trim()
    cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

    const parsed = JSON.parse(cleaned)

    // Validate structure
    if (!parsed.store_name || !Array.isArray(parsed.items)) {
      throw new Error('Invalid receipt structure')
    }

    // Normalise all item fields — coerce types, guarantee new boolean fields exist
    parsed.items = parsed.items.map((item: {
      name: string | unknown
      price: number | string | unknown
      quantity: number | string | unknown
      is_promo?: boolean | unknown
      is_private_label?: boolean | unknown
    }) => ({
      name: String(item.name),
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 1,
      is_promo: item.is_promo === true,
      is_private_label: item.is_private_label === true,
    }))

    parsed.total = Number(parsed.total) || parsed.items.reduce(
      (sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity,
      0
    )

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Parse receipt error:', error)
    return NextResponse.json(
      { error: 'Failed to parse receipt' },
      { status: 500 }
    )
  }
}
