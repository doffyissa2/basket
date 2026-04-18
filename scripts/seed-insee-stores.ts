// scripts/seed-insee-stores.ts
//
// Two-phase seed strategy:
//   Phase 1 — SIRENE API: fetch all grocery establishments (NAF 47.11*)
//             Gives us: SIRET, name, address, sometimes coordinates
//   Phase 2 — Geo CSV stream: enrich with precise government-geocoded coordinates
//             The CSV has SIRET → exact lat/lon for every French business
//   Phase 3 — BAN fallback: geocode via Base Adresse Nationale for any store
//             not found in the CSV (very rare for active establishments)
//   Phase 4 — Batch upsert into Supabase, conflicting on siret
//
// Run: npx tsx scripts/seed-insee-stores.ts
//
import fs from 'fs'
import readline from 'readline'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌  Missing Supabase environment variables.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// NAF codes: 47.11A = Supérettes, 47.11B = Supermarchés,
//            47.11C = Hypermarchés, 47.11D = Discount (Lidl, Aldi…)
const TARGET_NAF_CODES = ['47.11A', '47.11B', '47.11C', '47.11D']

const CSV_FILE_PATH = path.resolve(
  process.cwd(),
  'GeolocalisationEtablissement_Sirene_pour_etudes_statistiques_utf8.csv'
)

const BATCH_SIZE  = 500
const API_DELAY   = 150  // ms between SIRENE API pages — be a polite client
const BAN_DELAY   = 50   // ms between BAN calls

// ── Types ──────────────────────────────────────────────────────────────────────

interface StoreRecord {
  siret:     string
  name:      string
  chain:     string
  address:   string | null
  postcode:  string | null
  city:      string | null
  latitude:  number | null
  longitude: number | null
}

// ── Phase 1: SIRENE API ────────────────────────────────────────────────────────

async function fetchSirenePage(
  nafCode: string,
  page: number
): Promise<{ results: Record<string, unknown>[]; total: number }> {
  const url =
    `https://recherche-entreprises.api.gouv.fr/search` +
    `?activite_principale=${encodeURIComponent(nafCode)}&page=${page}&per_page=25`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'basket-app/1.0' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`SIRENE API ${res.status}: ${await res.text()}`)
  const data = await res.json() as Record<string, unknown>
  return {
    results: (data.results as Record<string, unknown>[]) ?? [],
    total:   (data.total_results as number) ?? 0,
  }
}

function extractStoreFromResult(result: Record<string, unknown>): StoreRecord | null {
  const siege = (result.siege ?? {}) as Record<string, unknown>
  const siret = (result.siret ?? siege.siret) as string | undefined
  if (!siret || siret.length !== 14) return null

  const name =
    (siege.enseigne_1 as string) ??
    (siege.denomination_usuelle as string) ??
    (result.nom_complet as string) ??
    (result.siege as Record<string, unknown>)?.nom_complet as string ??
    'Supermarché'

  const postcode = (siege.code_postal as string) ?? null
  const city     = (siege.commune    as string) ?? null

  const addressParts = [
    siege.numero_voie,
    siege.type_voie,
    siege.libelle_voie,
    postcode,
    city,
  ].filter(Boolean) as string[]
  const address = addressParts.length > 0 ? addressParts.join(' ') : null

  // Some SIRENE results include coordinates directly
  const lat = parseFloat((siege.latitude as string) ?? '')
  const lon = parseFloat((siege.longitude as string) ?? '')

  return {
    siret,
    name,
    chain:     name,
    address,
    postcode,
    city,
    latitude:  isNaN(lat) ? null : lat,
    longitude: isNaN(lon) ? null : lon,
  }
}

async function buildStoreMapFromAPI(): Promise<Map<string, StoreRecord>> {
  const stores = new Map<string, StoreRecord>()

  for (const nafCode of TARGET_NAF_CODES) {
    console.log(`\n📋  Fetching NAF ${nafCode} from SIRENE API…`)
    let page     = 1
    let fetched  = 0
    let total    = 0

    do {
      try {
        const { results, total: t } = await fetchSirenePage(nafCode, page)
        total = t

        for (const result of results) {
          const store = extractStoreFromResult(result)
          if (store) stores.set(store.siret, store)
        }

        fetched += results.length
        process.stdout.write(`\r    Page ${page} — ${fetched}/${total} fetched`)

        if (results.length < 25) break
        page++
        await new Promise(r => setTimeout(r, API_DELAY))
      } catch (err) {
        console.error(`\n    ⚠️  Error on page ${page}: ${(err as Error).message} — retrying`)
        await new Promise(r => setTimeout(r, 2000))
      }
    } while (fetched < total && fetched < 20_000)  // safety cap at 20k per code

    console.log(`\n    ✅  ${nafCode}: ${fetched} of ${total} establishments collected`)
  }

  return stores
}

// ── Phase 2: Enrich from the local geo CSV ─────────────────────────────────────
// The CSV has SIRET;x;y;…;y_latitude;x_longitude (semicolon-separated).
// We stream line-by-line (never loading the whole 1.2 GB into memory) and
// fill in coordinates for any store in our map that still lacks them.

async function enrichFromCsv(stores: Map<string, StoreRecord>): Promise<void> {
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.log('\n⚠️  Geo CSV not found — skipping CSV enrichment phase')
    return
  }

  console.log(`\n📂  Streaming geo CSV for precise coordinates…`)

  const needCoords = new Set(
    [...stores.values()]
      .filter(s => s.latitude === null)
      .map(s => s.siret)
  )

  console.log(`    ${needCoords.size} stores still need coordinates from CSV`)

  const rl = readline.createInterface({
    input:       fs.createReadStream(CSV_FILE_PATH, { encoding: 'utf8' }),
    crlfDelay:   Infinity,
    terminal:    false,
  })

  let lineNum    = 0
  let enriched   = 0
  let latIdx     = -1
  let lonIdx     = -1
  let siretIdx   = 0

  for await (const line of rl) {
    lineNum++

    if (lineNum === 1) {
      // Parse header to find column indices
      const headers = line.split(';')
      siretIdx = headers.indexOf('siret')
      latIdx   = headers.indexOf('y_latitude')
      lonIdx   = headers.indexOf('x_longitude')

      if (latIdx === -1 || lonIdx === -1) {
        console.error('\n❌  CSV missing y_latitude/x_longitude columns')
        rl.close()
        return
      }
      continue
    }

    if (needCoords.size === 0) break  // all stores enriched — stop streaming

    const cols  = line.split(';')
    const siret = cols[siretIdx]?.trim()
    if (!siret || !needCoords.has(siret)) continue

    const lat = parseFloat(cols[latIdx] ?? '')
    const lon = parseFloat(cols[lonIdx] ?? '')

    if (!isNaN(lat) && !isNaN(lon)) {
      const store = stores.get(siret)!
      store.latitude  = lat
      store.longitude = lon
      needCoords.delete(siret)
      enriched++
      if (enriched % 1000 === 0) {
        process.stdout.write(`\r    Enriched ${enriched} stores from CSV…`)
      }
    }
  }

  console.log(`\n    ✅  CSV enrichment complete: ${enriched} stores got precise coordinates`)
  console.log(`    ℹ️   ${needCoords.size} stores still without coordinates — will try BAN`)
}

// ── Phase 3: BAN geocoding fallback ───────────────────────────────────────────

async function geocodeBAN(
  address: string
): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`,
      { headers: { 'User-Agent': 'basket-app/1.0' }, signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const data = await res.json() as Record<string, unknown>
    const features = (data.features as unknown[]) ?? []
    const feature  = features[0] as Record<string, unknown> | undefined
    if (!feature) return null
    const props = feature.properties as Record<string, unknown>
    if ((props.score as number) < 0.4) return null
    const [lon, lat] = (feature.geometry as Record<string, unknown>).coordinates as [number, number]
    return { lat, lon }
  } catch { return null }
}

async function banEnrichRemaining(stores: Map<string, StoreRecord>): Promise<void> {
  const missing = [...stores.values()].filter(s => s.latitude === null && s.address)
  if (missing.length === 0) return

  console.log(`\n🌍  BAN geocoding ${missing.length} remaining stores…`)
  let done = 0

  for (const store of missing) {
    const geo = await geocodeBAN(store.address!)
    if (geo) {
      store.latitude  = geo.lat
      store.longitude = geo.lon
    }
    done++
    if (done % 100 === 0) process.stdout.write(`\r    BAN: ${done}/${missing.length}`)
    await new Promise(r => setTimeout(r, BAN_DELAY))
  }

  console.log(`\n    ✅  BAN geocoding done`)
}

// ── Phase 4: Batch upsert ─────────────────────────────────────────────────────

async function upsertToSupabase(stores: Map<string, StoreRecord>): Promise<void> {
  const valid = [...stores.values()].filter(
    s => s.latitude !== null && s.longitude !== null
  )
  const skipped = stores.size - valid.length

  console.log(`\n💾  Upserting ${valid.length} stores (${skipped} skipped — no coords)…`)

  let inserted = 0

  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const batch = valid.slice(i, i + BATCH_SIZE).map(s => ({
      // osm_id: stable synthetic key so existing OSM rows aren't broken
      osm_id:    `sirene_${s.siret}`,
      siret:     s.siret,
      name:      s.name,
      chain:     s.chain,
      address:   s.address,
      postcode:  s.postcode,
      city:      s.city,
      latitude:  s.latitude!,
      longitude: s.longitude!,
      source:    'insee_sirene',
      accuracy:  'exact',
    }))

    const { error } = await supabase
      .from('store_locations')
      .upsert(batch, { onConflict: 'siret', ignoreDuplicates: false })

    if (error) {
      console.error(`\n❌  Batch ${i}–${i + batch.length} error: ${error.message}`)
    } else {
      inserted += batch.length
      process.stdout.write(`\r    ✅  ${inserted}/${valid.length} upserted`)
    }
  }

  console.log(`\n\n🎉  Seed complete! ${inserted} French grocery stores in the database.`)
  if (skipped > 0) {
    console.log(`    ℹ️   ${skipped} stores were skipped (no address + not in geo CSV).`)
    console.log(`         They will be added automatically when a user scans a receipt there.`)
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🇫🇷  INSEE/SIRENE French Supermarket Seed')
  console.log('────────────────────────────────────────────')
  console.log(`📡  Phase 1: SIRENE API (NAF codes: ${TARGET_NAF_CODES.join(', ')})`)
  console.log(`📂  Phase 2: Geo CSV enrichment`)
  console.log(`🌍  Phase 3: BAN geocoding fallback`)
  console.log(`💾  Phase 4: Supabase batch upsert (conflict on siret)\n`)

  const stores = await buildStoreMapFromAPI()
  console.log(`\n📊  Total unique stores from API: ${stores.size}`)

  await enrichFromCsv(stores)
  await banEnrichRemaining(stores)
  await upsertToSupabase(stores)

  process.exit(0)
}

main().catch(e => {
  console.error('\n❌  Fatal error:', e)
  process.exit(1)
})
