// scripts/seed-massive.ts
// Run: export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/seed-massive.ts

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error('Missing env vars. Need: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

// Auth client (anon key) — only for sign-in to obtain user ID
const authClient = createClient(SUPABASE_URL, ANON_KEY)
// Service client — bypasses RLS for all inserts
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// ─────────────────────────────────────────────────────────────────────────────
// STORES
// ─────────────────────────────────────────────────────────────────────────────
const STORES = [
  { name: 'E.Leclerc',          min: 0.90, max: 0.95, frozenOnly: false },
  { name: 'Carrefour',          min: 0.97, max: 1.02, frozenOnly: false },
  { name: 'Carrefour Market',   min: 1.02, max: 1.07, frozenOnly: false },
  { name: 'Intermarché',        min: 0.94, max: 0.98, frozenOnly: false },
  { name: 'Système U',          min: 0.95, max: 1.00, frozenOnly: false },
  { name: 'Auchan',             min: 0.99, max: 1.04, frozenOnly: false },
  { name: 'Lidl',               min: 0.84, max: 0.90, frozenOnly: false },
  { name: 'Aldi',               min: 0.82, max: 0.88, frozenOnly: false },
  { name: 'Casino Supermarché', min: 1.05, max: 1.12, frozenOnly: false },
  { name: 'Monoprix',           min: 1.12, max: 1.22, frozenOnly: false },
  { name: 'Franprix',           min: 1.10, max: 1.18, frozenOnly: false },
  { name: 'Netto',              min: 0.86, max: 0.92, frozenOnly: false },
  { name: 'Cora',               min: 0.98, max: 1.03, frozenOnly: false },
  { name: 'Match',              min: 0.96, max: 1.01, frozenOnly: false },
  { name: 'Picard',             min: 1.15, max: 1.30, frozenOnly: true  },
]

const POSTCODES = [
  '75001','75003','75005','75008','75011','75013','75015','75018','75020',
  '69001','69003','69006','13001','13005','13008','31000','31200','31400',
  '33000','33300','33800','44000','44200','59000','59300','59800',
  '67000','67200','76000','76600','35000','35200','34000','34080',
  '06000','06100','57000','57050','21000','37000','14000','30000',
  '42000','63000','29200','56000','68000','10000','80000','25000',
  '74000','73000',
]

interface Product {
  name: string
  normalised: string
  basePrice: number
  category: string
  isFrozen: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT CATALOG
// ─────────────────────────────────────────────────────────────────────────────
const PRODUCTS: Product[] = []

function add(name: string, basePrice: number, category: string, isFrozen = false) {
  PRODUCTS.push({ name, normalised: name.toLowerCase().trim(), basePrice, category, isFrozen })
}

// ── 1. PRODUITS LAITIERS ─────────────────────────────────────────────────────
const milkBrands: [string, number][] = [['Lactel', 0], ['Candia', 0.02], ['Bridel', 0.01], ['Bridelice', 0.03], ['MDD', -0.10]]
for (const [brand, delta] of milkBrands) {
  add(`${brand} lait demi-écrémé 1L`, 1.10 + delta, 'PRODUITS LAITIERS')
  add(`${brand} lait entier 1L`, 1.20 + delta, 'PRODUITS LAITIERS')
  add(`${brand} lait écrémé 1L`, 1.05 + delta, 'PRODUITS LAITIERS')
  add(`${brand} lait demi-écrémé 6x1L`, 6.20 + delta * 4, 'PRODUITS LAITIERS')
  add(`${brand} lait UHT demi-écrémé 1L`, 1.05 + delta, 'PRODUITS LAITIERS')
  add(`${brand} lait sans lactose 1L`, 1.80 + delta, 'PRODUITS LAITIERS')
}
const butterBrands: [string, number][] = [['Président', 0.20], ['Elle&Vire', 0.15], ['Bridel', 0.05], ['St Hubert', 0.25], ['Paysan Breton', 0.18], ['MDD', 0]]
for (const [brand, delta] of butterBrands) {
  add(`${brand} beurre doux 250g`, 2.20 + delta, 'PRODUITS LAITIERS')
  add(`${brand} beurre demi-sel 250g`, 2.30 + delta, 'PRODUITS LAITIERS')
  add(`${brand} beurre doux 500g`, 4.20 + delta * 2, 'PRODUITS LAITIERS')
  add(`${brand} beurre allégé 250g`, 2.50 + delta, 'PRODUITS LAITIERS')
}
const creamBrands: [string, number][] = [['Elle&Vire', 0.15], ['Président', 0.20], ['Candia', 0.05], ['Fleurette', 0.10], ['MDD', 0]]
for (const [brand, delta] of creamBrands) {
  add(`${brand} crème fraîche épaisse 20cl`, 1.40 + delta, 'PRODUITS LAITIERS')
  add(`${brand} crème fraîche liquide 25cl`, 1.50 + delta, 'PRODUITS LAITIERS')
  add(`${brand} crème fraîche légère 20cl`, 1.45 + delta, 'PRODUITS LAITIERS')
  add(`${brand} crème entière liquide 33cl`, 1.80 + delta, 'PRODUITS LAITIERS')
  add(`${brand} crème épaisse entière 40cl`, 2.20 + delta, 'PRODUITS LAITIERS')
}
const yoghurtBrands: [string, number][] = [['Danone', 0.30], ['Yoplait', 0.20], ['MDD', 0]]
for (const [brand, delta] of yoghurtBrands) {
  add(`${brand} yaourt nature x4`, 1.50 + delta, 'PRODUITS LAITIERS')
  add(`${brand} yaourt nature x8`, 2.80 + delta * 1.8, 'PRODUITS LAITIERS')
  add(`${brand} yaourt nature brassé x4`, 1.60 + delta, 'PRODUITS LAITIERS')
  add(`${brand} yaourt lait entier x4`, 1.70 + delta, 'PRODUITS LAITIERS')
  add(`${brand} yaourt nature x12`, 3.80 + delta * 2.5, 'PRODUITS LAITIERS')
}
const yFruits = ['fraise', 'pêche', 'framboise', 'abricot', 'cerise', 'citron', 'myrtille', 'coco-ananas', 'mangue', 'passion']
const yFruitBrands: [string, number][] = [['Danone', 0.30], ['Yoplait', 0.20], ['MDD', 0]]
for (const fruit of yFruits) {
  for (const [brand, delta] of yFruitBrands) {
    add(`${brand} yaourt ${fruit} x4`, 1.60 + delta, 'PRODUITS LAITIERS')
    add(`${brand} yaourt ${fruit} x8`, 2.90 + delta * 1.8, 'PRODUITS LAITIERS')
  }
}
for (const [flavor] of [['chocolat'], ['vanille'], ['caramel'], ['café']] as [string][]) {
  add(`Danette ${flavor} x4`, 1.90, 'PRODUITS LAITIERS')
  add(`Danette ${flavor} x8`, 3.40, 'PRODUITS LAITIERS')
  add(`MDD dessert lacté ${flavor} x4`, 1.40, 'PRODUITS LAITIERS')
  add(`Danone La Laitière ${flavor} x4`, 2.20, 'PRODUITS LAITIERS')
}
add('Activia nature x4', 2.20, 'PRODUITS LAITIERS')
add('Activia fruits rouges x4', 2.40, 'PRODUITS LAITIERS')
add('Activia 0% nature x4', 2.10, 'PRODUITS LAITIERS')
add('Petit Filou fraise x6', 2.30, 'PRODUITS LAITIERS')
add('Petit Filou nature x6', 2.10, 'PRODUITS LAITIERS')
add('Skyr nature Arla 500g', 2.90, 'PRODUITS LAITIERS')
add('Skyr fraise Arla 150g', 1.40, 'PRODUITS LAITIERS')
for (const [brand, bp] of [['Fage', 2.20], ['Oikos Danone', 2.00], ['MDD', 1.40]] as [string, number][]) {
  add(`${brand} yaourt grec nature x2`, bp, 'PRODUITS LAITIERS')
  add(`${brand} yaourt grec 0% x2`, bp - 0.10, 'PRODUITS LAITIERS')
  add(`${brand} yaourt grec miel x2`, bp + 0.20, 'PRODUITS LAITIERS')
  add(`${brand} yaourt grec fruits rouges x2`, bp + 0.30, 'PRODUITS LAITIERS')
}
for (const [brand, bp] of [['Danone', 1.80], ['Yoplait', 1.70], ['MDD', 1.20]] as [string, number][]) {
  add(`${brand} fromage blanc 0% 500g`, bp, 'PRODUITS LAITIERS')
  add(`${brand} fromage blanc 3.2% 500g`, bp + 0.10, 'PRODUITS LAITIERS')
  add(`${brand} fromage blanc nature 20cl`, bp - 0.50, 'PRODUITS LAITIERS')
  add(`${brand} fromage blanc fruits x4`, bp + 0.20, 'PRODUITS LAITIERS')
}
add('Gervais petits suisses x12', 2.10, 'PRODUITS LAITIERS')
add('MDD petits suisses x12', 1.60, 'PRODUITS LAITIERS')
// Fromages
add('Président camembert 250g', 1.99, 'PRODUITS LAITIERS')
add('MDD camembert 250g', 1.49, 'PRODUITS LAITIERS')
add('Camembert de Normandie AOP 250g', 3.20, 'PRODUITS LAITIERS')
add('Président brie 200g', 2.50, 'PRODUITS LAITIERS')
add('MDD brie 200g', 1.90, 'PRODUITS LAITIERS')
add('Brie de Meaux AOP 200g', 3.50, 'PRODUITS LAITIERS')
add('Entremont comté 200g', 3.50, 'PRODUITS LAITIERS')
add('MDD comté 200g', 2.90, 'PRODUITS LAITIERS')
add('Comté AOP affiné 12 mois 200g', 4.80, 'PRODUITS LAITIERS')
add('Société roquefort 100g', 3.20, 'PRODUITS LAITIERS')
add('MDD roquefort 100g', 2.60, 'PRODUITS LAITIERS')
add('MDD chèvre bûche 200g', 2.10, 'PRODUITS LAITIERS')
add('Président chèvre bûche 200g', 2.80, 'PRODUITS LAITIERS')
add('Chèvre frais 150g', 1.90, 'PRODUITS LAITIERS')
add('Galbani mozzarella 125g', 1.70, 'PRODUITS LAITIERS')
add('MDD mozzarella 125g', 1.10, 'PRODUITS LAITIERS')
add('Galbani mozzarella di bufala 125g', 2.50, 'PRODUITS LAITIERS')
add('Galbani mozzarella 3x125g', 3.90, 'PRODUITS LAITIERS')
add('Babybel original x6', 3.80, 'PRODUITS LAITIERS')
add('Babybel light x6', 3.90, 'PRODUITS LAITIERS')
add('Babybel original x12', 6.90, 'PRODUITS LAITIERS')
add('Kiri fromage x8 portions', 2.40, 'PRODUITS LAITIERS')
add('La Vache qui rit x8', 1.80, 'PRODUITS LAITIERS')
add('La Vache qui rit x16', 3.20, 'PRODUITS LAITIERS')
add('Boursin ail et fines herbes 150g', 3.50, 'PRODUITS LAITIERS')
add('Boursin poivre 150g', 3.50, 'PRODUITS LAITIERS')
add('Boursin échalote ciboulette 150g', 3.60, 'PRODUITS LAITIERS')
add('Philadelphia nature 150g', 2.20, 'PRODUITS LAITIERS')
add('Philadelphia ail et fines herbes 150g', 2.30, 'PRODUITS LAITIERS')
add('Philadelphia light 150g', 2.10, 'PRODUITS LAITIERS')
add('Saint Môret nature 150g', 2.10, 'PRODUITS LAITIERS')
add('MDD fromage à tartiner nature 150g', 1.30, 'PRODUITS LAITIERS')
add('Mascarpone 250g', 1.80, 'PRODUITS LAITIERS')
add('MDD mascarpone 250g', 1.40, 'PRODUITS LAITIERS')
add('Ricotta 250g', 1.70, 'PRODUITS LAITIERS')
add('MDD ricotta 250g', 1.30, 'PRODUITS LAITIERS')
add('Parmesan râpé 100g', 2.40, 'PRODUITS LAITIERS')
add('Grana Padano râpé 100g', 2.20, 'PRODUITS LAITIERS')
add('Entremont emmental râpé 200g', 2.10, 'PRODUITS LAITIERS')
add('MDD emmental râpé 200g', 1.60, 'PRODUITS LAITIERS')
add('MDD emmental râpé 400g', 2.90, 'PRODUITS LAITIERS')
add('Gruyère râpé 200g', 2.30, 'PRODUITS LAITIERS')
add('MDD mozzarella râpée 200g', 1.90, 'PRODUITS LAITIERS')
add('Raclette tranchée 400g', 3.90, 'PRODUITS LAITIERS')
add('Reblochon fermier 450g', 4.20, 'PRODUITS LAITIERS')
add('MDD reblochon 450g', 3.40, 'PRODUITS LAITIERS')
add('Munster 300g', 2.90, 'PRODUITS LAITIERS')
add('Edam tranché 150g', 1.80, 'PRODUITS LAITIERS')
add('Gouda tranché 150g', 1.90, 'PRODUITS LAITIERS')
add('Feta 200g', 2.50, 'PRODUITS LAITIERS')
add('Feta AOP 150g', 2.90, 'PRODUITS LAITIERS')
add('Halloumi 250g', 3.20, 'PRODUITS LAITIERS')
add('Beaufort 200g', 4.50, 'PRODUITS LAITIERS')
add('Epoisses 250g', 4.90, 'PRODUITS LAITIERS')
add('Maroilles 200g', 3.80, 'PRODUITS LAITIERS')
add('Cantal entre-deux 200g', 3.20, 'PRODUITS LAITIERS')
add('Tomme de Savoie 200g', 3.50, 'PRODUITS LAITIERS')
add('Ossau-Iraty 200g', 4.20, 'PRODUITS LAITIERS')
add('Lait de coco 400ml', 1.80, 'PRODUITS LAITIERS')
add('MDD lait de coco 400ml', 1.30, 'PRODUITS LAITIERS')
add('Crème de coco 200ml', 1.60, 'PRODUITS LAITIERS')

// ── 2. LAITS VÉGÉTAUX ────────────────────────────────────────────────────────
const plantMilkBrands: [string, number][] = [['Alpro', 0.60], ['Bjorg', 0.40], ['Oatly', 0.70], ['Califia Farms', 0.80], ['MDD', 0]]
const plantMilkTypes = ['soja nature', 'soja vanille', 'amande nature', 'avoine', 'riz', 'noisette', 'coco', 'avoine barista']
for (const [brand, delta] of plantMilkBrands) {
  for (const type of plantMilkTypes) {
    add(`${brand} boisson ${type} 1L`, 1.80 + delta, 'LAITS VÉGÉTAUX')
  }
}
add('Alpro yaourt soja nature x4', 2.40, 'LAITS VÉGÉTAUX')
add('Alpro yaourt soja fruits rouges x4', 2.60, 'LAITS VÉGÉTAUX')
add('MDD yaourt soja nature x4', 1.80, 'LAITS VÉGÉTAUX')
add('Oatly crème avoine 25cl', 1.90, 'LAITS VÉGÉTAUX')
add('Alpro cuisine soja 20cl', 1.50, 'LAITS VÉGÉTAUX')

// ── 3. BOULANGERIE & VIENNOISERIES ──────────────────────────────────────────
add('Baguette tradition', 1.30, 'BOULANGERIE')
add('Baguette classique', 0.99, 'BOULANGERIE')
add('Baguette rustique', 1.15, 'BOULANGERIE')
add('Pain de campagne 400g', 2.10, 'BOULANGERIE')
add('Pain aux céréales 500g', 2.30, 'BOULANGERIE')
add('Pain complet 500g', 2.20, 'BOULANGERIE')
add('Pain au seigle 500g', 2.40, 'BOULANGERIE')
add('Pain de seigle tranché 500g', 2.50, 'BOULANGERIE')
add('Pain aux graines 500g', 2.50, 'BOULANGERIE')
add('Pain de mie brioche 500g', 2.60, 'BOULANGERIE')
for (const [brand, bp] of [['Harrys', 2.10], ['Jacquet', 1.99], ['Pasquier', 2.05], ['La Boulangère', 2.10], ['MDD', 1.49]] as [string, number][]) {
  add(`${brand} pain de mie nature 500g`, bp, 'BOULANGERIE')
  add(`${brand} pain de mie complet 500g`, bp + 0.15, 'BOULANGERIE')
  add(`${brand} pain de mie sans croûte 500g`, bp + 0.20, 'BOULANGERIE')
  add(`${brand} pain de mie céréales 500g`, bp + 0.25, 'BOULANGERIE')
}
for (const [brand, bp] of [['Pasquier', 2.40], ['La Boulangère', 2.30], ['MDD', 1.70]] as [string, number][]) {
  add(`${brand} brioche tranchée 400g`, bp, 'BOULANGERIE')
  add(`${brand} brioche tressée 400g`, bp + 0.20, 'BOULANGERIE')
  add(`${brand} brioches individuelles x6`, bp + 0.10, 'BOULANGERIE')
  add(`${brand} brioche ronde 400g`, bp + 0.15, 'BOULANGERIE')
}
for (const [brand, bp] of [['Pasquier', 2.90], ['La Boulangère', 2.80], ['MDD', 2.10]] as [string, number][]) {
  add(`${brand} croissants x6`, bp, 'BOULANGERIE')
  add(`${brand} pains au chocolat x6`, bp + 0.20, 'BOULANGERIE')
  add(`${brand} pains aux raisins x4`, bp, 'BOULANGERIE')
  add(`${brand} croissants pur beurre x4`, bp + 0.30, 'BOULANGERIE')
}
add('Pain hamburger nature x4', 1.50, 'BOULANGERIE')
add('Pain hamburger brioché x4', 1.90, 'BOULANGERIE')
add('Pain hamburger sésame x4', 1.80, 'BOULANGERIE')
add('Pain hot-dog x6', 1.40, 'BOULANGERIE')
add('Wraps nature x6', 1.90, 'BOULANGERIE')
add('Wraps complets x6', 2.00, 'BOULANGERIE')
add('Wraps blé x8', 2.10, 'BOULANGERIE')
add('Tortillas blé x8', 2.10, 'BOULANGERIE')
add('Galettes de blé x8', 2.00, 'BOULANGERIE')
add('Naan x4', 2.20, 'BOULANGERIE')
add('Baguette viennoise', 1.10, 'BOULANGERIE')
add('Panettone 750g', 4.90, 'BOULANGERIE')
add('Crêpes nature x8', 2.40, 'BOULANGERIE')
add('Pancakes x6', 2.30, 'BOULANGERIE')
add('Blinis x16', 2.80, 'BOULANGERIE')
add('Biscottes nature x36', 1.90, 'BOULANGERIE')
add('Biscottes complètes x30', 2.00, 'BOULANGERIE')
add('Pain suédois Wasa x12', 2.20, 'BOULANGERIE')
add('Pain grillé x16', 1.80, 'BOULANGERIE')
add('Ficelle 250g', 0.99, 'BOULANGERIE')
add('Épi de pain', 1.20, 'BOULANGERIE')

// ── 4. OEUFS ─────────────────────────────────────────────────────────────────
const eggTypes: [string, number][] = [['plein air', 0.40], ['bio', 0.80], ['Label Rouge', 0.60], ['cages enrichies', 0], ['MDD', -0.10]]
for (const [type, delta] of eggTypes) {
  add(`Oeufs ${type} x6`, 1.90 + delta, 'OEUFS')
  add(`Oeufs ${type} x10`, 2.90 + delta * 1.5, 'OEUFS')
  add(`Oeufs ${type} x12`, 3.20 + delta * 2, 'OEUFS')
}
add('Oeufs de caille x12', 2.50, 'OEUFS')
add('Oeufs durs x6', 2.20, 'OEUFS')
add('Oeufs extra-frais plein air x6', 2.50, 'OEUFS')

// ── 5. PÂTES, RIZ & FÉCULENTS ────────────────────────────────────────────────
const pastaShapes = ['spaghetti', 'penne', 'fusilli', 'tagliatelles', 'farfalle', 'coquillettes', 'macaroni', 'rigatoni', 'torsettes', 'linguine', 'pappardelle', 'conchiglie', 'vermicelle', 'orecchiette']
const pastaBrands: [string, number][] = [['Barilla', 1.40], ['Panzani', 1.30], ['MDD', 0.85]]
for (const shape of pastaShapes) {
  for (const [brand, bp] of pastaBrands) {
    add(`${brand} ${shape} 500g`, bp, 'PÂTES RIZ FÉCULENTS')
    add(`${brand} ${shape} 1kg`, bp * 1.7, 'PÂTES RIZ FÉCULENTS')
  }
}
add('Barilla lasagnes 500g', 1.90, 'PÂTES RIZ FÉCULENTS')
add('Panzani lasagnes 500g', 1.70, 'PÂTES RIZ FÉCULENTS')
add('MDD lasagnes 500g', 1.10, 'PÂTES RIZ FÉCULENTS')
add('Lustucru tortellini ricotta épinards 250g', 2.80, 'PÂTES RIZ FÉCULENTS')
add('Lustucru ravioli bolognaise 250g', 2.80, 'PÂTES RIZ FÉCULENTS')
add('Lustucru gnocchi 500g', 1.90, 'PÂTES RIZ FÉCULENTS')
add('MDD gnocchi 500g', 1.30, 'PÂTES RIZ FÉCULENTS')
add('Barilla fettuccine 500g', 1.50, 'PÂTES RIZ FÉCULENTS')
add('Panzani spaghetti complets 500g', 1.40, 'PÂTES RIZ FÉCULENTS')
add('Barilla pâtes sans gluten fusilli 400g', 2.40, 'PÂTES RIZ FÉCULENTS')
const riceTypes: [string, number][] = [['basmati', 2.20], ['long grain', 1.60], ['thaï jasmin', 2.40], ['complet', 2.00], ['arborio risotto', 2.80], ['rond dessert', 1.80]]
const riceBrands: [string, number][] = [["Uncle Ben's", 0.40], ['Taureau Ailé', 0.30], ['MDD', 0]]
for (const [type, bp] of riceTypes) {
  for (const [brand, delta] of riceBrands) {
    add(`${brand} riz ${type} 500g`, bp + delta, 'PÂTES RIZ FÉCULENTS')
    add(`${brand} riz ${type} 1kg`, (bp + delta) * 1.7, 'PÂTES RIZ FÉCULENTS')
  }
}
add("Uncle Ben's riz express micro-ondes x2", 2.50, 'PÂTES RIZ FÉCULENTS')
add('MDD semoule fine 500g', 0.99, 'PÂTES RIZ FÉCULENTS')
add('MDD couscous moyen 500g', 1.10, 'PÂTES RIZ FÉCULENTS')
add('MDD couscous grain fin 500g', 1.05, 'PÂTES RIZ FÉCULENTS')
add('MDD couscous gros grain 500g', 1.05, 'PÂTES RIZ FÉCULENTS')
add('Tipiak quinoa 400g', 3.20, 'PÂTES RIZ FÉCULENTS')
add('MDD quinoa 400g', 2.40, 'PÂTES RIZ FÉCULENTS')
add('MDD boulgour 500g', 1.60, 'PÂTES RIZ FÉCULENTS')
add('MDD épeautre 400g', 2.20, 'PÂTES RIZ FÉCULENTS')
add('MDD lentilles vertes 500g', 1.50, 'PÂTES RIZ FÉCULENTS')
add('MDD lentilles corail 500g', 1.60, 'PÂTES RIZ FÉCULENTS')
add('MDD pois chiches secs 500g', 1.40, 'PÂTES RIZ FÉCULENTS')
add('MDD haricots secs blancs 500g', 1.30, 'PÂTES RIZ FÉCULENTS')
add('MDD haricots secs rouges 500g', 1.35, 'PÂTES RIZ FÉCULENTS')
add('MDD flageolets secs 500g', 1.40, 'PÂTES RIZ FÉCULENTS')
add('MDD polenta 500g', 1.20, 'PÂTES RIZ FÉCULENTS')
add('Vico nouilles chinoises 250g', 1.50, 'PÂTES RIZ FÉCULENTS')
add('MDD nouilles de riz 250g', 1.80, 'PÂTES RIZ FÉCULENTS')
add('Lustucru purée en flocons 500g', 1.90, 'PÂTES RIZ FÉCULENTS')
add('MDD purée en flocons 500g', 1.30, 'PÂTES RIZ FÉCULENTS')
add('Tipiak taboulé 400g', 2.80, 'PÂTES RIZ FÉCULENTS')
add('MDD taboulé 400g', 1.90, 'PÂTES RIZ FÉCULENTS')

// ── 6. CONSERVES & BOCAUX ────────────────────────────────────────────────────
const tomatoBrands: [string, number][] = [['Mutti', 0.40], ['Heinz', 0.30], ["D'Aucy", 0.15], ['MDD', 0]]
for (const [type, bp] of [['tomates pelées', 0.95], ['tomates concassées', 1.00], ['pulpe de tomate', 0.90], ['tomates cerises', 1.30]] as [string, number][]) {
  for (const [brand, delta] of tomatoBrands) {
    add(`${brand} ${type} 400g`, bp + delta, 'CONSERVES')
  }
}
add('Mutti concentré de tomate 200g', 1.30, 'CONSERVES')
add('MDD concentré de tomate 140g', 0.65, 'CONSERVES')
add('Mutti coulis de tomate 500g', 1.80, 'CONSERVES')
add('MDD coulis de tomate 500g', 0.99, 'CONSERVES')
const vegBrands: [string, number][] = [['Bonduelle', 0.30], ['Cassegrain', 0.25], ["D'Aucy", 0.15], ['MDD', 0]]
for (const [veg, bp] of [['petits pois', 0.90], ['petits pois carottes', 0.95], ['maïs', 0.85], ['haricots verts', 1.10], ['haricots blancs', 0.95], ['haricots rouges', 0.95], ['flageolets', 1.00], ['champignons émincés', 1.20], ['artichauts', 1.80], ['cœurs de palmier', 2.20], ['asperges', 2.50]] as [string, number][]) {
  for (const [brand, delta] of vegBrands) {
    add(`${brand} ${veg} 400g`, bp + delta, 'CONSERVES')
  }
}
add('Bonduelle lentilles cuisinées 400g', 1.60, 'CONSERVES')
add('MDD lentilles cuisinées 400g', 1.20, 'CONSERVES')
add('Bonduelle pois chiches 400g', 1.50, 'CONSERVES')
add('MDD pois chiches 265g', 0.95, 'CONSERVES')
add('MDD maïs doux 3x150g', 1.90, 'CONSERVES')
for (const [type, bp] of [['olives vertes', 1.60], ['olives noires', 1.50], ['cornichons fins', 2.00], ['câpres', 1.80], ['jalapeños', 1.90]] as [string, number][]) {
  for (const [brand, delta] of [['Maille', 0.40], ['Amora', 0.30], ['MDD', 0]] as [string, number][]) {
    add(`${brand} ${type} 200g`, bp + delta, 'CONSERVES')
  }
}
const tunaBrands: [string, number][] = [['Petit Navire', 0.50], ['Saupiquet', 0.40], ['MDD', 0]]
for (const [type, bp] of [['thon naturel', 1.60], ['thon huile olive', 1.90], ['thon albacore', 2.20]] as [string, number][]) {
  for (const [brand, delta] of tunaBrands) {
    add(`${brand} ${type} 140g`, bp + delta, 'CONSERVES')
    add(`${brand} ${type} 2x140g`, (bp + delta) * 1.8, 'CONSERVES')
  }
}
add('Saupiquet sardines huile 120g', 1.20, 'CONSERVES')
add('Saupiquet sardines tomate 120g', 1.20, 'CONSERVES')
add('MDD sardines huile 125g', 0.90, 'CONSERVES')
add('Petit Navire maquereau moutarde 120g', 1.50, 'CONSERVES')
add('MDD maquereau citron 120g', 1.20, 'CONSERVES')
add('MDD saumon rose 200g', 2.90, 'CONSERVES')
add('William Saurin cassoulet 840g', 2.90, 'CONSERVES')
add('William Saurin cassoulet 400g', 1.70, 'CONSERVES')
add('MDD cassoulet 840g', 2.20, 'CONSERVES')
add('Panzani ravioli tomate 800g', 2.30, 'CONSERVES')
add('MDD ravioli tomate 800g', 1.80, 'CONSERVES')
add('William Saurin chili con carne 400g', 1.90, 'CONSERVES')
add('MDD chili con carne 400g', 1.50, 'CONSERVES')
add('Raynal couscous royal 400g', 2.80, 'CONSERVES')
add('MDD ratatouille 375g', 1.40, 'CONSERVES')
add('Bonduelle ratatouille 375g', 1.90, 'CONSERVES')
add('MDD hachis parmentier 400g', 2.10, 'CONSERVES')
add('Knorr soupe de légumes 1L', 2.50, 'CONSERVES')
add('Liebig soupe de tomate 1L', 2.40, 'CONSERVES')
add('Liebig velouté champignons 1L', 2.50, 'CONSERVES')
add('Liebig velouté potiron 1L', 2.60, 'CONSERVES')
add('MDD soupe de légumes 1L', 1.80, 'CONSERVES')
add('MDD velouté de champignons 1L', 1.90, 'CONSERVES')
add('Crème de marrons Clément Faugier 500g', 3.20, 'CONSERVES')
add('MDD crème de marrons 500g', 2.40, 'CONSERVES')

// ── 7. HUILES, VINAIGRES & ASSAISONNEMENTS ──────────────────────────────────
const oilBrands: [string, number][] = [['Puget', 0.40], ['Lesieur', 0.30], ['Carapelli', 0.35], ['MDD', 0]]
for (const [type, bp] of [["huile d'olive extra vierge 75cl", 6.50], ["huile d'olive extra vierge 1L", 8.50], ['huile de tournesol 1L', 2.20], ['huile de colza 1L', 2.10], ["huile d'arachide 1L", 2.90], ['huile de pépin de raisin 500ml', 3.50], ['huile de coco désodorisée 200ml', 4.90], ['huile de sésame 250ml', 3.80]] as [string, number][]) {
  for (const [brand, delta] of oilBrands) {
    add(`${brand} ${type}`, bp + delta, 'HUILES VINAIGRES')
  }
}
for (const [type, bp] of [['vinaigre de vin rouge 75cl', 1.20], ['vinaigre balsamique 250ml', 2.40], ['vinaigre balsamique 500ml', 3.80], ['vinaigre de cidre 75cl', 1.40], ['vinaigre blanc 1L', 0.90], ['vinaigre de Xérès 250ml', 2.80]] as [string, number][]) {
  for (const [brand, delta] of [['Maille', 0.50], ['Amora', 0.30], ['MDD', 0]] as [string, number][]) {
    add(`${brand} ${type}`, bp + delta, 'HUILES VINAIGRES')
  }
}
add('Lesieur vinaigrette huile olive 50cl', 2.80, 'HUILES VINAIGRES')
add('Maille vinaigrette moutarde 50cl', 2.60, 'HUILES VINAIGRES')
add('MDD vinaigrette classique 500ml', 1.50, 'HUILES VINAIGRES')
add('Kikkoman sauce soja 250ml', 2.30, 'HUILES VINAIGRES')
add('MDD sauce soja 250ml', 1.60, 'HUILES VINAIGRES')
add('Barilla pesto verde 190g', 2.90, 'HUILES VINAIGRES')
add('Sacla pesto verde 190g', 3.20, 'HUILES VINAIGRES')
add('MDD pesto verde 190g', 1.90, 'HUILES VINAIGRES')
add('Barilla pesto rosso 190g', 3.10, 'HUILES VINAIGRES')
add('MDD pesto rosso 190g', 2.10, 'HUILES VINAIGRES')
add('Crème de vinaigre balsamique 250ml', 3.20, 'HUILES VINAIGRES')
add('Lesieur huile de noix 250ml', 4.50, 'HUILES VINAIGRES')

// ── 8. CONDIMENTS & SAUCES ───────────────────────────────────────────────────
for (const [type, bp] of [['Dijon nature', 1.60], ['à l\'ancienne', 1.80], ['au miel', 1.90], ['forte', 1.60], ['herbes de Provence', 1.80], ['basilic', 1.80], ['estragon', 1.80]] as [string, number][]) {
  for (const [brand, delta] of [['Maille', 0.60], ['Amora', 0.40], ['MDD', 0]] as [string, number][]) {
    add(`${brand} moutarde ${type} 370g`, bp + delta, 'CONDIMENTS')
  }
}
for (const [size, bp] of [['340g', 1.60], ['700g', 2.90]] as [string, number][]) {
  for (const [brand, delta] of [['Heinz', 0.50], ['Amora', 0.30], ['MDD', 0]] as [string, number][]) {
    add(`${brand} ketchup ${size}`, bp + delta, 'CONDIMENTS')
  }
}
add('Heinz ketchup piquant 570g', 3.40, 'CONDIMENTS')
for (const [size, bp] of [['235g', 1.80], ['470g', 3.00]] as [string, number][]) {
  for (const [brand, delta] of [['Amora', 0.40], ['Bénédicta', 0.30], ['Hellmann\'s', 0.50], ['MDD', 0]] as [string, number][]) {
    add(`${brand} mayonnaise ${size}`, bp + delta, 'CONDIMENTS')
  }
}
for (const [type, bp] of [['sauce barbecue 350g', 2.10], ['sauce algérienne 350g', 2.00], ['sauce samouraï 350g', 2.00], ['sauce harissa 150g', 1.40], ['sauce piment doux 150g', 1.50], ['sauce béarnaise 250ml', 2.30], ['sauce bourguignonne 250ml', 2.20], ['sauce curry 350g', 2.10], ['sauce satay 250ml', 2.80], ['sauce teriyaki 250ml', 2.60], ['sauce aigre-douce 220ml', 1.90], ['sauce oyster 150ml', 1.80]] as [string, number][]) {
  add(`Amora ${type}`, bp + 0.30, 'CONDIMENTS')
  add(`MDD ${type}`, bp, 'CONDIMENTS')
}
add('Tabasco rouge 60ml', 2.90, 'CONDIMENTS')
add('Sriracha 435ml', 3.50, 'CONDIMENTS')
add('Worcestershire sauce 150ml', 2.20, 'CONDIMENTS')
add('Nuoc-mâm 500ml', 2.50, 'CONDIMENTS')
add('Pâte de curry rouge 50g', 2.20, 'CONDIMENTS')
add('Pâte de curry vert 50g', 2.20, 'CONDIMENTS')
add('Miso blanc 400g', 3.50, 'CONDIMENTS')
add('Tahini 250g', 3.80, 'CONDIMENTS')
add('Hummus nature 200g', 2.20, 'CONDIMENTS')
add('Guacamole 200g', 2.80, 'CONDIMENTS')
add('Tapenade noire 180g', 3.20, 'CONDIMENTS')

// ── 9. ÉPICES & HERBES SÉCHÉES ───────────────────────────────────────────────
const spices = ['cumin moulu', 'curcuma', 'paprika doux', 'paprika fumé', 'curry', 'cannelle moulue', 'gingembre moulu', 'coriandre moulue', 'noix de muscade', 'clous de girofle', 'poivre noir moulu', 'piment de Cayenne', 'herbes de Provence', 'bouquet garni x6', 'thym séché', 'origan séché', 'basilic séché', 'romarin séché', 'persil séché', 'ciboulette séchée', 'ail en poudre', 'oignon en poudre', 'mélange 5 épices', 'ras-el-hanout', 'épices mexicaines', 'épices couscous', 'sel fin 1kg', 'fleur de sel 250g', 'sel de Guérande 500g', 'sucre vanillé x8']
for (const spice of spices) {
  add(`Ducros ${spice}`, 1.80, 'ÉPICES HERBES')
  add(`MDD ${spice}`, 1.10, 'ÉPICES HERBES')
}
add('Ducros sel et poivre moulin 75g', 3.50, 'ÉPICES HERBES')
add('Moulin poivre Duc de Montfort', 3.80, 'ÉPICES HERBES')

// ── 10. VIANDES & CHARCUTERIE ────────────────────────────────────────────────
add('Poulet entier 1.2kg', 6.00, 'VIANDES CHARCUTERIE')
add('Poulet fermier 1.5kg', 9.50, 'VIANDES CHARCUTERIE')
add('Poulet rôti Label Rouge 1.3kg', 10.90, 'VIANDES CHARCUTERIE')
for (const [brand, delta] of [['Père Dodu', 0.50], ['Le Gaulois', 0.40], ['MDD', 0]] as [string, number][]) {
  add(`${brand} escalopes de poulet x2`, 4.50 + delta, 'VIANDES CHARCUTERIE')
  add(`${brand} cuisses de poulet x4`, 4.90 + delta, 'VIANDES CHARCUTERIE')
  add(`${brand} ailes de poulet 500g`, 3.80 + delta, 'VIANDES CHARCUTERIE')
  add(`${brand} blanc de poulet x2`, 5.20 + delta, 'VIANDES CHARCUTERIE')
  add(`${brand} nuggets de poulet 400g`, 3.90 + delta, 'VIANDES CHARCUTERIE')
  add(`${brand} cordons bleus x4`, 4.50 + delta, 'VIANDES CHARCUTERIE')
  add(`${brand} filets de poulet marinés x2`, 4.80 + delta, 'VIANDES CHARCUTERIE')
}
add('Dinde escalopes x2', 5.20, 'VIANDES CHARCUTERIE')
add('Dinde hachée 400g', 4.20, 'VIANDES CHARCUTERIE')
add('Canard magret x2', 8.90, 'VIANDES CHARCUTERIE')
add('Canard confit x2 cuisses', 7.90, 'VIANDES CHARCUTERIE')
add('Steak haché 5% MG x2 150g', 3.20, 'VIANDES CHARCUTERIE')
add('Steak haché 15% MG x2 150g', 2.80, 'VIANDES CHARCUTERIE')
add('Steak haché 5% MG x4', 5.90, 'VIANDES CHARCUTERIE')
add('Bifteck x2 300g', 5.50, 'VIANDES CHARCUTERIE')
add('Boeuf bourguignon à mijoter 400g', 5.90, 'VIANDES CHARCUTERIE')
add('Rôti de boeuf 800g', 10.90, 'VIANDES CHARCUTERIE')
add('Entrecôte x2 400g', 9.90, 'VIANDES CHARCUTERIE')
add('Boeuf haché fraîcheur 500g', 4.20, 'VIANDES CHARCUTERIE')
add('Veau escalopes x2', 7.90, 'VIANDES CHARCUTERIE')
add('Agneau gigot 1.2kg', 16.90, 'VIANDES CHARCUTERIE')
add('Côtelettes d\'agneau x2', 6.90, 'VIANDES CHARCUTERIE')
add('MDD côtes de porc x2', 4.50, 'VIANDES CHARCUTERIE')
add('MDD rôti de porc 800g', 7.50, 'VIANDES CHARCUTERIE')
add('MDD filet mignon de porc 500g', 6.90, 'VIANDES CHARCUTERIE')
add('MDD côtes de porc échine x2', 4.20, 'VIANDES CHARCUTERIE')
for (const [brand, delta] of [['Fleury Michon', 0.50], ['Herta', 0.40], ['Madrange', 0.30], ['MDD', 0]] as [string, number][]) {
  add(`${brand} jambon blanc x4 tranches`, 2.40 + delta, 'VIANDES CHARCUTERIE')
  add(`${brand} jambon blanc x6 tranches`, 3.40 + delta, 'VIANDES CHARCUTERIE')
  add(`${brand} jambon blanc x8 tranches`, 4.20 + delta, 'VIANDES CHARCUTERIE')
  add(`${brand} jambon blanc supérieur x4`, 2.80 + delta, 'VIANDES CHARCUTERIE')
  add(`${brand} jambon blanc fumé x4`, 2.90 + delta, 'VIANDES CHARCUTERIE')
}
for (const [brand, delta] of [['Cochonou', 0.40], ['Justin Bridou', 0.30], ['MDD', 0]] as [string, number][]) {
  add(`${brand} saucisson sec 250g`, 3.20 + delta, 'VIANDES CHARCUTERIE')
  add(`${brand} jambon sec x4 tranches`, 2.60 + delta, 'VIANDES CHARCUTERIE')
  add(`${brand} chorizo fort 250g`, 2.90 + delta, 'VIANDES CHARCUTERIE')
  add(`${brand} chorizo doux 250g`, 2.90 + delta, 'VIANDES CHARCUTERIE')
  add(`${brand} rosette 150g`, 2.80 + delta, 'VIANDES CHARCUTERIE')
}
for (const [brand, delta] of [['Herta', 0.30], ['MDD', 0]] as [string, number][]) {
  add(`${brand} lardons fumés 200g`, 2.00 + delta, 'VIANDES CHARCUTERIE')
  add(`${brand} lardons nature 200g`, 2.00 + delta, 'VIANDES CHARCUTERIE')
  add(`${brand} lardons allumettes 150g`, 1.60 + delta, 'VIANDES CHARCUTERIE')
  add(`${brand} saucisses de Toulouse x4`, 2.80 + delta, 'VIANDES CHARCUTERIE')
  add(`${brand} merguez x6`, 3.20 + delta, 'VIANDES CHARCUTERIE')
  add(`${brand} chipolatas x6`, 2.90 + delta, 'VIANDES CHARCUTERIE')
  add(`${brand} saucisses cocktail x20`, 2.80 + delta, 'VIANDES CHARCUTERIE')
}
add('Herta knacki x6', 2.30, 'VIANDES CHARCUTERIE')
add('Herta knacki x10', 3.50, 'VIANDES CHARCUTERIE')
add('MDD saucisses de Strasbourg x4', 2.20, 'VIANDES CHARCUTERIE')
add('Rillettes du Mans 350g', 2.90, 'VIANDES CHARCUTERIE')
add('Pâté de campagne 200g', 1.80, 'VIANDES CHARCUTERIE')
add('Herta pâté de foie 200g', 1.90, 'VIANDES CHARCUTERIE')
add('Mousse de canard 200g', 3.20, 'VIANDES CHARCUTERIE')
add('Foie gras de canard 130g', 9.90, 'VIANDES CHARCUTERIE')
add('Boudin blanc x2', 3.20, 'VIANDES CHARCUTERIE')
add('Boudin noir x2', 2.90, 'VIANDES CHARCUTERIE')
add('Andouillette 220g', 3.50, 'VIANDES CHARCUTERIE')
add('MDD escalope panée x2', 3.90, 'VIANDES CHARCUTERIE')
add('Fleury Michon escalope panée x2', 4.50, 'VIANDES CHARCUTERIE')
add('Jambon de Parme 3 tranches 75g', 3.50, 'VIANDES CHARCUTERIE')
add('Pancetta fumée 100g', 2.80, 'VIANDES CHARCUTERIE')
add('MDD pastrami 100g', 2.50, 'VIANDES CHARCUTERIE')

// ── 11. POISSONS & FRUITS DE MER ─────────────────────────────────────────────
for (const [brand, delta] of [['Labeyrie', 0.80], ['Fumaison Atlantique', 0.40], ['MDD', 0]] as [string, number][]) {
  add(`${brand} saumon fumé x4 tranches`, 4.80 + delta, 'POISSONS')
  add(`${brand} saumon fumé x6 tranches`, 6.90 + delta, 'POISSONS')
  add(`${brand} saumon fumé 100g`, 3.90 + delta, 'POISSONS')
}
add('Labeyrie truite fumée x4', 3.90, 'POISSONS')
add('MDD truite fumée x4', 3.20, 'POISSONS')
add('Labeyrie saumon fumé Écosse 200g', 9.90, 'POISSONS')
for (const [brand, delta] of [['Fleury Michon', 0.40], ['Coraya', 0.20], ['MDD', 0]] as [string, number][]) {
  add(`${brand} surimi x12`, 2.20 + delta, 'POISSONS')
  add(`${brand} surimi x24`, 3.80 + delta, 'POISSONS')
  add(`${brand} surimi en bâtonnets x8`, 2.00 + delta, 'POISSONS')
  add(`${brand} crevettes cuites 150g`, 3.50 + delta, 'POISSONS')
}
add('MDD crevettes cuites 200g', 4.20, 'POISSONS')
add('MDD crevettes crues décongelées 300g', 5.50, 'POISSONS')
add('MDD crevettes roses cuites 400g', 6.90, 'POISSONS')
add('Labeyrie tarama 200g', 3.80, 'POISSONS')
add('MDD tarama 200g', 2.90, 'POISSONS')
add('MDD dos de cabillaud x2 300g', 5.90, 'POISSONS')
add('MDD filets de sole x2', 4.20, 'POISSONS')
add('MDD saumon pavé x2 280g', 6.90, 'POISSONS')
add('MDD cabillaud surgelé 400g', 4.50, 'POISSONS', true)
add('Findus colin filets x4 surgelé', 4.90, 'POISSONS', true)
add('Igloo bâtonnets de poisson x10', 3.20, 'POISSONS', true)
add('MDD bâtonnets de poisson x10 surgelé', 2.80, 'POISSONS', true)
add('MDD moules marinières 1kg surgelées', 3.90, 'POISSONS', true)
add('MDD coquilles Saint-Jacques x4', 5.90, 'POISSONS')
add('MDD langoustines x8 surgelées', 7.90, 'POISSONS', true)
add('MDD anchois 46g', 1.90, 'POISSONS')
add('MDD hareng fumé 400g', 3.20, 'POISSONS')
add('Fleury Michon tartare de saumon 120g', 3.80, 'POISSONS')
add('MDD brandade de morue 400g', 3.50, 'POISSONS')
add('MDD aiglefin surgelé x2', 4.20, 'POISSONS', true)
add('MDD lieu noir surgelé 400g', 3.90, 'POISSONS', true)
add('MDD dorade entière 300g', 4.50, 'POISSONS')
add('MDD bar entier 300g', 5.20, 'POISSONS')
add('MDD gambas surgelées 300g', 7.90, 'POISSONS', true)

// ── 12. FRUITS ────────────────────────────────────────────────────────────────
const freshFruits: [string, number][] = [
  ['bananes 1kg', 1.60], ['pommes Golden 1kg', 2.20], ['pommes Gala 1kg', 2.30],
  ['pommes Granny Smith 1kg', 2.40], ['pommes Fuji 1kg', 2.50], ['poires Williams 1kg', 2.80],
  ['poires Conférence 1kg', 2.70], ['oranges 1kg', 2.10], ['oranges 2kg', 3.80],
  ['clémentines 1kg', 3.20], ['mandarines 1kg', 2.90], ['citrons filet 500g', 1.80],
  ['citrons verts x5', 1.20], ['pamplemousse x2', 1.90], ['kiwis x6', 2.40],
  ['kiwis x9', 3.20], ['mangue pièce', 2.20], ['ananas pièce', 2.50],
  ['melon pièce', 2.80], ['pastèque pièce', 3.90], ['pêches 1kg', 3.50],
  ['nectarines 1kg', 3.50], ['abricots 1kg', 3.20], ['prunes 500g', 2.80],
  ['raisin blanc 500g', 2.40], ['raisin noir 500g', 2.40], ['cerises 500g', 4.90],
  ['fraises barquette 250g', 2.80], ['fraises barquette 500g', 4.80],
  ['framboises 125g', 2.90], ['myrtilles 125g', 2.80], ['mûres 125g', 2.90],
  ['noix de coco pièce', 2.50], ['grenades x2', 2.90], ['litchis 300g', 3.20],
  ['figues fraîches x4', 2.80], ['papaye pièce', 2.90], ['goyave x2', 2.80],
  ['physalis 100g', 2.50], ['fruit de la passion x3', 2.80], ['caramboles x2', 2.60],
]
for (const [name, bp] of freshFruits) { add(name, bp, 'FRUITS') }
const driedFruits: [string, number][] = [
  ['noix 150g', 3.50], ['amandes 125g', 2.90], ['noisettes 125g', 2.80],
  ['noix de cajou 100g', 3.20], ['pistaches 125g', 3.80], ['noix du Brésil 100g', 3.20],
  ['dattes Medjool 250g', 4.50], ['dattes 250g', 3.00], ['pruneaux Agen 250g', 2.80],
  ['abricots secs 200g', 2.90], ['raisins secs 200g', 1.90], ['figues sèches 250g', 2.80],
  ['cranberries séchées 100g', 2.80], ['baies de goji 100g', 3.20],
  ['mélange de fruits secs 200g', 3.50], ['mélange de noix 150g', 4.20],
  ['amandes effilées 100g', 2.60], ['noix de coco râpée 200g', 2.20],
]
for (const [name, bp] of driedFruits) { add(name, bp, 'FRUITS') }

// ── 13. LÉGUMES ──────────────────────────────────────────────────────────────
const freshVegs: [string, number][] = [
  ['tomates rondes 500g', 1.80], ['tomates grappe 500g', 2.20], ['tomates cerises 250g', 2.10],
  ['tomates côtelées x2', 2.50], ['carottes 1kg', 1.20], ['carottes botte', 1.50],
  ['pommes de terre 2.5kg', 2.80], ['pommes de terre 5kg', 4.90], ['pommes de terre nouvelles 1kg', 2.40],
  ['oignons jaunes 1kg', 1.40], ['oignons rouges 500g', 1.60], ['oignons filet 2kg', 2.60],
  ['courgettes 500g', 1.80], ['courgettes rondes x2', 2.20], ['aubergines x2', 2.00],
  ['aubergine pièce', 1.10], ['poivrons rouges x2', 2.20], ['poivrons verts x2', 1.90],
  ['poivron jaune pièce', 1.30], ['poivrons tricolores x3', 3.20], ['concombre pièce', 0.99],
  ['salade laitue pièce', 1.00], ['salade batavia pièce', 1.20], ['salade iceberg pièce', 1.30],
  ['salade frisée pièce', 1.40], ['mâche 100g', 1.80], ['épinards frais 200g', 2.20],
  ['brocoli pièce', 1.80], ['chou-fleur pièce', 2.00], ['chou blanc 1kg', 1.20],
  ['chou rouge 1kg', 1.40], ['poireaux botte', 2.20], ['céleri branche pièce', 2.00],
  ['céleri rave pièce', 2.10], ['fenouil pièce', 1.80], ['endives 500g', 1.90],
  ['navets 1kg', 1.40], ['betteraves cuites x4', 2.00], ['radis botte', 0.90],
  ['asperges vertes botte 500g', 3.80], ['asperges blanches botte 500g', 4.50],
  ['artichaut x2', 2.50], ['champignons de Paris 500g', 2.20], ['champignons de Paris 250g', 1.50],
  ['shiitake 150g', 3.20], ['pleurotes 150g', 3.50], ['girolles 150g', 5.90],
  ['gingembre 100g', 1.20], ['ail tête pièce', 0.80], ['ail filet x3', 2.00],
  ['échalotes 250g', 1.50], ['patates douces 1kg', 2.80], ['topinambours 500g', 2.60],
  ['panais 500g', 2.40], ['butternut pièce', 3.20], ['potiron 1kg', 1.80],
  ['maïs épi x2', 2.10], ['haricots verts frais 400g', 2.20], ['petits pois frais 500g', 2.00],
  ['fèves fraîches 500g', 2.80], ['pak choï 300g', 2.50], ['broccolini botte', 3.20],
]
for (const [name, bp] of freshVegs) { add(name, bp, 'LÉGUMES') }
const freshHerbs = ['persil', 'ciboulette', 'basilic', 'menthe', 'thym', 'romarin', 'coriandre', 'estragon', 'aneth', 'origan', 'sauge', 'laurier']
for (const herb of freshHerbs) {
  add(`herbe fraîche ${herb} pot`, 1.60, 'LÉGUMES')
  add(`herbe fraîche ${herb} bouquet`, 0.90, 'LÉGUMES')
}
add('Carottes râpées 300g', 1.50, 'LÉGUMES')
add('Mélange salade 200g', 1.80, 'LÉGUMES')
add('Salade roquette 100g', 1.90, 'LÉGUMES')
add('Salade jeunes pousses 100g', 2.20, 'LÉGUMES')
add('Wok de légumes 400g', 2.50, 'LÉGUMES')
add('Ratatouille fraîche 400g', 2.80, 'LÉGUMES')
add('Poêlée de légumes 600g', 2.80, 'LÉGUMES')
add('Gratin de courgettes 600g', 3.50, 'LÉGUMES')
add('Soupe fraîche tomate basilic 1L', 3.20, 'LÉGUMES')
add('Gaspacho tomate 500ml', 2.50, 'LÉGUMES')

// ── 14. SURGELÉS ─────────────────────────────────────────────────────────────
for (const [type, bp] of [['margherita', 2.80], ['4 fromages', 3.20], ['reine', 3.00], ['chorizo', 3.20], ['chèvre miel', 3.40], ['végétarienne', 3.10], ['jambon mozzarella', 3.00], ['saumon', 3.50]] as [string, number][]) {
  for (const [brand, delta] of [['Picard', 0.80], ['Marie', 0.30], ['MDD', 0]] as [string, number][]) {
    add(`${brand} pizza ${type} 400g`, bp + delta, 'SURGELÉS', true)
  }
}
for (const [type, bp] of [['frites classiques 1kg', 2.50], ['frites allumettes 1kg', 2.60], ['frites country 1kg', 2.70], ['potatoes 700g', 2.80], ['galettes de pomme de terre x8', 2.40], ['croquettes pomme de terre x20', 2.30], ['gratin dauphinois 600g', 3.80]] as [string, number][]) {
  for (const [brand, delta] of [['McCain', 0.50], ['Picard', 0.70], ['MDD', 0]] as [string, number][]) {
    add(`${brand} ${type}`, bp + delta, 'SURGELÉS', true)
  }
}
for (const [veg, bp] of [['haricots verts 1kg', 2.20], ['petits pois 1kg', 2.10], ['épinards 1kg', 2.30], ['poêlée de légumes 750g', 2.80], ['brocoli 600g', 2.50], ['maïs 600g', 2.20], ['macédoine 1kg', 2.40], ['ratatouille 750g', 2.70], ['wok de légumes 750g', 3.20], ['carottes 1kg', 2.00], ['poireaux 750g', 2.60]] as [string, number][]) {
  for (const [brand, delta] of [['Bonduelle', 0.40], ['Picard', 0.60], ['MDD', 0]] as [string, number][]) {
    add(`${brand} ${veg} surgelé`, bp + delta, 'SURGELÉS', true)
  }
}
for (const [type, bp] of [['quiche lorraine 400g', 3.20], ['tarte aux poireaux 400g', 3.10], ['hachis parmentier 600g', 3.80], ['lasagnes bolognaise 1kg', 5.90], ['lasagnes saumon 900g', 6.20], ['gratin dauphinois 1kg', 3.90], ['tartiflette 900g', 5.90], ['paella 900g', 5.50], ['moussaka 800g', 5.20], ['blanquette de veau 300g', 4.80], ['boeuf bourguignon 300g', 4.90], ['poulet basquaise 300g', 4.50]] as [string, number][]) {
  for (const [brand, delta] of [['Marie', 0.50], ['Picard', 0.80], ['MDD', 0]] as [string, number][]) {
    add(`${brand} ${type} surgelé`, bp + delta, 'SURGELÉS', true)
  }
}
add('Picard crêpes nature x10', 3.50, 'SURGELÉS', true)
add('MDD crêpes nature x10 surgelé', 2.50, 'SURGELÉS', true)
add('Picard gaufres x8', 3.20, 'SURGELÉS', true)
add('MDD gaufres x8 surgelées', 2.40, 'SURGELÉS', true)
add('Picard pain au chocolat x6 surgelé', 3.80, 'SURGELÉS', true)
add('MDD steak haché surgelé x10', 7.50, 'SURGELÉS', true)
add('Picard filets de poulet surgelés x4', 6.90, 'SURGELÉS', true)
for (const [type, bp] of [['vanille 500ml', 2.80], ['chocolat 500ml', 2.80], ['fraise 500ml', 2.80], ['vanille 1L', 4.50], ['caramel 1L', 4.80], ['praliné 500ml', 3.20]] as [string, number][]) {
  for (const [brand, delta] of [['Picard', 0.70], ['MDD', 0]] as [string, number][]) {
    add(`${brand} glace ${type}`, bp + delta, 'SURGELÉS', true)
  }
}
add('Magnum amande x4', 4.90, 'SURGELÉS', true)
add('Magnum classic x4', 4.70, 'SURGELÉS', true)
add('Magnum white x4', 4.90, 'SURGELÉS', true)
add('Cornetto classique x4', 4.20, 'SURGELÉS', true)
add('Häagen-Dazs vanille 460ml', 6.90, 'SURGELÉS', true)
add("Ben & Jerry's Cookie Dough 500ml", 6.50, 'SURGELÉS', true)
add("Ben & Jerry's Brownie 500ml", 6.50, 'SURGELÉS', true)
add('Sorbet citron 500ml Picard', 3.50, 'SURGELÉS', true)
add('Sorbet framboise 500ml Picard', 3.50, 'SURGELÉS', true)
add('Sorbet mangue 500ml Picard', 3.50, 'SURGELÉS', true)
add('MDD bâtonnets glacés x8 surgelé', 2.40, 'SURGELÉS', true)

// ── 15. BOISSONS ─────────────────────────────────────────────────────────────
// Eaux plates
for (const [brand, bp] of [['Cristaline', 0.30], ['Evian', 0.80], ['Volvic', 0.70], ['Vittel', 0.60], ['Hépar', 0.90], ['Contrex', 0.85], ['Thonon', 0.75], ['Courmayeur', 0.95]] as [string, number][]) {
  add(`${brand} eau source 1.5L`, bp, 'BOISSONS')
  add(`${brand} eau source 1.5L x6`, bp * 5, 'BOISSONS')
  add(`${brand} eau source 50cl`, bp * 0.4, 'BOISSONS')
}
for (const [brand, bp] of [['Perrier', 1.30], ['Badoit', 1.10], ['San Pellegrino', 1.40], ['Salvetat', 1.00], ['Rozana', 0.90], ['MDD eau gazeuse', 0.50]] as [string, number][]) {
  add(`${brand} gazeuse 1L`, bp, 'BOISSONS')
  add(`${brand} gazeuse 75cl x4`, bp * 2.8, 'BOISSONS')
}
// Jus de fruits
for (const [type, bp] of [['orange pur jus', 2.20], ['orange pressée', 2.50], ['pomme', 1.90], ['raisin', 2.20], ['ananas', 2.00], ['multifruit', 1.90], ['abricot nectar', 1.80], ['mangue nectar', 2.00], ['tomate', 1.80], ['pamplemousse', 2.10], ['grenade', 2.50]] as [string, number][]) {
  for (const [brand, delta] of [['Tropicana', 0.60], ['Joker', 0.40], ['MDD', 0]] as [string, number][]) {
    add(`${brand} jus ${type} 1L`, bp + delta, 'BOISSONS')
  }
}
add('Innocent smoothie tropical 750ml', 4.20, 'BOISSONS')
add('Innocent smoothie fraise banane 750ml', 4.20, 'BOISSONS')
add('MDD smoothie pomme mangue 750ml', 2.90, 'BOISSONS')
// Sodas
for (const [brand, bp] of [['Coca-Cola', 1.80], ['Coca-Cola Zero', 1.80], ['Pepsi', 1.60], ['Pepsi Max', 1.60], ['Fanta orange', 1.60], ['Fanta citron', 1.60], ['Sprite', 1.60], ['Orangina', 2.00], ['Oasis tropical', 1.70], ['Oasis orange', 1.70], ['Schweppes tonic', 2.00], ['Schweppes agrumes', 2.00], ['7up', 1.60], ['Canada Dry', 1.90], ['Dr Pepper', 1.90], ['Mountain Dew', 1.80], ['Gini', 1.70]] as [string, number][]) {
  add(`${brand} 1.5L`, bp, 'BOISSONS')
  add(`${brand} 33cl x6`, bp * 2.2, 'BOISSONS')
}
add('Lipton Ice Tea pêche 1.5L', 2.10, 'BOISSONS')
add('Lipton Ice Tea citron 1.5L', 2.10, 'BOISSONS')
add('Fuze Tea citron 1.5L', 2.10, 'BOISSONS')
add('Fuze Tea pêche 1.5L', 2.10, 'BOISSONS')
// Boissons énergisantes
add('Red Bull 25cl', 1.60, 'BOISSONS')
add('Red Bull 25cl x4', 5.90, 'BOISSONS')
add('Monster Energy 50cl', 1.80, 'BOISSONS')
add('Monster Energy x4 50cl', 6.50, 'BOISSONS')
add('Burn 50cl', 1.70, 'BOISSONS')
add('Powerade 50cl', 1.50, 'BOISSONS')
add('Gatorade 500ml', 1.70, 'BOISSONS')
// Sirops
for (const [flavor, bp] of [['grenadine', 2.10], ['menthe', 2.10], ['citron', 2.10], ['pêche', 2.30], ['fraise', 2.30], ['framboise', 2.30], ['orgeat', 2.50], ['violette', 2.50], ['cassis', 2.40]] as [string, number][]) {
  add(`Teisseire sirop ${flavor} 75cl`, bp + 0.50, 'BOISSONS')
  add(`MDD sirop ${flavor} 75cl`, bp, 'BOISSONS')
}
// Bières
for (const [brand, bp] of [['Kronenbourg 1664', 4.20], ['Heineken', 4.50], ['Leffe Blonde', 5.20], ['Grimbergen', 5.00], ['Stella Artois', 4.80], ['Amstel', 4.00], ['Desperados', 5.50], ['Carlsberg', 4.20], ['Fischer', 4.40], ['Bonne Espérance', 4.60], ['Guinness', 5.80]] as [string, number][]) {
  add(`${brand} 33cl x6`, bp, 'BOISSONS')
  add(`${brand} 33cl x12`, bp * 1.8, 'BOISSONS')
}
add('Bière artisanale IPA 33cl x3', 4.80, 'BOISSONS')
add('MDD bière blonde 33cl x6', 3.20, 'BOISSONS')
add('MDD bière sans alcool 33cl x6', 2.90, 'BOISSONS')
// Vins
for (const [type, bp] of [['bordeaux rouge 75cl', 4.90], ['côtes du rhône rouge 75cl', 4.50], ['bourgogne rouge 75cl', 8.90], ['côtes de provence rosé 75cl', 5.90], ['sancerre blanc 75cl', 9.90], ['chardonnay blanc 75cl', 4.80], ['muscadet 75cl', 4.50], ['pouilly-fumé 75cl', 8.90], ['beaujolais 75cl', 5.50], ['cahors rouge 75cl', 6.90]] as [string, number][]) {
  add(`Vin ${type}`, bp, 'BOISSONS')
}
// Cidres
add('Loïc Raison cidre brut 75cl', 2.90, 'BOISSONS')
add('Loïc Raison cidre doux 75cl', 2.90, 'BOISSONS')
add('Cidre fermier brut 75cl', 3.90, 'BOISSONS')
add('MDD cidre brut 75cl', 2.20, 'BOISSONS')
add('Saveur bière de Bretagne 75cl', 3.50, 'BOISSONS')
// Café & thé prêt à boire
add('Starbucks Frappuccino Moka 250ml', 2.80, 'BOISSONS')
add('Nescafé Iced 250ml', 1.90, 'BOISSONS')
add('Lipton thé glacé citron 33cl', 1.20, 'BOISSONS')

// ── 16. PETIT-DÉJEUNER & ÉPICERIE SUCRÉE ────────────────────────────────────
// Café
for (const [brand, bp] of [['Nescafé Classic', 4.20], ['Nescafé Gold', 6.50], ['Carte Noire', 4.80], ["L'Or", 5.20], ['Lavazza', 5.50], ['Malongo', 6.90], ['MDD', 2.80]] as [string, number][]) {
  add(`${brand} café moulu 250g`, bp, 'PETIT-DÉJEUNER')
}
add('Nescafé Classic 100g', 2.80, 'PETIT-DÉJEUNER')
add('Nescafé Dolce Gusto x16 capsules', 3.90, 'PETIT-DÉJEUNER')
add("L'Or capsules Nespresso x10", 3.80, 'PETIT-DÉJEUNER')
add('Carte Noire café en grains 500g', 7.90, 'PETIT-DÉJEUNER')
add('Lavazza café en grains 1kg', 13.90, 'PETIT-DÉJEUNER')
add('MDD dosettes café x36', 4.50, 'PETIT-DÉJEUNER')
add('MDD café en grains 1kg', 9.90, 'PETIT-DÉJEUNER')
add('Café Méo moulu 250g', 4.50, 'PETIT-DÉJEUNER')
// Thé & infusions
for (const [brand, bp] of [['Lipton', 2.30], ['Twinings', 2.90], ['Elephant', 2.20], ['Palais des Thés', 4.90], ['MDD', 1.50]] as [string, number][]) {
  for (const type of ['thé vert x25', 'thé Earl Grey x25', 'thé noir English Breakfast x25', 'thé menthe x25', 'thé jasmin x25']) {
    add(`${brand} ${type}`, bp, 'PETIT-DÉJEUNER')
  }
}
for (const type of ['verveine', 'camomille', 'tilleul', 'menthe poivrée', 'gingembre citron', 'rooibos', 'hibiscus', 'citronnelle gingembre']) {
  add(`Lipton infusion ${type} x25`, 2.40, 'PETIT-DÉJEUNER')
  add(`MDD infusion ${type} x25`, 1.60, 'PETIT-DÉJEUNER')
}
// Sucre & miel
for (const [type, bp] of [['sucre en poudre 1kg', 1.10], ['sucre en morceaux 1kg', 1.30], ['sucre roux 500g', 1.20], ['cassonade 500g', 1.50], ['sucre glace 500g', 1.40], ['sucre de canne 1kg', 1.30]] as [string, number][]) {
  add(`MDD ${type}`, bp, 'PETIT-DÉJEUNER')
  add(`Daddy ${type}`, bp + 0.30, 'PETIT-DÉJEUNER')
}
for (const [type, bp] of [['miel toutes fleurs 500g', 4.80], ['miel acacia 250g', 4.20], ['miel lavande 250g', 4.80], ['miel châtaignier 250g', 5.20], ['miel de Bretagne 500g', 5.90], ['miel liquide 375g', 3.90]] as [string, number][]) {
  add(`Lune de Miel ${type}`, bp + 0.50, 'PETIT-DÉJEUNER')
  add(`MDD ${type}`, bp, 'PETIT-DÉJEUNER')
}
// Confitures
for (const [brand, delta] of [['Bonne Maman', 0.80], ['St Mamet', 0.40], ['MDD', 0]] as [string, number][]) {
  for (const flavor of ['fraises', 'abricots', 'cerises', 'mûres', 'framboises', 'prunes mirabelle', 'oranges amères', 'myrtilles', 'figues', 'rhubarbe']) {
    add(`${brand} confiture ${flavor} 370g`, 2.20 + delta, 'PETIT-DÉJEUNER')
  }
}
// Pâtes à tartiner
for (const [brand, bp] of [['Nutella', 3.80], ['Nocciolata bio', 4.50], ['MDD pâte noisettes', 1.90]] as [string, number][]) {
  add(`${brand} 400g`, bp, 'PETIT-DÉJEUNER')
  add(`${brand} 750g`, bp * 1.7, 'PETIT-DÉJEUNER')
}
add("Justin's beurre de cacahuète 250g", 3.90, 'PETIT-DÉJEUNER')
add('MDD beurre de cacahuète 350g', 2.20, 'PETIT-DÉJEUNER')
add('MDD beurre de cacahuète crunchy 350g', 2.30, 'PETIT-DÉJEUNER')
add('Speculoos pâte à tartiner 400g', 3.20, 'PETIT-DÉJEUNER')
// Chocolat en poudre
for (const [brand, bp] of [['Nesquik', 3.20], ['Poulain', 3.00], ['Banania', 3.10], ['Van Houten', 3.40], ['MDD', 1.90]] as [string, number][]) {
  add(`${brand} cacao en poudre 400g`, bp, 'PETIT-DÉJEUNER')
  add(`${brand} cacao en poudre 1kg`, bp * 2.3, 'PETIT-DÉJEUNER')
}
// Céréales
for (const [name, bp] of [["Kellogg's Special K 440g", 4.20], ["Kellogg's Choco Pops 430g", 3.50], ["Kellogg's Frosties 400g", 3.70], ["Kellogg's Corn Flakes 750g", 3.20], ["Kellogg's Muesli 500g", 4.20], ['Nestlé Chocapic 430g', 3.40], ['Nestlé Cheerios 375g', 3.60], ['Nestlé Trésor 400g', 3.80], ['Nestlé Fitness 375g', 3.90], ['Nestlé Lion 400g', 4.20], ['Granola original 500g', 4.20], ["Jordans Country Crisp 500g", 4.90], ['MDD muesli 500g', 2.00], ['MDD corn flakes 500g', 1.50], ['MDD céréales chocolat 500g', 1.80], ['MDD muesli croustillant 500g', 2.20]] as [string, number][]) {
  add(name, bp, 'PETIT-DÉJEUNER')
}
add("Quaker flocons d'avoine 500g", 2.80, 'PETIT-DÉJEUNER')
add("MDD flocons d'avoine 500g", 1.40, 'PETIT-DÉJEUNER')
add('MDD porridge pomme cannelle 500g', 1.80, 'PETIT-DÉJEUNER')
add('Weetabix x24', 3.50, 'PETIT-DÉJEUNER')
// Compotes
for (const [brand, delta] of [['Materne', 0.40], ['Andros', 0.30], ['MDD', 0]] as [string, number][]) {
  add(`${brand} compote pomme x4`, 1.80 + delta, 'PETIT-DÉJEUNER')
  add(`${brand} compote pomme-fraise x4`, 1.90 + delta, 'PETIT-DÉJEUNER')
  add(`${brand} compote SSA pomme x8`, 2.80 + delta * 2, 'PETIT-DÉJEUNER')
  add(`${brand} compote abricot x4`, 1.90 + delta, 'PETIT-DÉJEUNER')
  add(`${brand} compote mangue-banane x4`, 2.20 + delta, 'PETIT-DÉJEUNER')
}
add('Materne fruits au sirop pêche 500g', 2.40, 'PETIT-DÉJEUNER')
add('Materne fruits au sirop poire 500g', 2.40, 'PETIT-DÉJEUNER')
add('MDD salade de fruits 500g', 1.80, 'PETIT-DÉJEUNER')
add('Ananas en morceaux au sirop 565g', 2.10, 'PETIT-DÉJEUNER')

// ── 17. BISCUITS, GÂTEAUX & SNACKS ───────────────────────────────────────────
add('LU Petit Beurre 200g', 1.80, 'BISCUITS')
add('LU Petit Beurre x2 400g', 3.20, 'BISCUITS')
add('LU BN chocolat x16', 2.40, 'BISCUITS')
add('LU Prince chocolat 300g', 2.90, 'BISCUITS')
add('Oreo original 176g', 2.50, 'BISCUITS')
add('Oreo double crème 157g', 2.80, 'BISCUITS')
add('Oreo golden 176g', 2.60, 'BISCUITS')
add('LU Petit Écolier chocolat noir 150g', 2.40, 'BISCUITS')
add('LU Petit Écolier chocolat au lait 150g', 2.40, 'BISCUITS')
add('LU Granola chocolat 200g', 2.60, 'BISCUITS')
add('Mikado chocolat 75g', 1.80, 'BISCUITS')
add('Mikado amande 75g', 1.90, 'BISCUITS')
add("LU Pim's orange 150g", 2.60, 'BISCUITS')
add("LU Pim's framboises 150g", 2.60, 'BISCUITS')
add('LU Pepito chocolat 200g', 2.40, 'BISCUITS')
add('Brossard Savane chocolat 310g', 2.90, 'BISCUITS')
add('Brossard Madeleine nature x12', 2.50, 'BISCUITS')
add('Brossard Madeleine citron x12', 2.60, 'BISCUITS')
add('St Michel Galette bretonne 130g', 2.20, 'BISCUITS')
add('Palets bretons pur beurre 125g', 2.60, 'BISCUITS')
add('Sablés normands 200g', 2.40, 'BISCUITS')
add('Speculoos Lotus 250g', 2.80, 'BISCUITS')
add('Speculoos Lotus 400g', 3.90, 'BISCUITS')
add('Digestive McVitie\'s 250g', 2.50, 'BISCUITS')
add('Shortbread Walker\'s 150g', 3.20, 'BISCUITS')
add('MDD sablés beurre 200g', 1.40, 'BISCUITS')
add('MDD petits beurres 200g', 1.10, 'BISCUITS')
add('MDD madeleines nature x12', 1.70, 'BISCUITS')
add('MDD cookies chocolat x8', 1.60, 'BISCUITS')
add('MDD financiers x8', 2.20, 'BISCUITS')
add('LU cookies pépites chocolat x8', 2.80, 'BISCUITS')
add('Galettes de riz Bjorg nature x16', 2.50, 'BISCUITS')
add('MDD galettes de riz nature x16', 1.60, 'BISCUITS')
add('Galettes de maïs x16', 1.80, 'BISCUITS')
add('Wasa pain craquant original x12', 2.10, 'BISCUITS')
add('Wasa pain craquant seigle x12', 2.20, 'BISCUITS')
add('Tuc original 100g', 1.70, 'BISCUITS')
add('Tuc fromage 100g', 1.80, 'BISCUITS')
add('Crackers Belin 100g', 2.20, 'BISCUITS')
add('Gressins nature 125g', 1.80, 'BISCUITS')
add('Bretzels nature 200g', 1.90, 'BISCUITS')
add('MDD soufflés fromage 80g', 0.99, 'BISCUITS')
add('Pain d\'épices tranché 400g', 2.80, 'BISCUITS')
add('LU Paille d\'Or 250g', 2.40, 'BISCUITS')
add('MDD barres céréales x6', 2.20, 'BISCUITS')
add('Nature Valley barres x6', 3.80, 'BISCUITS')
add('Belvita matin x12', 3.50, 'BISCUITS')
add('Gerblé biscuits sans sucre 230g', 3.20, 'BISCUITS')
add('MDD crakers salés 200g', 1.30, 'BISCUITS')
// Chips & snacks apéritif
const chipBrands: [string, string, number][] = [["Lay's", '150g', 2.10], ["Lay's", '250g', 3.20], ['Pringles', '175g', 2.80], ['Doritos', '170g', 2.50], ['Vico', '200g', 2.30], ['MDD', '200g', 1.60]]
const chipFlavors = ['nature', 'paprika', 'sel et vinaigre', 'fromage', 'barbecue', 'sour cream']
for (const [brand, size, bp] of chipBrands) {
  for (const flavor of chipFlavors) {
    add(`${brand} chips ${flavor} ${size}`, bp, 'BISCUITS')
  }
}
add('Pringles sour cream 175g', 2.80, 'BISCUITS')
add('Pringles hot & spicy 175g', 2.80, 'BISCUITS')
add('Curly cacahuète 120g', 1.90, 'BISCUITS')
add('Curly bolognaise 90g', 1.80, 'BISCUITS')
add('Vico Maxi Corn 100g', 1.70, 'BISCUITS')
add('MDD pop-corn beurre 90g', 0.99, 'BISCUITS')
add('Popcorn salé 90g', 1.50, 'BISCUITS')
add('Cacahuètes grillées salées 200g', 1.90, 'BISCUITS')
add('Pistaches grillées salées 125g', 3.50, 'BISCUITS')
add('Noix de cajou grillées 100g', 3.20, 'BISCUITS')
add('Mix apéritif 200g', 2.40, 'BISCUITS')
add('Belin Cracky Mix 100g', 1.90, 'BISCUITS')
add('Croûtons apéritif 100g', 1.70, 'BISCUITS')
add('Gressins sesame 100g', 1.90, 'BISCUITS')
add('MDD chips de légumes 75g', 1.80, 'BISCUITS')

// ── 18. CHOCOLAT & CONFISERIE ────────────────────────────────────────────────
for (const [brand, delta] of [['Lindt', 0.60], ['Milka', 0.20], ["Côte d'Or", 0.30], ['Nestlé', 0.10], ['MDD', 0]] as [string, number][]) {
  add(`${brand} chocolat noir 70% 100g`, 1.60 + delta, 'CHOCOLAT')
  add(`${brand} chocolat au lait 100g`, 1.50 + delta, 'CHOCOLAT')
  add(`${brand} chocolat blanc 100g`, 1.50 + delta, 'CHOCOLAT')
  add(`${brand} tablette chocolat noir amandes 100g`, 1.90 + delta, 'CHOCOLAT')
}
add('Lindt Excellence 85% 100g', 2.80, 'CHOCOLAT')
add('Lindt Excellence 90% 100g', 2.90, 'CHOCOLAT')
add('Lindt Excellence lait 100g', 2.70, 'CHOCOLAT')
add("Côte d'Or noir noisette 200g", 4.90, 'CHOCOLAT')
add("Côte d'Or mignonnettes lait 200g", 5.20, 'CHOCOLAT')
add('Milka Oreo 100g', 2.50, 'CHOCOLAT')
add('Milka Daim 100g', 2.50, 'CHOCOLAT')
add('Milka Caramel 100g', 2.50, 'CHOCOLAT')
add('Toblerone miel amandes 200g', 4.90, 'CHOCOLAT')
add('After Eight 200g', 4.50, 'CHOCOLAT')
add('Ferrero Rocher x16', 6.50, 'CHOCOLAT')
add('Ferrero Rocher x8', 3.90, 'CHOCOLAT')
add('Kinder Bueno x2', 1.80, 'CHOCOLAT')
add('Kinder Bueno x6 multipack', 4.90, 'CHOCOLAT')
add('Kinder Country x9', 3.80, 'CHOCOLAT')
add('Kinder Maxi x3', 2.80, 'CHOCOLAT')
add('Kinder Surprise x3', 4.50, 'CHOCOLAT')
add('Mon Chéri x30', 7.90, 'CHOCOLAT')
add('Raffaello x15', 5.90, 'CHOCOLAT')
add('Snickers x3', 2.30, 'CHOCOLAT')
add('Twix x3', 2.20, 'CHOCOLAT')
add('Mars x3', 2.30, 'CHOCOLAT')
add('Kit Kat x3', 2.20, 'CHOCOLAT')
add("M&M's peanut 200g", 3.50, 'CHOCOLAT')
add("M&M's choco 200g", 3.50, 'CHOCOLAT')
add('Maltesers 175g', 3.20, 'CHOCOLAT')
add('Bounty x3', 2.20, 'CHOCOLAT')
add('Haribo Tagada 300g', 2.90, 'CHOCOLAT')
add("Haribo Ours d'Or 300g", 2.90, 'CHOCOLAT')
add('Haribo Schtroumpfs 300g', 2.90, 'CHOCOLAT')
add('Haribo Chamallows 200g', 2.50, 'CHOCOLAT')
add('Haribo Fraises Tagada 500g', 4.50, 'CHOCOLAT')
add('Lutti Arlequin 200g', 2.40, 'CHOCOLAT')
add('Carambar original x30', 3.20, 'CHOCOLAT')
add('Dragibus 280g', 2.80, 'CHOCOLAT')
add("Têtes Brûlées 200g", 2.70, 'CHOCOLAT')
add('Chupa Chups x10', 2.80, 'CHOCOLAT')
add('Mentos raisin x3', 1.60, 'CHOCOLAT')
add('Tic Tac menthe 100g', 1.90, 'CHOCOLAT')
add('MDD bonbons gélifiés 300g', 1.80, 'CHOCOLAT')
add('MDD réglisse 200g', 1.50, 'CHOCOLAT')
add('Nougat de Montélimar 200g', 4.80, 'CHOCOLAT')
add('Calissons Aix 200g', 7.90, 'CHOCOLAT')

// ── 19. HYGIÈNE CORPORELLE ───────────────────────────────────────────────────
const gelDoucheBrands: [string, number][] = [['Dove', 0.50], ['Nivea', 0.40], ['Le Petit Marseillais', 0.30], ['Palmolive', 0.20], ['Monsavon', 0.10], ['Sanex', 0.30], ['MDD', 0]]
const gelDouchemScents = ['amande douce', 'lait de coco', 'monoï', 'menthe fraîche', 'argan', 'orchidée']
for (const [brand, delta] of gelDoucheBrands) {
  for (const scent of gelDouchemScents) {
    add(`${brand} gel douche ${scent} 250ml`, 2.50 + delta, 'HYGIÈNE')
    add(`${brand} gel douche ${scent} 500ml`, 3.80 + delta, 'HYGIÈNE')
  }
}
const shampoBrands: [string, number][] = [["L'Oréal", 0.60], ['Garnier', 0.40], ['Head & Shoulders', 0.30], ['Pantène', 0.50], ['Elsève', 0.40], ['MDD', 0]]
const shampoTypes = ['normal', 'cheveux secs', 'cheveux gras', 'antipelliculaire', 'volume', 'couleur']
for (const [brand, delta] of shampoBrands) {
  for (const type of shampoTypes) {
    add(`${brand} shampooing ${type} 250ml`, 3.00 + delta, 'HYGIÈNE')
    add(`${brand} shampooing ${type} 400ml`, 4.50 + delta, 'HYGIÈNE')
  }
}
add("Garnier après-shampooing 200ml", 3.20, 'HYGIÈNE')
add("L'Oréal masque capillaire 300ml", 5.90, 'HYGIÈNE')
add("Elsève huile extraordinaire 100ml", 7.90, 'HYGIÈNE')
for (const [brand, delta] of [['Dove', 0.40], ['Palmolive', 0.20], ['Le Petit Marseillais', 0.30], ['Monsavon', 0.10], ['MDD', 0]] as [string, number][]) {
  add(`${brand} savon solide x4`, 2.20 + delta, 'HYGIÈNE')
}
add('Savon de Marseille 300g', 2.50, 'HYGIÈNE')
add('Sanex savon liquide 500ml', 2.90, 'HYGIÈNE')
add('MDD savon liquide 300ml', 1.50, 'HYGIÈNE')
for (const [brand, delta] of [['Colgate', 0.30], ['Signal', 0.20], ['Oral-B', 0.40], ['Sensodyne', 0.80], ['Elmex', 0.60], ['MDD', 0]] as [string, number][]) {
  add(`${brand} dentifrice blancheur 75ml`, 2.40 + delta, 'HYGIÈNE')
  add(`${brand} dentifrice fraîcheur 75ml`, 2.30 + delta, 'HYGIÈNE')
  add(`${brand} dentifrice sensitive 75ml`, 2.60 + delta, 'HYGIÈNE')
}
add('Colgate bain de bouche 500ml', 3.20, 'HYGIÈNE')
add('Listerine fraîcheur intense 500ml', 3.90, 'HYGIÈNE')
add('MDD bain de bouche 500ml', 1.80, 'HYGIÈNE')
add('Oral-B brosses à dents x2', 3.50, 'HYGIÈNE')
add('MDD brosses à dents souple x3', 1.90, 'HYGIÈNE')
add('Colgate brosse dents électrique recharge x2', 7.90, 'HYGIÈNE')
for (const [brand, delta] of [['Axe', 0.30], ['Dove', 0.40], ['Rexona', 0.30], ['Nivea', 0.30], ['Old Spice', 0.20], ['MDD', 0]] as [string, number][]) {
  add(`${brand} déodorant spray 150ml`, 2.80 + delta, 'HYGIÈNE')
  add(`${brand} déodorant roll-on 50ml`, 2.50 + delta, 'HYGIÈNE')
  add(`${brand} déodorant stick 40ml`, 2.60 + delta, 'HYGIÈNE')
}
add('Nivea crème hydratante 200ml', 4.50, 'HYGIÈNE')
add('Nivea crème visage 50ml', 5.90, 'HYGIÈNE')
add('Nivea crème mains 75ml', 1.90, 'HYGIÈNE')
add('Garnier crème solaire SPF50 200ml', 7.90, 'HYGIÈNE')
add('MDD crème solaire SPF30 200ml', 4.50, 'HYGIÈNE')
add('Vaseline soin lèvres 20g', 1.90, 'HYGIÈNE')
add('Neutrogena crème mains 75ml', 3.80, 'HYGIÈNE')
add('Nana serviettes normal x14', 2.80, 'HYGIÈNE')
add('Always serviettes normal x28', 4.20, 'HYGIÈNE')
add('MDD serviettes hygiéniques normal x20', 2.20, 'HYGIÈNE')
add('Nana tampons x16', 2.90, 'HYGIÈNE')
add('MDD tampons x16', 2.20, 'HYGIÈNE')
add('Nana protège-slips x30', 2.40, 'HYGIÈNE')
add('MDD protège-slips x30', 1.60, 'HYGIÈNE')
add('Gillette Mach3 recharges x4', 8.90, 'HYGIÈNE')
add('Gillette rasoir jetable x3', 3.50, 'HYGIÈNE')
add('Wilkinson rasoirs jetables x5', 3.80, 'HYGIÈNE')
add('MDD rasoirs jetables x5', 2.20, 'HYGIÈNE')
add('Gillette mousse à raser 200ml', 2.80, 'HYGIÈNE')
add('MDD mousse à raser 200ml', 1.40, 'HYGIÈNE')
add('MDD coton-tiges x200', 1.40, 'HYGIÈNE')
add("Demak'Up cotons démaquillants x80", 2.90, 'HYGIÈNE')
add('MDD cotons démaquillants x80', 1.80, 'HYGIÈNE')
add('Pampers lingettes bébé x72', 3.90, 'HYGIÈNE')
add('MDD lingettes bébé x72', 2.40, 'HYGIÈNE')
add('Biafine emulsion 93ml', 7.20, 'HYGIÈNE')
add('Doliprane 1000mg x8', 3.50, 'HYGIÈNE')
add('MDD paracétamol 500mg x16', 1.90, 'HYGIÈNE')

// ── 20. ENTRETIEN MÉNAGER ────────────────────────────────────────────────────
const lessiveBrands: [string, number][] = [['Ariel', 0.80], ['Skip', 0.60], ['Persil', 0.50], ['Le Chat', 0.30], ['MDD', 0]]
for (const [brand, delta] of lessiveBrands) {
  add(`${brand} lessive liquide 1.5L`, 5.50 + delta, 'ENTRETIEN')
  add(`${brand} lessive liquide 2.5L`, 9.90 + delta * 1.5, 'ENTRETIEN')
  add(`${brand} lessive capsules x20`, 6.90 + delta, 'ENTRETIEN')
  add(`${brand} lessive capsules x30`, 9.50 + delta * 1.3, 'ENTRETIEN')
  add(`${brand} lessive poudre 2.5kg`, 7.90 + delta, 'ENTRETIEN')
  add(`${brand} lessive laine et délicat 500ml`, 4.50 + delta, 'ENTRETIEN')
}
add('Lenor adoucissant 1.5L printemps', 4.20, 'ENTRETIEN')
add('Lenor adoucissant 1.5L lavande', 4.20, 'ENTRETIEN')
add('Soupline adoucissant 1.5L', 3.90, 'ENTRETIEN')
add('MDD adoucissant 2L', 2.20, 'ENTRETIEN')
for (const [brand, delta] of [['Mir', 0.30], ['Palmolive', 0.30], ['Paic', 0.20], ['Fairy', 0.40], ['MDD', 0]] as [string, number][]) {
  add(`${brand} liquide vaisselle citron 500ml`, 1.60 + delta, 'ENTRETIEN')
  add(`${brand} liquide vaisselle original 1L`, 2.50 + delta, 'ENTRETIEN')
}
for (const [brand, delta] of [['Finish', 0.60], ['Somat', 0.40], ['MDD', 0]] as [string, number][]) {
  add(`${brand} tablettes lave-vaisselle x30`, 5.90 + delta, 'ENTRETIEN')
  add(`${brand} tablettes lave-vaisselle x50`, 8.90 + delta, 'ENTRETIEN')
}
add('Finish sel lave-vaisselle 1kg', 1.80, 'ENTRETIEN')
add('MDD sel lave-vaisselle 1kg', 1.20, 'ENTRETIEN')
add('Finish liquide rinçage 800ml', 4.20, 'ENTRETIEN')
add('Mr Propre nettoyant multi-surfaces 750ml', 2.50, 'ENTRETIEN')
add('Cillit Bang calcaire 750ml', 3.50, 'ENTRETIEN')
add('Cillit Bang salle de bains 750ml', 3.50, 'ENTRETIEN')
add('Harpic nettoyant WC 750ml', 2.80, 'ENTRETIEN')
add('Harpic canalisations 500ml', 4.20, 'ENTRETIEN')
add('Destop déboucheur 1L', 4.20, 'ENTRETIEN')
add('Ajax nettoyant vitres 500ml', 2.30, 'ENTRETIEN')
add('MDD nettoyant multi-surfaces 750ml', 1.40, 'ENTRETIEN')
add('MDD javel liquide 1L', 1.20, 'ENTRETIEN')
add('MDD javel liquide 2.5L', 2.50, 'ENTRETIEN')
add('Febreze spray air 300ml', 3.80, 'ENTRETIEN')
add('MDD désodorisant air 400ml', 2.20, 'ENTRETIEN')
add('Flash nettoyant sol 1L', 3.20, 'ENTRETIEN')
add('Swiffer lingettes recharges x8', 6.90, 'ENTRETIEN')
add('Lavette microfibre x5', 3.50, 'ENTRETIEN')
for (const [brand, delta] of [['Lotus', 0.50], ['Okay', 0.20], ['MDD', 0]] as [string, number][]) {
  add(`${brand} papier toilette x6`, 3.20 + delta, 'ENTRETIEN')
  add(`${brand} papier toilette x12`, 5.90 + delta * 2, 'ENTRETIEN')
  add(`${brand} papier toilette x24`, 10.90 + delta * 3, 'ENTRETIEN')
  add(`${brand} essuie-tout x3`, 3.80 + delta, 'ENTRETIEN')
  add(`${brand} essuie-tout x6`, 6.90 + delta * 1.5, 'ENTRETIEN')
}
add('Sopalin essuie-tout x6', 6.80, 'ENTRETIEN')
add('Handy Bag sacs poubelle 30L x20', 3.20, 'ENTRETIEN')
add('MDD sacs poubelle 30L x20', 2.10, 'ENTRETIEN')
add('MDD sacs poubelle 50L x20', 2.80, 'ENTRETIEN')
add('MDD sacs poubelle 100L x10', 3.20, 'ENTRETIEN')
add('Albal papier aluminium 20m', 2.40, 'ENTRETIEN')
add('MDD film alimentaire 50m', 1.80, 'ENTRETIEN')
add('MDD sacs congélation x50', 2.10, 'ENTRETIEN')
add('MDD sacs de conservation x40', 2.50, 'ENTRETIEN')
add('Spontex éponges classiques x3', 2.20, 'ENTRETIEN')
add('MDD éponges grattantes x6', 1.80, 'ENTRETIEN')
add('Spontex grattoir inox x3', 2.50, 'ENTRETIEN')

// ── 21. BÉBÉ ─────────────────────────────────────────────────────────────────
for (const [brand, delta] of [['Pampers', 1.50], ['Huggies', 1.00], ['Love & Green', 1.80], ['MDD', 0]] as [string, number][]) {
  for (const taille of ['1 (2-5kg) x40', '2 (3-6kg) x40', '3 (4-9kg) x40', '4 (7-18kg) x40', '5 (11-25kg) x38', '6 (13kg+) x36']) {
    add(`${brand} couches taille ${taille}`, 8.90 + delta, 'BÉBÉ')
  }
}
for (const [brand, delta] of [['Gallia', 0.50], ['Guigoz', 0.40], ['Modilac', 0.60], ['MDD', 0]] as [string, number][]) {
  add(`${brand} lait infantile 1er âge 800g`, 13.90 + delta * 2, 'BÉBÉ')
  add(`${brand} lait infantile 2ème âge 800g`, 13.50 + delta * 2, 'BÉBÉ')
  add(`${brand} lait infantile 3ème âge 800g`, 12.90 + delta * 2, 'BÉBÉ')
  add(`${brand} lait de croissance 1L`, 3.90 + delta, 'BÉBÉ')
}
for (const [brand, delta] of [['Blédina', 0.40], ['Nestlé bébé', 0.30], ['MDD', 0]] as [string, number][]) {
  add(`${brand} petits pots légumes x2`, 1.60 + delta, 'BÉBÉ')
  add(`${brand} petits pots fruits x2`, 1.50 + delta, 'BÉBÉ')
  add(`${brand} petits pots viande légumes x2`, 2.10 + delta, 'BÉBÉ')
  add(`${brand} compotes bébé x4`, 2.20 + delta, 'BÉBÉ')
  add(`${brand} céréales bébé 250g`, 3.20 + delta, 'BÉBÉ')
  add(`${brand} petites gourdes fruits x4`, 2.80 + delta, 'BÉBÉ')
}
add('Eau minérale bébé Évian 1L', 0.80, 'BÉBÉ')
add('MDD eau faiblement minéralisée bébé 1L', 0.60, 'BÉBÉ')
add('Blédina biscuits bébé x24', 2.90, 'BÉBÉ')
add('MDD biscuits bébé x18', 1.80, 'BÉBÉ')
add('Huggies lingettes sensitive x56', 2.90, 'BÉBÉ')
add('Pampers lingettes bébé x80', 3.50, 'BÉBÉ')
add('MDD lingettes bébé sensitive x72', 2.20, 'BÉBÉ')
add('Mustela gel lavant 200ml', 7.90, 'BÉBÉ')
add('MDD crème change bébé 75ml', 3.20, 'BÉBÉ')

// ── 22. ANIMAUX ───────────────────────────────────────────────────────────────
for (const [brand, delta] of [['Royal Canin', 2.00], ['Purina One', 0.80], ['Purina Pro Plan', 1.50], ['Whiskas', 0.30], ['Felix', 0.40], ['Friskies', 0.20], ['MDD', 0]] as [string, number][]) {
  add(`${brand} croquettes chat adulte 2kg`, 6.50 + delta, 'ANIMAUX')
  add(`${brand} croquettes chat stérilisé 2kg`, 7.20 + delta, 'ANIMAUX')
  add(`${brand} croquettes chat senior 2kg`, 7.50 + delta, 'ANIMAUX')
}
for (const [brand, delta] of [['Whiskas', 0.50], ['Felix', 0.60], ['Sheba', 1.00], ['Purina', 0.40], ['MDD', 0]] as [string, number][]) {
  add(`${brand} pâtée chat volaille x12`, 5.20 + delta, 'ANIMAUX')
  add(`${brand} pâtée chat poisson x12`, 5.50 + delta, 'ANIMAUX')
  add(`${brand} pâtée chat boeuf x12`, 5.20 + delta, 'ANIMAUX')
}
add('Whiskas friandises chat 60g', 1.50, 'ANIMAUX')
add('Temptations friandises chat 75g', 2.20, 'ANIMAUX')
add('Royal Canin chat Kitten 2kg', 14.90, 'ANIMAUX')
for (const [brand, delta] of [['Royal Canin', 3.00], ['Pedigree', 0.50], ['Eukanuba', 2.50], ['Purina Pro Plan', 2.00], ['Hill\'s Science', 3.50], ['MDD', 0]] as [string, number][]) {
  add(`${brand} croquettes chien adulte 4kg`, 14.90 + delta, 'ANIMAUX')
  add(`${brand} croquettes chien adulte 10kg`, 32.90 + delta * 2, 'ANIMAUX')
  add(`${brand} croquettes chien senior 4kg`, 15.90 + delta, 'ANIMAUX')
}
for (const [brand, delta] of [['Pedigree', 0.40], ['Purina', 0.30], ['MDD', 0]] as [string, number][]) {
  add(`${brand} pâtée chien boeuf x12`, 8.50 + delta, 'ANIMAUX')
  add(`${brand} pâtée chien poulet x12`, 8.50 + delta, 'ANIMAUX')
}
add('Pedigree friandises chien 180g', 2.90, 'ANIMAUX')
add('Purina Dentalife friandises chien x105g', 4.20, 'ANIMAUX')
add('Catsan litière naturelle 10L', 7.90, 'ANIMAUX')
add('MDD litière minérale 10L', 3.90, 'ANIMAUX')
add('MDD litière agglomérante 5L', 4.50, 'ANIMAUX')
add('Ever Clean litière agglomérante 6L', 9.90, 'ANIMAUX')

// ── 23. BIO & SANTÉ ──────────────────────────────────────────────────────────
for (const type of ['lait demi-écrémé 1L', "beurre doux 250g", 'yaourt nature x4', 'fromage blanc 500g', 'oeufs plein air x6', 'spaghetti 500g', 'penne 500g', 'riz basmati 1kg', 'quinoa 400g', 'farine T55 1kg', 'farine T80 1kg', "huile d'olive 75cl", 'huile de colza 1L', 'compote pomme x4', 'muesli 500g', "flocons d'avoine 500g", 'tofu nature 400g', 'tempeh 200g', 'seitan 200g']) {
  add(`Bio Village ${type} bio`, Math.round((1.80 + Math.random() * 3) * 100) / 100, 'BIO SANTÉ')
  add(`Bjorg ${type} bio`, Math.round((2.00 + Math.random() * 3) * 100) / 100, 'BIO SANTÉ')
}
add('Gerblé pain grillé sans gluten x250g', 3.20, 'BIO SANTÉ')
add('Grillon d\'Or pain de mie sans gluten 400g', 3.90, 'BIO SANTÉ')
add('MDD pâtes sans gluten fusilli 400g', 2.10, 'BIO SANTÉ')
add('Bjorg galettes de riz épeautre x16', 2.80, 'BIO SANTÉ')
add('Hipp céréales bébé bio 250g', 3.90, 'BIO SANTÉ')
add('Innocent pomme bio 1L', 3.50, 'BIO SANTÉ')
add('Biocoop lentilles vertes bio 500g', 2.80, 'BIO SANTÉ')
add('Protéines de soja texturé 250g', 3.50, 'BIO SANTÉ')
add('Graines de chia 250g', 4.20, 'BIO SANTÉ')
add('Spiruline comprimés x100', 8.90, 'BIO SANTÉ')
add('MDD amarante 400g bio', 3.50, 'BIO SANTÉ')
add('Tofutti fromage blanc soja 250g', 3.80, 'BIO SANTÉ')

// ── 24. CUISINE DU MONDE ─────────────────────────────────────────────────────
add('Sauce teriyaki Kikkoman 250ml', 2.80, 'CUISINE DU MONDE')
add('Sauce oyster Lee Kum Kee 150ml', 2.50, 'CUISINE DU MONDE')
add('Pâte miso Hikari 500g', 4.80, 'CUISINE DU MONDE')
add('Sauce nuoc-mâm 500ml', 2.90, 'CUISINE DU MONDE')
add('Lait de coco Aroy-D 400ml', 1.90, 'CUISINE DU MONDE')
add('Pâte de curry rouge Thai 50g', 2.30, 'CUISINE DU MONDE')
add('Pâte de curry vert Thai 50g', 2.30, 'CUISINE DU MONDE')
add('Sauce sriracha Huy Fong 500ml', 4.50, 'CUISINE DU MONDE')
add('Vinaigre de riz 500ml', 2.20, 'CUISINE DU MONDE')
add('Huile de sésame grillé 250ml', 3.90, 'CUISINE DU MONDE')
add('Wasabi en tube 43g', 2.50, 'CUISINE DU MONDE')
add('Gari gingembre mariné 130g', 2.80, 'CUISINE DU MONDE')
add('Nori feuilles x10', 3.50, 'CUISINE DU MONDE')
add('Riz à sushi 500g', 2.80, 'CUISINE DU MONDE')
add('Edamame surgelé 400g', 3.20, 'CUISINE DU MONDE', true)
add('Gyoza porc surgelé x12', 5.90, 'CUISINE DU MONDE', true)
add('Samossas légumes x12', 5.50, 'CUISINE DU MONDE', true)
add('Nems crevettes x8', 5.20, 'CUISINE DU MONDE', true)
add('Harissa Loulou 135g', 1.90, 'CUISINE DU MONDE')
add('Ras-el-hanout 50g', 2.20, 'CUISINE DU MONDE')
add('Zaatar 50g', 2.40, 'CUISINE DU MONDE')
add('Sumac 40g', 2.80, 'CUISINE DU MONDE')
add('Falafel mix 200g', 2.50, 'CUISINE DU MONDE')
add('Houmous Sabra 340g', 3.80, 'CUISINE DU MONDE')
add('Tzatziki 200g', 2.40, 'CUISINE DU MONDE')
add('Sauce enchilada 250ml', 2.90, 'CUISINE DU MONDE')
add('Tacos Old El Paso x8', 2.80, 'CUISINE DU MONDE')
add('Tortillas blé Old El Paso x8', 2.80, 'CUISINE DU MONDE')
add('Sauce salsa Old El Paso 230g', 2.60, 'CUISINE DU MONDE')
add('Guacamole Old El Paso 230g', 3.20, 'CUISINE DU MONDE')
add('Pesto rosso Barilla 190g', 3.10, 'CUISINE DU MONDE')
add('Polenta Rapunzel 500g', 2.40, 'CUISINE DU MONDE')
add('Farine de pois chiche 500g', 2.80, 'CUISINE DU MONDE')
add('Vermicelles de verre 200g', 1.80, 'CUISINE DU MONDE')
add('Galettes de riz vietnamien 200g', 2.30, 'CUISINE DU MONDE')

// ─────────────────────────────────────────────────────────────────────────────
// SEEDING LOGIC
// ─────────────────────────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function calcPrice(base: number, storeMin: number, storeMax: number): number {
  const factor = rand(storeMin, storeMax) * rand(0.97, 1.03)
  return Math.max(0.01, Math.round(base * factor * 100) / 100)
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

interface PriceEntry {
  product: Product
  store: typeof STORES[0]
  price: number
  postcode: string
}

async function main() {
  console.log('\n🧺  Basket Massive Seed Script')
  console.log('══════════════════════════════════════════\n')

  // ── Auth: sign up or sign in seed user ──
  console.log('🔐 Authenticating seed user...')
  let userId: string | undefined

  const { data: signUpData, error: signUpError } = await authClient.auth.signUp({
    email: 'seed@basket.app',
    password: 'seedpassword123456',
  })

  if (!signUpError && signUpData.user?.id) {
    userId = signUpData.user.id
    console.log(`   ✓ Signed up: ${userId}`)
  } else {
    const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
      email: 'seed@basket.app',
      password: 'seedpassword123456',
    })
    if (signInError || !signInData.user?.id) {
      console.error('   ✗ Auth failed:', signInError?.message)
      process.exit(1)
    }
    userId = signInData.user.id
    console.log(`   ✓ Signed in: ${userId}`)
  }

  // ── Build flat list of all entries ──
  console.log('\n📦 Building product catalog...')
  const today = new Date().toISOString().split('T')[0]
  const allEntries: PriceEntry[] = []

  for (const product of PRODUCTS) {
    for (const store of STORES) {
      if (store.frozenOnly && !product.isFrozen) continue
      allEntries.push({
        product,
        store,
        price: calcPrice(product.basePrice, store.min, store.max),
        postcode: pickRandom(POSTCODES),
      })
    }
  }

  const categories = [...new Set(PRODUCTS.map(p => p.category))]
  console.log(`   ${PRODUCTS.length} unique products`)
  console.log(`   ${allEntries.length} total price entries to insert`)
  console.log(`   ${categories.length} categories\n`)

  const BATCH_SIZE = 100
  let totalInserted = 0
  let totalErrors = 0

  // ── Insert by category for readable progress ──
  for (const category of categories) {
    const catEntries = allEntries.filter(e => e.product.category === category)
    const numBatches = Math.ceil(catEntries.length / BATCH_SIZE)

    for (let b = 0; b < numBatches; b++) {
      const batch = catEntries.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE)

      // Insert receipts
      const receiptRows = batch.map(e => ({
        user_id: userId!,
        store_name: e.store.name,
        total_amount: e.price,
        receipt_date: today,
        postcode: e.postcode,
      }))

      const { data: receipts, error: receiptError } = await supabase
        .from('receipts')
        .insert(receiptRows)
        .select('id')

      if (receiptError || !receipts) {
        totalErrors += batch.length
        process.stdout.write(`\r   ${category.padEnd(28)} | Batch ${String(b + 1).padStart(3)}/${numBatches} | ✓ ${totalInserted} / ✗ ${totalErrors}`)
        continue
      }

      // Insert price_items using returned receipt IDs
      const itemRows = batch.map((e, idx) => ({
        receipt_id: receipts[idx].id,
        user_id: userId!,
        item_name: e.product.name,
        item_name_normalised: e.product.normalised,
        quantity: 1,
        unit_price: e.price,
        total_price: e.price,
        store_name: e.store.name,
        postcode: e.postcode,
      }))

      const { error: itemError } = await supabase
        .from('price_items')
        .insert(itemRows)

      if (itemError) {
        totalErrors += batch.length
      } else {
        totalInserted += batch.length
      }

      process.stdout.write(`\r   ${category.padEnd(28)} | Batch ${String(b + 1).padStart(3)}/${numBatches} | ✓ ${totalInserted} / ✗ ${totalErrors}  `)
    }
    console.log() // newline after each category
  }

  console.log('\n══════════════════════════════════════════')
  console.log(`✅  Done!`)
  console.log(`   Inserted:  ${totalInserted} price entries`)
  console.log(`   Errors:    ${totalErrors}`)
  console.log(`   Products:  ${PRODUCTS.length} unique`)
  console.log(`   Stores:    ${STORES.length}`)
  console.log(`   Target:    ${allEntries.length}`)
  console.log('══════════════════════════════════════════\n')

  await authClient.auth.signOut()
  process.exit(0)
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err)
  process.exit(1)
})
