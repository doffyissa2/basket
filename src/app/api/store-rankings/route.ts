/**
 * GET /api/store-rankings
 *
 * Public endpoint — no auth required (marketing/social content).
 * Returns a ranked list of supermarket chains by avg price,
 * built from market_prices + community_prices, with per-category breakdown.
 *
 * Result is HTTP-cached for 1 hour at the edge (Cache-Control).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit'

export interface CategoryStat { avg: number; count: number }
export interface ChainRanking {
  rank:         number
  chain:        string
  avg_price:    number
  index:        number   // relative to cheapest = 100
  sample_count: number
  tier:         'cheap' | 'mid' | 'expensive'
  categories:   Record<string, CategoryStat>
}

const CAT_PATTERNS: Array<[string, RegExp]> = [
  ['Produits laitiers',    /\b(lait|beurre|fromage|yaourt|yogourt|cr[eè]me|kefir|feta|camembert|brie|emmental|gruy[eè]re|mozzarella|ricotta)\b/i],
  ['Épicerie sèche',       /\b(p[aâ]tes|pasta|riz\b|farine|sucre\b|huile\b|sel\b|poivre|conserve|haricot|lentille|c[eé]r[eé]ale|muesli|confiture|miel|vinaigre|ma[iï]s)\b/i],
  ['Viandes & Poissons',   /\b(viande|boeuf|poulet|porc|dinde|steak|jambon|saumon|thon|poisson|crevette|merlu|sardine|cabillaud|agneau|lapin|chorizo)\b/i],
  ['Fruits & Légumes',     /\b(pomme\b|tomate|carotte|courgette|salade|banane|poire\b|oignon|pomme de terre|brocoli|[eé]pinard|poivron|concombre|citron|avocat|aubergine)\b/i],
  ['Boissons',             /\b(eau\b|jus\b|coca|pepsi|limonade|bi[eè]re|vin\b|cidre|sirop\b|soda)\b/i],
]

function assignCategory(name: string): string {
  if (!name) return 'Autres'
  for (const [cat, re] of CAT_PATTERNS) if (re.test(name)) return cat
  return 'Autres'
}

type ChainData = { prices: number[]; cats: Map<string, number[]> }

function addRow(map: Map<string, ChainData>, chain: string, item: string, price: number) {
  if (!chain) return
  if (!map.has(chain)) map.set(chain, { prices: [], cats: new Map() })
  const cd = map.get(chain)!
  cd.prices.push(price)
  const cat = assignCategory(item)
  if (!cd.cats.has(cat)) cd.cats.set(cat, [])
  cd.cats.get(cat)!.push(price)
}

function avg(arr: number[]) { return arr.reduce((a, b) => a + b, 0) / arr.length }

export async function GET(request: NextRequest) {
  const rlResponse = await checkRateLimit(request, 'storeRankings')
  if (rlResponse) return rlResponse

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Defensive caps — public endpoint, even with rate limiting we don't want
  // a single request to pull a giant payload from the DB. 10k per source is
  // plenty for chain-level ranking aggregation.
  const ROW_CAP = 10000
  const [mpRes, cpRes] = await Promise.all([
    supabase
      .from('market_prices')
      .select('store_chain, product_name_normalised, unit_price')
      .gt('unit_price', 0.1)
      .lt('unit_price', 150)
      .limit(ROW_CAP),
    supabase
      .from('community_prices')
      .select('store_chain, item_name_normalised, unit_price')
      .not('store_chain', 'is', null)
      .not('item_name_normalised', 'is', null)
      .gt('unit_price', 0.1)
      .lt('unit_price', 150)
      .limit(ROW_CAP),
  ])

  const chainMap = new Map<string, ChainData>()
  for (const r of mpRes.data  ?? []) addRow(chainMap, r.store_chain ?? '', r.product_name_normalised ?? '', r.unit_price)
  for (const r of cpRes.data  ?? []) addRow(chainMap, r.store_chain ?? '', r.item_name_normalised ?? '', r.unit_price)

  // Build entries — only chains with ≥10 observations
  type Entry = { chain: string; avg: number; count: number; cats: Record<string, CategoryStat> }
  const entries: Entry[] = []

  for (const [chain, cd] of chainMap) {
    if (cd.prices.length < 10) continue
    const cats: Record<string, CategoryStat> = {}
    for (const [cat, ps] of cd.cats) {
      if (ps.length < 3) continue
      cats[cat] = { avg: Math.round(avg(ps) * 100) / 100, count: ps.length }
    }
    entries.push({ chain, avg: Math.round(avg(cd.prices) * 100) / 100, count: cd.prices.length, cats })
  }

  entries.sort((a, b) => a.avg - b.avg)

  const n    = entries.length
  const base = entries[0]?.avg ?? 1
  const total = [...chainMap.values()].reduce((s, cd) => s + cd.prices.length, 0)

  const rankings: ChainRanking[] = entries.map((e, i) => ({
    rank:         i + 1,
    chain:        e.chain,
    avg_price:    e.avg,
    index:        Math.round((e.avg / base) * 100),
    sample_count: e.count,
    tier:         i < n / 3 ? 'cheap' : i < (2 * n) / 3 ? 'mid' : 'expensive',
    categories:   e.cats,
  }))

  return NextResponse.json(
    { rankings, total_samples: total, updated_at: new Date().toISOString().split('T')[0] },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
  )
}
