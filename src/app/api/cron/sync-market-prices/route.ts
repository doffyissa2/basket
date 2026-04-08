/**
 * Cron: sync-market-prices
 *
 * Scrapes Carrefour and Leclerc public product catalogs and upserts the
 * prices into market_prices. Designed to run daily at 03:00 UTC.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { scrapeCarrefour } from '@/lib/scrapers/carrefour'
import { scrapeLeclerc } from '@/lib/scrapers/leclerc'
import type { ScrapedPrice } from '@/lib/scrapers/base'

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) { console.error("[cron] CRON_SECRET not set — rejecting request"); return false }
  return request.headers.get('authorization') === `Bearer ${secret}`
}

async function upsertPrices(prices: ScrapedPrice[]): Promise<number> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const CHUNK = 200
  let upserted = 0

  for (let i = 0; i < prices.length; i += CHUNK) {
    const chunk = prices.slice(i, i + CHUNK).map((p) => ({
      chain: p.chain,
      product_name: p.productName,
      product_name_normalised: p.productNameNormalised,
      ean: p.ean,
      unit_price: p.unitPrice,
      unit: p.unit,
      category: p.category,
      region: p.region,
      source: p.chain.toLowerCase().replace(/\s/g, '_') + '_scraper',
      source_url: p.sourceUrl,
      scraped_at: new Date().toISOString(),
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('market_prices') as any)
      .upsert(chunk, { onConflict: 'chain,product_name_normalised,region', ignoreDuplicates: false })

    if (error) console.error('[sync-market-prices] upsert error:', error.message)
    else upserted += chunk.length
  }

  return upserted
}

export async function POST(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const report: Record<string, number> = {}

  // Carrefour
  try {
    const prices = await scrapeCarrefour(50)
    report.carrefour = await upsertPrices(prices)
    console.log(`[sync-market-prices] Carrefour: ${prices.length} scraped, ${report.carrefour} upserted`)
  } catch (err) {
    console.error('[sync-market-prices] Carrefour error:', err)
    report.carrefour = -1
  }

  // Leclerc
  try {
    const prices = await scrapeLeclerc(50)
    report.leclerc = await upsertPrices(prices)
    console.log(`[sync-market-prices] Leclerc: ${prices.length} scraped, ${report.leclerc} upserted`)
  } catch (err) {
    console.error('[sync-market-prices] Leclerc error:', err)
    report.leclerc = -1
  }

  const elapsed = Math.round((Date.now() - startedAt) / 1000)
  return NextResponse.json({ ok: true, report, elapsed_s: elapsed })
}

export const GET = POST
