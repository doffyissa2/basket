import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { timingSafeEqual } from 'crypto'
import { SupabaseClient } from '@supabase/supabase-js'
import { getServiceClient } from '@/lib/supabase-service'
import { requireAuth } from '@/lib/auth'
import { normalizeStoreChain } from '@/lib/store-chains'
import { normalizeProductName, extractBrand, extractWeight } from '@/lib/normalize'
import type { ParsedItem, ParsedReceipt } from '@/types/api'

// ── Phase 2: Background Worker ──────────────────────────────────────────────
// Reads scan_jobs row → Sonnet Vision parse → post-processing → DB inserts
// → marks job done. Location resolution runs AFTER marking done (deferred).
//
// Auth: accepts EITHER x-internal-secret header (server-to-server)
// OR a user Bearer token (client-triggered). The user must own the job.

// ── Auth ─────────────────────────────────────────────────────────────────────

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(createHash('sha256').update(a).digest())
  const bufB = Buffer.from(createHash('sha256').update(b).digest())
  return timingSafeEqual(bufA, bufB)
}

function authorizeInternal(req: NextRequest): boolean {
  const secret = process.env.INTERNAL_API_SECRET ?? process.env.CRON_SECRET
  if (!secret) return false
  const provided = req.headers.get('x-internal-secret') ?? ''
  return safeCompare(provided, secret)
}

// ── SIRENE API types ─────────────────────────────────────────────────────────
interface SireneEtab {
  adresse?: string
  code_postal?: string
  siret?: string
}
interface SireneResult {
  siege?: SireneEtab
  matching_etablissements?: SireneEtab[]
}

// ── French government geocoding helpers ──────────────────────────────────────

async function lookupSirene(query: string, postcode?: string | null): Promise<string | null> {
  try {
    const res = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(query)}&page=1&per_page=5`,
      { headers: { 'User-Agent': 'basket-app/1.0' }, signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const results: SireneResult[] = data?.results ?? []
    if (results.length === 0) return null
    for (const result of results) {
      const etab = postcode
        ? (result.matching_etablissements?.find(e => e.code_postal === postcode) ??
           (result.siege?.code_postal === postcode ? result.siege : null))
        : result.siege
      if (etab?.adresse) return etab.adresse
    }
    return results[0]?.siege?.adresse ?? null
  } catch { return null }
}

function sirenFromVat(vat: string): string | null {
  const clean = vat.replace(/\s/g, '').toUpperCase()
  return clean.match(/^FR\w{2}(\d{9})$/)?.[1] ?? null
}

async function geocodeBAN(address: string): Promise<{ lat: number; lon: number; score: number } | null> {
  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`,
      { headers: { 'User-Agent': 'basket-app/1.0' }, signal: AbortSignal.timeout(4000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const feature = data?.features?.[0]
    if (!feature) return null
    const score: number = feature.properties?.score ?? 0
    if (score < 0.4) return null
    const [lon, lat] = feature.geometry.coordinates as [number, number]
    return { lat, lon, score }
  } catch { return null }
}

// ── Fetch price anchors from community_prices ────────────────────────────────
async function fetchPriceAnchors(supabase: SupabaseClient): Promise<string> {
  try {
    const { data } = await supabase
      .from('community_prices')
      .select('item_name, item_name_normalised, unit_price')
      .order('processed_at', { ascending: false })
      .limit(1000)

    if (!data || data.length === 0) return ''

    const groups: Record<string, { name: string; prices: number[] }> = {}
    for (const row of data) {
      const key = row.item_name_normalised as string
      if (!groups[key]) groups[key] = { name: row.item_name as string, prices: [] }
      groups[key].prices.push(row.unit_price as number)
    }

    const anchors = Object.values(groups)
      .filter(g => g.prices.length >= 2 && g.name.length > 3)
      .map(g => {
        const s = [...g.prices].sort((a, b) => a - b)
        return { name: g.name, min: s[0], max: s[s.length - 1], count: s.length }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 50)

    if (anchors.length === 0) return ''

    return `\n\n── PRIX DE RÉFÉRENCE (données réelles France) ───────────────────────────────\nSi un prix semble aberrant, corrige-le en utilisant ces fourchettes :\n${anchors
      .map(a => `- ${a.name} : ${a.min.toFixed(2)}€ – ${a.max.toFixed(2)}€`)
      .join('\n')}`
  } catch {
    return ''
  }
}

// ── Post-parse price validation ──────────────────────────────────────────────
async function validateItemPrices(
  items: ParsedItem[],
  supabase: SupabaseClient
): Promise<ParsedItem[]> {
  try {
    const { data } = await supabase
      .from('community_prices')
      .select('item_name_normalised, unit_price')
      .limit(2000)

    if (!data || data.length === 0) return items

    const priceMap: Record<string, number[]> = {}
    for (const row of data) {
      const key = row.item_name_normalised as string
      if (!priceMap[key]) priceMap[key] = []
      priceMap[key].push(row.unit_price as number)
    }
    const keys = Object.keys(priceMap)

    return items.map(item => {
      if (item.price <= 0 || item.price > 500) return item

      const norm = normalizeProductName(item.name)
      const normWords = norm.split(' ').filter((w: string) => w.length > 3)
      if (normWords.length === 0) return item

      let bestKey: string | null = null
      let bestScore = 0
      for (const key of keys) {
        const keyWords = key.split(' ')
        const overlap = normWords.filter((w: string) => keyWords.includes(w)).length
        const score = overlap / Math.max(normWords.length, keyWords.length)
        if (score > bestScore && score >= 0.45) { bestScore = score; bestKey = key }
      }
      if (!bestKey) return item

      const prices = priceMap[bestKey]
      const sorted = [...prices].sort((a, b) => a - b)
      const median = sorted[Math.floor(sorted.length / 2)]

      if (item.price >= median * 6 && item.price >= 5) {
        const corrected = parseFloat((item.price / 10).toFixed(2))
        if (Math.abs(corrected - median) / median < 0.6) {
          console.log(`[process-scan] price correction: ${item.name} ${item.price}→${corrected} (median=${median})`)
          return { ...item, price: corrected, confidence: Math.min(item.confidence ?? 1, 0.75) }
        }
      }

      return item
    })
  } catch {
    return items
  }
}

// ── Quality check ────────────────────────────────────────────────────────────
function isParseQualityBad(parsed: ParsedReceipt): boolean {
  if (!parsed.items || parsed.items.length === 0) return true
  if (parsed.total === 0 && parsed.items.length < 2) return true
  const zeroPriceCount = parsed.items.filter((i) => i.price === 0).length
  if (zeroPriceCount > parsed.items.length * 0.4) return true
  return false
}

// ── Build Claude prompt ──────────────────────────────────────────────────────
function buildPrompt(formatHintsSection: string): string {
  return `Analyse ce ticket de caisse français et extrais les informations suivantes. Réponds UNIQUEMENT avec du JSON valide, sans texte avant ou après, sans backticks markdown.

Format attendu :
{
  "raw_lines": ["PAIN DE MIE COMP", "1,89", "YAOURT BIO 125G", "2 x 1,45", "TOTAL", "45,67"],
  "store_name": "Nom du magasin",
  "store_address": "Adresse postale complète si visible sur le ticket, sinon null",
  "siret": "12345678900014",
  "vat_number": "FR12123456789",
  "company_name": "MONTIS",
  "postcode": "76230",
  "items": [
    {
      "name": "Nom du produit développé et lisible (pas l'abréviation du ticket)",
      "price": 2.49,
      "quantity": 1,
      "is_promo": false,
      "is_private_label": false,
      "confidence": 0.95,
      "raw_ref": "PAIN DE MIE COMP",
      "brand": "Harrys",
      "volume_weight": "500g"
    }
  ],
  "total": 45.67
}

── RÈGLE ANTI-HALLUCINATION (CRITIQUE) ──────────────────────────────────────
ÉTAPE 1 — Remplis d'abord "raw_lines" : copie CHAQUE ligne imprimée sur le ticket, exactement telle qu'elle est écrite, de haut en bas. Ne saute aucune ligne, n'invente rien.
ÉTAPE 2 — Pour chaque article dans "items", le champ "raw_ref" DOIT contenir la ligne exacte de "raw_lines" où apparaît le nom de l'article. Si tu ne trouves pas la ligne dans ta transcription → N'INCLUS PAS cet article.

── RÈGLES CRITIQUES ──────────────────────────────────────────────────────────
- INTERDIT : n'inventer AUCUN article. N'inclure QUE les articles dont le nom ET le prix sont CLAIREMENT visibles sur le ticket.
- IGNORER ABSOLUMENT : "SOUS-TOTAL", "TOTAL", "MONTANT DU", "TVA", "CARTE", "ESPECES", "MONNAIE", "CB", "RENDU", "FIDÉLITÉ", "CAUTION", "CONSIGNE", "ECO-PART", "TAXE EMBALLAGE", "VIGNETTE", numéros de carte, codes barres.
- Vérification finale : additionne (prix × quantité) pour chaque article. Si le total obtenu s'écarte de plus de 10% du TOTAL imprimé sur le ticket, tu as inclus des lignes non-articles — retire-les.

── ADRESSE DU MAGASIN ────────────────────────────────────────────────────────
- Cherche l'adresse postale dans le bas ou le haut du ticket (rue + code postal + ville).
- Si visible → "store_address": "Zone du Gros Chêne, 76230 Isneauville"
- Si absente → "store_address": null

── IDENTIFIANTS LÉGAUX DU MAGASIN ───────────────────────────────────────────
Ces champs permettent de localiser le magasin précisément via les APIs gouvernementales. Cherche-les dans le bas du ticket (pied de page, mentions légales, ligne TVA).

- "siret" : numéro à 14 chiffres (ex: "123 456 789 00014" → "12345678900014"). Chiffres uniquement. null si absent.
- "vat_number" : numéro de TVA intracommunautaire commençant par FR (ex: "FR 12 123456789" → "FR12123456789"). null si absent.
- "company_name" : raison sociale légale (souvent différente de l'enseigne — ex: "MONTIS" pour un Intermarché, "SAS AUCHAN ROUEN" pour un Auchan). null si absente.
- "postcode" : code postal à 5 chiffres du magasin. null si absent.

── RÈGLES GÉNÉRALES ──────────────────────────────────────────────────────────
- Extrais le nom du magasin depuis l'en-tête du ticket
- Pour chaque article, développe le nom lisible à partir de l'abréviation : "BOUT D OR HUILE TO" → "Bouton d'Or huile tournesol"
- Si la quantité n'est pas visible, mets 1
- Le prix doit être un nombre décimal (ex: 2.49 pas "2,49€")
- Le total doit correspondre au montant total payé sur le ticket

── RÈGLES POUR LES PRIX ET QUANTITÉS ────────────────────────────────────────
- Format "Qté × Prix unitaire" (ex: "2 x 1,49") → price=1.49, quantity=2
- Format poids "0,543 kg x 12,99 €/kg" → price=12.99 (prix au kg), quantity=0.543 (en kg)
- Prix barrés et remplacés → utiliser toujours le prix final après remise
- Remises séparées (REMISE, REMISE FIDÉLITÉ, OFFRE, AVOIR, RÉDUCTION, -XX%) avec un montant NÉGATIF :
  RATTACHE le montant négatif à l'article IMMÉDIATEMENT AU-DESSUS dans le ticket.
  Modifie son price = prix original - remise, et mets is_promo=true.
  NE CRÉE JAMAIS un article séparé pour une ligne de remise.
  Ex: "POULET FERMIER 8.00" suivi de "REMISE FIDELITE -2.00" → price=6.00, is_promo=true
- Retours/avoirs → inclure avec un prix NÉGATIF

── RÈGLES POUR is_promo ──────────────────────────────────────────────────────
- true si : PROMO, REMISE, FIDÉLITÉ, FIDELITE, -XX%, LOT DE, OFFRE, SOLDE, BON PRIX, PRIX CHOC, SURGELÉ PROMO, ou prix barré remplacé
- false sinon

── RÈGLES POUR is_private_label ─────────────────────────────────────────────
- true si marque de distributeur (MDD) : Marque Repère, Reflets de France, Casino Bio, Casino, U Bio, U, Auchan, Top Budget, Eco+, Monoprix Gourmet, Carrefour Bio, Carrefour (produit), Leclerc (produit), Jean Bon, Les Tilleuls, Pouce, Bien Vu, Auchan Bio, ou toute marque clairement liée au magasin
- false si marque nationale (Nutella, Coca-Cola, Président, Danone, Barilla…)
- En cas de doute : false

── RÈGLES POUR confidence ────────────────────────────────────────────────────
- 1.0 : nom et prix parfaitement lisibles
- 0.7–0.9 : texte partiellement lisible mais sens clair
- 0.3–0.6 : partie du nom ou prix devinée
- < 0.3 : trop incertain — OMETTRE l'article complètement

── EXTRACTION MARQUE ET POIDS/VOLUME ────────────────────────────────────────
- "brand" : marque du produit (ex: "Président", "Coca-Cola", "Barilla", "Panzani"). null si MDD (is_private_label=true) ou inconnu.
- "volume_weight" : poids ou volume standardisé en minuscules sans espace (ex: "1.5l", "500g", "250ml", "1kg", "6x25cl"). null si absent du ticket.
- Si le ticket abrège la marque (ex: "PRES" pour Président, "DAN" pour Danone), reconstitue le nom complet.
- Pour les MDD (marques de distributeur), mettre brand à null.

── VÉRIFICATION ARITHMÉTIQUE ────────────────────────────────────────────────
Après avoir extrait tous les articles, calcule : somme = Σ(price × quantity) pour chaque article.
Si |somme - total| > total × 0.05, tu as probablement fait une erreur d'extraction. Revérifie chaque prix et corrige avant de répondre.${formatHintsSection}`
}

// ── Call Claude Vision ───────────────────────────────────────────────────────
async function callClaude(
  apiKey: string,
  images: Array<{ base64: string; mediaType: string }>,
  prompt: string,
  model = 'claude-sonnet-4-6',
  timeoutMs = 25000
): Promise<string> {
  const imageBlocks = images.map(img => ({
    type: 'image' as const,
    source: { type: 'base64' as const, media_type: img.mediaType, data: img.base64 },
  }))

  const isVision = images.length > 0
  const isMultiPart = images.length > 1
  const multiPartNote = isMultiPart
    ? `Ces ${images.length} images sont les différentes parties d'un même ticket de caisse, dans l'ordre du haut vers le bas. Analyse-les comme un seul ticket et extrais TOUS les articles de l'ensemble des images.`
    : ''

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let requestBody: Record<string, any>

  if (isVision) {
    headers['anthropic-beta'] = 'prompt-caching-2024-07-31'
    requestBody = {
      model,
      max_tokens: 4096,
      system: [{ type: 'text', text: prompt, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: [
          ...imageBlocks,
          ...(multiPartNote ? [{ type: 'text', text: multiPartNote }] : []),
        ],
      }],
    }
  } else {
    requestBody = {
      model,
      max_tokens: 100,
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
    }
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error: ${response.status} ${err}`)
  }

  const data = await response.json()
  return data.content?.[0]?.text ?? ''
}

// ── Normalise raw Claude output ──────────────────────────────────────────────
function normaliseItems(items: ParsedItem[]): ParsedItem[] {
  return items
    .filter((item) => {
      const name = String(item.name ?? '').trim()
      return name.length > 0 && !/^\d+$/.test(name)
    })
    .map((item) => ({
      name: String(item.name).trim(),
      price: Math.max(0, Number(item.price) || 0),
      quantity: Math.max(0.001, Number(item.quantity) || 1),
      is_promo: item.is_promo === true,
      is_private_label: item.is_private_label === true,
      confidence: typeof item.confidence === 'number' ? Math.min(1, Math.max(0, item.confidence)) : 1,
      raw_ref: typeof item.raw_ref === 'string' ? item.raw_ref.trim() : undefined,
      brand: typeof item.brand === 'string' ? item.brand.trim() || null : null,
      volume_weight: typeof item.volume_weight === 'string' ? item.volume_weight.trim().toLowerCase() || null : null,
    }))
}

// ── Store location resolution (deferred — runs after marking job done) ──────
async function resolveStoreLocation(
  supabase: SupabaseClient,
  parsed: ParsedReceipt,
  receiptId: string,
) {
  const parsedRaw     = parsed as unknown as Record<string, unknown>
  const claudeAddress = typeof parsedRaw.store_address === 'string' && parsedRaw.store_address.trim().length > 5
    ? parsedRaw.store_address.trim() : null
  const claudeSiret   = typeof parsedRaw.siret === 'string'
    ? parsedRaw.siret.replace(/\s/g, '').match(/^\d{14}$/)?.[0] ?? null : null
  const claudeVat     = typeof parsedRaw.vat_number === 'string' && parsedRaw.vat_number.trim().startsWith('FR')
    ? parsedRaw.vat_number.trim() : null
  const claudeCompany = typeof parsedRaw.company_name === 'string' && parsedRaw.company_name.trim().length > 2
    ? parsedRaw.company_name.trim() : null
  const claudePostcode = typeof parsedRaw.postcode === 'string'
    ? parsedRaw.postcode.replace(/\s/g, '').match(/^\d{5}$/)?.[0] ?? null : null

  const postcodeMatch  = claudeAddress?.match(/\b(\d{5})\s+([A-ZÀ-ÿa-z\-]+(?:\s+[A-ZÀ-ÿa-z\-]+)*)/i)
  const receiptPostcode = claudePostcode ?? postcodeMatch?.[1] ?? null
  const receiptCity     = postcodeMatch?.[2]?.trim() ?? null

  let storeLocation: { address: string | null; lat: number | null; lon: number | null } =
    { address: claudeAddress, lat: null, lon: null }

  const storeName = parsed.store_name ?? 'unknown'
  const stableOsmId = `basket_receipt_${storeName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${claudeSiret ?? receiptPostcode ?? receiptCity?.toLowerCase().replace(/[^a-z0-9]/g, '_') ?? 'fr'}`

  let locationSource = 'none'

  // Step 0: DB cache
  const { data: cached } = await supabase.from('store_locations')
    .select('latitude, longitude, address').eq('osm_id', stableOsmId).maybeSingle()
  if (cached?.latitude && cached?.longitude) {
    storeLocation.lat = cached.latitude
    storeLocation.lon = cached.longitude
    if (!storeLocation.address) storeLocation.address = cached.address
    locationSource = 'cache'
  }

  // Step 1: SIRET → SIRENE → BAN
  if (!storeLocation.lat && claudeSiret) {
    const sireneAddr = await lookupSirene(claudeSiret)
    if (sireneAddr) {
      const geo = await geocodeBAN(sireneAddr)
      if (geo) {
        storeLocation = { lat: geo.lat, lon: geo.lon, address: claudeAddress ?? sireneAddr }
        locationSource = 'siret'
      }
    }
  }

  // Step 2: VAT → SIREN → SIRENE → BAN
  if (!storeLocation.lat && claudeVat) {
    const siren = sirenFromVat(claudeVat)
    if (siren) {
      const sireneAddr = await lookupSirene(siren, receiptPostcode)
      if (sireneAddr) {
        const geo = await geocodeBAN(sireneAddr)
        if (geo) {
          storeLocation = { lat: geo.lat, lon: geo.lon, address: claudeAddress ?? sireneAddr }
          locationSource = 'vat'
        }
      }
    }
  }

  // Step 3: company + postcode → SIRENE → BAN
  if (!storeLocation.lat && claudeCompany && receiptPostcode) {
    const sireneAddr = await lookupSirene(claudeCompany, receiptPostcode)
    if (sireneAddr) {
      const geo = await geocodeBAN(sireneAddr)
      if (geo) {
        storeLocation = { lat: geo.lat, lon: geo.lon, address: claudeAddress ?? sireneAddr }
        locationSource = 'company'
      }
    }
  }

  // Step 4: address → BAN
  if (!storeLocation.lat && claudeAddress) {
    const geo = await geocodeBAN(claudeAddress)
    if (geo) {
      storeLocation = { lat: geo.lat, lon: geo.lon, address: claudeAddress }
      locationSource = 'address'
    }
  }

  // Step 5: chain + postcode → Overpass
  if (!storeLocation.lat && (receiptPostcode || receiptCity)) {
    try {
      const chainWord  = storeName.split(/[\s\-]/)[0].replace(/[^a-zA-ZÀ-ÿ]/g, '')
      const pcFilter   = receiptPostcode ? `["addr:postcode"="${receiptPostcode}"]` : ''
      const cityFilter = receiptCity     ? `["addr:city"~"${receiptCity}","i"]`    : ''
      const overpassQuery = `[out:json][timeout:8];
(
  node["shop"~"supermarket|convenience|hypermarket|discount|grocery|department_store"]["name"~"${chainWord}","i"]${pcFilter};
  way["shop"~"supermarket|convenience|hypermarket|discount|grocery|department_store"]["name"~"${chainWord}","i"]${pcFilter};
  node["shop"~"supermarket|convenience|hypermarket|discount|grocery|department_store"]["name"~"${chainWord}","i"]${cityFilter};
  way["shop"~"supermarket|convenience|hypermarket|discount|grocery|department_store"]["name"~"${chainWord}","i"]${cityFilter};
  node["name"~"${chainWord}","i"]${pcFilter};
  way["name"~"${chainWord}","i"]${pcFilter};
);
out center 1;`
      const ovRes = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(overpassQuery)}`,
        signal: AbortSignal.timeout(8000),
      })
      if (ovRes.ok) {
        const ovData = await ovRes.json() as { elements?: Array<{ type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number } }> }
        const el = ovData.elements?.[0]
        if (el) {
          storeLocation.lat = el.lat ?? el.center?.lat ?? null
          storeLocation.lon = el.lon ?? el.center?.lon ?? null
          locationSource = 'overpass'
        }
      }
    } catch { /* Overpass timeout — no pin */ }
  }

  console.log(`[process-scan] Location "${storeName}": source=${locationSource} lat=${storeLocation.lat ?? 'none'}`)

  // Persist to store_locations
  if (locationSource !== 'cache' && locationSource !== 'none' && storeLocation.lat && storeLocation.lon) {
    const upsertPayload = {
      osm_id:    stableOsmId,
      chain:     storeName,
      name:      storeName,
      address:   storeLocation.address,
      latitude:  storeLocation.lat,
      longitude: storeLocation.lon,
      source:    locationSource,
      accuracy:  ['siret', 'vat', 'company'].includes(locationSource) ? 'siret' : 'address',
      ...(claudeSiret ? { siret: claudeSiret } : {}),
    }
    const conflictCol = claudeSiret ? 'siret' : 'osm_id'
    await supabase.from('store_locations').upsert(upsertPayload,
      { onConflict: conflictCol, ignoreDuplicates: false }
    ).then(({ error: upsertErr }) => {
      if (upsertErr) console.error('[process-scan] store_locations upsert failed:', upsertErr.message)
    })
  }

  // Update receipt row with location
  if (storeLocation.lat && storeLocation.lon) {
    await supabase.from('receipts').update({
      store_address: storeLocation.address,
      store_latitude: storeLocation.lat,
      store_longitude: storeLocation.lon,
    }).eq('id', receiptId)
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth: internal secret (server-to-server) OR user Bearer token (client-triggered)
  let authenticatedUserId: string | null = null

  if (authorizeInternal(request)) {
    // Server-to-server: trust the user_id in the body
    authenticatedUserId = null // will be read from body
  } else {
    // Try user auth as fallback (client-triggered)
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    authenticatedUserId = authResult.userId
  }

  const { job_id, user_id } = await request.json()
  if (!job_id || !user_id) {
    return NextResponse.json({ error: 'Missing job_id or user_id' }, { status: 400 })
  }

  // If authenticated via user token, ensure they own this job
  if (authenticatedUserId && authenticatedUserId !== user_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const supabase = getServiceClient()
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    await supabase.from('scan_jobs').update({ status: 'failed', error_msg: 'API key not configured' }).eq('id', job_id)
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    // ── Read job ─────────────────────────────────────────────────────────
    const { data: job } = await supabase.from('scan_jobs')
      .select('id, user_id, image_hash, image_data, status')
      .eq('id', job_id)
      .single()

    if (!job || job.status !== 'pending') {
      return NextResponse.json({ error: 'Job not found or already processed' }, { status: 404 })
    }

    // ── Mark processing ──────────────────────────────────────────────────
    await supabase.from('scan_jobs').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', job_id)

    const images: Array<{ base64: string; mediaType: string }> = job.image_data as Array<{ base64: string; mediaType: string }>

    // ── Parallel DB queries ──────────────────────────────────────────────
    const [{ data: formats }, priceAnchorsSection, corrections] = await Promise.all([
      supabase.from('receipt_formats').select('store_chain, format_hints').order('store_chain'),
      fetchPriceAnchors(supabase),
      supabase.from('ocr_corrections')
        .select('original_text, corrected_text')
        .gte('correction_count', 3)
        .limit(200)
        .then(r => (r.data ?? []) as { original_text: string; corrected_text: string }[]),
    ])

    const formatHintsSection =
      formats && formats.length > 0
        ? `\n\n── FORMATS DE TICKETS CONNUS ────────────────────────────────────────────────\nUtilise ces informations si tu reconnais l'enseigne :\n${formats
            .map((f: { store_chain: string; format_hints: string }) => `- ${f.store_chain}: ${f.format_hints}`)
            .join('\n')}`
        : ''

    // ── Sonnet Vision parse (25s timeout) ────────────────────────────────
    const textContent = await callClaude(apiKey, images, buildPrompt(formatHintsSection + priceAnchorsSection))

    const cleaned = textContent.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    let parsed: ParsedReceipt = JSON.parse(cleaned)

    if (!parsed.store_name || !Array.isArray(parsed.items)) {
      throw new Error('Invalid receipt structure')
    }

    parsed.items = normaliseItems(parsed.items)

    // ── Hallucination guard ──────────────────────────────────────────────
    const rawLines = Array.isArray((parsed as unknown as Record<string, unknown>).raw_lines)
      ? ((parsed as unknown as Record<string, unknown>).raw_lines as string[])
      : []
    if (rawLines.length > 0) {
      const rawSet = rawLines.map(l => l.toLowerCase().trim())
      parsed.items = parsed.items.filter(item => {
        if (!item.raw_ref) return true
        const ref = item.raw_ref.toLowerCase().trim()
        return rawSet.some(line => line === ref || line.includes(ref) || ref.includes(line))
      })
    }

    // ── Enrichment ───────────────────────────────────────────────────────
    parsed.items = parsed.items.map(item => ({
      ...item,
      brand: item.brand ?? extractBrand(item.name) ?? null,
      volume_weight: item.volume_weight ?? extractWeight(item.name) ?? null,
    }))

    parsed.total = Number(parsed.total) || parsed.items.reduce(
      (s, i) => s + i.price * i.quantity, 0
    )

    // ── Quality warning (no retry — user can re-scan or edit) ────────────
    const qualityWarning = isParseQualityBad(parsed)

    // ── Post-parse intelligence ──────────────────────────────────────────
    parsed.store_name = normalizeStoreChain(parsed.store_name)

    if (corrections.length > 0) {
      parsed.items = parsed.items.map(item => {
        const match = corrections.find(
          (c: { original_text: string; corrected_text: string }) => c.original_text.toLowerCase() === item.name.toLowerCase()
        )
        return match ? { ...item, name: match.corrected_text } : item
      })
    }

    parsed.items = await validateItemPrices(parsed.items, supabase)

    const correctedTotal = parsed.items.reduce((s, i) => s + i.price * i.quantity, 0)
    if (Math.abs(correctedTotal - parsed.total) / (parsed.total || 1) < 0.15) {
      parsed.total = correctedTotal
    }

    // ── Insert receipt + price_items ─────────────────────────────────────
    const { data: receiptRow, error: receiptErr } = await supabase
      .from('receipts')
      .insert({
        user_id,
        store_chain: parsed.store_name,
        total_amount: parsed.total,
        raw_ocr_text: textContent,
        image_hash: job.image_hash,
        receipt_date: new Date().toISOString().split('T')[0],
      })
      .select('id')
      .single()

    if (receiptErr || !receiptRow) {
      console.error('[process-scan] receipt insert failed:', receiptErr?.message)
      throw new Error('Failed to insert receipt')
    }

    const receiptId = receiptRow.id

    // Insert price_items
    if (parsed.items.length > 0) {
      const priceItems = parsed.items.map(item => ({
        receipt_id: receiptId,
        user_id,
        item_name: item.name,
        item_name_normalised: normalizeProductName(item.name),
        unit_price: item.price,
        quantity: item.quantity,
        is_promo: item.is_promo,
        is_private_label: item.is_private_label,
        brand: item.brand ?? null,
        volume_weight: item.volume_weight ?? null,
        store_chain: parsed.store_name,
      }))

      const { error: itemsErr } = await supabase.from('price_items').insert(priceItems)
      if (itemsErr) console.error('[process-scan] price_items insert error:', itemsErr.message)
    }

    // ── Build result and mark job done ────────────────────────────────────
    const result = {
      ...parsed,
      raw_ocr_text: textContent,
      store_address: null as string | null,
      store_latitude: null as number | null,
      store_longitude: null as number | null,
      image_hash: job.image_hash,
      receipt_id: receiptId,
      quality_warning: qualityWarning,
    }

    await supabase.from('scan_jobs').update({
      status: 'done',
      result,
      image_data: null, // clear image data to save storage
      updated_at: new Date().toISOString(),
    }).eq('id', job_id)

    // ── Deferred: resolve store location (after marking done) ────────────
    // User already sees results; location fills in later.
    void resolveStoreLocation(supabase, parsed, receiptId).catch(err => {
      console.error('[process-scan] Location resolution failed:', err)
    })

    // Fire-and-forget stats refresh
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    void fetch(`${siteUrl}/api/trigger-stats-refresh`, { method: 'POST' }).catch(() => null)

    return NextResponse.json({ ok: true, receipt_id: receiptId })
  } catch (error) {
    console.error('[process-scan] Error:', error)
    try {
      await supabase.from('scan_jobs').update({
        status: 'failed',
        error_msg: error instanceof Error ? error.message : 'Unknown error',
        image_data: null,
        updated_at: new Date().toISOString(),
      }).eq('id', job_id)
    } catch { /* best effort */ }

    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
