import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

interface StatRow {
  item_name_normalised: string
  avg_price: number
  store_chain: string
  sample_count: number
  freshness_score: number | null
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const rlResponse = await checkRateLimit(request, 'shoppingListBestStore', authResult.userId)
  if (rlResponse) return rlResponse

  try {
    const { items, postcode } = await request.json()

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 })
    }

    if (items.length > 50) {
      return NextResponse.json({ error: 'Too many items (max 50)' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const dept = postcode && postcode.length >= 2 ? postcode.slice(0, 2) : null

    // ── 1. Match all items via match_product RPC (full catalogue, pg_trgm) ──
    // Fire all RPC calls concurrently — no sequential N+1
    const matchMap = new Map<string, string | null>()
    await Promise.all(
      (items as string[]).map(async (itemName) => {
        const key = itemName.toLowerCase().trim()
        const { data, error } = await supabase.rpc('match_product', { search_name: key })
        const matched = (!error && data && data.length > 0 && data[0].matched_name)
          ? (data[0].matched_name as string)
          : null
        matchMap.set(itemName, matched)
      })
    )

    const matchedNames = [...new Set([...matchMap.values()].filter(Boolean))] as string[]

    // ── 3. Batch-fetch stats (max 2 queries total, not N×2) ────────────────
    const statsByItem = new Map<string, StatRow[]>()

    if (matchedNames.length > 0) {
      // Try local dept first
      if (dept) {
        const { data } = await supabase
          .from('product_price_stats')
          .select('item_name_normalised, avg_price, store_chain, sample_count, freshness_score')
          .in('item_name_normalised', matchedNames)
          .eq('dept', dept)
          .neq('store_chain', 'Inconnu')
          .order('avg_price', { ascending: true })
        for (const row of (data ?? []) as StatRow[]) {
          if (!statsByItem.has(row.item_name_normalised)) statsByItem.set(row.item_name_normalised, [])
          statsByItem.get(row.item_name_normalised)!.push(row)
        }
      }

      // National fallback for items with fewer than 2 local results
      const needsNational = matchedNames.filter((n) => (statsByItem.get(n) ?? []).length < 2)
      if (needsNational.length > 0) {
        const { data } = await supabase
          .from('product_price_stats')
          .select('item_name_normalised, avg_price, store_chain, sample_count, freshness_score')
          .in('item_name_normalised', needsNational)
          .neq('store_chain', 'Inconnu')
          .order('avg_price', { ascending: true })
        for (const row of (data ?? []) as StatRow[]) {
          if (!statsByItem.has(row.item_name_normalised)) statsByItem.set(row.item_name_normalised, [])
          statsByItem.get(row.item_name_normalised)!.push(row)
        }
      }
    }

    // ── 4. Build per-item results and store tallies ────────────────────────
    const storePrices: Record<string, { total: number; items: number; wins: number }> = {}
    const perItem: { name: string; best_store: string | null; best_price: number | null }[] = []

    for (const itemName of items as string[]) {
      const matched = matchMap.get(itemName) ?? null
      if (!matched) {
        perItem.push({ name: itemName, best_store: null, best_price: null })
        continue
      }

      const statsData = statsByItem.get(matched) ?? []
      if (statsData.length === 0) {
        perItem.push({ name: itemName, best_store: null, best_price: null })
        continue
      }

      // statsData is already sorted by avg_price ascending from DB query
      const storeAvgs = statsData
        .filter((r) => r.store_chain)
        .map((r) => ({ store: r.store_chain, avg: r.avg_price }))

      if (storeAvgs.length === 0) {
        perItem.push({ name: itemName, best_store: null, best_price: null })
        continue
      }

      const best = storeAvgs[0]

      for (const { store, avg } of storeAvgs) {
        if (!storePrices[store]) storePrices[store] = { total: 0, items: 0, wins: 0 }
        storePrices[store].total += avg
        storePrices[store].items += 1
      }
      storePrices[best.store].wins += 1

      perItem.push({
        name: itemName,
        best_store: best.store,
        best_price: Math.round(best.avg * 100) / 100,
      })
    }

    // ── 5. Determine best overall store (most wins) ────────────────────────
    const bestEntry = Object.entries(storePrices).sort((a, b) => b[1].wins - a[1].wins)[0]

    const storeComparison = Object.entries(storePrices)
      .map(([store, { total, items }]) => ({
        store,
        total: Math.round(total * 100) / 100,
        items_found: items,
      }))
      .sort((a, b) => a.total - b.total)
      .slice(0, 5)

    const cheapestTotal = storeComparison[0]?.total ?? 0
    const bestStoreTotal = bestEntry ? storePrices[bestEntry[0]]?.total ?? 0 : 0
    const estimatedSavings = Math.max(0, Math.round((bestStoreTotal - cheapestTotal) * 100) / 100)

    return NextResponse.json({
      best_store: bestEntry?.[0] ?? null,
      estimated_savings: estimatedSavings,
      items_count: bestEntry?.[1].wins ?? 0,
      per_item: perItem,
      store_comparison: storeComparison,
    })
  } catch (error) {
    console.error('Shopping list best-store error:', error)
    return NextResponse.json({ error: 'Failed to compute best store' }, { status: 500 })
  }
}
