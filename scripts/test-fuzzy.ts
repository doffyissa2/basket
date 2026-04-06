import { fuzzyMatch } from '../src/lib/fuzzy-match'
import { normalizeProductName, extractBrand, extractWeight, tokenize } from '../src/lib/normalize'
import { expandAbbreviations } from '../src/lib/receipt-abbreviations'

// ─── Sample database products (mimics seed-massive output) ───────────────────
const DB_PRODUCTS = [
  'eau minerale 1.5l x6',
  'eau gazeuse perrier 75cl',
  'beurre doux president 250g',
  'beurre demi-sel 250g',
  'lait demi-ecreme 1l',
  'lait entier 1l',
  'yaourt nature danone x8',
  'bonbons haribo tagada 300g',
  'nutella 400g',
  'papier toilette x6',
  'chips lay classique 200g',
  'jambon blanc herta 4 tranches',
  'pates spaghetti barilla 500g',
  'pates penne rigate 500g',
  'fromage camembert president 250g',
  'huile d\'olive 75cl',
  'huile de tournesol 1l',
  'chocolat noir 200g',
  'jus d\'orange 1l',
  'farine de ble 1kg',
  'sucre en poudre 1kg',
  'sel fin 750g',
  'riz long grain 1kg',
  'tomates cerises 250g',
  'moutarde de dijon 200g',
  'shampooing volumisant 250ml',
  'liquide vaisselle citron 500ml',
  'lessive liquide 1.5l',
]

// ─── Test cases ───────────────────────────────────────────────────────────────
const TEST_CASES: Array<{ input: string; expectedContains: string; note?: string }> = [
  { input: 'CRISTALINE 1.5L',          expectedContains: 'eau',         note: 'Brand → water' },
  { input: 'PRES BEURRE DX 250G',      expectedContains: 'beurre',      note: 'Abbreviation + brand' },
  { input: 'HARIBO TAGADA 300G',        expectedContains: 'haribo',      note: 'Brand + name' },
  { input: 'LT 1/2 ECR 1L',            expectedContains: 'lait',        note: 'Abbreviation (lt=lait, 1/2 ecr)' },
  { input: 'NUTELLA 400G',              expectedContains: 'nutella',     note: 'Exact brand name' },
  { input: 'PQ X6',                     expectedContains: 'papier',      note: 'PQ abbreviation' },
  { input: 'BARILLA SPAGH 500G',        expectedContains: 'spaghetti',   note: 'Brand + truncated name' },
  { input: 'LESSIVE LIQ 1.5L',         expectedContains: 'lessive',     note: 'Partial match' },
  { input: 'CHIPS LAY 200G',            expectedContains: 'chips',       note: 'Brand match' },
  { input: 'JBN HERTA 4TR',            expectedContains: 'jambon',      note: 'Abbreviation (jbn=jambon)' },
  { input: 'PENNE 500G',               expectedContains: 'penne',       note: 'Direct token match' },
  { input: 'FROMAGE CAMEMBERT 250G',   expectedContains: 'camembert',   note: 'Token overlap' },
  { input: 'MOUTARDE DIJON 200G',      expectedContains: 'moutarde',    note: 'Token overlap' },
  { input: 'TOMATES CERISES 250G',     expectedContains: 'tomates',     note: 'Token overlap' },
  { input: 'H.OLIVE 75CL',             expectedContains: 'olive',       note: 'Abbreviation h.olive' },
  { input: 'JUS OR 1L',                expectedContains: 'orange',      note: 'Abbreviation jus or' },
  { input: 'FARINE BLE 1KG',           expectedContains: 'farine',      note: 'Token match' },
  { input: 'RIZ LG GRAIN 1KG',        expectedContains: 'riz',         note: 'Abbreviation + token' },
  { input: 'CHOC NOIR 200G',           expectedContains: 'chocolat',    note: 'Abbreviation choc' },
  { input: 'LIQ VAISS CIT 500ML',      expectedContains: 'vaisselle',   note: 'Abbreviation liq vaiss' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
const RESET = '\x1b[0m'
const GREEN = '\x1b[32m'
const RED   = '\x1b[31m'
const YELLOW = '\x1b[33m'
const CYAN  = '\x1b[36m'
const DIM   = '\x1b[2m'
const BOLD  = '\x1b[1m'

function confidenceBar(score: number): string {
  const filled = Math.round(score * 10)
  return '█'.repeat(filled) + '░'.repeat(10 - filled)
}

// ─── Run tests ────────────────────────────────────────────────────────────────
console.log(`\n${BOLD}━━━ Basket Fuzzy Matcher — Test Suite ━━━${RESET}\n`)

// Print normalization examples first
console.log(`${CYAN}Normalization examples:${RESET}`)
for (const s of ['PRES BEURRE DX 250G', 'LT 1/2 ECR 1L', 'CRISTALINE 1.5L']) {
  const expanded = expandAbbreviations(s)
  const norm = normalizeProductName(expanded)
  const tokens = tokenize(expanded)
  const brand = extractBrand(expanded)
  const weight = extractWeight(expanded)
  console.log(`  "${s}"`)
  console.log(`  ${DIM}expanded: "${expanded}"${RESET}`)
  console.log(`  ${DIM}norm:     "${norm}"${RESET}`)
  console.log(`  ${DIM}tokens:   [${tokens.join(', ')}]${RESET}`)
  console.log(`  ${DIM}brand:    ${brand ?? 'null'}  weight: ${weight ?? 'null'}${RESET}`)
  console.log()
}

// Run match tests
console.log(`${CYAN}Match results:${RESET}\n`)

let passed = 0
let failed = 0

for (const tc of TEST_CASES) {
  const result = fuzzyMatch(tc.input, DB_PRODUCTS)
  const matched = result.matched ?? '(no match)'
  const ok = result.matched !== null && result.matched.includes(tc.expectedContains)

  if (ok) passed++
  else failed++

  const status = ok ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`
  const confColor = result.confidence >= 0.6 ? GREEN : result.confidence >= 0.3 ? YELLOW : RED
  const stratLabel = result.strategy.padEnd(13)

  console.log(
    `  ${status} ${BOLD}"${tc.input}"${RESET}${DIM} (${tc.note})${RESET}`
  )
  console.log(
    `    ${DIM}→${RESET} "${matched}"`
  )
  console.log(
    `    ${confColor}${confidenceBar(result.confidence)}${RESET} ${confColor}${(result.confidence * 100).toFixed(0)}%${RESET}` +
    `  ${DIM}strategy: ${stratLabel}${RESET}` +
    (!ok ? `  ${RED}expected to contain "${tc.expectedContains}"${RESET}` : '')
  )
  console.log()
}

console.log(`${BOLD}━━━ Results: ${GREEN}${passed} passed${RESET}${BOLD}, ${failed > 0 ? RED : RESET}${failed} failed${RESET}${BOLD} / ${TEST_CASES.length} total ━━━${RESET}\n`)
