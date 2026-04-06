/**
 * French supermarket receipt abbreviation → full product name
 * Sourced from common French POS system abbreviations.
 */
export const RECEIPT_ABBREVIATIONS: Record<string, string> = {
  // Water & drinks
  'crstaline': 'cristaline',
  'cristal': 'cristaline',
  'eau min': 'eau minerale',
  'eau gaz': 'eau gazeuse',
  'eau plat': 'eau plate',
  'jus or': 'jus orange',
  'jus pom': 'jus pomme',
  'jus mult': 'jus multifruits',
  'coca': 'coca cola',
  'peps': 'pepsi',
  'schwp': 'schweppes',
  'orangina': 'orangina',
  'lip': 'lipton',
  'nesc': 'nescafe',
  'caf': 'cafe',
  // Dairy
  'pres': 'president',
  'lt': 'lait',
  'lait ent': 'lait entier',
  'lait dm': 'lait demi ecreme',
  'lait ecr': 'lait ecreme',
  '1/2 ecr': 'demi ecreme',
  'dm ecr': 'demi ecreme',
  'demi ecr': 'demi ecreme',
  'beurre dx': 'beurre doux',
  'bre': 'beurre',
  'beur': 'beurre',
  'crm frch': 'creme fraiche',
  'crm': 'creme',
  'frg': 'fromage',
  'frm': 'fromage',
  'frgo': 'fromage',
  'yrt': 'yaourt',
  'yao': 'yaourt',
  'yog': 'yaourt',
  'dan': 'danone',
  'dano': 'danone',
  // Meat & charcuterie
  'jbn': 'jambon',
  'jmb': 'jambon',
  'jam': 'jambon',
  'lard': 'lardons',
  'bif': 'bifteck',
  'bif hach': 'bifteck hache',
  'hach': 'hache',
  'porc': 'porc',
  'poulet': 'poulet',
  'poul': 'poulet',
  'saus': 'saucisse',
  'sauss': 'saucisse',
  'mergu': 'merguez',
  'chipo': 'chipolata',
  'chrc': 'charcuterie',
  // Fish
  'sal': 'saumon',
  'thn': 'thon',
  'thon nat': 'thon nature',
  'caill': 'caille',
  // Bread & bakery
  'bag': 'baguette',
  'pan': 'pain',
  'pain comp': 'pain complet',
  'pain cer': 'pain cereales',
  'crois': 'croissant',
  'brig': 'brioche',
  // Produce
  'pdt': 'pommes de terre',
  'pom ter': 'pommes de terre',
  'tom': 'tomates',
  'car': 'carottes',
  'sal vrt': 'salade verte',
  'lait': 'lait',
  'chou fl': 'chou fleur',
  'couch': 'courgettes',
  'oign': 'oignons',
  'ail': 'ail',
  'echal': 'echalotes',
  'persi': 'persil',
  'banan': 'bananes',
  'pom': 'pommes',
  'poire': 'poires',
  'fras': 'fraises',
  'raisi': 'raisins',
  'kiwi': 'kiwi',
  'citron': 'citron',
  'orang': 'oranges',
  // Pasta & rice
  'pate': 'pates',
  'spag': 'spaghetti',
  'spagh': 'spaghetti',
  'penne': 'penne',
  'fus': 'fusilli',
  'riz': 'riz',
  'semoul': 'semoule',
  // Oil & condiments
  'h.olive': "huile d'olive",
  'huil oliv': "huile d'olive",
  'huil tourn': 'huile tournesol',
  'tourn': 'tournesol',
  'vinai': 'vinaigre',
  'moust': 'moutarde',
  'ketch': 'ketchup',
  'mayo': 'mayonnaise',
  'sel mar': 'sel de mer',
  // Canned & preserves
  'cons tom': 'conserve tomates',
  'pois ch': 'pois chiches',
  'lent': 'lentilles',
  'hri vrt': 'haricots verts',
  'mals': 'mais',
  // Hygiene & household
  'pq': 'papier toilette',
  'pap tlt': 'papier toilette',
  'pap cui': 'papier cuisine',
  'liq vaiss': 'liquide vaisselle',
  'liq vais': 'liquide vaisselle',
  'lessive': 'lessive',
  'lesv': 'lessive',
  'shampo': 'shampoing',
  'deo': 'deodorant',
  'savon': 'savon',
  'gel dou': 'gel douche',
  'mousse ras': 'mousse a raser',
  // Sweets & snacks
  'choc': 'chocolat',
  'nutl': 'nutella',
  'bis': 'biscuits',
  'bisc': 'biscuits',
  'chips': 'chips',
  'bonb': 'bonbons',
  'carab': 'carambar',
  // Frozen
  'leg sur': 'legumes surgeles',
  'surg': 'surgele',
  // Misc
  'bio': 'biologique',
  'ss': 'sans sucre',
  'sg': 'sans gluten',
  'allg': 'allegee',
  'x6': 'pack 6',
  'x4': 'pack 4',
  'x12': 'pack 12',
  'bte': 'boite',
  'btle': 'bouteille',
  'pkg': 'paquet',
  'sach': 'sachet',
  'pot': 'pot',
  'bar': 'barquette',
}

/**
 * Expand abbreviations found in a product name.
 * Replaces known shorthands with their full form.
 */
export function expandAbbreviations(name: string): string {
  const lower = name.toLowerCase().trim()
  let expanded = lower

  // Sort by length descending so longer abbreviations match first
  const sorted = Object.entries(RECEIPT_ABBREVIATIONS).sort((a, b) => b[0].length - a[0].length)

  for (const [abbr, full] of sorted) {
    // Use word boundary-like matching: the abbreviation must be surrounded by
    // spaces, start/end of string, or non-alpha chars
    const pattern = new RegExp(`(?<![a-z])${abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z])`, 'gi')
    expanded = expanded.replace(pattern, full)
  }

  return expanded.replace(/\s+/g, ' ').trim()
}
