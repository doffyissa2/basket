-- tracked_staples: Master catalog of Top 100 household staples to track daily.
-- The cron job loops through these EANs, queries OFF Prices API per EAN,
-- and upserts chain-level median prices into market_prices.
--
-- Run in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS tracked_staples (
  ean            TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  brand          TEXT NOT NULL,
  category       TEXT NOT NULL,
  image_url      TEXT,
  target_volume  TEXT,            -- e.g. '1L', '500g' — ensures correct size match
  active         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for the cron job: only fetch active staples
CREATE INDEX IF NOT EXISTS tracked_staples_active_idx
  ON tracked_staples (active) WHERE active = true;

-- Seed initial staples (Top ~50 French household items)
-- EAN codes are real EAN-13 barcodes from Open Food Facts
INSERT INTO tracked_staples (ean, name, brand, category, target_volume) VALUES
  -- Dairy
  ('3033490004743', 'Lait demi-ecrm 1L',            'Lactel',         'Dairy',     '1l'),
  ('3176572467408', 'Beurre doux 250g',              'President',      'Dairy',     '250g'),
  ('3023290028339', 'Yaourt nature',                 'Danone',         'Dairy',     '125g'),
  ('3228021170039', 'Creme fraiche epaisse 20cl',    'Elle & Vire',    'Dairy',     '20cl'),
  ('3073781069631', 'Camembert',                     'President',      'Dairy',     '250g'),
  ('3261055800015', 'Emmental rape 200g',            'President',      'Dairy',     '200g'),

  -- Beverages
  ('5449000000996', 'Coca-Cola 1.5L',                'Coca-Cola',      'Beverages', '1.5l'),
  ('3124480186539', 'Eau minerale 1.5L',             'Cristaline',     'Beverages', '1.5l'),
  ('3057640100178', 'Jus d orange 1L',               'Tropicana',      'Beverages', '1l'),

  -- Bread & Cereals
  ('3175680011480', 'Pain de mie complet',            'Harrys',         'Bread',     '500g'),
  ('5053827163354', 'Cereales Tresor',                'Kelloggs',       'Breakfast', '375g'),

  -- Pasta & Rice
  ('3038350012005', 'Pates coquillettes 500g',       'Panzani',        'Pasta',     '500g'),
  ('3451790012365', 'Riz basmati 1kg',               'Uncle Bens',     'Rice',      '1kg'),

  -- Oils & Condiments
  ('3168930005889', 'Huile de tournesol 1L',         'Lesieur',        'Oils',      '1l'),
  ('8722700460237', 'Mayonnaise 235g',               'Amora',          'Condiments','235g'),
  ('8722700140214', 'Moutarde de Dijon 440g',        'Amora',          'Condiments','440g'),
  ('3036320013817', 'Ketchup 342g',                  'Heinz',          'Condiments','342g'),

  -- Snacks & Sweets
  ('3017620429484', 'Nutella 400g',                  'Nutella',        'Snacks',    '400g'),
  ('7622300489434', 'Biscuits Prince 300g',          'Lu',             'Snacks',    '300g'),
  ('3017760000017', 'Madeleines St Michel',          'St Michel',      'Snacks',    '250g'),

  -- Canned & Preserved
  ('3083680015721', 'Thon entier 140g',              'Petit Navire',   'Canned',    '140g'),
  ('3250391660018', 'Haricots verts extra fins',     'Bonduelle',      'Canned',    '800g'),
  ('3038359007613', 'Sauce tomate cuisinee',         'Panzani',        'Canned',    '400g'),

  -- Frozen
  ('3576280039604', 'Poisson pane 400g',             'Findus',         'Frozen',    '400g'),

  -- Hygiene & Household
  ('3014230022012', 'Lessive liquide 1.5L',          'Skip',           'Household', '1.5l'),
  ('3346028415802', 'Papier toilette 12 rouleaux',   'Lotus',          'Household', '12'),
  ('3600523577316', 'Gel douche 250ml',              'Le Petit Marseillais', 'Hygiene', '250ml'),

  -- Meat & Protein
  ('2000000001001', 'Oeufs frais x12',               'Matines',        'Eggs',      '12'),

  -- Coffee & Tea
  ('3228881015822', 'Cafe moulu 250g',               'Grand Mere',     'Coffee',    '250g'),
  ('3228881028174', 'Dosettes Senseo 36',            'Senseo',         'Coffee',    '36'),

  -- Baby & Pet
  ('3041091377807', 'Croquettes chien 4kg',          'Pedigree',       'Pet',       '4kg')

ON CONFLICT (ean) DO NOTHING;
