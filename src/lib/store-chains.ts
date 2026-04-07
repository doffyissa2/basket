// Maps raw store name variants from receipts to canonical chain names
const CHAIN_MAP: [string, string][] = [
  ['LECLERC', 'Leclerc'],
  ['LIDL', 'Lidl'],
  ['ALDI', 'Aldi'],
  ['INTERMARCHE', 'Intermarché'],
  ['ITM', 'Intermarché'],
  ['CARREFOUR', 'Carrefour'],
  ['SUPER U', 'Super U'],
  ['HYPER U', 'Super U'],
  ['U EXPRESS', 'Super U'],
  ['UTILE', 'Super U'],
  ['MONOPRIX', 'Monoprix'],
  ["MONOP'", 'Monoprix'],
  ['CASINO', 'Casino'],
  ['FRANPRIX', 'Franprix'],
  ['PICARD', 'Picard'],
  ['BIOCOOP', 'Biocoop'],
  ['NETTO', 'Netto'],
  ['SPAR', 'Spar'],
  ['CORA', 'Cora'],
  ['AUCHAN', 'Auchan'],
  ['SIMPLY MARKET', 'Auchan'],
  ['MATCH', 'Match'],
  ['MARCHE', 'Marché'],
]

function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function normalizeStoreChain(rawName: string): string {
  if (!rawName) return rawName
  const upper = removeAccents(rawName.toUpperCase().trim())
  for (const [key, canonical] of CHAIN_MAP) {
    if (upper.includes(removeAccents(key))) return canonical
  }
  return rawName.trim()
}
