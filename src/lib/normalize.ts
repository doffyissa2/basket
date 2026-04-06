const ACCENT_MAP: Record<string, string> = {
  à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a', å: 'a',
  è: 'e', é: 'e', ê: 'e', ë: 'e',
  ì: 'i', í: 'i', î: 'i', ï: 'i',
  ò: 'o', ó: 'o', ô: 'o', õ: 'o', ö: 'o',
  ù: 'u', ú: 'u', û: 'u', ü: 'u',
  ý: 'y', ÿ: 'y',
  ç: 'c', ñ: 'n', ø: 'o', æ: 'ae', œ: 'oe',
}

export function removeAccents(str: string): string {
  return str
    .split('')
    .map((ch) => ACCENT_MAP[ch] ?? ch)
    .join('')
}

const STOPWORDS = new Set([
  'de', 'le', 'la', 'les', 'du', 'des', 'au', 'aux', 'un', 'une',
  'et', 'en', 'a', 'x', 'par', 'pour', 'sur', 'avec', 'sans',
  'the', 'of', 'and', 'or',
])

export function normalizeProductName(str: string): string {
  return removeAccents(str.toLowerCase())
    .replace(/[^a-z0-9\s.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokenize(str: string): string[] {
  return normalizeProductName(str)
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
}

const WEIGHT_PATTERN = /\b(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml|cl|dl|mg)\b/gi

export function extractWeight(str: string): string | null {
  const normalized = str.toLowerCase().replace(/,/g, '.')
  const match = WEIGHT_PATTERN.exec(normalized)
  WEIGHT_PATTERN.lastIndex = 0
  if (!match) return null
  const value = match[1]
  const unit = match[2].toLowerCase()
  // Normalize to a canonical form
  return `${value}${unit}`
}

const KNOWN_BRANDS = [
  // Water & drinks
  'cristaline', 'evian', 'volvic', 'contrex', 'perrier', 'badoit', 'vals', 'hepar',
  'tropicana', 'innocent', 'oasis', 'minute maid', 'schweppes', 'coca cola', 'pepsi',
  'orangina', 'lipton', 'nescafe', 'ricoré', 'jardin bio', 'bjorg',
  // Dairy
  'president', 'beurre president', 'danone', 'activia', 'actimel', 'yaourt danone',
  'lactel', 'yoplait', 'vache qui rit', 'babybel', 'laughing cow', 'elle et vire',
  'candia', 'bridel', 'paysan breton', 'coeur de lion', 'caprice des dieux',
  'camembert president', 'brie president',
  // Pasta & cereals
  'barilla', 'panzani', 'lustucru', 'bjorg', 'tipiak', 'soubry',
  'kelloggs', 'jordans', 'nestle cereales', 'lion', 'kit kat', 'nesquik',
  // Meat & charcuterie
  'herta', 'fleury michon', 'justin bridou', 'madrange', 'montagne noire',
  'aoste', 'jean caby', 'le gaulois', 'marie', 'labeyrie',
  // Vegetables & canned
  'bonduelle', 'cassegrain', 'william saurin', 'd aucy', 'pom etal',
  // Condiments & oil
  'lesieur', 'puget', 'amora', 'maille', 'bornier', 'sacla', 'heinz',
  'ketchup heinz', 'hellmanns',
  // Bakery & sweets
  'nutella', 'ferrero', 'haribo', 'tagada', 'carambar', 'werther', 'ricola',
  'lu', 'bonne maman', 'saint michel', 'pepperidge', 'liegeois', 'mcvitie',
  'prince', 'bn', 'oreo', 'digestive', 'palmier',
  // Frozen
  'picard', 'findus', 'iglo', 'weight watchers', 'marie', 'fiche cuisine',
  // Baby
  'bledina', 'nestle bebe', 'hipp', 'gallia', 'novalac',
  // Beauty & household
  'ariel', 'skip', 'persil', 'calgon', 'fairy', 'ajax', 'mr propre',
  'palmolive', 'monsavon', 'dove', 'nivea', 'garnier', "l oreal",
  // Misc grocery
  'maggi', 'knorr', 'liebig', 'royco', 'uncle bens', 'uncle ben',
  'pringles', 'lay', 'vico', 'benenuts', 'curly',
]

export function extractBrand(str: string): string | null {
  const norm = normalizeProductName(str)
  for (const brand of KNOWN_BRANDS) {
    const normBrand = normalizeProductName(brand)
    if (norm.includes(normBrand)) return normBrand
  }
  return null
}

/**
 * Maps a brand name to its primary product category keyword(s).
 * Used so "cristaline" implies "eau" even when the candidate doesn't
 * mention the brand name.
 */
export const BRAND_CATEGORY_MAP: Record<string, string[]> = {
  cristaline:     ['eau', 'eau minerale'],
  evian:          ['eau', 'eau minerale'],
  volvic:         ['eau', 'eau minerale'],
  contrex:        ['eau', 'eau minerale'],
  perrier:        ['eau', 'eau gazeuse'],
  badoit:         ['eau', 'eau gazeuse'],
  president:      ['beurre', 'fromage', 'camembert', 'creme'],
  danone:         ['yaourt', 'lait'],
  activia:        ['yaourt'],
  actimel:        ['yaourt', 'lait'],
  lactel:         ['lait'],
  yoplait:        ['yaourt'],
  barilla:        ['pates', 'spaghetti', 'penne'],
  panzani:        ['pates', 'spaghetti'],
  lustucru:       ['pates', 'riz'],
  herta:          ['jambon', 'charcuterie', 'lardons'],
  'fleury michon':['jambon', 'charcuterie'],
  bonduelle:      ['legumes', 'haricots', 'pois', 'mais'],
  cassegrain:     ['legumes', 'haricots'],
  lesieur:        ['huile'],
  puget:          ["huile d'olive", 'huile'],
  amora:          ['moutarde', 'ketchup'],
  maille:         ['moutarde'],
  heinz:          ['ketchup'],
  nutella:        ['nutella', 'pate a tartiner'],
  haribo:         ['bonbons'],
  kelloggs:       ['cereales'],
  lu:             ['biscuits', 'gateau'],
  'bonne maman':  ['confiture', 'biscuits', 'gateau'],
  tropicana:      ['jus', 'jus orange'],
  innocent:       ['jus', 'smoothie'],
  coca:           ['soda', 'coca cola'],
  pepsi:          ['soda'],
  schweppes:      ['soda', 'tonic'],
  ariel:          ['lessive'],
  skip:           ['lessive'],
  persil:         ['lessive'],
  fairy:          ['liquide vaisselle'],
  ajax:           ['nettoyant'],
  palmolive:      ['gel douche', 'savon'],
  dove:           ['gel douche', 'savon'],
  nivea:          ['creme', 'deodorant'],
  garnier:        ['shampoing', 'soin'],
  pringles:       ['chips'],
  lay:            ['chips'],
}

/**
 * Returns the category keywords associated with the brand found in `str`,
 * or null if no brand→category mapping exists.
 */
export function brandToCategory(str: string): string[] | null {
  const brand = extractBrand(str)
  if (!brand) return null
  return BRAND_CATEGORY_MAP[brand] ?? null
}

/**
 * Compute a normalized price per standard unit so items of different sizes
 * can be compared fairly (e.g. 400g vs 750g).
 * Returns €/100g for solids, €/L for liquids, or null if weight can't be parsed.
 */
export function computeNormalizedPrice(
  price: number,
  weightStr: string
): { value: number; label: string } | null {
  const lower = weightStr.toLowerCase().replace(',', '.')
  const match = lower.match(/^(\d+(?:\.\d+)?)(kg|g|l|ml|cl|dl)$/)
  if (!match) return null
  const amount = parseFloat(match[1])
  const unit = match[2]
  if (isNaN(amount) || amount === 0) return null

  let normalized: number
  let unitLabel: string
  if (unit === 'g')       { normalized = (price / amount) * 100;        unitLabel = '100g' }
  else if (unit === 'kg') { normalized = (price / (amount * 1000)) * 100; unitLabel = '100g' }
  else if (unit === 'l')  { normalized = price / amount;                 unitLabel = 'L' }
  else if (unit === 'cl') { normalized = (price / amount) * 100;         unitLabel = 'L' }
  else if (unit === 'dl') { normalized = (price / amount) * 10;          unitLabel = 'L' }
  else if (unit === 'ml') { normalized = (price / amount) * 1000;        unitLabel = 'L' }
  else return null

  return { value: Math.round(normalized * 100) / 100, label: `€${normalized.toFixed(2)}/${unitLabel}` }
}
