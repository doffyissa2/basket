import { NextRequest, NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase-service'
import { normalizeStoreChain } from '@/lib/store-chains'
import type { ParsedItem, ParsedReceipt } from '@/types/api'

function normaliseProductName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Fetch price anchors from community_prices ─────────────────────────────────
// Returns a formatted section to inject into the Claude prompt so it can
// self-correct obvious OCR price errors (e.g. 19,89€ for milk → 1,89€).
async function fetchPriceAnchors(supabase: SupabaseClient): Promise<string> {
  try {
    const { data } = await supabase
      .from('community_prices')
      .select('item_name, item_name_normalised, unit_price')
      .order('processed_at', { ascending: false })
      .limit(1000)

    if (!data || data.length === 0) return ''

    // Group by normalised name, compute min/max/median
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

// ── Post-parse price validation ───────────────────────────────────────────────
// Detects and auto-corrects obvious OCR digit errors using community_prices.
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

    // Build price lookup map
    const priceMap: Record<string, number[]> = {}
    for (const row of data) {
      const key = row.item_name_normalised as string
      if (!priceMap[key]) priceMap[key] = []
      priceMap[key].push(row.unit_price as number)
    }
    const keys = Object.keys(priceMap)

    return items.map(item => {
      if (item.price <= 0 || item.price > 500) return item

      const norm = normaliseProductName(item.name)
      const normWords = norm.split(' ').filter(w => w.length > 3)
      if (normWords.length === 0) return item

      // Find best-matching key by word overlap
      let bestKey: string | null = null
      let bestScore = 0
      for (const key of keys) {
        const keyWords = key.split(' ')
        const overlap = normWords.filter(w => keyWords.includes(w)).length
        const score = overlap / Math.max(normWords.length, keyWords.length)
        if (score > bestScore && score >= 0.45) { bestScore = score; bestKey = key }
      }
      if (!bestKey) return item

      const prices = priceMap[bestKey]
      const sorted = [...prices].sort((a, b) => a - b)
      const median = sorted[Math.floor(sorted.length / 2)]

      // Auto-correct leading-digit OCR error (19.89 → 1.89, 29.90 → 2.90)
      if (item.price >= median * 6 && item.price >= 5) {
        const corrected = parseFloat((item.price / 10).toFixed(2))
        if (Math.abs(corrected - median) / median < 0.6) {
          console.log(`[parse-receipt] price correction: ${item.name} ${item.price}→${corrected} (median=${median})`)
          return { ...item, price: corrected, confidence: Math.min(item.confidence ?? 1, 0.75) }
        }
      }

      return item
    })
  } catch {
    return items
  }
}


// ── Quality check ─────────────────────────────────────────────────────────────
function isParseQualityBad(parsed: ParsedReceipt): boolean {
  if (!parsed.items || parsed.items.length === 0) return true
  if (parsed.total === 0 && parsed.items.length < 2) return true
  const zeroPriceCount = parsed.items.filter((i) => i.price === 0).length
  if (zeroPriceCount > parsed.items.length * 0.4) return true
  return false
}

// ── Build Claude prompt ───────────────────────────────────────────────────────
function buildPrompt(formatHintsSection: string, isRetry = false): string {
  const retryPrefix = isRetry
    ? `⚠️ ATTENTION : La première tentative d'analyse a produit des résultats incomplets (articles manquants ou prix à zéro). Relis TRÈS attentivement l'image. Assure-toi d'extraire CHAQUE article avec son prix exact. Ne laisse aucun article de côté.\n\n`
    : ''

  return `${retryPrefix}Analyse ce ticket de caisse français et extrais les informations suivantes. Réponds UNIQUEMENT avec du JSON valide, sans texte avant ou après, sans backticks markdown.

Format attendu :
{
  "store_name": "Nom du magasin",
  "items": [
    {
      "name": "Nom du produit",
      "price": 2.49,
      "quantity": 1,
      "is_promo": false,
      "is_private_label": false,
      "confidence": 0.95
    }
  ],
  "total": 45.67
}

── RÈGLES GÉNÉRALES ──────────────────────────────────────────────────────────
- Extrais le nom du magasin depuis l'en-tête du ticket
- Pour chaque article, donne le nom lisible (développé, pas abrégé), le prix unitaire et la quantité
- Si la quantité n'est pas visible, mets 1
- Le prix doit être un nombre décimal (ex: 2.49 pas "2,49€")
- Le total doit correspondre au montant total payé sur le ticket
- Ignore les lignes de TVA et les informations de paiement

── RÈGLES POUR LES PRIX ET QUANTITÉS ────────────────────────────────────────
- Format "Qté × Prix unitaire" (ex: "2 x 1,49") → price=1.49, quantity=2
- Format poids "0,543 kg x 12,99 €/kg" → price=12.99 (prix au kg), quantity=0.543 (en kg)
- Prix barrés et remplacés → utiliser toujours le prix final après remise
- Remises séparées (lignes REMISE, OFFRE FIDÉLITÉ, -XX%) → SOUSTRAIRE du prix de l'article précédent et mettre is_promo=true; NE PAS créer un article séparé pour la remise
- Consignes/dépôts → IGNORER les lignes "CAUTION", "CONSIGNE", "ECO-PART", "TAXE EMBALLAGE"
- Retours/avoirs → inclure avec un prix NÉGATIF
- IGNORER COMPLÈTEMENT : "SOUS-TOTAL", "TOTAL", "TVA", "CARTE", "ESPECES", "MONNAIE", "CB", "RENDU"

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
- < 0.3 : trop incertain — OMETTRE l'article complètement${formatHintsSection}`
}

// ── Call Claude Vision (supports 1–3 images for long receipts) ───────────────
async function callClaude(
  apiKey: string,
  images: Array<{ base64: string; mediaType: string }>,
  prompt: string
): Promise<string> {
  const isMultiPart = images.length > 1
  const multiPartPrefix = isMultiPart
    ? `Ces ${images.length} images sont les différentes parties d'un même ticket de caisse, dans l'ordre du haut vers le bas. Analyse-les comme un seul ticket et extrais TOUS les articles de l'ensemble des images.\n\n`
    : ''

  const imageBlocks = images.map(img => ({
    type: 'image' as const,
    source: { type: 'base64' as const, media_type: img.mediaType, data: img.base64 },
  }))

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            ...imageBlocks,
            { type: 'text', text: multiPartPrefix + prompt },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error: ${response.status} ${err}`)
  }

  const data = await response.json()
  return data.content?.[0]?.text ?? ''
}

// ── Normalise raw Claude output ───────────────────────────────────────────────
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
    }))
}

// ── Nearest store lookup ──────────────────────────────────────────────────────
// Finds the closest store_locations row matching the chain within 15 km.
// Uses the Haversine formula client-side on a bounded result set (faster than PostGIS RPC).
async function findNearestStore(
  supabase: SupabaseClient,
  chain: string,
  lat: number | null,
  lon: number | null
): Promise<{ address: string | null; lat: number | null; lon: number | null }> {
  if (!lat || !lon) return { address: null, lat: null, lon: null }
  try {
    // Fetch candidate stores within a rough ~0.15° bounding box (~15 km)
    const { data } = await supabase
      .from('store_locations')
      .select('name, address, latitude, longitude')
      .ilike('chain', `%${chain.split(' ')[0]}%`)
      .gte('latitude', lat - 0.15)
      .lte('latitude', lat + 0.15)
      .gte('longitude', lon - 0.20)
      .lte('longitude', lon + 0.20)
      .limit(20)

    if (!data || data.length === 0) return { address: null, lat: null, lon: null }

    // Pick closest by Haversine
    let best = data[0]
    let bestDist = Infinity
    for (const row of data) {
      const dLat = (row.latitude - lat) * (Math.PI / 180)
      const dLon = (row.longitude - lon) * (Math.PI / 180)
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * Math.PI / 180) * Math.cos(row.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2
      const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      if (dist < bestDist) { bestDist = dist; best = row }
    }

    if (bestDist > 5) return { address: null, lat: null, lon: null } // >5 km away — skip
    return { address: best.address ?? best.name ?? null, lat: best.latitude, lon: best.longitude }
  } catch { return { address: null, lat: null, lon: null } }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const rateLimitResponse = await checkRateLimit(request, 'parseReceipt', authResult.userId)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await request.json()

    // Optional caller-provided coords for store location lookup
    const callerLat: number | null = typeof body.latitude === 'number' ? body.latitude : null
    const callerLon: number | null = typeof body.longitude === 'number' ? body.longitude : null

    // Support both single image (legacy) and multi-part arrays
    const images: Array<{ base64: string; mediaType: string }> = Array.isArray(body.images)
      ? body.images.map((img: { image_base64: string; media_type?: string }) => ({
          base64: img.image_base64,
          mediaType: img.media_type ?? 'image/jpeg',
        }))
      : [{ base64: body.image_base64, mediaType: body.media_type ?? 'image/jpeg' }]

    if (images.length === 0 || !images[0].base64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }
    if (images.length > 3) {
      return NextResponse.json({ error: 'Maximum 3 images per receipt' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    // ── Fetch all known receipt format hints + price anchors ─────────────
    const supabase = getServiceClient()
    const [{ data: formats }, priceAnchorsSection] = await Promise.all([
      supabase.from('receipt_formats').select('store_chain, format_hints').order('store_chain'),
      fetchPriceAnchors(supabase),
    ])

    const formatHintsSection =
      formats && formats.length > 0
        ? `\n\n── FORMATS DE TICKETS CONNUS ────────────────────────────────────────────────\nUtilise ces informations si tu reconnais l'enseigne :\n${formats
            .map((f: { store_chain: string; format_hints: string }) => `- ${f.store_chain}: ${f.format_hints}`)
            .join('\n')}`
        : ''

    // ── First parse attempt ───────────────────────────────────────────────
    let textContent = await callClaude(apiKey, images, buildPrompt(formatHintsSection + priceAnchorsSection, false))

    let cleaned = textContent.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    let parsed: ParsedReceipt = JSON.parse(cleaned)

    if (!parsed.store_name || !Array.isArray(parsed.items)) {
      throw new Error('Invalid receipt structure')
    }

    parsed.items = normaliseItems(parsed.items)
    parsed.total = Number(parsed.total) || parsed.items.reduce(
      (s, i) => s + i.price * i.quantity, 0
    )

    // ── Retry if quality is poor ──────────────────────────────────────────
    if (isParseQualityBad(parsed)) {
      console.log('[parse-receipt] Quality check failed, retrying with stricter prompt')

      textContent = await callClaude(apiKey, images, buildPrompt(formatHintsSection + priceAnchorsSection, true))

      cleaned = textContent.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      const retryParsed: ParsedReceipt = JSON.parse(cleaned)

      if (retryParsed.store_name && Array.isArray(retryParsed.items) && retryParsed.items.length > 0) {
        retryParsed.items = normaliseItems(retryParsed.items)
        retryParsed.total = Number(retryParsed.total) || retryParsed.items.reduce(
          (s, i) => s + i.price * i.quantity, 0
        )
        if (
          retryParsed.items.length >= parsed.items.length &&
          retryParsed.total > 0
        ) {
          parsed = retryParsed
        }
      }
    }

    // ── Post-parse intelligence ───────────────────────────────────────────
    // 1. Normalize store chain name using our OSM chain map
    parsed.store_name = normalizeStoreChain(parsed.store_name)

    // 2. Validate/correct item prices against community_prices data
    parsed.items = await validateItemPrices(parsed.items, supabase)

    // Recompute total after any price corrections
    const correctedTotal = parsed.items.reduce((s, i) => s + i.price * i.quantity, 0)
    if (Math.abs(correctedTotal - parsed.total) / (parsed.total || 1) < 0.15) {
      parsed.total = correctedTotal
    }

    // 3. Find nearest matching store for accurate location data
    const storeLocation = await findNearestStore(supabase, parsed.store_name, callerLat, callerLon)

    // 4. If no existing store found but user shared their GPS coords, add the scanned
    //    location to store_locations so it appears on the map for all users.
    if (!storeLocation.lat && callerLat && callerLon && parsed.store_name) {
      const pseudoId = `basket_${parsed.store_name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${callerLat.toFixed(3)}_${callerLon.toFixed(3)}`
      await supabase.from('store_locations').upsert({
        osm_id:    pseudoId,
        chain:     parsed.store_name,
        name:      parsed.store_name,
        latitude:  callerLat,
        longitude: callerLon,
        address:   null,
        source:    'user_scan',
      }, { onConflict: 'osm_id', ignoreDuplicates: true })
      storeLocation.lat = callerLat
      storeLocation.lon = callerLon
    }

    return NextResponse.json({
      ...parsed,
      raw_ocr_text:    textContent,
      store_address:   storeLocation.address,
      store_latitude:  storeLocation.lat,
      store_longitude: storeLocation.lon,
    })
  } catch (error) {
    console.error('Parse receipt error:', error)
    return NextResponse.json(
      { error: 'Failed to parse receipt' },
      { status: 500 }
    )
  }
}
