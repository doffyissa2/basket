import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { SupabaseClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase-service'
import { normalizeStoreChain } from '@/lib/store-chains'
import { normalizeProductName, extractBrand, extractWeight } from '@/lib/normalize'
import { comparePrices, type ComparisonResult } from '@/lib/compare-prices'
import type { ParsedItem, ParsedReceipt } from '@/types/api'

export const maxDuration = 60

// ── Call Claude Vision ──────────────────────────────────────────────────────
async function callClaude(
  apiKey: string,
  images: Array<{ base64: string; mediaType: string }>,
  prompt: string,
): Promise<string> {
  const imageBlocks = images.map(img => ({
    type: 'image' as const,
    source: { type: 'base64' as const, media_type: img.mediaType, data: img.base64 },
  }))

  const multiPartNote = images.length > 1
    ? `Ces ${images.length} images sont les différentes parties d'un même ticket de caisse, dans l'ordre du haut vers le bas. Analyse-les comme un seul ticket et extrais TOUS les articles de l'ensemble des images.\n\n`
    : ''

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          ...imageBlocks,
          { type: 'text', text: multiPartNote + prompt },
        ],
      }],
    }),
    signal: AbortSignal.timeout(50000),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error(`[scan] Claude API error ${response.status}:`, err.slice(0, 1000))
    let detail = ''
    try { detail = JSON.parse(err)?.error?.message ?? '' } catch {}
    throw new Error(`Erreur API Claude: ${response.status}${detail ? ' — ' + detail : ''}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text ?? ''
  if (!text) throw new Error('Réponse Claude vide')
  return text
}

// ── Build Claude prompt ─────────────────────────────────────────────────────
function buildPrompt(formatHints: string, priceAnchors: string): string {
  return `Analyse ce ticket de caisse français et extrais les informations suivantes. Réponds UNIQUEMENT avec du JSON valide, sans texte avant ou après, sans backticks markdown.

Format attendu :
{
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
      "brand": "Harrys",
      "volume_weight": "500g"
    }
  ],
  "total": 45.67
}

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
Si |somme - total| > total × 0.03, revérifie chaque prix CARACTÈRE PAR CARACTÈRE sur l'image et corrige.
Si l'écart persiste, tu as probablement oublié un article ou compté une ligne non-article — relis le ticket.
Le total imprimé sur le ticket est TOUJOURS correct. Ne le modifie JAMAIS.
Ne supprime PAS d'articles.${formatHints}${priceAnchors}`
}

// ── Normalise raw Claude output ─────────────────────────────────────────────
function normaliseItems(items: ParsedItem[]): ParsedItem[] {
  return items
    .filter(item => {
      const name = String(item.name ?? '').trim()
      return name.length > 0 && !/^\d+$/.test(name)
    })
    .map(item => ({
      name: String(item.name).trim(),
      price: Math.max(0, Number(item.price) || 0),
      quantity: Math.max(0.001, Number(item.quantity) || 1),
      is_promo: item.is_promo === true,
      is_private_label: item.is_private_label === true,
      confidence: typeof item.confidence === 'number' ? Math.min(1, Math.max(0, item.confidence)) : 1,
      brand: typeof item.brand === 'string' ? item.brand.trim() || null : null,
      volume_weight: typeof item.volume_weight === 'string' ? item.volume_weight.trim().toLowerCase() || null : null,
    }))
}

// ── Fetch price anchors from community_prices ───────────────────────────────
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

// ── Post-parse price validation ─────────────────────────────────────────────
async function validateItemPrices(
  items: ParsedItem[],
  supabase: SupabaseClient,
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
          return { ...item, price: corrected, confidence: Math.min(item.confidence ?? 1, 0.75) }
        }
      }

      return item
    })
  } catch {
    return items
  }
}

// ── Store location resolution (deferred) ────────────────────────────────────
async function resolveStoreLocation(
  supabase: SupabaseClient,
  parsed: ParsedReceipt,
  receiptId: string,
) {
  const parsedRaw = parsed as unknown as Record<string, unknown>
  const claudeAddress = typeof parsedRaw.store_address === 'string' && parsedRaw.store_address.trim().length > 5
    ? parsedRaw.store_address.trim() : null
  const claudeSiret = typeof parsedRaw.siret === 'string'
    ? parsedRaw.siret.replace(/\s/g, '').match(/^\d{14}$/)?.[0] ?? null : null
  const claudePostcode = typeof parsedRaw.postcode === 'string'
    ? parsedRaw.postcode.replace(/\s/g, '').match(/^\d{5}$/)?.[0] ?? null : null

  if (claudeAddress) {
    try {
      const res = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(claudeAddress)}&limit=1`,
        { headers: { 'User-Agent': 'basket-app/1.0' }, signal: AbortSignal.timeout(4000) },
      )
      if (res.ok) {
        const data = await res.json()
        const feature = data?.features?.[0]
        if (feature && (feature.properties?.score ?? 0) >= 0.4) {
          const [lon, lat] = feature.geometry.coordinates as [number, number]
          await supabase.from('receipts').update({
            store_address: claudeAddress,
            store_latitude: lat,
            store_longitude: lon,
          }).eq('id', receiptId)

          const storeName = parsed.store_name ?? 'unknown'
          const stableId = `basket_receipt_${storeName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${claudeSiret ?? claudePostcode ?? 'fr'}`
          await supabase.from('store_locations').upsert({
            osm_id: stableId,
            chain: storeName,
            name: storeName,
            address: claudeAddress,
            latitude: lat,
            longitude: lon,
            source: 'address',
            accuracy: 'address',
            ...(claudeSiret ? { siret: claudeSiret } : {}),
          }, { onConflict: 'osm_id', ignoreDuplicates: false }).then(({ error }) => {
            if (error) console.error('[scan] store_locations upsert failed:', error.message)
          })
          return
        }
      }
    } catch { /* non-critical */ }
  }

  if (claudePostcode) {
    try {
      const chainWord = (parsed.store_name ?? '').split(/[\s\-]/)[0].replace(/[^a-zA-ZÀ-ÿ]/g, '')
      const query = `[out:json][timeout:6];(node["shop"~"supermarket|convenience|hypermarket|discount"]["name"~"${chainWord}","i"]["addr:postcode"="${claudePostcode}"];way["shop"~"supermarket|convenience|hypermarket|discount"]["name"~"${chainWord}","i"]["addr:postcode"="${claudePostcode}"];);out center 1;`
      const ovRes = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(6000),
      })
      if (ovRes.ok) {
        const ovData = await ovRes.json() as { elements?: Array<{ lat?: number; lon?: number; center?: { lat: number; lon: number } }> }
        const el = ovData.elements?.[0]
        if (el) {
          const lat = el.lat ?? el.center?.lat ?? null
          const lon = el.lon ?? el.center?.lon ?? null
          if (lat && lon) {
            await supabase.from('receipts').update({
              store_address: claudeAddress,
              store_latitude: lat,
              store_longitude: lon,
            }).eq('id', receiptId)
          }
        }
      }
    } catch { /* non-critical */ }
  }
}

// ── Main handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const userId = authResult.userId

  const [dailyLimit, burstLimit] = await Promise.all([
    checkRateLimit(request, 'parseReceipt', userId),
    checkRateLimit(request, 'parseReceiptBurst', userId),
  ])
  if (dailyLimit) return dailyLimit
  if (burstLimit) return burstLimit

  const body = await request.json()
  const images: Array<{ base64: string; mediaType: string }> = Array.isArray(body.images)
    ? body.images.map((img: { image_base64: string; media_type?: string }) => ({
        base64: img.image_base64,
        mediaType: img.media_type ?? 'image/jpeg',
      }))
    : body.image_base64
      ? [{ base64: body.image_base64, mediaType: body.media_type ?? 'image/jpeg' }]
      : []

  if (images.length === 0 || !images[0].base64) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  }
  if (images.length > 3) {
    return NextResponse.json({ error: 'Maximum 3 images per receipt' }, { status: 400 })
  }

  const MAX_BASE64_BYTES = 12 * 1024 * 1024
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  for (const img of images) {
    if (img.base64.length > MAX_BASE64_BYTES) {
      return NextResponse.json({ error: 'Image trop grande (max 9 Mo)' }, { status: 413 })
    }
    if (!ALLOWED_TYPES.includes(img.mediaType)) {
      return NextResponse.json({ error: 'Format non supporté' }, { status: 400 })
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  const imageHash = createHash('sha256').update(images[0].base64).digest('hex')
  const supabase = getServiceClient()

  // Postcode + coords from request body (sent by frontend)
  const postcode: string | null = typeof body.postcode === 'string' && body.postcode.length === 5
    ? body.postcode : null
  const dept = postcode ? postcode.slice(0, 2) : null
  const userLat: number | null = typeof body.lat === 'number' ? body.lat : null
  const userLon: number | null = typeof body.lon === 'number' ? body.lon : null

  // ── Dedup: return cached result if same image was scanned before ─────
  const { data: cachedReceipt } = await supabase
    .from('receipts')
    .select('id, store_chain, total_amount, raw_ocr_text, store_address, receipt_date, image_url')
    .eq('user_id', userId)
    .eq('image_hash', imageHash)
    .maybeSingle()

  if (cachedReceipt) {
    const { data: cachedItems } = await supabase
      .from('price_items')
      .select('item_name, unit_price, quantity, is_promo, is_private_label, brand, volume_weight')
      .eq('receipt_id', cachedReceipt.id)

    if (cachedItems && cachedItems.length > 0) {
      console.log(`[scan] cache hit (${cachedItems.length} items) for user ${userId}`)

      const items = cachedItems.map(i => ({
        name: i.item_name as string,
        price: i.unit_price as number,
        quantity: i.quantity as number,
        is_promo: (i.is_promo as boolean) ?? false,
        is_private_label: (i.is_private_label as boolean) ?? false,
        brand: (i.brand as string) ?? null,
        volume_weight: (i.volume_weight as string) ?? null,
      }))

      const storeChain = cachedReceipt.store_chain as string
      const compResult = await comparePrices(supabase, items, storeChain, dept, userLat, userLon)

      return NextResponse.json({
        cached: true,
        receipt_id: cachedReceipt.id,
        store_name: storeChain,
        store_display_name: storeChain,
        total: cachedReceipt.total_amount,
        total_mismatch: false,
        items,
        store_address: cachedReceipt.store_address ?? null,
        image_hash: imageHash,
        quality_warning: false,
        comparisons: compResult.comparisons,
        total_savings: compResult.total_savings,
        best_store: compResult.best_store,
        data_as_of: compResult.data_as_of,
      })
    }

    await supabase.from('price_items').delete().eq('receipt_id', cachedReceipt.id)
    await supabase.from('receipts').delete().eq('id', cachedReceipt.id)
  }

  // ── Claude Vision parse ───────────────────────────────────────────────
  try {
    console.log(`[scan] Starting Claude Vision for user=${userId} (${images.length} image(s))`)

    const [formatHints, priceAnchors, corrections] = await Promise.all([
      Promise.resolve(supabase.from('receipt_formats').select('store_chain, format_hints').order('store_chain'))
        .then(r => {
          const data = r.data as { store_chain: string; format_hints: string }[] | null
          if (!data || data.length === 0) return ''
          return `\n\n── FORMATS DE TICKETS CONNUS ────────────────────────────────────────────────\n${data.map(f => `- ${f.store_chain}: ${f.format_hints}`).join('\n')}`
        })
        .catch(() => ''),
      fetchPriceAnchors(supabase),
      Promise.resolve(supabase.from('ocr_corrections')
        .select('original_text, corrected_text')
        .gte('correction_count', 3)
        .limit(200))
        .then(r => (r.data ?? []) as { original_text: string; corrected_text: string }[])
        .catch(() => [] as { original_text: string; corrected_text: string }[]),
    ])

    const textContent = await callClaude(apiKey, images, buildPrompt(formatHints, priceAnchors))
    console.log(`[scan] Claude response: ${textContent.length} chars`)

    // ── Parse JSON response ──────────────────────────────────────────────
    let cleaned = textContent.trim()
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1')

    let parsed: ParsedReceipt
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Réponse invalide (pas de JSON détecté)')
      parsed = JSON.parse(jsonMatch[0].replace(/,(\s*[}\]])/g, '$1'))
    }

    if (!parsed.store_name || !Array.isArray(parsed.items)) {
      throw new Error('Structure de ticket invalide')
    }

    // ── Normalise + enrich ───────────────────────────────────────────────
    parsed.items = normaliseItems(parsed.items)

    parsed.items = parsed.items.map(item => ({
      ...item,
      brand: item.brand ?? extractBrand(item.name) ?? null,
      volume_weight: item.volume_weight ?? extractWeight(item.name) ?? null,
    }))

    parsed.total = Number(parsed.total) || parsed.items.reduce(
      (s, i) => s + i.price * i.quantity, 0,
    )

    const storeDisplayName = parsed.store_name
    parsed.store_name = normalizeStoreChain(parsed.store_name)

    if (corrections.length > 0) {
      parsed.items = parsed.items.map(item => {
        const match = corrections.find(
          (c: { original_text: string; corrected_text: string }) => c.original_text.toLowerCase() === item.name.toLowerCase(),
        )
        return match ? { ...item, name: match.corrected_text } : item
      })
    }

    parsed.items = await validateItemPrices(parsed.items, supabase)

    const correctedTotal = parsed.items.reduce((s, i) => s + i.price * i.quantity, 0)
    const totalDiff = Math.abs(correctedTotal - parsed.total) / (parsed.total || 1)
    const totalMismatch = totalDiff > 0.03 && Math.abs(correctedTotal - parsed.total) > 1.0
    if (!totalMismatch) {
      parsed.total = correctedTotal
    }

    console.log(`[scan] Parsed: store="${parsed.store_name}", total=${parsed.total}, items=${parsed.items.length}`)

    // ── Insert receipt + price_items ─────────────────────────────────────
    const { data: receiptRow, error: receiptErr } = await supabase
      .from('receipts')
      .insert({
        user_id: userId,
        store_chain: parsed.store_name,
        total_amount: parsed.total,
        raw_ocr_text: textContent,
        image_hash: imageHash,
        receipt_date: new Date().toISOString().split('T')[0],
        store_address: typeof (parsed as unknown as Record<string, unknown>).store_address === 'string'
          ? (parsed as unknown as Record<string, unknown>).store_address as string
          : null,
      })
      .select('id')
      .single()

    if (receiptErr || !receiptRow) {
      console.error('[scan] receipt insert failed:', receiptErr?.message)
      throw new Error('Erreur base de données')
    }

    const receiptId = receiptRow.id

    if (parsed.items.length > 0) {
      const priceItems = parsed.items.map(item => ({
        receipt_id: receiptId,
        user_id: userId,
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
      if (itemsErr) console.error('[scan] price_items insert error:', itemsErr.message)
    }

    // ── Price comparison (inline — no second HTTP call) ──────────────────
    const storeChain = parsed.store_name
    const compItems = parsed.items.map(i => ({
      name: i.name,
      price: i.price,
      brand: i.brand ?? null,
      volume_weight: i.volume_weight ?? null,
    }))

    let compResult = { comparisons: [] as ComparisonResult[], total_savings: 0, best_store: null as { name: string; items_cheaper: number; total_savings: number } | null, data_as_of: null as string | null }
    try {
      compResult = await comparePrices(supabase, compItems, storeChain, dept, userLat, userLon)
    } catch (e) {
      console.error('[scan] comparison failed (non-blocking):', e)
    }

    // Save savings amount
    if (compResult.total_savings > 0) {
      void supabase.from('receipts').update({ savings_amount: compResult.total_savings }).eq('id', receiptId).then(() => {})
    }

    // ── Resolve store location (semi-blocking, 3.5s timeout) ────────────
    const locationPromise = resolveStoreLocation(supabase, parsed, receiptId).catch(err => {
      console.error('[scan] Location resolution failed:', err)
    })
    await Promise.race([locationPromise, new Promise(r => setTimeout(r, 3500))])

    // Re-read resolved address
    const { data: resolvedReceipt } = await supabase
      .from('receipts')
      .select('store_address, store_latitude, store_longitude')
      .eq('id', receiptId)
      .maybeSingle()
    const resolvedAddress = resolvedReceipt?.store_address as string | null

    // ── Return complete result ──────────────────────────────────────────
    const qualityWarning = !parsed.items || parsed.items.length === 0 ||
      (parsed.total === 0 && parsed.items.length < 2) ||
      parsed.items.filter(i => i.price === 0).length > parsed.items.length * 0.4

    const claudeAddress = typeof (parsed as unknown as Record<string, unknown>).store_address === 'string'
      ? (parsed as unknown as Record<string, unknown>).store_address as string : null

    return NextResponse.json({
      receipt_id: receiptId,
      store_name: parsed.store_name,
      store_display_name: storeDisplayName,
      total: parsed.total,
      total_mismatch: totalMismatch,
      items: parsed.items.map(i => ({
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        is_promo: i.is_promo,
        is_private_label: i.is_private_label,
        brand: i.brand ?? null,
        volume_weight: i.volume_weight ?? null,
        confidence: i.confidence ?? 1,
      })),
      store_address: resolvedAddress ?? claudeAddress,
      image_hash: imageHash,
      quality_warning: qualityWarning,
      comparisons: compResult.comparisons,
      total_savings: compResult.total_savings,
      best_store: compResult.best_store,
      data_as_of: compResult.data_as_of,
    })
  } catch (error) {
    console.error('[scan] Error:', error)
    const msg = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
