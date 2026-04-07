import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface PriceItem {
  store_chain: string | null
  store_name: string
  latitude: number
  longitude: number
  unit_price: number
  receipt_id: string
  item_name_normalised: string
}

export interface StorePin {
  store_chain: string
  store_name: string
  lat: number
  lon: number
  avg_price: number
  item_count: number
  receipt_count: number
  top_items: { name: string; avg_price: number }[]
  price_tier: 'cheap' | 'mid' | 'expensive'
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('price_items')
    .select('store_chain, store_name, latitude, longitude, unit_price, receipt_id, item_name_normalised')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .limit(2000)

  if (error) return NextResponse.json({ pins: [] })

  if (!data || data.length === 0) return NextResponse.json({ pins: [] })

  const items = data as PriceItem[]

  // Group by (chain, lat_bucket, lon_bucket)
  const groups = new Map<string, {
    store_chain: string
    store_name: string
    lat: number
    lon: number
    prices: number[]
    receipt_ids: Set<string>
    item_names: string[]
  }>()

  for (const item of items) {
    const chain = item.store_chain || item.store_name
    const latB = Math.round(item.latitude * 1000) / 1000
    const lonB = Math.round(item.longitude * 1000) / 1000
    const key = `${chain}::${latB}::${lonB}`

    if (!groups.has(key)) {
      groups.set(key, {
        store_chain: chain,
        store_name: item.store_name,
        lat: latB,
        lon: lonB,
        prices: [],
        receipt_ids: new Set(),
        item_names: [],
      })
    }
    const g = groups.get(key)!
    g.prices.push(item.unit_price)
    g.receipt_ids.add(item.receipt_id)
    g.item_names.push(item.item_name_normalised)
  }

  // Build raw pins, filter groups with < 3 items
  const rawPins = Array.from(groups.values())
    .filter((g) => g.prices.length >= 3)
    .map((g) => {
      const avg = g.prices.reduce((s, p) => s + p, 0) / g.prices.length

      // Top 3 cheapest unique items
      const itemMap = new Map<string, number[]>()
      for (let i = 0; i < g.item_names.length; i++) {
        const name = g.item_names[i]
        if (!itemMap.has(name)) itemMap.set(name, [])
        itemMap.get(name)!.push(g.prices[i])
      }
      const top_items = Array.from(itemMap.entries())
        .map(([name, ps]) => ({ name, avg_price: ps.reduce((s, p) => s + p, 0) / ps.length }))
        .sort((a, b) => a.avg_price - b.avg_price)
        .slice(0, 3)

      return {
        store_chain: g.store_chain,
        store_name: g.store_name,
        lat: g.lat,
        lon: g.lon,
        avg_price: avg,
        item_count: g.prices.length,
        receipt_count: g.receipt_ids.size,
        top_items,
        price_tier: 'mid' as StorePin['price_tier'], // assigned below
      }
    })

  if (rawPins.length === 0) return NextResponse.json({ pins: [] })

  // Assign price_tier by tertile
  const sorted = [...rawPins].sort((a, b) => a.avg_price - b.avg_price)
  const n = sorted.length
  const pins: StorePin[] = rawPins.map((pin) => {
    const rank = sorted.findIndex((p) => p === pin)
    const tier: StorePin['price_tier'] = rank < n / 3 ? 'cheap' : rank < (2 * n) / 3 ? 'mid' : 'expensive'
    return { ...pin, price_tier: tier }
  })

  return NextResponse.json({ pins })
}
