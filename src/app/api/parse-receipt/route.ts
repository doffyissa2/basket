import { NextRequest, NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { checkRateLimit } from '@/lib/rate-limit'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase-service'
import { normalizeStoreChain } from '@/lib/store-chains'
import { normalizeProductName } from '@/lib/normalize'
import type { ParsedItem, ParsedReceipt } from '@/types/api'

// ── SIRENE API types ──────────────────────────────────────────────────────────
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

// SIRENE: looks up address text for a SIRET, SIREN, or company name.
// When postcode is provided, filters to the matching establishment.
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

// VAT: extracts 9-digit SIREN from a French intra-community VAT number (FR XX XXXXXXXXX).
function sirenFromVat(vat: string): string | null {
  const clean = vat.replace(/\s/g, '').toUpperCase()
  return clean.match(/^FR\w{2}(\d{9})$/)?.[1] ?? null
}

// BAN (Base Adresse Nationale): geocodes a French address to lat/lon.
// Returns null if score < 0.4 (low confidence) to avoid wrong pins.
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

function getScanRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
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

      const norm = normalizeProductName(item.name)
      const normWords = norm.split(' ').filter((w: string) => w.length > 3)
      if (normWords.length === 0) return item

      // Find best-matching key by word overlap
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
      "raw_ref": "PAIN DE MIE COMP"
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
- Remises séparées (lignes REMISE, OFFRE FIDÉLITÉ, -XX%) → SOUSTRAIRE du prix de l'article précédent et mettre is_promo=true; NE PAS créer un article séparé pour la remise
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
- < 0.3 : trop incertain — OMETTRE l'article complètement${formatHintsSection}`
}

// ── Haiku receipt gatekeeper ──────────────────────────────────────────────────
// Cheap yes/no check before committing to Sonnet. Runs in parallel with DB queries.
// Fails open — a gatekeeper error never blocks a legitimate user.
async function isReceiptImage(
  apiKey: string,
  image: { base64: string; mediaType: string }
): Promise<boolean> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 5,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
            { type: 'text', text: 'Is this a grocery or retail store receipt? Reply ONLY "yes" or "no".' },
          ],
        }],
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return true  // fail open
    const data = await res.json()
    const answer = (data.content?.[0]?.text ?? '').trim().toLowerCase()
    return answer.startsWith('yes')
  } catch {
    return true  // fail open — gatekeeper errors must never block real scans
  }
}

// ── Call Claude Vision (supports 1–3 images for long receipts) ───────────────
// Vision calls: prompt cached in system message (same every scan → ~90% discount on prompt tokens).
// Text-only calls (address verify): standard messages, max_tokens capped at 100.
async function callClaude(
  apiKey: string,
  images: Array<{ base64: string; mediaType: string }>,
  prompt: string,
  model = 'claude-sonnet-4-6'
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
    // Prompt goes in system (cacheable — same for every scan).
    // Images go in user message (unique per scan — not cached).
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
    // Text-only verification call (address verify, etc.)
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


export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  // Layer 1: daily cap (10/day) + burst cap (3/min) — checked in parallel
  const [dailyLimit, burstLimit] = await Promise.all([
    checkRateLimit(request, 'parseReceipt', authResult.userId),
    checkRateLimit(request, 'parseReceiptBurst', authResult.userId),
  ])
  if (dailyLimit) return dailyLimit
  if (burstLimit) return burstLimit

  // Layer 5: block users with ≥5 consecutive failed scans (abuse signal)
  const redis = getScanRedis()
  const failKey = `basket_scan_fails:${authResult.userId}`
  if (redis) {
    const consecutiveFails = await redis.get<number>(failKey).catch(() => null)
    if ((consecutiveFails ?? 0) >= 5) {
      return NextResponse.json(
        { error: 'Trop de tentatives invalides. Contactez le support si c\'est une erreur.' },
        { status: 429 }
      )
    }
  }

  try {
    const body = await request.json()

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

    const MAX_BASE64_BYTES = 12 * 1024 * 1024 // ~9 MB file → ~12 MB base64
    const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    for (const img of images) {
      if (img.base64.length > MAX_BASE64_BYTES) {
        return NextResponse.json({ error: 'Image trop grande (max 9 Mo)' }, { status: 413 })
      }
      if (!ALLOWED_MEDIA_TYPES.includes(img.mediaType)) {
        return NextResponse.json({ error: 'Format non supporté' }, { status: 400 })
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    // ── Layer 2: Haiku gatekeeper + DB queries run in parallel ───────────
    // Gatekeeper costs ~$0.0005 and stops cat photos / memes before Sonnet.
    const supabase = getServiceClient()
    const [{ data: formats }, priceAnchorsSection, isReceipt] = await Promise.all([
      supabase.from('receipt_formats').select('store_chain, format_hints').order('store_chain'),
      fetchPriceAnchors(supabase),
      isReceiptImage(apiKey, images[0]),
    ])

    if (!isReceipt) {
      if (redis) void redis.incr(failKey).then(n => { if (n === 1) void redis.expire(failKey, 86400) }).catch(() => null)
      return NextResponse.json(
        { error: 'Cette image ne ressemble pas à un ticket de caisse.' },
        { status: 400 }
      )
    }

    const formatHintsSection =
      formats && formats.length > 0
        ? `\n\n── FORMATS DE TICKETS CONNUS ────────────────────────────────────────────────\nUtilise ces informations si tu reconnais l'enseigne :\n${formats
            .map((f: { store_chain: string; format_hints: string }) => `- ${f.store_chain}: ${f.format_hints}`)
            .join('\n')}`
        : ''

    // ── Pre-fetch OCR corrections (defensive — table may not exist yet) ──────
    let corrections: { original_text: string; corrected_text: string }[] = []
    try {
      const { data: corrData } = await supabase
        .from('ocr_corrections')
        .select('original_text, corrected_text')
        .gte('correction_count', 3)
        .limit(200)
      corrections = corrData ?? []
    } catch { /* table doesn't exist yet — skip */ }

    // ── First parse attempt ───────────────────────────────────────────────
    let textContent = await callClaude(apiKey, images, buildPrompt(formatHintsSection + priceAnchorsSection, false))

    let cleaned = textContent.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    let parsed: ParsedReceipt = JSON.parse(cleaned)

    if (!parsed.store_name || !Array.isArray(parsed.items)) {
      throw new Error('Invalid receipt structure')
    }

    parsed.items = normaliseItems(parsed.items)

    // ── Hallucination guard: reject items not anchored in raw_lines ───────
    const rawLines = Array.isArray((parsed as unknown as Record<string, unknown>).raw_lines)
      ? ((parsed as unknown as Record<string, unknown>).raw_lines as string[])
      : []
    if (rawLines.length > 0) {
      const rawSet = rawLines.map(l => l.toLowerCase().trim())
      parsed.items = parsed.items.filter(item => {
        if (!item.raw_ref) return true  // no anchor → keep (graceful for old prompts)
        const ref = item.raw_ref.toLowerCase().trim()
        return rawSet.some(line => line === ref || line.includes(ref) || ref.includes(line))
      })
    }

    parsed.total = Number(parsed.total) || parsed.items.reduce(
      (s, i) => s + i.price * i.quantity, 0
    )

    // ── Retry if quality is poor — escalate to Sonnet for accuracy ───────
    if (isParseQualityBad(parsed)) {
      console.log('[parse-receipt] Quality check failed, retrying with Sonnet')

      textContent = await callClaude(
        apiKey, images,
        buildPrompt(formatHintsSection + priceAnchorsSection, true),
        'claude-sonnet-4-6'
      )

      cleaned = textContent.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      const retryParsed: ParsedReceipt = JSON.parse(cleaned)

      if (retryParsed.store_name && Array.isArray(retryParsed.items) && retryParsed.items.length > 0) {
        retryParsed.items = normaliseItems(retryParsed.items)
        const retryRawLines = Array.isArray((retryParsed as unknown as Record<string, unknown>).raw_lines)
          ? ((retryParsed as unknown as Record<string, unknown>).raw_lines as string[])
          : []
        if (retryRawLines.length > 0) {
          const retryRawSet = retryRawLines.map(l => l.toLowerCase().trim())
          retryParsed.items = retryParsed.items.filter(item => {
            if (!item.raw_ref) return true
            const ref = item.raw_ref.toLowerCase().trim()
            return retryRawSet.some(line => line === ref || line.includes(ref) || ref.includes(line))
          })
        }
        retryParsed.total = Number(retryParsed.total) || retryParsed.items.reduce(
          (s, i) => s + i.price * i.quantity, 0
        )
        if (retryParsed.items.length >= parsed.items.length && retryParsed.total > 0) {
          parsed = retryParsed
        }
      }
    }

    // ── Post-parse intelligence ───────────────────────────────────────────
    // 1. Normalize store chain name using our OSM chain map
    parsed.store_name = normalizeStoreChain(parsed.store_name)

    // 2. Apply learned OCR corrections (items corrected ≥3 times by users)
    if (corrections.length > 0) {
      parsed.items = parsed.items.map(item => {
        const match = corrections.find(
          c => c.original_text.toLowerCase() === item.name.toLowerCase()
        )
        return match ? { ...item, name: match.corrected_text } : item
      })
    }

    // 3. Validate/correct item prices against community_prices data
    parsed.items = await validateItemPrices(parsed.items, supabase)

    // Recompute total after any price corrections
    const correctedTotal = parsed.items.reduce((s, i) => s + i.price * i.quantity, 0)
    if (Math.abs(correctedTotal - parsed.total) / (parsed.total || 1) < 0.15) {
      parsed.total = correctedTotal
    }

    // 4. Resolve store location
    //    Priority: DB cache → SIRET→SIRENE→BAN → VAT→SIREN→SIRENE→BAN
    //              → company+postcode→SIRENE→BAN → address→BAN → Overpass → no pin
    //    All identifiers come from the receipt itself — no user GPS used.
    let storeLocation: { address: string | null; lat: number | null; lon: number | null } =
      { address: null, lat: null, lon: null }

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

    // Extract postcode + city from address text (fallback if not extracted as a standalone field)
    const postcodeMatch  = claudeAddress?.match(/\b(\d{5})\s+([A-ZÀ-ÿa-z\-]+(?:\s+[A-ZÀ-ÿa-z\-]+)*)/i)
    const receiptPostcode = claudePostcode ?? postcodeMatch?.[1] ?? null
    const receiptCity     = postcodeMatch?.[2]?.trim() ?? null

    if (claudeAddress) storeLocation.address = claudeAddress

    // Stable cache key — SIRET is the most precise anchor, then postcode, then city
    const stableOsmId = `basket_receipt_${parsed.store_name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${claudeSiret ?? receiptPostcode ?? receiptCity?.toLowerCase().replace(/[^a-z0-9]/g, '_') ?? 'fr'}`

    let locationSource = 'none'

    // Step 0: DB cache — known store skips all external API calls
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

    // Step 2: FR VAT → extract SIREN → SIRENE (filtered by postcode) → BAN
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

    // Step 3: legal company name + postcode → SIRENE → BAN
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

    // Step 4: receipt address text → BAN directly
    if (!storeLocation.lat && claudeAddress) {
      const geo = await geocodeBAN(claudeAddress)
      if (geo) {
        storeLocation = { lat: geo.lat, lon: geo.lon, address: claudeAddress }
        locationSource = 'address'
      }
    }

    // Step 5: chain + postcode → Overpass (receipt has no legal footer at all)
    if (!storeLocation.lat && (receiptPostcode || receiptCity)) {
      try {
        const chainWord  = parsed.store_name.split(/[\s\-]/)[0].replace(/[^a-zA-ZÀ-ÿ]/g, '')
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

    // Step 6: no pin — better than a wrong one
    console.log(`[parse-receipt] Location "${parsed.store_name}": source=${locationSource} lat=${storeLocation.lat ?? 'none'}`)

    // Persist successful geocoding to DB (all sources except cache)
    if (locationSource !== 'cache' && locationSource !== 'none' && storeLocation.lat && storeLocation.lon) {
      void supabase.from('store_locations').upsert({
        osm_id:    stableOsmId,
        chain:     parsed.store_name,
        name:      parsed.store_name,
        address:   storeLocation.address,
        latitude:  storeLocation.lat,
        longitude: storeLocation.lon,
        source:    locationSource,
        accuracy:  ['siret', 'vat', 'company'].includes(locationSource) ? 'siret' : 'address',
      }, { onConflict: 'osm_id', ignoreDuplicates: false })
    }

    // Success — reset consecutive failure counter
    if (redis) void redis.del(failKey).catch(() => null)

    return NextResponse.json({
      ...parsed,
      raw_ocr_text:    textContent,
      store_address:   storeLocation.address,
      store_latitude:  storeLocation.lat,
      store_longitude: storeLocation.lon,
    })
  } catch (error) {
    // Increment failure counter — JSON parse errors / API errors are abuse signals
    if (redis) void redis.incr(failKey).then(n => { if (n === 1) void redis.expire(failKey, 86400) }).catch(() => null)
    console.error('Parse receipt error:', error)
    return NextResponse.json(
      { error: 'Failed to parse receipt' },
      { status: 500 }
    )
  }
}
