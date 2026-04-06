import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fuzzyMatch } from '@/lib/fuzzy-match'

export async function POST(request: NextRequest) {
  try {
    const { items, postcode, store_name } = await request.json()

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Fetch all unique product names from OTHER stores once — reused for every item
    let productsQuery = supabase
      .from('price_items')
      .select('item_name_normalised')
      .limit(500)

    if (store_name) {
      productsQuery = productsQuery.neq('store_name', store_name)
    }

    const { data: allProducts } = await productsQuery
    const uniqueProducts = [...new Set(allProducts?.map((p) => p.item_name_normalised) || [])] as string[]

    if (uniqueProducts.length === 0) {
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

    // ── Step 1: local fuzzy matching ─────────────────────────────────────────
    const HIGH_CONFIDENCE = 0.6
    const LOW_CONFIDENCE = 0.3

    const localResults = items.map((item: { name: string; price: number }) => {
      const result = fuzzyMatch(item.name, uniqueProducts)
      return { item, ...result }
    })

    const needsClaude = localResults.filter((r) => r.confidence < LOW_CONFIDENCE)
    const locallyMatched = localResults.filter((r) => r.confidence >= LOW_CONFIDENCE)

    console.log(
      `[compare-prices] Local match: ${locallyMatched.length}/${items.length} items resolved locally. ` +
      `High confidence (≥${HIGH_CONFIDENCE}): ${localResults.filter(r => r.confidence >= HIGH_CONFIDENCE).length}. ` +
      `Needs Claude: ${needsClaude.length}.`
    )
    for (const r of localResults) {
      console.log(
        `  [${r.strategy.padEnd(13)}] conf=${r.confidence.toFixed(2)} | "${r.item.name}" → ${r.matched ?? '(no match)'}`
      )
    }

    // ── Step 2: Claude API only for unresolved items ─────────────────────────
    let claudeMatchMap: Record<string, string> = {}

    if (needsClaude.length > 0) {
      const apiKey = process.env.ANTHROPIC_API_KEY
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
${needsClaude.map((r) => `- "${r.item.name}"`).join('\n')}

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
            claudeMatchMap = parsed.matches || {}
            console.log(`[compare-prices] Claude resolved ${Object.keys(claudeMatchMap).length} items.`)
          }
        } catch (matchError) {
          console.error('[compare-prices] Claude matching error:', matchError)
        }
      }
    }

    // ── Step 3: Build final match map ────────────────────────────────────────
    // Merge: local results take precedence when confidence ≥ LOW_CONFIDENCE
    const finalMatchMap: Record<string, string | null> = {}

    for (const r of localResults) {
      const key = r.item.name.toLowerCase().trim()
      if (r.confidence >= LOW_CONFIDENCE && r.matched) {
        finalMatchMap[key] = r.matched
      } else {
        // Try Claude result
        const claudeKey = Object.entries(claudeMatchMap).find(
          ([k]) => k.toLowerCase().trim() === key
        )
        finalMatchMap[key] = claudeKey?.[1] ?? null
      }
    }

    // ── Step 4: Query prices and build comparison ─────────────────────────────
    const comparisons = []

    for (const item of items as { name: string; price: number }[]) {
      const itemLower = item.name.toLowerCase().trim()
      const matchedProduct = finalMatchMap[itemLower] ?? null

      let query = supabase
        .from('price_items')
        .select('unit_price, store_name, postcode')

      if (matchedProduct) {
        query = query.eq('item_name_normalised', matchedProduct)
      } else {
        const words = itemLower.split(/\s+/).filter((w: string) => w.length > 2)
        if (words.length > 0) {
          const keyword = words.reduce((a: string, b: string) => (a.length >= b.length ? a : b))
          query = query.ilike('item_name_normalised', `%${keyword}%`)
        } else {
          query = query.ilike('item_name_normalised', `%${itemLower}%`)
        }
      }

      if (store_name) {
        query = query.neq('store_name', store_name)
      }

      const { data: priceData } = await query.limit(50)

      if (priceData && priceData.length > 0) {
        const prices = priceData.map((p) => p.unit_price)
        const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length
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
