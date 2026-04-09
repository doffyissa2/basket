# Database Cleanup — Basket App

> Generated: 2026-04-09  
> Status: **PLAN ONLY — no SQL has been executed**  
> Row counts as reported: price_items 77,713 · receipts 45,406 · store_locations 8,655 · market_prices 5,508 · community_prices 2,840 · price_weekly 2,828 · product_price_stats 2,799

---

## 1. Summary verdict per table

| Table | Rows | Status | Reason |
|-------|------|--------|--------|
| `receipts` | 45,406 | **KEEP** | Core user data; read/written by scan, dashboard, bilan, profile |
| `price_items` | 77,713 | **KEEP** | Core price corpus; 10+ files read/write it |
| `profiles` | 4 | **KEEP** | User identity + gamification stats |
| `store_locations` | 8,655 | **KEEP** | Map pins; read by price-map, written by parse-receipt + cron |
| `product_price_stats` | 2,799 | **KEEP** | Aggregated view used by compare-prices, shopping list, alertes |
| `community_prices` | 2,840 | **KEEP** | Source data for stats rebuild; read by compare-prices, price-map |
| `market_prices` | 5,508 | **KEEP** | External scrape source; read by compare-prices, price-map |
| `price_weekly` | 2,828 | **KEEP** | Trend data; read by price-trend + compare-prices |
| `price_watches` | 0 | **KEEP** | New feature (alertes page); actively written by scan + alertes |
| `notifications` | 0 | **KEEP** | Read+written by notifications page + compare-prices |
| `shopping_list_items` | 17 | **KEEP** | liste page; actively read/written |
| `receipt_formats` | 3 | **KEEP** | Read+written by parse-receipt + learn-receipt-format |
| `xp_log` | 2 | **KEEP** | Audit trail; written by gamification/award |
| `item_corrections` | 1 | **KEEP** | Written by correct-item; different schema from ocr_corrections |
| `ocr_corrections` | 0 | **KEEP** | Read+written by parse-receipt + correct-item; learning system |
| `store_feedback` | 0 | **KEEP (watch)** | Written by log-unknown-store; low value but harmless |
| `contact_messages` | 0 | **KEEP (watch)** | Written by contact route; only 1 API file |
| `newsletter_subscribers` | 1 | **KEEP (watch)** | Written + deleted by newsletter/delete-account |
| `basket_inflation_weekly` | — | **KEEP** | Materialized view; read by basket-index route |
| `leaderboard` | — | **KEEP** | View; read by leaderboard + gamification routes |
| `products` | 0 | **DISCUSS** | Never `.from('products')` in code; only via `match_product` RPC |
| `waitlist` | 0 | **DELETE** | Zero rows; zero code references anywhere in codebase |

---

## 2. Problems identified

### 2a. `waitlist` — dead table
No code file anywhere in `src/` references `waitlist`. Safe to drop.

### 2b. `products` — 0 rows, accessed only via RPC
The `match_product(search_name)` RPC is called in three places:
- `src/app/api/compare-prices/route.ts`
- `src/app/api/shopping-list/best-store/route.ts`
- `src/app/api/price-trend/route.ts`

If `products` has 0 rows, then `match_product` always returns null, and all three routes silently fail their primary matching step (they fall back to ILIKE on `product_price_stats`). The RPC likely searches `product_price_stats` or `price_items` — **verify in Supabase SQL editor before deciding**. If `match_product` only searches `products` and `products` is empty, the RPC is broken and should be rewritten to query `product_price_stats` instead.

**Action needed (manual verification before any SQL):**
```sql
-- Run this in Supabase SQL editor to inspect the RPC definition:
SELECT routine_definition FROM information_schema.routines
WHERE routine_name = 'match_product';
```

### 2c. `community_prices` vs `market_prices` vs `price_items` — are they duplicates?

**Short answer: No — they serve distinct roles in the pipeline.**

| Table | Source | Who writes | Who reads |
|-------|--------|-----------|-----------|
| `price_items` | User scans | `scan/page.tsx` | dashboard, bilan, receipt page |
| `community_prices` | Synthesized from `price_items` | `sync-community-prices` cron | compare-prices, price-map, stats rebuild |
| `market_prices` | External scrape (Open Food Facts etc.) | `sync-market-prices` cron | compare-prices, price-map |
| `product_price_stats` | Aggregated from all three | `rebuild_price_stats()` RPC | compare-prices, shopping list, alertes |

They have different schemas: `market_prices` has `ean, category, source_url`; `community_prices` has `dedup_key, processed_at`; `price_items` has `receipt_id, user_id`. **Do not merge them.**

**Real problem:** Both `market_prices` and `community_prices` use `store_chain` but `price_items` has **both** `store_name` and `store_chain` columns (see §2d below).

### 2d. `store_name` vs `store_chain` vs `chain` — inconsistent column naming

This is the most impactful inconsistency. It causes bugs when joining or filtering across tables.

| Table | Columns present | Used in code as |
|-------|----------------|----------------|
| `receipts` | `store_name` AND `store_chain` | Both are written in scan page; dashboard reads `store_name`; correct-item reads `store_name` |
| `price_items` | `store_name` AND `store_chain` | Both written in scan page |
| `community_prices` | `store_chain` only | Correct |
| `market_prices` | `chain` only | Inconsistent with rest |
| `store_locations` | `chain` AND `name` | `chain` = chain ID (e.g. "Lidl"), `name` = display name (e.g. "Lidl Rouen") |
| `product_price_stats` | `store_chain` | Correct |

**Root cause:** `receipts` and `price_items` have a legacy `store_name` column (the raw OCR output) alongside `store_chain` (the normalised chain name). The scan page writes to both. This is redundant — `store_name` is the normalised name anyway (via `normalizeStoreChain()`).

### 2e. `item_corrections` vs `ocr_corrections` — are they duplicates?

**No — they have different schemas and purposes:**

| Table | Schema | Purpose |
|-------|--------|---------|
| `item_corrections` | `user_id, receipt_id, original_name, corrected_name, original_price, corrected_price` | Audit log: who corrected what on which receipt |
| `ocr_corrections` | `original_text, corrected_text, store_chain, correction_count` | Learning table: when N users correct the same text, auto-apply in future scans |

They're complementary, not duplicates. Keep both.

---

## 3. Migration plan

Execute steps in this exact order. Each step is independently reversible.

---

### Step 1 — Drop `waitlist` (zero risk)

**Risk:** None — 0 rows, 0 code references.

```sql
-- Execute:
DROP TABLE IF EXISTS waitlist;

-- Rollback:
CREATE TABLE waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Code files to update:** None.

---

### Step 2 — Verify and fix `match_product` RPC (manual step first)

Run in Supabase SQL editor:
```sql
SELECT routine_definition FROM information_schema.routines
WHERE routine_name = 'match_product';
```

**If the RPC queries `products` table:** rewrite it to query `product_price_stats`:
```sql
CREATE OR REPLACE FUNCTION match_product(search_name TEXT)
RETURNS TABLE(matched_name TEXT, avg_price NUMERIC, store_chain TEXT, sample_count INTEGER)
LANGUAGE sql STABLE AS $$
  SELECT
    item_name_normalised AS matched_name,
    avg_price,
    store_chain,
    sample_count
  FROM product_price_stats
  WHERE item_name_normalised % search_name          -- pg_trgm similarity
     OR item_name_normalised ILIKE '%' || search_name || '%'
  ORDER BY similarity(item_name_normalised, search_name) DESC
  LIMIT 5;
$$;
```

Then optionally drop the empty `products` table:
```sql
DROP TABLE IF EXISTS products;

-- Rollback (recreate empty):
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  name_normalised TEXT,
  ean TEXT,
  category TEXT
);
```

**Code files to update after dropping `products`:** None (no direct `.from('products')` calls).

---

### Step 3 — Remove duplicate `store_name` column from `receipts` and `price_items`

**Background:** Both tables have `store_name` AND `store_chain`. The scan page writes the same normalised value to both (via `normalizeStoreChain()`). `store_name` is the redundant column.

**Before executing:** verify both columns hold identical values:
```sql
-- Should return 0 rows if columns are always equal:
SELECT id FROM receipts WHERE store_name IS DISTINCT FROM store_chain LIMIT 20;
SELECT id FROM price_items WHERE store_name IS DISTINCT FROM store_chain LIMIT 20;
```

**Only proceed if the query above returns 0 rows.**

```sql
-- Execute:
ALTER TABLE receipts DROP COLUMN store_name;
ALTER TABLE price_items DROP COLUMN store_name;

-- Rollback:
ALTER TABLE receipts ADD COLUMN store_name TEXT;
UPDATE receipts SET store_name = store_chain;
ALTER TABLE price_items ADD COLUMN store_name TEXT;
UPDATE price_items SET store_name = store_chain;
```

**Code files to update:**
- `src/app/api/parse-receipt/route.ts` — remove `store_name:` from INSERT object
- `src/app/scan/page.tsx` — remove `store_name:` from price_items INSERT (lines ~524, ~525)
- `src/app/api/compare-prices/route.ts` — check if `store_name` is referenced (use store_chain instead)
- `src/app/api/correct-item/route.ts` — `receipts.select('store_name')` → change to `store_chain`
- `src/app/dashboard/page.tsx` — reads `store_name` from receipts → change to `store_chain`
- `src/app/bilan/page.tsx` — reads `store_name` from receipts → change to `store_chain`
- `src/app/receipt/[id]/page.tsx` — reads `store_name` → change to `store_chain`
- `src/app/profile/page.tsx` — check if it reads `store_name`

---

### Step 4 — Standardize `market_prices.chain` → `store_chain`

The `market_prices` table uses `chain` while all other tables use `store_chain`.

**Before executing:** check current usage in compare-prices and price-map routes to ensure they reference the right column name.

```sql
-- Execute:
ALTER TABLE market_prices RENAME COLUMN chain TO store_chain;

-- Rollback:
ALTER TABLE market_prices RENAME COLUMN store_chain TO chain;
```

**Code files to update:**
- `src/app/api/cron/sync-market-prices/route.ts` — change `chain:` to `store_chain:` in upsert
- `src/app/api/compare-prices/route.ts` — update column reference if present
- `src/app/api/price-map/route.ts` — update column reference if present
- `src/app/api/store-rankings/route.ts` — update column reference if present

---

### Step 5 — Consider consolidating `store_feedback` and `contact_messages`

These two tables have 0 rows and minimal code usage. **Do not drop yet** — they have active API routes writing to them. Instead, monitor for 30 days. If still 0 rows with real users, then:

```sql
-- Only after confirming no real usage:
DROP TABLE IF EXISTS store_feedback;
DROP TABLE IF EXISTS contact_messages;
```

---

## 4. Execution order

```
Step 1  (Drop waitlist)          → Safe now, no code changes
Step 2  (Fix match_product RPC)  → Manual SQL editor verification first
Step 3  (Remove store_name cols) → Only after Step 2, requires code changes
Step 4  (Rename market_prices.chain) → After Step 3, requires code changes  
Step 5  (store_feedback / contact_messages) → Monitor 30 days, then decide
```

---

## 5. Estimated impact

| Step | Tables changed | Code files changed | Risk |
|------|---------------|-------------------|------|
| 1 | 1 dropped | 0 | Zero |
| 2 | 1 modified | 0 | Low (verify RPC first) |
| 3 | 2 modified | ~8 files | Medium (column removal) |
| 4 | 1 modified | ~4 files | Low (rename only) |
| 5 | 2 dropped | 2 | Low (0-row tables) |

---

## 6. What NOT to merge

The following were considered for merging but should **not** be merged:

- **`community_prices` + `market_prices` + `price_items`**: Different sources, schemas, and ownership semantics. Merging would lose auditability and break the rebuild pipeline.
- **`item_corrections` + `ocr_corrections`**: Different schemas and purposes (audit log vs learning table).
- **`basket_inflation_weekly` + `price_weekly`**: `basket_inflation_weekly` is a weekly aggregate materialized view; `price_weekly` is per-item per-store weekly average. Different granularity.

---

## 7. Tables with technical debt to watch (not urgent)

| Issue | Table | Note |
|-------|-------|------|
| `store_locations.chain` vs `.name` | `store_locations` | `chain` = chain ID, `name` = display name — confusing but not wrong |
| `notifications` always 0 rows | `notifications` | compare-prices INSERT is the only writer; if price alerts don't fire, this stays empty |
| `receipt_formats` only 3 rows | `receipt_formats` | Functional but low signal; the learn-receipt-format cron may not be running |
| `xp_log` only 2 rows | `xp_log` | Gamification is lightly used; table is correct |
