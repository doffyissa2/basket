import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fuzzyMatch } from '@/lib/fuzzy-match'
import { extractWeight, computeNormalizedPrice } from '@/lib/normalize'

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
          normalized_price: null,
          avg_normalized_price: null,
          is_local: false,
        })),
        total_savings: 0,
        best_store: null,
      })
    }

    // ── Step 1: local fuzzy matching ─────────────────────────────────────────
    const LOW_CONFIDENCE = 0.3

    const localResults = items.map((item: { name: string; price: number }) => {
      const result = fuzzyMatch(item.name, uniqueProducts)
      return { item, ...result }
    })

    const needsClaude = localResults.filter((r) => r.confidence < LOW_CONFIDENCE)
    const locallyMatched = localResults.filter((r) => r.confidence >= LOW_CONFIDENCE)

    console.log(
      `[compare-prices] Local: ${locallyMatched.length}/${items.length} resolved. Needs Claude: ${needsClaude.length}.`
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
    const finalMatchMap: Record<string, string | null> = {}

    for (const r of localResults) {
      const key = r.item.name.toLowerCase().trim()
      if (r.confidence >= LOW_CONFIDENCE && r.matched) {
        finalMatchMap[key] = r.matched
      } else {
        const claudeKey = Object.entries(claudeMatchMap).find(
          ([k]) => k.toLowerCase().trim() === key
        )
        finalMatchMap[key] = claudeKey?.[1] ?? null
      }
    }

    // ── Step 4: Query prices with postcode-aware two-pass strategy ────────────
    const dept = postcode && postcode.length >= 2 ? postcode.slice(0, 2) : null

    const comparisons = []

    for (const item of items as { name: string; price: number }[]) {
      const itemLower = item.name.toLowerCase().trim()
      const matchedProduct = finalMatchMap[itemLower] ?? null

      // Build the base price query (shared between local and national passes)
      const buildQuery = () => {
        let q = supabase
          .from('price_items')
          .select('unit_price, store_name, postcode')

        if (matchedProduct) {
          q = q.eq('item_name_normalised', matchedProduct)
        } else {
          const words = itemLower.split(/\s+/).filter((w: string) => w.length > 2)
          const keyword = words.length > 0
            ? words.reduce((a: string, b: string) => (a.length >= b.length ? a : b))
            : itemLower
          q = q.ilike('item_name_normalised', `%${keyword}%`)
        }

        if (store_name) {
          q = q.neq('store_name', store_name)
        }

        return q
      }

      // Pass 1: local (same département)
      let priceData: { unit_price: number; store_name: string; postcode: string | null }[] | null = null
      let isLocal = false

      if (dept) {
        const { data: localData } = await buildQuery()
          .like('postcode', `${dept}%`)
          .limit(50)
        if (localData && localData.length >= 3) {
          priceData = localData
          isLocal = true
        }
      }

      // Pass 2: national fallback
      if (!priceData || priceData.length < 3) {
        const { data: nationalData } = await buildQuery().limit(50)
        priceData = nationalData
        isLocal = false
      }

      // Compute normalized price per unit (€/100g or €/L)
      const weightStr = extractWeight(matchedProduct ?? item.name)
      const normalized = weightStr ? computeNormalizedPrice(item.price, weightStr) : null

      if (priceData && priceData.length > 0) {
        const prices = priceData.map((p) => p.unit_price)
        const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length
        const minPrice = Math.min(...prices)
        const cheapestEntry = priceData.find((p) => p.unit_price === minPrice)
        const avgNormalized = weightStr ? computeNormalizedPrice(avgPrice, weightStr) : null

        // Sanity check: if avg price is less than 20% of scanned price, likely a wrong product match
        const isSane = item.price === 0 || avgPrice >= item.price * 0.20
        const effectiveAvgPrice = isSane ? avgPrice : item.price
        const effectiveSavings = isSane ? item.price - avgPrice : 0

        comparisons.push({
          name: item.name,
          your_price: item.price,
          avg_price: Math.round(effectiveAvgPrice * 100) / 100,
          savings: Math.round(effectiveSavings * 100) / 100,
          cheaper_store: isSane ? cheapestEntry?.store_name || null : null,
          normalized_price: normalized?.label ?? null,
          avg_normalized_price: isSane ? avgNormalized?.label ?? null : null,
          is_local: isLocal,
        })
      } else {
        comparisons.push({
          name: item.name,
          your_price: item.price,
          avg_price: item.price,
          savings: 0,
          cheaper_store: null,
          normalized_price: normalized?.label ?? null,
          avg_normalized_price: null,
          is_local: false,
        })
      }
    }

    // ── Step 5: Total savings ─────────────────────────────────────────────────
    const totalSavings = comparisons.reduce(
      (sum, item) => sum + Math.max(0, item.savings),
      0
    )

    // ── Step 6: Best store recommendation ─────────────────────────────────────
    const storeTally: Record<string, { count: number; savings: number }> = {}
    for (const c of comparisons) {
      if (c.cheaper_store && c.savings > 0) {
        if (!storeTally[c.cheaper_store]) storeTally[c.cheaper_store] = { count: 0, savings: 0 }
        storeTally[c.cheaper_store].count += 1
        storeTally[c.cheaper_store].savings += c.savings
      }
    }
    const bestEntry = Object.entries(storeTally).sort((a, b) => b[1].savings - a[1].savings)[0]
    const best_store = bestEntry
      ? {
          name: bestEntry[0],
          items_cheaper: bestEntry[1].count,
          total_savings: Math.round(bestEntry[1].savings * 100) / 100,
        }
      : null

    // ── Step 7: Price watch — notify watchers if item is now cheaper ──────────
    const matchedNormalisedNames = Object.values(finalMatchMap).filter(Boolean) as string[]
    if (matchedNormalisedNames.length > 0) {
      const { data: watches } = await supabase
        .from('price_watches')
        .select('user_id, item_name, item_name_normalised, last_seen_price')
        .in('item_name_normalised', matchedNormalisedNames)

      if (watches && watches.length > 0) {
        const notifications: {
          user_id: string
          type: string
          title: string
          body: string
          metadata: object
          read: boolean
        }[] = []

        for (const watch of watches) {
          const comp = comparisons.find(
            (c) => (finalMatchMap[c.name.toLowerCase().trim()] ?? '') === watch.item_name_normalised
          )
          if (comp && watch.last_seen_price && comp.avg_price < watch.last_seen_price * 0.95) {
            notifications.push({
              user_id: watch.user_id,
              type: 'price_drop',
              title: `Prix en baisse sur ${watch.item_name}`,
              body: `Disponible à €${comp.avg_price.toFixed(2)} chez ${comp.cheaper_store || 'une autre enseigne'} (vous payiez €${watch.last_seen_price.toFixed(2)})`,
              metadata: {
                item_name: watch.item_name,
                new_price: comp.avg_price,
                old_price: watch.last_seen_price,
                store: comp.cheaper_store,
              },
              read: false,
            })
          }
        }

        if (notifications.length > 0) {
          await supabase.from('notifications').insert(notifications)
        }
      }
    }

    return NextResponse.json({
      comparisons,
      total_savings: Math.round(totalSavings * 100) / 100,
      best_store,
    })
  } catch (error) {
    console.error('Compare prices error:', error)
    return NextResponse.json(
      { error: 'Failed to compare prices' },
      { status: 500 }
    )
  }
}
