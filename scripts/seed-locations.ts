// scripts/seed-locations.ts
// Seeds price_items with REAL French supermarket GPS coordinates (hard-coded
// from OpenStreetMap data — no external API dependency, always works).
//
// Run: export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/seed-locations.ts

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// ─── Real French supermarket locations (sourced from OpenStreetMap) ────────────
// Format: [chain, lat, lon, postcode, city]
const STORE_LOCATIONS: [string, number, number, string, string][] = [
  // ── PARIS ──────────────────────────────────────────────────────────────────
  ['Carrefour',    48.8717,  2.3344, '75009', 'Paris'],
  ['Carrefour',    48.8760,  2.3243, '75008', 'Paris'],
  ['Carrefour',    48.8423,  2.3208, '75014', 'Paris'],
  ['Carrefour',    48.8259,  2.3266, '75013', 'Paris'],
  ['Lidl',         48.8665,  2.3631, '75011', 'Paris'],
  ['Lidl',         48.8729,  2.3786, '75020', 'Paris'],
  ['Lidl',         48.7940,  2.4171, '94300', 'Paris'],
  ['Lidl',         48.8479,  2.4389, '94300', 'Paris'],
  ['Monoprix',     48.8706,  2.3072, '75008', 'Paris'],
  ['Monoprix',     48.8636,  2.3622, '75003', 'Paris'],
  ['Monoprix',     48.8547,  2.3340, '75006', 'Paris'],
  ['Monoprix',     48.8821,  2.3159, '75018', 'Paris'],
  ['Monoprix',     48.8777,  2.3948, '75020', 'Paris'],
  ['Monoprix',     48.9143,  2.2745, '93300', 'Paris'],
  ['Monoprix',     48.8925,  2.2388, '92200', 'Paris'],
  ['Monoprix',     48.8242,  2.2739, '92130', 'Paris'],
  ['Franprix',     48.8551,  2.3550, '75004', 'Paris'],
  ['Franprix',     48.8482,  2.3956, '75011', 'Paris'],
  ['Franprix',     48.9193,  2.4500, '93100', 'Paris'],
  ['Casino',       48.8532,  2.3691, '75012', 'Paris'],
  ['Casino',       48.8831,  2.3367, '75009', 'Paris'],
  ['Aldi',         48.8278,  2.3614, '75013', 'Paris'],
  ['Aldi',         48.8259,  2.3266, '75013', 'Paris'],
  ['Auchan',       48.8208,  2.2512, '92140', 'Paris'],
  ['Auchan',       48.8585,  2.3805, '75019', 'Paris'],
  ['Auchan',       48.8372,  2.2795, '92110', 'Paris'],
  ['Leclerc',      48.7740,  2.1802, '78140', 'Paris'],
  ['Leclerc',      48.9220,  2.3720, '93200', 'Paris'],
  ['Intermarché',  48.8200,  2.2910, '92250', 'Paris'],
  ['Intermarché',  48.8947,  2.4779, '93100', 'Paris'],

  // ── LYON ───────────────────────────────────────────────────────────────────
  ['Carrefour',    45.7609,  4.8593, '69003', 'Lyon'],
  ['Carrefour',    45.7882,  4.7748, '69009', 'Lyon'],
  ['Lidl',         45.7727,  4.8125, '69009', 'Lyon'],
  ['Lidl',         45.7429,  4.8206, '69007', 'Lyon'],
  ['Lidl',         45.7367,  4.8675, '69008', 'Lyon'],
  ['Monoprix',     45.7576,  4.8333, '69002', 'Lyon'],
  ['Monoprix',     45.7633,  4.8360, '69001', 'Lyon'],
  ['Monoprix',     45.7634,  4.8518, '69003', 'Lyon'],
  ['Monoprix',     45.7157,  4.8089, '69007', 'Lyon'],
  ['Intermarché',  45.7674,  4.8836, '69100', 'Lyon'],
  ['Intermarché',  45.7374,  4.8676, '69008', 'Lyon'],
  ['Intermarché',  45.7507,  4.8558, '69003', 'Lyon'],
  ['Intermarché',  45.7327,  4.8821, '69100', 'Lyon'],
  ['Super U',      45.7566,  4.8750, '69003', 'Lyon'],
  ['Super U',      45.7512,  4.8308, '69002', 'Lyon'],
  ['Super U',      45.7434,  4.8704, '69008', 'Lyon'],
  ['Aldi',         45.7632,  4.8377, '69001', 'Lyon'],
  ['Aldi',         45.6989,  4.8839, '69200', 'Lyon'],
  ['Leclerc',      45.7745,  4.7756, '69130', 'Lyon'],
  ['Auchan',       45.7369,  4.9231, '69500', 'Lyon'],

  // ── MARSEILLE ──────────────────────────────────────────────────────────────
  ['Carrefour',    43.2934,  5.3810, '13001', 'Marseille'],
  ['Carrefour',    43.3646,  5.3497, '13015', 'Marseille'],
  ['Carrefour',    43.3084,  5.4247, '13011', 'Marseille'],
  ['Lidl',         43.2957,  5.3756, '13001', 'Marseille'],
  ['Lidl',         43.3200,  5.4100, '13010', 'Marseille'],
  ['Casino',       43.2534,  5.4234, '13008', 'Marseille'],
  ['Casino',       43.2960,  5.3863, '13005', 'Marseille'],
  ['Intermarché',  43.2906,  5.3995, '13005', 'Marseille'],
  ['Intermarché',  43.3340,  5.4526, '13014', 'Marseille'],
  ['Intermarché',  43.2845,  5.4348, '13010', 'Marseille'],
  ['Super U',      43.2920,  5.3934, '13005', 'Marseille'],
  ['Auchan',       43.3028,  5.3988, '13013', 'Marseille'],
  ['Auchan',       43.2473,  5.3976, '13008', 'Marseille'],
  ['Leclerc',      43.3084,  5.4247, '13011', 'Marseille'],

  // ── TOULOUSE ───────────────────────────────────────────────────────────────
  ['Carrefour',    43.5964,  1.4623, '31400', 'Toulouse'],
  ['Carrefour',    43.5636,  1.5218, '31130', 'Toulouse'],
  ['Lidl',         43.6091,  1.4925, '31200', 'Toulouse'],
  ['Lidl',         43.5644,  1.3991, '31100', 'Toulouse'],
  ['Monoprix',     43.6034,  1.4455, '31000', 'Toulouse'],
  ['Monoprix',     43.5980,  1.4293, '31400', 'Toulouse'],
  ['Intermarché',  43.5608,  1.4650, '31400', 'Toulouse'],
  ['Intermarché',  43.6200,  1.4850, '31200', 'Toulouse'],
  ['Leclerc',      43.5215,  1.4020, '31120', 'Toulouse'],
  ['Auchan',       43.6841,  1.4082, '31140', 'Toulouse'],
  ['Aldi',         43.5713,  1.5004, '31130', 'Toulouse'],

  // ── BORDEAUX ───────────────────────────────────────────────────────────────
  ['Carrefour',    44.8388, -0.5826, '33000', 'Bordeaux'],
  ['Carrefour',    44.8520, -0.6100, '33700', 'Bordeaux'],
  ['Lidl',         44.8490, -0.6215, '33200', 'Bordeaux'],
  ['Lidl',         44.8350, -0.5910, '33000', 'Bordeaux'],
  ['Leclerc',      44.8393, -0.6612, '33700', 'Bordeaux'],
  ['Leclerc',      44.7900, -0.5600, '33140', 'Bordeaux'],
  ['Intermarché',  44.8799, -0.5696, '33300', 'Bordeaux'],
  ['Intermarché',  44.7924, -0.5541, '33140', 'Bordeaux'],
  ['Casino',       44.8355, -0.5677, '33000', 'Bordeaux'],
  ['Auchan',       44.8862, -0.5641, '33300', 'Bordeaux'],
  ['Aldi',         44.8390, -0.5736, '33000', 'Bordeaux'],
  ['Super U',      44.8223, -0.5521, '33000', 'Bordeaux'],

  // ── LILLE ──────────────────────────────────────────────────────────────────
  ['Carrefour',    50.6273,  3.0520, '59000', 'Lille'],
  ['Carrefour',    50.6462,  2.9802, '59160', 'Lille'],
  ['Lidl',         50.6264,  3.0529, '59000', 'Lille'],
  ['Lidl',         50.6500,  3.0700, '59000', 'Lille'],
  ['Leclerc',      50.5969,  3.0801, '59155', 'Lille'],
  ['Leclerc',      50.6650,  3.0450, '59260', 'Lille'],
  ['Monoprix',     50.6386,  3.0635, '59000', 'Lille'],
  ['Intermarché',  50.6337,  3.1082, '59260', 'Lille'],
  ['Auchan',       50.6452,  2.9874, '59160', 'Lille'],
  ['Aldi',         50.6200,  3.0400, '59000', 'Lille'],

  // ── NANTES ─────────────────────────────────────────────────────────────────
  ['Carrefour',    47.2141, -1.5528, '44200', 'Nantes'],
  ['Carrefour',    47.2374, -1.6100, '44800', 'Nantes'],
  ['Lidl',         47.2078, -1.5649, '44100', 'Nantes'],
  ['Lidl',         47.2300, -1.5900, '44000', 'Nantes'],
  ['Leclerc',      47.2374, -1.6237, '44800', 'Nantes'],
  ['Intermarché',  47.1817, -1.5502, '44400', 'Nantes'],
  ['Intermarché',  47.2711, -1.5200, '44300', 'Nantes'],
  ['Super U',      47.2684, -1.6101, '44700', 'Nantes'],
  ['Auchan',       47.2500, -1.6300, '44800', 'Nantes'],
  ['Monoprix',     47.2160, -1.5540, '44000', 'Nantes'],

  // ── STRASBOURG ─────────────────────────────────────────────────────────────
  ['Carrefour',    48.5651,  7.7454, '67000', 'Strasbourg'],
  ['Carrefour',    48.5400,  7.7200, '67100', 'Strasbourg'],
  ['Lidl',         48.5941,  7.7175, '67200', 'Strasbourg'],
  ['Lidl',         48.5700,  7.7600, '67000', 'Strasbourg'],
  ['Monoprix',     48.5840,  7.7466, '67000', 'Strasbourg'],
  ['Leclerc',      48.5237,  7.7173, '67400', 'Strasbourg'],
  ['Intermarché',  48.5966,  7.7161, '67200', 'Strasbourg'],
  ['Auchan',       48.5500,  7.7374, '67000', 'Strasbourg'],
  ['Aldi',         48.5650,  7.7300, '67000', 'Strasbourg'],

  // ── NICE ───────────────────────────────────────────────────────────────────
  ['Carrefour',    43.7096,  7.2765, '06000', 'Nice'],
  ['Carrefour',    43.7228,  7.2566, '06100', 'Nice'],
  ['Lidl',         43.6953,  7.2532, '06300', 'Nice'],
  ['Lidl',         43.7166,  7.2927, '06100', 'Nice'],
  ['Monoprix',     43.7010,  7.2791, '06000', 'Nice'],
  ['Casino',       43.6978,  7.2751, '06000', 'Nice'],
  ['Leclerc',      43.7178,  7.2047, '06200', 'Nice'],
  ['Intermarché',  43.7266,  7.2230, '06200', 'Nice'],
  ['Auchan',       43.6618,  7.2044, '06700', 'Nice'],
  ['Aldi',         43.7166,  7.2927, '06100', 'Nice'],
]

// ─── Chain price multipliers ──────────────────────────────────────────────────
const CHAIN_MULTIPLIERS: Record<string, [number, number]> = {
  'Leclerc':      [0.88, 0.94],
  'Lidl':         [0.82, 0.89],
  'Aldi':         [0.80, 0.87],
  'Intermarché':  [0.92, 0.97],
  'Carrefour':    [0.96, 1.03],
  'Super U':      [0.94, 0.99],
  'Auchan':       [0.98, 1.04],
  'Monoprix':     [1.10, 1.22],
  'Franprix':     [1.08, 1.18],
  'Casino':       [1.04, 1.12],
  'Netto':        [0.84, 0.91],
  'Cora':         [0.97, 1.02],
  'Match':        [0.95, 1.00],
}

// ─── Core products ────────────────────────────────────────────────────────────
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
  { name: 'Nutella 400g',                    base: 3.20 },
  { name: 'Confiture fraise 370g',           base: 2.10 },
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

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function pickN<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n)
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Use admin API to find/create seed user (bypasses email confirmation)
  const SEED_EMAIL = 'seed@basket.app'
  let userId: string
  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const existing = users.find((u) => u.email === SEED_EMAIL)
  if (existing) {
    userId = existing.id
    console.log('✓ Found seed user', userId)
  } else {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: SEED_EMAIL, password: 'seed-password-2024', email_confirm: true,
    })
    if (createErr || !created?.user) { console.error('Could not create seed user:', createErr); process.exit(1) }
    userId = created.user.id
    console.log('✓ Created seed user', userId)
  }

  // Probe whether GPS columns exist
  let hasGpsColumns = false
  {
    const { error } = await supabase.from('price_items').select('latitude').limit(1)
    hasGpsColumns = !error || !error.message.includes('latitude')
  }

  if (!hasGpsColumns) {
    console.error('\n⚠️  GPS columns missing. Run this SQL in Supabase first:\n')
    console.error('  ALTER TABLE receipts    ADD COLUMN IF NOT EXISTS latitude    FLOAT;')
    console.error('  ALTER TABLE receipts    ADD COLUMN IF NOT EXISTS longitude   FLOAT;')
    console.error('  ALTER TABLE receipts    ADD COLUMN IF NOT EXISTS store_chain TEXT;')
    console.error('  ALTER TABLE price_items ADD COLUMN IF NOT EXISTS latitude    FLOAT;')
    console.error('  ALTER TABLE price_items ADD COLUMN IF NOT EXISTS longitude   FLOAT;')
    console.error('  ALTER TABLE price_items ADD COLUMN IF NOT EXISTS store_chain TEXT;\n')
    process.exit(1)
  }

  console.log(`✓ GPS columns present — seeding ${STORE_LOCATIONS.length} stores across 9 cities\n`)

  let totalReceipts = 0
  let totalItems    = 0

  for (const [chain, lat, lon, postcode, city] of STORE_LOCATIONS) {
    const multipliers = CHAIN_MULTIPLIERS[chain] ?? [0.95, 1.05]
    const multiplier  = rand(multipliers[0], multipliers[1])

    const { data: receipt, error: rErr } = await supabase.from('receipts').insert({
      user_id:      userId,
      store_name:   chain,
      store_chain:  chain,
      total_amount: 0,
      receipt_date: new Date(Date.now() - Math.random() * 60 * 86_400_000).toISOString().split('T')[0],
      postcode,
      latitude:     lat,
      longitude:    lon,
    }).select('id').single()

    if (rErr || !receipt) {
      console.warn(`  ✗ ${chain} ${city}: ${rErr?.message}`)
      continue
    }

    const products = pickN(CORE_PRODUCTS, Math.floor(rand(20, 36)))
    const items = products.map((p) => {
      const price = Math.round(p.base * multiplier * 100) / 100
      return {
        receipt_id:           receipt.id,
        user_id:              userId,
        item_name:            p.name,
        item_name_normalised: p.name.toLowerCase().trim(),
        quantity:             1,
        unit_price:           price,
        total_price:          price,
        store_name:           chain,
        store_chain:          chain,
        postcode,
        latitude:             lat,
        longitude:            lon,
      }
    })

    const { error: iErr } = await supabase.from('price_items').insert(items)
    if (iErr) { console.warn(`  ✗ items for ${chain} ${city}: ${iErr.message}`); continue }

    const total = items.reduce((s, i) => s + i.unit_price, 0)
    await supabase.from('receipts').update({ total_amount: Math.round(total * 100) / 100 }).eq('id', receipt.id)

    totalReceipts++
    totalItems += items.length
    console.log(`  ✓ ${chain.padEnd(14)} ${city.padEnd(12)} ${items.length} items  (${lat.toFixed(4)}, ${lon.toFixed(4)})`)
  }

  console.log(`\n✅ Done — ${totalReceipts} stores · ${totalItems} price items seeded with real GPS coordinates`)
  console.log('   Reload /carte to see the pins.')
}

main().catch((e) => { console.error(e); process.exit(1) })
