// scripts/seed-locations.ts
// Fetches REAL French supermarket locations from OpenStreetMap Overpass API
// and seeds price_items with real GPS coordinates so the /carte map has data.
//
// Run: export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/seed-locations.ts

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error('Missing env vars')
  process.exit(1)
}

const authClient = createClient(SUPABASE_URL, ANON_KEY)
const supabase   = createClient(SUPABASE_URL, SERVICE_KEY)

// ─── Store chain config ───────────────────────────────────────────────────────
// Maps name substrings (uppercased) → { canonical, price multiplier range }
const CHAIN_CONFIG: { key: string; canonical: string; min: number; max: number }[] = [
  { key: 'LECLERC',      canonical: 'Leclerc',           min: 0.88, max: 0.94 },
  { key: 'LIDL',         canonical: 'Lidl',              min: 0.82, max: 0.89 },
  { key: 'ALDI',         canonical: 'Aldi',              min: 0.80, max: 0.87 },
  { key: 'INTERMARCHE',  canonical: 'Intermarché',       min: 0.92, max: 0.97 },
  { key: 'INTERMARCHÉ',  canonical: 'Intermarché',       min: 0.92, max: 0.97 },
  { key: 'CARREFOUR',    canonical: 'Carrefour',         min: 0.96, max: 1.03 },
  { key: 'SUPER U',      canonical: 'Super U',           min: 0.94, max: 0.99 },
  { key: 'HYPER U',      canonical: 'Super U',           min: 0.93, max: 0.98 },
  { key: 'U EXPRESS',    canonical: 'Super U',           min: 0.96, max: 1.01 },
  { key: 'SYSTÈME U',    canonical: 'Super U',           min: 0.94, max: 0.99 },
  { key: 'SYSTEME U',    canonical: 'Super U',           min: 0.94, max: 0.99 },
  { key: 'AUCHAN',       canonical: 'Auchan',            min: 0.98, max: 1.04 },
  { key: 'SIMPLY',       canonical: 'Auchan',            min: 0.99, max: 1.04 },
  { key: 'MONOPRIX',     canonical: 'Monoprix',          min: 1.10, max: 1.22 },
  { key: 'FRANPRIX',     canonical: 'Franprix',          min: 1.08, max: 1.18 },
  { key: 'CASINO',       canonical: 'Casino',            min: 1.04, max: 1.12 },
  { key: 'NETTO',        canonical: 'Netto',             min: 0.84, max: 0.91 },
  { key: 'CORA',         canonical: 'Cora',              min: 0.97, max: 1.02 },
  { key: 'MATCH',        canonical: 'Match',             min: 0.95, max: 1.00 },
]

function resolveChain(name: string): { canonical: string; min: number; max: number } | null {
  const up = name.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  for (const c of CHAIN_CONFIG) {
    const key = c.key.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (up.includes(key)) return c
  }
  return null
}

// ─── Core products (50 items — enough to make per-store price data meaningful) ─
const CORE_PRODUCTS: { name: string; base: number }[] = [
  { name: 'Lait demi-écrémé 1L',              base: 1.05 },
  { name: 'Lait entier 1L',                   base: 1.15 },
  { name: 'Beurre doux 250g',                 base: 2.20 },
  { name: 'Yaourt nature x4',                 base: 1.50 },
  { name: 'Oeufs x6',                         base: 2.20 },
  { name: 'Oeufs x12',                        base: 3.90 },
  { name: 'Emmental râpé 200g',               base: 2.10 },
  { name: 'Camembert 250g',                   base: 1.75 },
  { name: 'Farine T45 1kg',                   base: 1.10 },
  { name: 'Pain de mie complet',              base: 1.60 },
  { name: 'Pâtes spaghetti 500g',             base: 0.90 },
  { name: 'Pâtes penne 500g',                 base: 0.90 },
  { name: 'Riz long grain 1kg',               base: 1.20 },
  { name: 'Semoule 500g',                     base: 0.85 },
  { name: 'Huile tournesol 1L',               base: 1.80 },
  { name: 'Huile olive vierge extra 75cl',    base: 4.50 },
  { name: 'Sucre 1kg',                        base: 1.10 },
  { name: 'Sel 1kg',                          base: 0.55 },
  { name: 'Café moulu 250g',                  base: 3.50 },
  { name: 'Thé noir 25 sachets',              base: 2.20 },
  { name: 'Eau minérale 1.5L',               base: 0.48 },
  { name: 'Eau minérale 6x1.5L',             base: 2.60 },
  { name: 'Jus orange 1L',                   base: 1.80 },
  { name: 'Tomates cerises 250g',            base: 2.00 },
  { name: 'Carottes 1kg',                    base: 1.20 },
  { name: 'Pommes de terre 2kg',             base: 2.30 },
  { name: 'Bananes 1kg',                     base: 1.40 },
  { name: 'Pommes gala 1kg',                 base: 2.20 },
  { name: 'Poulet entier 1.5kg',             base: 6.50 },
  { name: 'Escalopes poulet x4',             base: 5.80 },
  { name: 'Steak haché 5%MG x4',             base: 5.20 },
  { name: 'Jambon blanc x4 tranches',        base: 2.40 },
  { name: 'Lardons fumés 200g',              base: 1.90 },
  { name: 'Saumon fumé 100g',               base: 4.20 },
  { name: 'Thon en boîte 160g',             base: 1.60 },
  { name: 'Sardines à l\'huile 135g',       base: 1.20 },
  { name: 'Nutella 400g',                    base: 3.20 },
  { name: 'Confiture fraise 370g',           base: 2.10 },
  { name: 'Miel 500g',                       base: 4.80 },
  { name: 'Ketchup Heinz 500ml',            base: 2.80 },
  { name: 'Moutarde Amora 200g',            base: 1.40 },
  { name: 'Mayonnaise Hellmann\'s 400ml',   base: 3.00 },
  { name: 'Pesto alla genovese 190g',       base: 2.50 },
  { name: 'Sauce tomate 400g',              base: 1.20 },
  { name: 'Chips nature 150g',              base: 1.90 },
  { name: 'Biscuits LU Petit Beurre 200g', base: 1.80 },
  { name: 'Chocolat noir 100g',             base: 1.50 },
  { name: 'Shampooing 250ml',               base: 2.80 },
  { name: 'Dentifrice 75ml',               base: 1.60 },
  { name: 'Papier toilette x6 rouleaux',   base: 2.40 },
]

// ─── Overpass bounding boxes — 9 major French cities ─────────────────────────
const CITY_BOXES = [
  { city: 'Paris',        bbox: '48.79,2.20,48.92,2.48'   },
  { city: 'Lyon',         bbox: '45.70,4.77,45.79,4.91'   },
  { city: 'Marseille',    bbox: '43.21,5.31,43.40,5.54'   },
  { city: 'Toulouse',     bbox: '43.54,1.35,43.67,1.52'   },
  { city: 'Bordeaux',     bbox: '44.80,-0.68,44.89,-0.52' },
  { city: 'Lille',        bbox: '50.59,2.99,50.69,3.10'   },
  { city: 'Nantes',       bbox: '47.19,-1.62,47.29,-1.48' },
  { city: 'Strasbourg',   bbox: '48.54,7.71,48.61,7.83'   },
  { city: 'Nice',         bbox: '43.67,7.19,43.74,7.30'   },
]

const OVERPASS_MIRRORS = [
  'https://overpass.openstreetmap.fr/api/interpreter',  // French mirror — fastest for France
  'https://overpass.kumi.systems/api/interpreter',       // EU mirror
  'https://overpass-api.de/api/interpreter',             // Main (sometimes busy)
]

interface OverpassNode {
  type: 'node'
  id: number
  lat: number
  lon: number
  tags?: Record<string, string>
}

async function overpassQuery(query: string): Promise<OverpassNode[]> {
  for (const mirror of OVERPASS_MIRRORS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(mirror, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(30_000),
        })
        if (!res.ok) {
          console.warn(`    mirror ${mirror} returned ${res.status}, trying next…`)
          break // try next mirror
        }
        const json = await res.json() as { elements: OverpassNode[] }
        return json.elements
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        if (attempt < 3) {
          console.warn(`    attempt ${attempt} failed (${msg}), retrying in 3s…`)
          await new Promise((r) => setTimeout(r, 3000))
        }
      }
    }
  }
  console.warn('    all mirrors failed for this city, skipping')
  return []
}

async function fetchStores(): Promise<{ name: string; lat: number; lon: number; postcode: string | null }[]> {
  const all: { name: string; lat: number; lon: number; postcode: string | null }[] = []

  for (const { city, bbox } of CITY_BOXES) {
    process.stdout.write(`  → ${city.padEnd(12)}`)
    const query = `[out:json][timeout:30];\nnode["shop"="supermarket"](${bbox});\nout body;`
    const nodes = await overpassQuery(query)
    const stores = nodes
      .filter((n) => n.tags?.name)
      .map((n) => ({ name: n.tags!.name!, lat: n.lat, lon: n.lon, postcode: n.tags?.['addr:postcode'] ?? null }))
    console.log(` ${stores.length} nodes`)
    all.push(...stores)
    // Polite delay between city queries (Nominatim policy: 1 req/s)
    await new Promise((r) => setTimeout(r, 1500))
  }

  console.log(`→ ${all.length} total raw nodes across all cities`)
  return all
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Sign in / create seed user
  const SEED_EMAIL    = 'seed@basket.app'
  const SEED_PASSWORD = 'seed-password-2024'

  // Use admin API (service role key) — bypasses email confirmation entirely
  let userId: string
  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const existing = users.find((u) => u.email === SEED_EMAIL)
  if (existing) {
    userId = existing.id
    console.log('✓ Found seed user', userId)
  } else {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: SEED_EMAIL,
      password: SEED_PASSWORD,
      email_confirm: true,
    })
    if (createErr || !created.user) { console.error('Could not create seed user:', createErr); process.exit(1) }
    userId = created.user.id
    console.log('✓ Created seed user', userId)
  }

  // Fetch real store locations
  const rawStores = await fetchStores()

  // Keep only known chains, deduplicate by (chain, lat_bucket, lon_bucket)
  const seen = new Set<string>()
  const stores: { name: string; canonical: string; min: number; max: number; lat: number; lon: number; postcode: string | null }[] = []
  for (const s of rawStores) {
    const chain = resolveChain(s.name)
    if (!chain) continue
    const key = `${chain.canonical}::${Math.round(s.lat * 100)}::${Math.round(s.lon * 100)}`
    if (seen.has(key)) continue
    seen.add(key)
    stores.push({ ...s, ...chain })
  }

  console.log(`→ ${stores.length} unique known-chain supermarkets found`)

  if (stores.length === 0) {
    console.error('No stores found — Overpass may be rate-limiting. Try again in a minute.')
    process.exit(1)
  }

  // Probe whether the new GPS columns exist by attempting a minimal insert + rollback
  let hasGpsColumns = false
  {
    const probe = await supabase.from('price_items').insert({
      receipt_id: '00000000-0000-0000-0000-000000000000',
      user_id: userId,
      item_name: '__probe__',
      item_name_normalised: '__probe__',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      store_name: '__probe__',
      store_chain: '__probe__',
      postcode: null,
      latitude: 48.8566,
      longitude: 2.3522,
    })
    if (!probe.error) {
      hasGpsColumns = true
      // Clean up probe row
      await supabase.from('price_items').delete().eq('item_name', '__probe__').eq('user_id', userId)
    } else if (probe.error.message.includes('latitude') || probe.error.message.includes('longitude') || probe.error.message.includes('store_chain')) {
      console.warn('\n⚠️  GPS columns are missing from your database.')
      console.warn('   Run this SQL in Supabase SQL Editor first, then re-run this script:\n')
      console.warn('   ALTER TABLE receipts    ADD COLUMN IF NOT EXISTS latitude    FLOAT;')
      console.warn('   ALTER TABLE receipts    ADD COLUMN IF NOT EXISTS longitude   FLOAT;')
      console.warn('   ALTER TABLE receipts    ADD COLUMN IF NOT EXISTS store_chain TEXT;')
      console.warn('   ALTER TABLE price_items ADD COLUMN IF NOT EXISTS latitude    FLOAT;')
      console.warn('   ALTER TABLE price_items ADD COLUMN IF NOT EXISTS longitude   FLOAT;')
      console.warn('   ALTER TABLE price_items ADD COLUMN IF NOT EXISTS store_chain TEXT;\n')
      console.warn('   Continuing with inserts WITHOUT GPS columns — the price map will be empty until you run the SQL.\n')
    }
  }

  let totalReceipts = 0
  let totalItems    = 0

  for (const store of stores) {
    // Create a seed receipt — include GPS only if columns exist
    const receiptPayload: Record<string, unknown> = {
      user_id:      userId,
      store_name:   store.canonical,
      total_amount: 0,
      receipt_date: new Date(Date.now() - Math.random() * 30 * 86_400_000).toISOString().split('T')[0],
      postcode:     store.postcode,
    }
    if (hasGpsColumns) {
      receiptPayload.store_chain = store.canonical
      receiptPayload.latitude    = store.lat
      receiptPayload.longitude   = store.lon
    }

    const { data: receipt, error: rErr } = await supabase.from('receipts').insert(receiptPayload).select('id').single()
    if (rErr || !receipt) {
      console.warn(`  ✗ Failed receipt for ${store.canonical}: ${rErr?.message}`)
      continue
    }

    // Pick 20–35 products for this receipt
    const products   = pickN(CORE_PRODUCTS, Math.floor(rand(20, 36)))
    const multiplier = rand(store.min, store.max)

    const items = products.map((p) => {
      const price = Math.round(p.base * multiplier * 100) / 100
      const row: Record<string, unknown> = {
        receipt_id:           receipt.id,
        user_id:              userId,
        item_name:            p.name,
        item_name_normalised: p.name.toLowerCase().trim(),
        quantity:             1,
        unit_price:           price,
        total_price:          price,
        store_name:           store.canonical,
        postcode:             store.postcode,
      }
      if (hasGpsColumns) {
        row.store_chain = store.canonical
        row.latitude    = store.lat
        row.longitude   = store.lon
      }
      return row
    })

    const { error: iErr } = await supabase.from('price_items').insert(items)
    if (iErr) {
      console.warn(`  ✗ Items insert failed for ${store.canonical}: ${iErr.message}`)
      continue
    }

    const total = items.reduce((s: number, i) => s + (i.unit_price as number), 0)
    await supabase.from('receipts').update({ total_amount: Math.round(total * 100) / 100 }).eq('id', receipt.id)

    totalReceipts++
    totalItems += items.length

    const city = CITY_BOXES.find(({ bbox }) => {
      const [minLat, minLon, maxLat, maxLon] = bbox.split(',').map(Number)
      return store.lat >= minLat && store.lat <= maxLat && store.lon >= minLon && store.lon <= maxLon
    })?.city ?? '?'

    if (totalReceipts % 20 === 0 || totalReceipts <= 5) {
      console.log(`  ✓ ${store.canonical.padEnd(14)} ${city.padEnd(12)} ${items.length} items  (${store.lat.toFixed(4)}, ${store.lon.toFixed(4)})`)
    }
  }

  const gpsNote = hasGpsColumns ? 'with real GPS coordinates' : 'WITHOUT GPS (run SQL migrations then re-seed)'
  console.log(`\n✅ Done — ${totalReceipts} receipts · ${totalItems} price items seeded ${gpsNote}`)
  if (hasGpsColumns) console.log('   Reload /carte to see the pins.')
}

main().catch((e) => { console.error(e); process.exit(1) })
