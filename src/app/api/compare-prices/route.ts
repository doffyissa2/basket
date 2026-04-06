import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { items, postcode, store_name } = await request.json()

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 })
    }

    // Use service role key on the server to bypass RLS and access all users' price data.
    // The anon key would only see the current user's rows due to row-level security.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get all unique product names from OTHER stores for matching
    // (exclude the user's store so Claude doesn't match items back to themselves)
    let productsQuery = supabase
      .from('price_items')
      .select('item_name_normalised')
      .limit(500)

    if (store_name) {
      productsQuery = productsQuery.neq('store_name', store_name)
    }

    const { data: allProducts } = await productsQuery

    const uniqueProducts = [...new Set(allProducts?.map((p) => p.item_name_normalised) || [])]

    if (uniqueProducts.length === 0) {
      // No comparison data at all
      return NextResponse.json({
        comparisons: items.map((item: { name: string; price: number }) => ({
          name: item.name,
          your_price: item.price,
          avg_price: item.price,
          savings: 0,
          cheaper_store: null,
        })),
        total_savings: 0,
      })
    }

    // Use Claude to match scanned items to database products
    const apiKey = process.env.ANTHROPIC_API_KEY
    let matchMap: Record<string, string> = {}

    if (apiKey) {
      try {
        const matchResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [
              {
                role: 'user',
                content: `Tu dois faire correspondre des noms de produits scannés depuis un ticket de caisse avec des noms de produits dans une base de données.

Produits scannés:
${items.map((i: { name: string }) => `- "${i.name}"`).join('\n')}

Produits dans la base de données:
${uniqueProducts.map((p) => `- "${p}"`).join('\n')}

Pour chaque produit scanné, trouve le produit le plus proche dans la base de données. Un produit correspond s'il s'agit du même type de produit (ex: "CRISTALINE 1.5L" correspond à "eau minérale 1.5l x6" car ce sont tous les deux de l'eau).

Réponds UNIQUEMENT en JSON valide sans backticks, avec ce format:
{
  "matches": {
    "NOM_SCANNÉ_EN_MINUSCULES": "nom_base_de_données_ou_null"
  }
}

Si aucun produit de la base ne correspond, mets null comme valeur.`,
              },
            ],
          }),
        })

        if (matchResponse.ok) {
          const matchData = await matchResponse.json()
          const matchText = matchData.content?.[0]?.text || ''
          const cleaned = matchText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
          const parsed = JSON.parse(cleaned)
          matchMap = parsed.matches || {}
        }
      } catch (matchError) {
        console.error('Claude matching error:', matchError)
        // Fall back to substring matching below
      }
    }

    const comparisons = []

    for (const item of items) {
      const itemLower = item.name.toLowerCase().trim()
      
      // Try Claude's match — do a case-insensitive key lookup since Claude
      // may return keys in any casing despite the prompt asking for lowercase
      const matchedProduct =
        matchMap[itemLower] ??
        matchMap[item.name] ??
        (Object.entries(matchMap).find(([k]) => k.toLowerCase().trim() === itemLower)?.[1] ?? null)

      let query = supabase
        .from('price_items')
        .select('unit_price, store_name, postcode')

      if (matchedProduct) {
        // Claude returns the exact string from uniqueProducts — use exact match
        query = query.eq('item_name_normalised', matchedProduct)
      } else {
        // Fallback: try substring match with key words
        const words = itemLower.split(/\s+/).filter((w: string) => w.length > 2)
        if (words.length > 0) {
          // Try matching the longest word
          const keyword = words.reduce((a: string, b: string) => (a.length >= b.length ? a : b))
          query = query.ilike('item_name_normalised', `%${keyword}%`)
        } else {
          query = query.ilike('item_name_normalised', `%${itemLower}%`)
        }
      }

      // Exclude the user's current store to show alternatives
      if (store_name) {
        query = query.neq('store_name', store_name)
      }

      const { data: priceData } = await query.limit(50)

      if (priceData && priceData.length > 0) {
        const prices = priceData.map((p) => p.unit_price)
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
        const minPrice = Math.min(...prices)
        const cheapestEntry = priceData.find((p) => p.unit_price === minPrice)

        comparisons.push({
          name: item.name,
          your_price: item.price,
          avg_price: Math.round(avgPrice * 100) / 100,
          savings: Math.round((item.price - avgPrice) * 100) / 100,
          cheaper_store: cheapestEntry?.store_name || null,
        })
      } else {
        comparisons.push({
          name: item.name,
          your_price: item.price,
          avg_price: item.price,
          savings: 0,
          cheaper_store: null,
        })
      }
    }

    const totalSavings = comparisons.reduce(
      (sum, item) => sum + Math.max(0, item.savings),
      0
    )

    return NextResponse.json({
      comparisons,
      total_savings: Math.round(totalSavings * 100) / 100,
    })
  } catch (error) {
    console.error('Compare prices error:', error)
    return NextResponse.json(
      { error: 'Failed to compare prices' },
      { status: 500 }
    )
  }
}