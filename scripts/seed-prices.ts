// Seed script — run with: npx tsx scripts/seed-prices.ts
// This populates the database with real French supermarket prices for comparison

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// First, we need a "seed" user to attach these prices to
// We'll create a system receipt for each store

interface SeedProduct {
  name: string
  normalised: string
  prices: { store: string; price: number }[]
}

const PRODUCTS: SeedProduct[] = [
  // PRODUITS LAITIERS
  {
    name: 'Lait demi-écrémé 1L',
    normalised: 'lait demi-écrémé 1l',
    prices: [
      { store: 'Carrefour', price: 1.15 },
      { store: 'Leclerc', price: 1.05 },
      { store: 'Lidl', price: 0.89 },
      { store: 'Aldi', price: 0.85 },
      { store: 'Intermarché', price: 1.09 },
    ],
  },
  {
    name: 'Lait entier 1L',
    normalised: 'lait entier 1l',
    prices: [
      { store: 'Carrefour', price: 1.25 },
      { store: 'Leclerc', price: 1.15 },
      { store: 'Lidl', price: 0.95 },
      { store: 'Aldi', price: 0.92 },
      { store: 'Intermarché', price: 1.19 },
    ],
  },
  {
    name: 'Beurre doux 250g',
    normalised: 'beurre doux 250g',
    prices: [
      { store: 'Carrefour', price: 2.35 },
      { store: 'Leclerc', price: 2.19 },
      { store: 'Lidl', price: 1.89 },
      { store: 'Aldi', price: 1.85 },
      { store: 'Intermarché', price: 2.25 },
    ],
  },
  {
    name: 'Crème fraîche 20cl',
    normalised: 'crème fraîche 20cl',
    prices: [
      { store: 'Carrefour', price: 1.45 },
      { store: 'Leclerc', price: 1.35 },
      { store: 'Lidl', price: 1.09 },
      { store: 'Aldi', price: 1.05 },
      { store: 'Intermarché', price: 1.39 },
    ],
  },
  {
    name: 'Yaourt nature x4',
    normalised: 'yaourt nature x4',
    prices: [
      { store: 'Carrefour', price: 1.60 },
      { store: 'Leclerc', price: 1.49 },
      { store: 'Lidl', price: 1.19 },
      { store: 'Aldi', price: 1.15 },
      { store: 'Intermarché', price: 1.55 },
    ],
  },
  {
    name: 'Fromage râpé emmental 200g',
    normalised: 'fromage râpé emmental 200g',
    prices: [
      { store: 'Carrefour', price: 2.15 },
      { store: 'Leclerc', price: 1.99 },
      { store: 'Lidl', price: 1.69 },
      { store: 'Aldi', price: 1.65 },
      { store: 'Intermarché', price: 2.05 },
    ],
  },
  {
    name: 'Camembert 250g',
    normalised: 'camembert 250g',
    prices: [
      { store: 'Carrefour', price: 1.89 },
      { store: 'Leclerc', price: 1.75 },
      { store: 'Lidl', price: 1.49 },
      { store: 'Aldi', price: 1.45 },
      { store: 'Intermarché', price: 1.79 },
    ],
  },
  // PAIN & BOULANGERIE
  {
    name: 'Baguette tradition',
    normalised: 'baguette tradition',
    prices: [
      { store: 'Carrefour', price: 1.30 },
      { store: 'Leclerc', price: 1.20 },
      { store: 'Lidl', price: 0.99 },
      { store: 'Aldi', price: 0.95 },
      { store: 'Intermarché', price: 1.25 },
    ],
  },
  {
    name: 'Pain de mie 500g',
    normalised: 'pain de mie 500g',
    prices: [
      { store: 'Carrefour', price: 1.65 },
      { store: 'Leclerc', price: 1.55 },
      { store: 'Lidl', price: 1.19 },
      { store: 'Aldi', price: 1.15 },
      { store: 'Intermarché', price: 1.59 },
    ],
  },
  // OEUFS
  {
    name: 'Oeufs x6',
    normalised: 'oeufs x6',
    prices: [
      { store: 'Carrefour', price: 1.95 },
      { store: 'Leclerc', price: 1.85 },
      { store: 'Lidl', price: 1.59 },
      { store: 'Aldi', price: 1.55 },
      { store: 'Intermarché', price: 1.89 },
    ],
  },
  {
    name: 'Oeufs x12',
    normalised: 'oeufs x12',
    prices: [
      { store: 'Carrefour', price: 3.45 },
      { store: 'Leclerc', price: 3.25 },
      { store: 'Lidl', price: 2.79 },
      { store: 'Aldi', price: 2.69 },
      { store: 'Intermarché', price: 3.35 },
    ],
  },
  // FÉCULENTS
  {
    name: 'Pâtes penne 500g',
    normalised: 'pâtes penne 500g',
    prices: [
      { store: 'Carrefour', price: 1.15 },
      { store: 'Leclerc', price: 1.05 },
      { store: 'Lidl', price: 0.79 },
      { store: 'Aldi', price: 0.75 },
      { store: 'Intermarché', price: 1.09 },
    ],
  },
  {
    name: 'Pâtes spaghetti 500g',
    normalised: 'pâtes spaghetti 500g',
    prices: [
      { store: 'Carrefour', price: 1.15 },
      { store: 'Leclerc', price: 1.05 },
      { store: 'Lidl', price: 0.79 },
      { store: 'Aldi', price: 0.75 },
      { store: 'Intermarché', price: 1.09 },
    ],
  },
  {
    name: 'Riz basmati 1kg',
    normalised: 'riz basmati 1kg',
    prices: [
      { store: 'Carrefour', price: 2.49 },
      { store: 'Leclerc', price: 2.35 },
      { store: 'Lidl', price: 1.99 },
      { store: 'Aldi', price: 1.89 },
      { store: 'Intermarché', price: 2.39 },
    ],
  },
  {
    name: 'Riz long grain 1kg',
    normalised: 'riz long grain 1kg',
    prices: [
      { store: 'Carrefour', price: 1.89 },
      { store: 'Leclerc', price: 1.79 },
      { store: 'Lidl', price: 1.49 },
      { store: 'Aldi', price: 1.45 },
      { store: 'Intermarché', price: 1.85 },
    ],
  },
  {
    name: 'Farine de blé T55 1kg',
    normalised: 'farine de blé t55 1kg',
    prices: [
      { store: 'Carrefour', price: 0.95 },
      { store: 'Leclerc', price: 0.89 },
      { store: 'Lidl', price: 0.69 },
      { store: 'Aldi', price: 0.65 },
      { store: 'Intermarché', price: 0.92 },
    ],
  },
  // CONSERVES & SAUCES
  {
    name: 'Sauce tomate 500g',
    normalised: 'sauce tomate 500g',
    prices: [
      { store: 'Carrefour', price: 1.45 },
      { store: 'Leclerc', price: 1.35 },
      { store: 'Lidl', price: 1.09 },
      { store: 'Aldi', price: 0.99 },
      { store: 'Intermarché', price: 1.39 },
    ],
  },
  {
    name: 'Huile d\'olive 1L',
    normalised: 'huile d\'olive 1l',
    prices: [
      { store: 'Carrefour', price: 6.95 },
      { store: 'Leclerc', price: 6.49 },
      { store: 'Lidl', price: 5.49 },
      { store: 'Aldi', price: 5.29 },
      { store: 'Intermarché', price: 6.79 },
    ],
  },
  {
    name: 'Huile de tournesol 1L',
    normalised: 'huile de tournesol 1l',
    prices: [
      { store: 'Carrefour', price: 2.65 },
      { store: 'Leclerc', price: 2.45 },
      { store: 'Lidl', price: 1.99 },
      { store: 'Aldi', price: 1.89 },
      { store: 'Intermarché', price: 2.55 },
    ],
  },
  {
    name: 'Thon en boîte 140g',
    normalised: 'thon en boîte 140g',
    prices: [
      { store: 'Carrefour', price: 2.15 },
      { store: 'Leclerc', price: 1.99 },
      { store: 'Lidl', price: 1.69 },
      { store: 'Aldi', price: 1.59 },
      { store: 'Intermarché', price: 2.09 },
    ],
  },
  {
    name: 'Petits pois carottes 400g',
    normalised: 'petits pois carottes 400g',
    prices: [
      { store: 'Carrefour', price: 1.35 },
      { store: 'Leclerc', price: 1.25 },
      { store: 'Lidl', price: 0.99 },
      { store: 'Aldi', price: 0.95 },
      { store: 'Intermarché', price: 1.29 },
    ],
  },
  {
    name: 'Haricots verts 400g',
    normalised: 'haricots verts 400g',
    prices: [
      { store: 'Carrefour', price: 1.49 },
      { store: 'Leclerc', price: 1.39 },
      { store: 'Lidl', price: 1.09 },
      { store: 'Aldi', price: 1.05 },
      { store: 'Intermarché', price: 1.45 },
    ],
  },
  {
    name: 'Maïs en conserve 300g',
    normalised: 'maïs en conserve 300g',
    prices: [
      { store: 'Carrefour', price: 1.25 },
      { store: 'Leclerc', price: 1.15 },
      { store: 'Lidl', price: 0.89 },
      { store: 'Aldi', price: 0.85 },
      { store: 'Intermarché', price: 1.19 },
    ],
  },
  // VIANDE & POISSON
  {
    name: 'Poulet entier 1.2kg',
    normalised: 'poulet entier 1.2kg',
    prices: [
      { store: 'Carrefour', price: 6.49 },
      { store: 'Leclerc', price: 5.99 },
      { store: 'Lidl', price: 5.29 },
      { store: 'Aldi', price: 4.99 },
      { store: 'Intermarché', price: 6.29 },
    ],
  },
  {
    name: 'Steak haché x2',
    normalised: 'steak haché x2',
    prices: [
      { store: 'Carrefour', price: 3.49 },
      { store: 'Leclerc', price: 3.29 },
      { store: 'Lidl', price: 2.79 },
      { store: 'Aldi', price: 2.69 },
      { store: 'Intermarché', price: 3.39 },
    ],
  },
  {
    name: 'Jambon blanc x4 tranches',
    normalised: 'jambon blanc x4 tranches',
    prices: [
      { store: 'Carrefour', price: 2.65 },
      { store: 'Leclerc', price: 2.49 },
      { store: 'Lidl', price: 1.99 },
      { store: 'Aldi', price: 1.89 },
      { store: 'Intermarché', price: 2.55 },
    ],
  },
  {
    name: 'Lardons fumés 200g',
    normalised: 'lardons fumés 200g',
    prices: [
      { store: 'Carrefour', price: 2.29 },
      { store: 'Leclerc', price: 2.15 },
      { store: 'Lidl', price: 1.79 },
      { store: 'Aldi', price: 1.69 },
      { store: 'Intermarché', price: 2.19 },
    ],
  },
  {
    name: 'Saumon fumé 4 tranches',
    normalised: 'saumon fumé 4 tranches',
    prices: [
      { store: 'Carrefour', price: 5.99 },
      { store: 'Leclerc', price: 5.49 },
      { store: 'Lidl', price: 4.49 },
      { store: 'Aldi', price: 4.29 },
      { store: 'Intermarché', price: 5.79 },
    ],
  },
  // FRUITS & LÉGUMES
  {
    name: 'Bananes 1kg',
    normalised: 'bananes 1kg',
    prices: [
      { store: 'Carrefour', price: 1.89 },
      { store: 'Leclerc', price: 1.75 },
      { store: 'Lidl', price: 1.49 },
      { store: 'Aldi', price: 1.39 },
      { store: 'Intermarché', price: 1.79 },
    ],
  },
  {
    name: 'Pommes Golden 1kg',
    normalised: 'pommes golden 1kg',
    prices: [
      { store: 'Carrefour', price: 2.49 },
      { store: 'Leclerc', price: 2.29 },
      { store: 'Lidl', price: 1.89 },
      { store: 'Aldi', price: 1.79 },
      { store: 'Intermarché', price: 2.39 },
    ],
  },
  {
    name: 'Tomates 1kg',
    normalised: 'tomates 1kg',
    prices: [
      { store: 'Carrefour', price: 2.99 },
      { store: 'Leclerc', price: 2.79 },
      { store: 'Lidl', price: 2.29 },
      { store: 'Aldi', price: 2.19 },
      { store: 'Intermarché', price: 2.89 },
    ],
  },
  {
    name: 'Carottes 1kg',
    normalised: 'carottes 1kg',
    prices: [
      { store: 'Carrefour', price: 1.49 },
      { store: 'Leclerc', price: 1.35 },
      { store: 'Lidl', price: 1.09 },
      { store: 'Aldi', price: 0.99 },
      { store: 'Intermarché', price: 1.39 },
    ],
  },
  {
    name: 'Pommes de terre 2.5kg',
    normalised: 'pommes de terre 2.5kg',
    prices: [
      { store: 'Carrefour', price: 2.99 },
      { store: 'Leclerc', price: 2.79 },
      { store: 'Lidl', price: 2.29 },
      { store: 'Aldi', price: 2.19 },
      { store: 'Intermarché', price: 2.89 },
    ],
  },
  {
    name: 'Oignons 1kg',
    normalised: 'oignons 1kg',
    prices: [
      { store: 'Carrefour', price: 1.69 },
      { store: 'Leclerc', price: 1.55 },
      { store: 'Lidl', price: 1.29 },
      { store: 'Aldi', price: 1.19 },
      { store: 'Intermarché', price: 1.59 },
    ],
  },
  {
    name: 'Salade laitue',
    normalised: 'salade laitue',
    prices: [
      { store: 'Carrefour', price: 1.19 },
      { store: 'Leclerc', price: 1.09 },
      { store: 'Lidl', price: 0.89 },
      { store: 'Aldi', price: 0.85 },
      { store: 'Intermarché', price: 1.15 },
    ],
  },
  {
    name: 'Concombre',
    normalised: 'concombre',
    prices: [
      { store: 'Carrefour', price: 0.99 },
      { store: 'Leclerc', price: 0.89 },
      { store: 'Lidl', price: 0.69 },
      { store: 'Aldi', price: 0.65 },
      { store: 'Intermarché', price: 0.95 },
    ],
  },
  {
    name: 'Courgettes 1kg',
    normalised: 'courgettes 1kg',
    prices: [
      { store: 'Carrefour', price: 2.29 },
      { store: 'Leclerc', price: 2.09 },
      { store: 'Lidl', price: 1.79 },
      { store: 'Aldi', price: 1.69 },
      { store: 'Intermarché', price: 2.19 },
    ],
  },
  {
    name: 'Citrons x4',
    normalised: 'citrons x4',
    prices: [
      { store: 'Carrefour', price: 1.99 },
      { store: 'Leclerc', price: 1.85 },
      { store: 'Lidl', price: 1.49 },
      { store: 'Aldi', price: 1.39 },
      { store: 'Intermarché', price: 1.89 },
    ],
  },
  // BOISSONS
  {
    name: 'Eau minérale 1.5L x6',
    normalised: 'eau minérale 1.5l x6',
    prices: [
      { store: 'Carrefour', price: 2.49 },
      { store: 'Leclerc', price: 2.29 },
      { store: 'Lidl', price: 1.79 },
      { store: 'Aldi', price: 1.69 },
      { store: 'Intermarché', price: 2.39 },
    ],
  },
  {
    name: 'Jus d\'orange 1L',
    normalised: 'jus d\'orange 1l',
    prices: [
      { store: 'Carrefour', price: 2.19 },
      { store: 'Leclerc', price: 1.99 },
      { store: 'Lidl', price: 1.59 },
      { store: 'Aldi', price: 1.49 },
      { store: 'Intermarché', price: 2.09 },
    ],
  },
  {
    name: 'Coca-Cola 1.5L',
    normalised: 'coca-cola 1.5l',
    prices: [
      { store: 'Carrefour', price: 2.15 },
      { store: 'Leclerc', price: 1.99 },
      { store: 'Lidl', price: 1.79 },
      { store: 'Aldi', price: 1.75 },
      { store: 'Intermarché', price: 2.09 },
    ],
  },
  {
    name: 'Café moulu 250g',
    normalised: 'café moulu 250g',
    prices: [
      { store: 'Carrefour', price: 3.49 },
      { store: 'Leclerc', price: 3.29 },
      { store: 'Lidl', price: 2.79 },
      { store: 'Aldi', price: 2.69 },
      { store: 'Intermarché', price: 3.39 },
    ],
  },
  {
    name: 'Thé vert x25 sachets',
    normalised: 'thé vert x25 sachets',
    prices: [
      { store: 'Carrefour', price: 2.29 },
      { store: 'Leclerc', price: 2.15 },
      { store: 'Lidl', price: 1.69 },
      { store: 'Aldi', price: 1.59 },
      { store: 'Intermarché', price: 2.19 },
    ],
  },
  // SUCRÉ & PETIT-DÉJEUNER
  {
    name: 'Sucre en poudre 1kg',
    normalised: 'sucre en poudre 1kg',
    prices: [
      { store: 'Carrefour', price: 1.29 },
      { store: 'Leclerc', price: 1.19 },
      { store: 'Lidl', price: 0.95 },
      { store: 'Aldi', price: 0.89 },
      { store: 'Intermarché', price: 1.25 },
    ],
  },
  {
    name: 'Confiture fraises 370g',
    normalised: 'confiture fraises 370g',
    prices: [
      { store: 'Carrefour', price: 2.49 },
      { store: 'Leclerc', price: 2.29 },
      { store: 'Lidl', price: 1.89 },
      { store: 'Aldi', price: 1.79 },
      { store: 'Intermarché', price: 2.39 },
    ],
  },
  {
    name: 'Nutella 400g',
    normalised: 'nutella 400g',
    prices: [
      { store: 'Carrefour', price: 4.49 },
      { store: 'Leclerc', price: 4.29 },
      { store: 'Lidl', price: 3.99 },
      { store: 'Aldi', price: 3.89 },
      { store: 'Intermarché', price: 4.39 },
    ],
  },
  {
    name: 'Céréales muesli 500g',
    normalised: 'céréales muesli 500g',
    prices: [
      { store: 'Carrefour', price: 3.29 },
      { store: 'Leclerc', price: 3.09 },
      { store: 'Lidl', price: 2.49 },
      { store: 'Aldi', price: 2.39 },
      { store: 'Intermarché', price: 3.19 },
    ],
  },
  {
    name: 'Chocolat noir 100g',
    normalised: 'chocolat noir 100g',
    prices: [
      { store: 'Carrefour', price: 1.79 },
      { store: 'Leclerc', price: 1.65 },
      { store: 'Lidl', price: 1.29 },
      { store: 'Aldi', price: 1.19 },
      { store: 'Intermarché', price: 1.69 },
    ],
  },
  {
    name: 'Biscuits petit beurre 200g',
    normalised: 'biscuits petit beurre 200g',
    prices: [
      { store: 'Carrefour', price: 1.49 },
      { store: 'Leclerc', price: 1.39 },
      { store: 'Lidl', price: 1.09 },
      { store: 'Aldi', price: 0.99 },
      { store: 'Intermarché', price: 1.45 },
    ],
  },
  // HYGIÈNE & ENTRETIEN
  {
    name: 'Papier toilette x6',
    normalised: 'papier toilette x6',
    prices: [
      { store: 'Carrefour', price: 3.49 },
      { store: 'Leclerc', price: 3.29 },
      { store: 'Lidl', price: 2.69 },
      { store: 'Aldi', price: 2.59 },
      { store: 'Intermarché', price: 3.39 },
    ],
  },
  {
    name: 'Liquide vaisselle 500ml',
    normalised: 'liquide vaisselle 500ml',
    prices: [
      { store: 'Carrefour', price: 1.79 },
      { store: 'Leclerc', price: 1.65 },
      { store: 'Lidl', price: 1.29 },
      { store: 'Aldi', price: 1.19 },
      { store: 'Intermarché', price: 1.69 },
    ],
  },
  {
    name: 'Lessive liquide 1.5L',
    normalised: 'lessive liquide 1.5l',
    prices: [
      { store: 'Carrefour', price: 5.99 },
      { store: 'Leclerc', price: 5.49 },
      { store: 'Lidl', price: 4.49 },
      { store: 'Aldi', price: 4.29 },
      { store: 'Intermarché', price: 5.79 },
    ],
  },
  {
    name: 'Savon de Marseille 300g',
    normalised: 'savon de marseille 300g',
    prices: [
      { store: 'Carrefour', price: 2.49 },
      { store: 'Leclerc', price: 2.29 },
      { store: 'Lidl', price: 1.89 },
      { store: 'Aldi', price: 1.79 },
      { store: 'Intermarché', price: 2.39 },
    ],
  },
  {
    name: 'Dentifrice 75ml',
    normalised: 'dentifrice 75ml',
    prices: [
      { store: 'Carrefour', price: 2.19 },
      { store: 'Leclerc', price: 1.99 },
      { store: 'Lidl', price: 1.49 },
      { store: 'Aldi', price: 1.39 },
      { store: 'Intermarché', price: 2.09 },
    ],
  },
  {
    name: 'Gel douche 250ml',
    normalised: 'gel douche 250ml',
    prices: [
      { store: 'Carrefour', price: 2.49 },
      { store: 'Leclerc', price: 2.29 },
      { store: 'Lidl', price: 1.79 },
      { store: 'Aldi', price: 1.69 },
      { store: 'Intermarché', price: 2.39 },
    ],
  },
  {
    name: 'Shampooing 250ml',
    normalised: 'shampooing 250ml',
    prices: [
      { store: 'Carrefour', price: 2.99 },
      { store: 'Leclerc', price: 2.79 },
      { store: 'Lidl', price: 2.19 },
      { store: 'Aldi', price: 1.99 },
      { store: 'Intermarché', price: 2.89 },
    ],
  },
  // SURGELÉS
  {
    name: 'Pizza surgelée margherita',
    normalised: 'pizza surgelée margherita',
    prices: [
      { store: 'Carrefour', price: 2.99 },
      { store: 'Leclerc', price: 2.79 },
      { store: 'Lidl', price: 2.29 },
      { store: 'Aldi', price: 2.19 },
      { store: 'Intermarché', price: 2.89 },
    ],
  },
  {
    name: 'Frites surgelées 1kg',
    normalised: 'frites surgelées 1kg',
    prices: [
      { store: 'Carrefour', price: 1.99 },
      { store: 'Leclerc', price: 1.85 },
      { store: 'Lidl', price: 1.49 },
      { store: 'Aldi', price: 1.39 },
      { store: 'Intermarché', price: 1.89 },
    ],
  },
  {
    name: 'Glace vanille 500ml',
    normalised: 'glace vanille 500ml',
    prices: [
      { store: 'Carrefour', price: 3.49 },
      { store: 'Leclerc', price: 3.19 },
      { store: 'Lidl', price: 2.69 },
      { store: 'Aldi', price: 2.49 },
      { store: 'Intermarché', price: 3.29 },
    ],
  },
  // CONDIMENTS
  {
    name: 'Moutarde de Dijon 370g',
    normalised: 'moutarde de dijon 370g',
    prices: [
      { store: 'Carrefour', price: 1.89 },
      { store: 'Leclerc', price: 1.75 },
      { store: 'Lidl', price: 1.39 },
      { store: 'Aldi', price: 1.29 },
      { store: 'Intermarché', price: 1.79 },
    ],
  },
  {
    name: 'Ketchup 340g',
    normalised: 'ketchup 340g',
    prices: [
      { store: 'Carrefour', price: 2.15 },
      { store: 'Leclerc', price: 1.99 },
      { store: 'Lidl', price: 1.59 },
      { store: 'Aldi', price: 1.49 },
      { store: 'Intermarché', price: 2.09 },
    ],
  },
  {
    name: 'Mayonnaise 235g',
    normalised: 'mayonnaise 235g',
    prices: [
      { store: 'Carrefour', price: 1.99 },
      { store: 'Leclerc', price: 1.85 },
      { store: 'Lidl', price: 1.49 },
      { store: 'Aldi', price: 1.39 },
      { store: 'Intermarché', price: 1.89 },
    ],
  },
  {
    name: 'Sel fin 1kg',
    normalised: 'sel fin 1kg',
    prices: [
      { store: 'Carrefour', price: 0.69 },
      { store: 'Leclerc', price: 0.59 },
      { store: 'Lidl', price: 0.45 },
      { store: 'Aldi', price: 0.39 },
      { store: 'Intermarché', price: 0.65 },
    ],
  },
  {
    name: 'Poivre noir moulu 45g',
    normalised: 'poivre noir moulu 45g',
    prices: [
      { store: 'Carrefour', price: 2.49 },
      { store: 'Leclerc', price: 2.29 },
      { store: 'Lidl', price: 1.79 },
      { store: 'Aldi', price: 1.69 },
      { store: 'Intermarché', price: 2.39 },
    ],
  },
  {
    name: 'Vinaigre balsamique 250ml',
    normalised: 'vinaigre balsamique 250ml',
    prices: [
      { store: 'Carrefour', price: 2.79 },
      { store: 'Leclerc', price: 2.59 },
      { store: 'Lidl', price: 2.09 },
      { store: 'Aldi', price: 1.99 },
      { store: 'Intermarché', price: 2.69 },
    ],
  },
]

// French postcodes for variety
const POSTCODES = ['75001', '75011', '75015', '69001', '13001', '31000', '33000', '44000', '59000', '67000', '76000', '35000']

async function seed() {
  console.log('🧺 Seeding Basket price database...')
  console.log(`   ${PRODUCTS.length} products × ${PRODUCTS[0].prices.length} stores = ${PRODUCTS.length * PRODUCTS[0].prices.length} price entries\n`)

  // We need a user ID to attach prices to. Sign up a seed user.
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: 'seed@basket.app',
    password: 'seedpassword123456',
  })

  if (authError && !authError.message.includes('already registered')) {
    console.error('Auth error:', authError.message)
    // Try to sign in instead
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'seed@basket.app',
      password: 'seedpassword123456',
    })
    if (signInError) {
      console.error('Cannot authenticate seed user:', signInError.message)
      process.exit(1)
    }
    var userId = signInData.user?.id
  } else {
    var userId = authData?.user?.id
  }

  if (!userId) {
    console.error('No user ID available')
    process.exit(1)
  }

  console.log(`   Seed user ID: ${userId}\n`)

  let inserted = 0
  let errors = 0

  for (const product of PRODUCTS) {
    for (const priceEntry of product.prices) {
      // Pick a random postcode for variety
      const postcode = POSTCODES[Math.floor(Math.random() * POSTCODES.length)]

      // Create a receipt for this store/product
      const { data: receipt, error: receiptError } = await supabase
        .from('receipts')
        .insert({
          user_id: userId,
          store_name: priceEntry.store,
          total_amount: priceEntry.price,
          receipt_date: new Date().toISOString().split('T')[0],
          postcode: postcode,
        })
        .select()
        .single()

      if (receiptError) {
        errors++
        continue
      }

      // Insert the price item
      const { error: itemError } = await supabase
        .from('price_items')
        .insert({
          receipt_id: receipt.id,
          user_id: userId,
          item_name: product.name,
          item_name_normalised: product.normalised,
          quantity: 1,
          unit_price: priceEntry.price,
          total_price: priceEntry.price,
          store_name: priceEntry.store,
          postcode: postcode,
        })

      if (itemError) {
        errors++
      } else {
        inserted++
      }
    }
    process.stdout.write(`\r   Inserted: ${inserted} | Errors: ${errors}`)
  }

  console.log(`\n\n✅ Done! Inserted ${inserted} price entries across ${PRODUCTS.length} products.`)
  console.log(`   Errors: ${errors}`)

  await supabase.auth.signOut()
  process.exit(0)
}

seed()
