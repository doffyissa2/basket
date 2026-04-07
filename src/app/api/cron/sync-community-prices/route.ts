/**
 * Cron: sync-community-prices
 *
 * Scrapes Reddit (r/france, r/BudgetFrancais) and Dealabs for public
 * receipt posts. Extracts prices using Claude Haiku in a privacy pipeline
 * that strips all PII before any data is written to the database.
 *
 * Schedule: every 4 hours.
 *
 * CNIL LIA compliance:
 * - Benefit: transparency in grocery pricing during inflation
 * - Necessity: individual stores don't publish real-time regional data
 * - Safeguard: automated PII scrubber; only dept (2 chars) kept from postcodes
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { scrapeCommunityPrices } from '@/lib/scrapers/community'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  return request.headers.get('authorization') === `Bearer ${secret}`
}

export async function POST(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  const startedAt = Date.now()

  try {
    const prices = await scrapeCommunityPrices()
    console.log(`[sync-community-prices] extracted ${prices.length} items`)

    if (prices.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0, elapsed_s: 0 })
    }

    const rows = prices.map((p) => ({
      store_chain: p.storeChain,
      postcode: p.postcodeDept, // dept only — already anonymized
      item_name: p.itemName,
      item_name_normalised: p.itemNameNormalised,
      unit_price: p.unitPrice,
      source: p.source,
      source_date: p.sourceDate,
      processed_at: new Date().toISOString(),
    }))

    const CHUNK = 100
    let inserted = 0
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error } = await supabase
        .from('community_prices')
        .insert(rows.slice(i, i + CHUNK))
      if (error) console.error('[sync-community-prices] insert error:', error.message)
      else inserted += Math.min(CHUNK, rows.length - i)
    }

    const elapsed = Math.round((Date.now() - startedAt) / 1000)
    return NextResponse.json({ ok: true, extracted: prices.length, inserted, elapsed_s: elapsed })
  } catch (err) {
    console.error('[sync-community-prices] error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export const GET = POST
