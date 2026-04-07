// Maps raw store name variants from receipts to canonical chain names.
// Keys are UPPERCASE+accent-stripped substrings; values are display names.
const CHAIN_MAP: [string, string][] = [
  // ── Discount / hard discount ──────────────────────────────────────────────
  ['LIDL', 'Lidl'],
  ['ALDI', 'Aldi'],
  ['NETTO', 'Netto'],
  ['LEADER PRICE', 'Leader Price'],
  ['ED ', 'Ed'],
  // ── Leclerc family ────────────────────────────────────────────────────────
  ['LECLERC', 'Leclerc'],
  ['E.LECLERC', 'Leclerc'],
  // ── Intermarché family ────────────────────────────────────────────────────
  ['INTERMARCHE', 'Intermarché'],
  ['INTERMARCHÉ', 'Intermarché'],
  ['ITM', 'Intermarché'],
  // ── Carrefour family ─────────────────────────────────────────────────────
  ['CARREFOUR CITY', 'Carrefour'],
  ['CARREFOUR CONTACT', 'Carrefour'],
  ['CARREFOUR MARKET', 'Carrefour'],
  ['CARREFOUR EXPRESS', 'Carrefour'],
  ['CARREFOUR', 'Carrefour'],
  // ── Super U family ────────────────────────────────────────────────────────
  ['SUPER U', 'Super U'],
  ['HYPER U', 'Super U'],
  ['U EXPRESS', 'Super U'],
  ['UTILE', 'Super U'],
  ['U EXPRESS', 'Super U'],
  ['MARCHE U', 'Super U'],
  // ── Auchan family ────────────────────────────────────────────────────────
  ['AUCHAN SUPERMARCHE', 'Auchan'],
  ['AUCHAN HYPERMARCHE', 'Auchan'],
  ['SIMPLY MARKET', 'Auchan'],
  ['AUCHAN', 'Auchan'],
  // ── Casino family ─────────────────────────────────────────────────────────
  ['CASINO SUPERMARCHE', 'Casino'],
  ['CASINO HYPERMARCHE', 'Casino'],
  ['PETIT CASINO', 'Casino'],
  ['SPAR', 'Spar'],
  ['VIVAL', 'Casino'],
  ['CASINO', 'Casino'],
  // ── Monoprix / Franprix ───────────────────────────────────────────────────
  ['MONOPRIX', 'Monoprix'],
  ["MONOP'", 'Monoprix'],
  ['MONOP', 'Monoprix'],
  ['FRANPRIX', 'Franprix'],
  // ── Coop / Regional ──────────────────────────────────────────────────────
  ['CORA', 'Cora'],
  ['MATCH', 'Match'],
  ['COOPEO', 'Coopéo'],
  ['COOP', 'Coop'],
  // ── Specialty ─────────────────────────────────────────────────────────────
  ['PICARD', 'Picard'],
  ['BIOCOOP', 'Biocoop'],
  ['NATURALIA', 'Naturalia'],
  ['LA VIE CLAIRE', 'La Vie Claire'],
  ['BIO C BON', 'Bio c\' Bon'],
  // ── Convenience ───────────────────────────────────────────────────────────
  ['8 A HUIT', '8 à Huit'],
  ['8 À HUIT', '8 à Huit'],
  ['G 20', 'G20'],
  ['G20', 'G20'],
  ['PROXY', 'Proxi'],
  // ── Drive formats ─────────────────────────────────────────────────────────
  ['DRIVE', 'Drive'],
]

function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Returns the canonical chain name for a raw store name, or the trimmed
 * original if no match is found in CHAIN_MAP.
 */
export function normalizeStoreChain(rawName: string): string {
  if (!rawName) return rawName
  const upper = removeAccents(rawName.toUpperCase().trim())
  for (const [key, canonical] of CHAIN_MAP) {
    if (upper.includes(removeAccents(key))) return canonical
  }
  return rawName.trim()
}

/**
 * Returns true if the raw store name was matched to a known chain.
 * Returns false when normalizeStoreChain falls back to the raw input.
 */
export function isKnownStore(rawName: string): boolean {
  if (!rawName) return false
  const upper = removeAccents(rawName.toUpperCase().trim())
  return CHAIN_MAP.some(([key]) => upper.includes(removeAccents(key)))
}
