# Basket App — Full Security, Performance & Reliability Audit

**Date:** 2026-04-10  
**Auditor:** Claude Code (automated + manual review)  
**Scope:** All files in `src/app/`, `src/components/`, `src/lib/`  
**Branch:** `main` @ `6d01d50`

---

## Build & Type Check Results

```
npx tsc --noEmit → 0 errors (EXIT:0)
npm run build    → SUCCESS — 44 pages, 0 errors
                 → 1 deprecation warning (see Medium section)
```

### npm audit
```
@hono/node-server <1.19.13 — moderate — Middleware bypass via repeated slashes
hono <=4.12.11   — moderate — cookie name bypass, IP matching bypass, path traversal in toSSG

2 moderate severity vulnerabilities
Fix: npm audit fix
```

---

## 1. CRITICAL ISSUES

### CRIT-01 — Secret key compared with `===` (timing-safe attack surface)
**File:** `src/app/api/rebuild-stats/route.ts:30–33`  
**Severity:** Critical  
**Description:** The `REBUILD_STATS_SECRET_KEY` and `VERCEL_CRON_SECRET` are compared using JavaScript `===` which is **not timing-safe**. A timing oracle attack could allow an attacker to brute-force the secret one character at a time by measuring response time differences.

```typescript
// CURRENT (vulnerable):
const authorized =
  (vercelSecret && providedKey === vercelSecret) ||
  (manualSecret && providedKey === manualSecret)

// FIX:
import { timingSafeEqual, createHash } from 'crypto'
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(createHash('sha256').update(a).digest())
  const bufB = Buffer.from(createHash('sha256').update(b).digest())
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}
const authorized =
  (vercelSecret && safeCompare(providedKey, vercelSecret)) ||
  (manualSecret && safeCompare(providedKey, manualSecret))
```

---

### CRIT-02 — No payload size validation in `parse-receipt` (DoS via large base64)
**File:** `src/app/api/parse-receipt/route.ts:322–334`  
**Severity:** Critical  
**Description:** The route validates `images.length > 3` (max 3 images) but does **not validate the size of each base64 string**. A malicious authenticated user can bypass the client-side 10MB check by crafting a direct API call with 3 images of 50MB each, sending 150MB+ payloads directly to Claude — costing real money and potentially timing out or crashing the worker. There is no `Content-Length` check either.

```typescript
// FIX: Add after line 333
const MAX_BASE64_BYTES = 12 * 1024 * 1024 // 9MB file → ~12MB base64
for (const img of images) {
  if (img.base64.length > MAX_BASE64_BYTES) {
    return NextResponse.json({ error: 'Image trop grande (max 9 Mo)' }, { status: 413 })
  }
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(img.mediaType)) {
    return NextResponse.json({ error: 'Format non supporté' }, { status: 400 })
  }
}
```

---

### CRIT-03 — `delete-account`: profile deleted before email lookup (broken cleanup)
**File:** `src/app/api/delete-account/route.ts:34–46`  
**Severity:** Critical (data integrity)  
**Description:** The profile is deleted on line 34 (`await supabase.from('profiles').delete().eq('id', userId)`). Then on line 38, the code queries the **already-deleted** profile to get the email for newsletter unsubscribe. This query will **always return null**, meaning newsletter subscribers are never unsubscribed on account deletion. Additionally, `shopping_list_items` is deleted by `list_id` (from the legacy `shopping_lists` table) but the app's current schema uses a `user_id` column directly on `shopping_list_items`. If the schema changed, this cleanup silently fails.

```typescript
// FIX: Query auth user for email BEFORE deleting profile
const { data: { user } } = await supabase.auth.admin.getUserById(userId)
const email = user?.email ?? null

// ... then do all deletions ...

// Use the pre-fetched email:
if (email) {
  await supabase.from('newsletter_subscribers').delete().eq('email', email)
}
```

---

### CRIT-04 — `shopping-list/suggest` has no authentication
**File:** `src/app/api/shopping-list/suggest/route.ts`  
**Severity:** Critical  
**Description:** This route makes no call to `requireAuth`. It accepts a query parameter `q` and performs an `.ilike()` search against `product_price_stats` using the service role key. Any unauthenticated user on the internet can enumerate product names from your database at will.

The `.ilike()` with user input (`%${q}%`) is not SQL-injectable via Supabase's parameterized client, but without auth it's a **fully open search API** on your data.

```typescript
// FIX: Add at top of GET handler:
import { requireAuth } from '@/lib/auth'
const authResult = await requireAuth(request)
if (authResult instanceof NextResponse) return authResult
// Also add to limiters and call checkRateLimit('shoppingListSuggest', authResult.userId)
```

---

### CRIT-05 — `store-rankings` has no authentication and no rate limit
**File:** `src/app/api/store-rankings/route.ts:1–80`  
**Severity:** Critical  
**Description:** The route is documented as "intentionally public (marketing content)" but queries `market_prices` and `community_prices` with a **LIMIT 30,000** each — returning up to 60,000 rows on every unauthenticated request. No rate limiting is applied. This route can be used to exhaust your Supabase bandwidth/read quota with no barrier. Even if the intent is public access, a rate limit is mandatory.

```typescript
// FIX: Add rate limiter entry and check, even for public routes:
// In rate-limit.ts: storeRankings: makeLimiter(10, 60),
// In route: const rl = await checkRateLimit(request, 'storeRankings'); if (rl) return rl
```

---

## 2. HIGH PRIORITY ISSUES

### HIGH-01 — `watchItem()` uses inconsistent normalization for `item_name_normalised`
**File:** `src/app/scan/page.tsx:669`  
**Severity:** High (data integrity)  
**Description:** The `watchItem` function sets `item_name_normalised: itemName.toLowerCase().trim()` while every other write path uses `normalizeProductName(itemName)` (which additionally strips accents and special characters). This means a price watch for "Lait entier" will be stored as `lait entier` but the stats table has it as `lait entier` (same in this case) — however for items with accents like "Côtelettes" the normalization diverges: `toLowerCase()` gives `côtelettes`, but `normalizeProductName` gives `cotelettes`. The unique constraint on `item_name_normalised` will fail to deduplicate them.

```typescript
// FIX in watchItem():
item_name_normalised: normalizeProductName(itemName),  // was: itemName.toLowerCase().trim()
```

---

### HIGH-02 — `liste/page.tsx` uses inconsistent normalization
**File:** `src/app/liste/page.tsx:109, 209`  
**Severity:** High (data integrity)  
**Description:** Both the insert and the rename operation use `n.toLowerCase().trim()` / `r.item_name.toLowerCase().trim()` instead of `normalizeProductName()`. This creates duplicate entries in `shopping_list_items` for accented product names, breaks the `onConflict: 'user_id,item_name_normalised'` deduplication, and causes mismatches with scan-page badge detection.

```typescript
// Line 109 FIX:
item_name_normalised: normalizeProductName(n)

// Line 209 FIX:
item_name_normalised: normalizeProductName(r.item_name)
```

---

### HIGH-03 — Three separate local `normaliseProductName` implementations
**Files:** `src/app/api/parse-receipt/route.ts:12`, `src/app/api/trigger-stats-refresh/route.ts:20`, `src/app/api/cron/sync-community-prices/route.ts` (local function)  
**Severity:** High (data integrity)  
**Description:** There are at least 3 local copies of `normaliseProductName` (note: British spelling vs `normalizeProductName` in `src/lib/normalize.ts`) in API routes. If the canonical implementation in `src/lib/normalize.ts` is ever updated, these copies diverge and produce different normalized keys for the same product. All server-side code should import from `@/lib/normalize`.

```typescript
// FIX: In each API route, replace the local function with:
import { normalizeProductName } from '@/lib/normalize'
// Note: the lib function uses American spelling "normalize"
```

---

### HIGH-04 — `compare-prices`: N+1 RPC calls pattern (up to 50 sequential matches)
**File:** `src/app/api/compare-prices/route.ts:132–165`  
**Severity:** High (performance)  
**Description:** `items.map(async (item) => { const matchedName = await resolveMatch(item.name); ... })` runs inside `Promise.all`, so RPC calls are parallel, not sequential — this is not a classic N+1. However, each item still makes **2 separate DB queries** (`fetchStats` and `fetchTrend`), for a total of up to 100 DB round-trips per request for a 50-item receipt. The match RPC has a cache but stats/trend queries do not.

Consider batching: use `.in('item_name_normalised', [...allMatchedNames])` in a single query for stats, then fan out results in memory.

---

### HIGH-05 — `shopping-list/best-store`: N+1 `match_product` RPC calls
**File:** `src/app/api/shopping-list/best-store/route.ts:43–55`  
**Severity:** High (performance)  
**Description:** `Promise.all(items.map(async (itemName) => { const { data } = await supabase.rpc('match_product', ...) }))` — this fires N concurrent RPC calls for N shopping list items. With 50 items, that's 50 simultaneous RPCs to Postgres. This puts heavy load on the connection pool. Supabase has a 60–200 concurrent connection limit.

Consider a batch-match RPC that takes an array of names and returns matches in a single call.

---

### HIGH-06 — `trigger-stats-refresh` fires after every scan but calls 3 expensive RPCs
**File:** `src/app/api/trigger-stats-refresh/route.ts:120–130`  
**Severity:** High (performance + cost)  
**Description:** After each receipt scan, `trigger-stats-refresh` calls `rebuild_price_stats`, `rebuild_weekly_trends` (via RPC). These are bulk rebuild operations on potentially millions of rows, called once per user scan. At scale (100 scans/day), this is 300 full table rebuilds per day. This should be debounced or deferred to the nightly cron instead.

The rate limit is 30/min per IP, which does not prevent a single user from triggering this dozens of times per hour across different IPs.

---

### HIGH-07 — Rate limiting fails open if Redis is down (parse-receipt exposed)
**File:** `src/lib/rate-limit.ts:115`  
**Severity:** High (abuse risk)  
**Description:** When Upstash Redis is unreachable, `checkRateLimit` catches the error and returns `null` (allow). This is intentional for availability, but means during a Redis outage, `parse-receipt` (which calls the expensive Claude Vision API) has **zero rate limiting**. An attacker who discovers a Redis outage can spam parse-receipt at full speed.

Consider a circuit-breaker approach: if Redis fails, apply a conservative in-memory fallback limit.

---

### HIGH-08 — `rebuild-stats` GET is aliased to POST (triggers DB rebuild on GET)
**File:** `src/app/api/rebuild-stats/route.ts:84`  
**Severity:** High  
**Description:** `export const GET = POST` — Vercel cron triggers via GET, but this means any GET request to this endpoint (even from a browser) triggers a full database rebuild. While auth is required, this is semantically wrong (GET should be idempotent). Use a proper POST-only handler and have Vercel cron use POST.

---

### HIGH-09 — `delete-account` does not delete `price_watches` table entries
**File:** `src/app/api/delete-account/route.ts`  
**Severity:** High (GDPR/data retention)  
**Description:** The delete-account handler deletes `price_items`, `notifications`, `receipts`, `shopping_lists`, `shopping_list_items`, `profiles` — but does NOT delete `price_watches`. A deleted user's price watch entries will remain in the database indefinitely.

```typescript
// FIX: Add to the deletions Promise.allSettled:
supabase.from('price_watches').delete().eq('user_id', userId),
```

---

### HIGH-09b — All 3 cron routes also use non-timing-safe secret comparison
**Files:** `src/app/api/cron/sync-market-prices/route.ts:96`, `src/app/api/cron/sync-community-prices/route.ts:143`, `src/app/api/cron/sync-store-locations/route.ts:102`  
**Severity:** High  
**Description:** The same `===` comparison issue from CRIT-01 affects all three cron routes. They use `req.headers.get('authorization') === \`Bearer ${secret}\`` which is not timing-safe. The `CRON_SECRET` env var is comparatively lower risk (cron endpoints only trigger data sync, not account deletion), but the fix is identical to CRIT-01.

---

### HIGH-09c — `gamification/award`: user-supplied `savings` value not validated
**File:** `src/app/api/gamification/award/route.ts:103`  
**Severity:** High  
**Description:** The `context.savings` field from the request body has no bounds check — it's used to compute XP (more savings = more XP). A malicious authenticated user can call the award endpoint directly with `savings: 99999999` to farm XP and inflate their leaderboard position. The `reason: 'scan_receipt'` path only checks that a receipt was inserted; it does not verify the savings against the actual receipt row in the database.

```typescript
// FIX: Add after extracting savings:
const savings = typeof context?.savings === 'number' ? Math.max(0, Math.min(context.savings, 10000)) : 0
// Also: validate store/postcode string lengths
const store = typeof context?.store === 'string' ? context.store.slice(0, 100) : ''
const postcode = typeof context?.postcode === 'string' ? context.postcode.slice(0, 10) : ''
```

---

### HIGH-09d — `delete-account` route has no rate limit applied at route level
**File:** `src/app/api/delete-account/route.ts`  
**Severity:** High  
**Description:** `deleteAccount: makeLimiter(3, 3600)` is defined in `rate-limit.ts` but `checkRateLimit` is **never called** in the delete-account route handler. The limit exists but is never enforced. A malicious user could rapidly call this route (though auth is required, meaning they can only delete their own account — but this is still a GDPR/operational concern if automated).

```typescript
// FIX: Add after auth check (line 8):
const rlResponse = await checkRateLimit(request, 'deleteAccount', userId)
if (rlResponse) return rlResponse
```

---

### HIGH-10 — `parse-receipt` base64 strings not validated for content type
**File:** `src/app/api/parse-receipt/route.ts:322–327`  
**Severity:** High  
**Description:** The `mediaType` field comes directly from the client body with no server-side validation:
```typescript
mediaType: img.media_type ?? 'image/jpeg'
```
An attacker can set `media_type: 'application/pdf'` or any value and it gets passed directly to Claude's API. This could trigger unexpected Claude behavior or cause API errors. Validate against an allowlist.

---

## 3. MEDIUM PRIORITY ISSUES

### MED-01 — Next.js 16 deprecated middleware convention
**Build output warning:** `"The 'middleware' file convention is deprecated. Please use 'proxy' instead."`  
**Severity:** Medium  
**Description:** The app has a `middleware.ts` or `src/middleware.ts` file using the old convention. In Next.js 16.x this should be renamed to `proxy.ts`. Without this change, the behavior may change in a future release.

---

### MED-02 — `leaderboard` exposes user UUIDs in response
**File:** `src/app/api/leaderboard/route.ts:47`  
**Severity:** Medium (privacy)  
**Description:** The leaderboard response includes `id: row.id` which is the Supabase user UUID. Combined with `display_name`, this allows any user to associate a display name with a UUID that could be used to enumerate other endpoints (even if those endpoints require auth). Consider omitting or hashing the ID, or using a separate `public_id` column.

---

### MED-03 — `shopping-list/suggest` uses user-supplied `.ilike()` without length cap
**File:** `src/app/api/shopping-list/suggest/route.ts:18–19`  
**Severity:** Medium  
**Description:** `q` is trimmed to 2 chars minimum but has no maximum length check. A 10,000-character `q` parameter triggers a very expensive `LIKE` query. Add: `if (q.length > 100) return NextResponse.json({ suggestions: [] })`.

---

### MED-04 — `alertes/page.tsx` uses `.ilike()` on user-supplied search without length cap
**File:** `src/app/alertes/page.tsx:52`  
**Severity:** Medium  
**Description:** Same issue — `itemName.toLowerCase().trim()` is used directly in `.ilike()` with no length validation.

---

### MED-05 — `contact` and `newsletter` routes use anon key as fallback for service key
**Files:** `src/app/api/contact/route.ts:8`, `src/app/api/newsletter/route.ts:8`  
**Severity:** Medium  
**Description:** Both use `SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!` — if the service role key is not configured, they silently fall back to the anon key, which may fail due to RLS policies, or worse, use the anon key with elevated trust assumptions. Use `getServiceClient()` consistently.

---

### MED-06 — `price-map` and `store-rankings` inline `createClient` with anon-key fallback
**Files:** `src/app/api/price-map/route.ts:74`, `src/app/api/store-rankings/route.ts:55`, `src/app/api/shopping-list/best-store/route.ts:35`  
**Severity:** Medium  
**Description:** Same pattern — inline `createClient` with service key fallback to anon key. These should all use `getServiceClient()` for consistency and to avoid misconfiguration surprises.

---

### MED-07 — `reverse-geocode` reads `NEXT_PUBLIC_MAPBOX_TOKEN` on the server
**File:** `src/app/api/reverse-geocode/route.ts:24`  
**Severity:** Medium (token exposure)  
**Description:** The Mapbox token is a `NEXT_PUBLIC_` variable (already exposed to the client bundle), so this is not a secret leak per se. However, using it server-side for Mapbox API calls means the same token is used for both client-side map rendering and server-side geocoding, making it impossible to restrict by domain on the Mapbox dashboard. Consider a separate server-only `MAPBOX_SECRET_TOKEN` for server-side calls.

---

### MED-08 — Unhandled `void fetch()` calls (no `.catch()`)
**Files:** `src/app/scan/page.tsx:477, 484, 560, 567, 662, 710`  
**Severity:** Medium  
**Description:** Multiple fire-and-forget `void fetch()` calls have no `.catch()`. If the network is offline or the server returns an error, these generate unhandled promise rejections visible in browser console. Examples:
- `void fetch('/api/log-unknown-store', ...)` — line 477
- `void fetch('/api/learn-receipt-format', ...)` — line 484
- `void fetch('/api/trigger-stats-refresh', ...)` — line 567
- Share XP award at line 710

Fix: `void fetch(...).catch(() => {})` or log the error.

---

### MED-08b — `correct-item` has no idempotency protection
**File:** `src/app/api/correct-item/route.ts`  
**Severity:** Medium  
**Description:** If the client retries a correction request due to a network error, a duplicate `ocr_corrections` row is inserted for the same `(receipt_id, original_name)` pair. Over time this inflates the correction table and skews the OCR learning model. Fix: add a unique constraint on `(receipt_id, item_name_original)` and use `.upsert()` with `onConflict`.

---

### MED-09 — `gamification/route.ts` (GET) has no rate limit
**File:** `src/app/api/gamification/route.ts`  
**Severity:** Medium  
**Description:** This authenticated GET route (which queries the profiles table) has no rate limit. A user can poll it thousands of times per minute. Add a rate limit entry (`gamification: makeLimiter(30, 60)`) and call `checkRateLimit`.

---

### MED-10 — `store-rankings` fetches up to 60,000 rows per request
**File:** `src/app/api/store-rankings/route.ts:65, 73`  
**Severity:** Medium (performance)  
**Description:** Two queries with `LIMIT 30000` each are executed synchronously. This is a very large dataset to load into memory just for ranking computation. Consider pre-computing rankings in a materialized view or caching the result server-side (a `Cache-Control` header is set but Vercel edge caching depends on deployment configuration).

---

### MED-11 — `parse-receipt` has a duplicate local `normaliseProductName` vs lib
**File:** `src/app/api/parse-receipt/route.ts:12–19`  
**Severity:** Medium (see HIGH-03 for full description)

---

### MED-12 — `user-context.tsx` — `price_items` query fetches LIMIT 200 for topItems
**File:** `src/lib/user-context.tsx:222–224`  
**Severity:** Medium (performance)  
**Description:** On every page load for every authenticated user, the context fetches 200 rows from `price_items` just to compute a top-20 list. This is expensive. Better: add a server-side endpoint or a Postgres view for the top items, or cache this in the profile.

---

### MED-13 — `compare-prices` `price_watches` query selects without `user_id` filter
**File:** `src/app/api/compare-prices/route.ts:265–266`  
**Severity:** Medium  
**Description:**
```typescript
.from('price_watches')
.select('user_id, item_name, item_name_normalised, last_seen_price')
.in('item_name_normalised', resolvedNames)
```
This selects price watches from **all users** to send price drop notifications. This is probably intentional (notify all watchers of a price drop), but worth confirming: it means User A's scan of cheap milk will trigger a notification for User B who watches milk. Ensure this is the intended behavior and document it in code.

---

### MED-13b — `liste/page.tsx` `findBestStore` runs sequential per-item DB UPDATEs
**File:** `src/app/liste/page.tsx:250–262`  
**Severity:** Medium (performance)  
**Description:** After fetching the best store recommendation, the code loops over results and fires a sequential `await supabase.from('shopping_list_items').update(...).eq('id', item.id)` for each item:

```typescript
for (const pi of data.per_item) {
  // ...
  await supabase.from('shopping_list_items').update({ best_store, best_price }).eq('id', item.id)
}
```

With 10 items this is 10 sequential round-trips. The compare-prices route correctly uses `Promise.all()` for parallelism — the same pattern should be applied here at minimum. Better: batch into a single upsert.

```typescript
// FIX: Run concurrently instead of sequentially
await Promise.all(updates.map(({ id, best_store, best_price }) =>
  supabase.from('shopping_list_items').update({ best_store, best_price }).eq('id', id)
))
```

---

### MED-13c — `dashboard/page.tsx` fetches ALL receipts with no LIMIT for spend calculation
**File:** `src/app/dashboard/page.tsx:133–134`  
**Severity:** Medium (performance)  
**Description:** The `fetchData` function fetches every receipt for the user to compute total spend and monthly spend client-side:

```typescript
supabase.from('receipts')
  .select('created_at, total_amount, receipt_date')
  .eq('user_id', userId)
  // NO .limit() — returns ALL receipts ever
```

For a power user with 500+ scans this returns a large payload just to sum numbers. The recent-receipts query has `.limit(10)` and the area insight query has `.limit(500)` — this one is the odd one out.

Fix: Move spend aggregation to a server-side Postgres function (`SUM(total_amount)`, `WHERE receipt_date >= now() - interval '30 days'`) or add `.limit(10000)` as a defensive cap.

---

### MED-14 — `alertes/page.tsx` makes Supabase queries directly without auth guard
**File:** `src/app/alertes/page.tsx:52–72`  
**Severity:** Medium  
**Description:** The page queries `supabase` (anon client) directly from the client. It calls `supabase.auth.getUser()` for auth, but the `fetchBestPrice` function at line 72 is called with `w.item_name_normalised` in a `.map()`, creating N concurrent requests to the Supabase client for N watches — a client-side N+1 pattern.

---

### MED-15 — `delete-account` deletes shopping_list_items by `list_id` (legacy schema)
**File:** `src/app/api/delete-account/route.ts:23–30`  
**Severity:** Medium (data integrity)  
**Description:** The handler queries `shopping_lists` table and deletes from `shopping_list_items` by `list_id`. But the current app schema uses `shopping_list_items` with a direct `user_id` column (no intermediate `shopping_lists` table). If the `shopping_lists` query returns no row, `shopping_list_items` for this user are never deleted. Confirm which schema is authoritative.

---

## 4. LOW PRIORITY ISSUES

### LOW-01 — `console.log` statements in production API routes
**Severity:** Low  
**Files with info-level logs in production paths:**
- `src/app/api/parse-receipt/route.ts:108` — logs item names and prices: `[parse-receipt] price correction: ${item.name} ${item.price}→${corrected}`
- `src/app/api/parse-receipt/route.ts:383, 416` — retry and verification logs
- `src/app/api/rebuild-stats/route.ts:49, 61, 75` — step completion logs
- `src/app/api/trigger-stats-refresh/route.ts:128` — error logs (acceptable)
- `src/app/api/cron/sync-store-locations/route.ts:186` — row counts
- `src/app/api/cron/sync-market-prices/route.ts:202` — row counts per chain
- `src/app/api/cron/sync-community-prices/route.ts:273, 323` — row counts

Server-side `console.log` in production is fine for observability, but item names/prices at line 108 could fill logs on busy days.

---

### LOW-02 — `gamification/route.ts` appears to be orphaned (not called from client)
**File:** `src/app/api/gamification/route.ts`  
**Severity:** Low  
**Description:** The frontend uses `/api/gamification/award` (POST) for awarding XP and reads gamification state from `useUserContext` (via profiles table). The `GET /api/gamification` route doesn't appear to be called from any frontend page. Either document why it exists or remove it to reduce maintenance burden.

---

### LOW-03 — `src/app/api/compare-prices/route.ts` — `postcode` destructured but unused
**File:** `src/app/api/compare-prices/route.ts:50`  
**Severity:** Low  
**Description:** `const { postcode, dept } = ctx` — `postcode` is destructured but never used (only `dept` is used). This is a minor dead variable.

---

### LOW-04 — Hono packages have moderate security vulnerabilities
**Severity:** Low  
**Description:** `@hono/node-server` and `hono` packages have moderate vulnerabilities (see npm audit above). These appear to be indirect dependencies (not directly used in app code). Running `npm audit fix` should resolve without breaking changes.

---

### LOW-05 — `src/app/api/parse-receipt/route.ts` — media_type not validated against allowlist
**File:** `src/app/api/parse-receipt/route.ts:325`  
**Severity:** Low (see HIGH-10 for the higher-severity angle)  
**Description:** `img.media_type ?? 'image/jpeg'` — no validation. Minimum fix: only pass through if it's in `['image/jpeg', 'image/png', 'image/webp']`.

---

### LOW-06 — `leaderboard` has no rate limit
**File:** `src/app/api/leaderboard/route.ts`  
**Severity:** Low  
**Description:** Auth is required, but no rate limit is applied. This route queries a `leaderboard` view which could be expensive. Add `leaderboard: makeLimiter(30, 60)`.

---

### LOW-07 — `basket-index` and `price-trend` call auth but have no `gamification` equivalent
**Severity:** Low  
**Description:** Minor: the `gamification` GET route has auth but no rate limit (see MED-09).

---

### LOW-08 — `src/app/scan/page.tsx:669` — `watchItem` normalization inconsistency (see HIGH-01)
Already reported in HIGH-01.

---

### LOW-09 — `as any` casts for GSAP/ScrollTrigger/Lenis on landing page
**File:** `src/app/page.tsx:172–174`  
**Severity:** Low  
**Description:** Three `(window as any)` casts for GSAP, ScrollTrigger, and Lenis. These are loaded via CDN script tags so no npm types exist — the cast is pragmatically justified. However if GSAP is moved to npm (or already is), add `@types/gsap` or use the official typed import.

---

### LOW-10 — `trigger-stats-refresh` uses `as any[]` to bypass type check on upsert
**File:** `src/app/api/trigger-stats-refresh/route.ts:116`  
**Severity:** Low  
**Description:** `.upsert(rows as any[], ...)` bypasses TypeScript's check on the row shape. If the `community_prices` table schema changes, this will silently compile and fail at runtime. Consider defining a typed `CommunityPriceRow` interface and using it explicitly.

---

### LOW-11 — Accessibility: buttons missing `type="button"`, inputs missing `<label>`
**File:** Multiple pages  
**Severity:** Low  
**Description:**
- Several `<button>` elements lack `type="button"`, e.g. `src/app/scan/page.tsx:804`. Inside a `<div>` (not a `<form>`) this is safe but is a bad habit — if a form wrapper is ever added above, these will submit.
- `src/components/LocationGateModal.tsx:154` — postcode `<input>` has a placeholder but no associated `<label>`. Screen readers cannot announce the field purpose. Fix: add `<label htmlFor="postcode-input">` or `aria-label="Code postal"`.

---

### LOW-12 — MapClient has no explicit map destroy on unmount
**File:** `src/components/MapClient.tsx`  
**Severity:** Low  
**Description:** The Leaflet map instance held in `mapRef.current` is never explicitly destroyed when the component unmounts. Leaflet maps hold DOM references and event listeners. On fast navigation (e.g. back/forward between carte and dashboard), this can cause "Map container is already initialized" errors or memory leaks. Fix: add a `useEffect` cleanup that calls `mapRef.current?.remove()`.

---

### LOW-14 — `user-context.tsx` `shopping_list_items` queries have no LIMIT
**File:** `src/lib/user-context.tsx:228–234, 339–343`  
**Severity:** Low  
**Description:** Both the initial load and the `refresh(['shoppingList'])` path query `shopping_list_items` without a `.limit()`. In practice users won't have thousands of list items, but it's the only unbounded query in the 6-branch context load. Add `.limit(500)` defensively.

---

### LOW-13 — Orphaned `baskets-ai`, `bilan`, `promo`, `vision`, `alertes` pages not linked from BottomNav
**Files:** `src/app/basket-ai/page.tsx`, `src/app/bilan/page.tsx`, `src/app/promo/page.tsx`, `src/app/vision/page.tsx`, `src/app/alertes/page.tsx`  
**Severity:** Low  
**Description:** These 5 pages appear in the build output but no link in `BottomNav` or any other navigation points to them (based on the BottomNav component). They are reachable only by direct URL. Confirm whether these are intentionally hidden (feature-flagged) or forgotten.

---

## 5. PASSED CHECKS ✓

### Auth Coverage
- All user-data routes require authentication via `requireAuth` or `getRequestContextWithBody`
- `contact`, `newsletter` are unauthenticated intentionally (public forms) and have IP-based rate limits
- `store-rankings` is intentionally public (marketing)
- `shopping-list/suggest` **FAILS** (see CRIT-04)
- Cron routes check `CRON_SECRET` before processing
- `delete-account` uses `requireAuth` before any destructive operations

### Service Role Key Usage
- `requireAuth` verifies tokens correctly (reads from Authorization header)
- Service role key is used for all admin operations (delete-account, gamification award, leaderboard)
- `getServiceClient()` used consistently in most routes — exceptions noted in MED-05/06

### User Data Isolation
- All receipt SELECT queries filter by `.eq('user_id', userId)` ✓
- Shopping list queries filter by `.eq('user_id', userId)` ✓
- Profile queries filter by `.eq('id', userId)` ✓
- Price data (community_prices, market_prices, product_price_stats) is correctly anonymized before being served ✓
- Leaderboard only exposes display_name, not email ✓ (but does expose UUID — see MED-02)

### Rate Limiting
- All expensive routes have rate limits defined ✓
- Rate limits fail open gracefully when Redis is unavailable ✓ (but see HIGH-07 for risk analysis)
- Per-user limiting (not just per-IP) on authenticated routes ✓

### Column Consistency
- All receipt INSERT queries use `store_chain` (not `store_name`) ✓
- All price_items INSERT queries use `store_chain` ✓
- `product_price_stats` used for comparison reads (not raw `price_items`) ✓
- `products` table not referenced anywhere in the codebase ✓
- `market_prices`, `community_prices`, `price_items` treated as distinct sources ✓

### TypeScript
- Zero type errors (`npx tsc --noEmit` → EXIT:0) ✓
- Build succeeds cleanly ✓

### `.gitignore`
- `.env*` pattern in `.gitignore` covers `.env.local` ✓
- No hardcoded API keys or secrets found in source code ✓

### Input Validation
- `parse-receipt`: validates `images.length > 3` ✓, validates `images[0].base64` exists ✓
- `compare-prices`: validates `items` is array, caps at 50 items ✓
- `shopping-list/best-store`: validates `items` is array, caps at 50 items ✓
- `rebuild-stats`: checks auth secret before any DB operations ✓
- `leaderboard`: validates `dept` format with `/^\d{2}$/` regex before using in query ✓
- `price-trend`: validates `item` param before query ✓

### Error Handling
- All API routes return appropriate HTTP status codes ✓
- All pages show loading state while data fetches ✓
- `ErrorBoundary` wraps the entire app ✓
- `OfflineBanner` detects connectivity loss ✓
- Receipt scan rollback on price_items failure ✓ (non-atomic — see scan/page.tsx concern)

### Privacy / PII
- Leaderboard anonymizes data — no emails exposed ✓
- Price comparison uses aggregated stats, not individual user data ✓
- Community prices are stored without user association ✓

---

## Summary Table

| ID | Severity | Category | File | Issue |
|----|----------|----------|------|-------|
| CRIT-01 | Critical | Security | rebuild-stats/route.ts | Non-timing-safe secret comparison |
| CRIT-02 | Critical | Security | parse-receipt/route.ts | No base64 payload size limit |
| CRIT-03 | Critical | Data | delete-account/route.ts | Profile deleted before email lookup |
| CRIT-04 | Critical | Security | shopping-list/suggest/route.ts | No authentication |
| CRIT-05 | Critical | Security | store-rankings/route.ts | No rate limit, 60k row queries |
| HIGH-01 | High | Data | scan/page.tsx:669 | watchItem wrong normalization |
| HIGH-02 | High | Data | liste/page.tsx:109,209 | Wrong normalization on insert/rename |
| HIGH-03 | High | Data | 3 API files | Duplicate normaliseProductName |
| HIGH-04 | High | Perf | compare-prices/route.ts | 2 DB queries per item (100 total) |
| HIGH-05 | High | Perf | best-store/route.ts | N concurrent match_product RPCs |
| HIGH-06 | High | Perf | trigger-stats-refresh/route.ts | Full table rebuild on every scan |
| HIGH-07 | High | Security | rate-limit.ts | Fail-open exposes parse-receipt |
| HIGH-08 | High | Security | rebuild-stats/route.ts | GET triggers DB rebuild |
| HIGH-09 | High | GDPR | delete-account/route.ts | price_watches not deleted |
| HIGH-09b | High | Security | 3 cron routes | Non-timing-safe CRON_SECRET comparison |
| HIGH-09c | High | Security | gamification/award/route.ts | savings param not validated — XP farming |
| HIGH-09d | High | Security | delete-account/route.ts | deleteAccount rate limit defined but never called |
| HIGH-10 | High | Security | parse-receipt/route.ts | mediaType not validated |
| MED-01 | Medium | Config | middleware | Deprecated convention in Next.js 16 |
| MED-02 | Medium | Privacy | leaderboard/route.ts | User UUIDs exposed |
| MED-03 | Medium | Security | suggest/route.ts | No max length on q param |
| MED-04 | Medium | Security | alertes/page.tsx | No max length on ilike input |
| MED-05 | Medium | Security | contact, newsletter | Anon key fallback |
| MED-06 | Medium | Security | price-map, best-store | Inline createClient |
| MED-07 | Medium | Security | reverse-geocode | Server uses NEXT_PUBLIC_ token |
| MED-08 | Medium | Reliability | scan/page.tsx | Unhandled void fetch() |
| MED-08b | Medium | Data | correct-item/route.ts | No idempotency — duplicate corrections on retry |
| MED-09 | Medium | Security | gamification/route.ts | No rate limit |
| MED-10 | Medium | Perf | store-rankings/route.ts | 60k row queries |
| MED-11 | Medium | Data | parse-receipt/route.ts | Local normalization copy |
| MED-12 | Medium | Perf | user-context.tsx | 200 price_items on every page load |
| MED-13 | Medium | Privacy | compare-prices/route.ts | Cross-user watch notification |
| MED-13b | Medium | Perf | liste/page.tsx:250 | Sequential per-item DB UPDATEs in loop |
| MED-13c | Medium | Perf | dashboard/page.tsx:133 | ALL receipts fetched with no LIMIT for spend calc |
| MED-14 | Medium | Perf | alertes/page.tsx | Client-side N+1 fetchBestPrice |
| MED-15 | Medium | Data | delete-account/route.ts | shopping_lists legacy schema |
| LOW-01 | Low | Ops | Various | console.log in prod paths |
| LOW-02 | Low | Code | gamification/route.ts | Orphaned route |
| LOW-03 | Low | Code | compare-prices/route.ts | postcode unused |
| LOW-04 | Low | Deps | npm | hono moderate vulns |
| LOW-05 | Low | Security | parse-receipt/route.ts | mediaType not allowlisted |
| LOW-06 | Low | Security | leaderboard/route.ts | No rate limit |
| LOW-07 | Low | Code | gamification/route.ts | No rate limit (same as MED-09) |
| LOW-09 | Low | Code | page.tsx:172 | `as any` casts for GSAP/Lenis |
| LOW-10 | Low | Code | trigger-stats-refresh | `as any[]` on upsert bypasses types |
| LOW-11 | Low | A11y | Multiple pages | Buttons missing type, inputs missing label |
| LOW-12 | Low | Reliability | MapClient.tsx | No map.remove() on unmount |
| LOW-13 | Low | Code | 5 pages | basket-ai/bilan/promo/vision/alertes unreachable from nav |
| LOW-14 | Low | Perf | user-context.tsx:228,339 | shopping_list_items missing .limit() |
