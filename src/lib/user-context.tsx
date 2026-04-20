'use client'

/**
 * UserContextProvider — the unified intelligence brain.
 *
 * Loads once on login in a single Promise.all and stays in memory across all pages.
 * Every page reads auth, profile, location, and user history from here instead of
 * making independent Supabase calls.
 *
 * NEVER redirects to /login — sets user: null and lets pages handle redirects.
 * Safe for unauthenticated pages (landing, login, privacy, etc.).
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { on } from '@/lib/events'

// ── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  postcode:      string | null
  dept:          string | null   // postcode.slice(0, 2) — derived, not a DB column
  onboarded:     boolean
  total_savings: number
}

export interface CachedLocation {
  lat:       number | null
  lon:       number | null
  postcode:  string | null
  timestamp: number   // expires epoch from localStorage
}

export interface ShoppingListItem {
  id:                   string
  item_name:            string
  item_name_normalised: string
  estimated_price:      number | null
  store_chain:          string | null
  quantity:             number
  is_bought:            boolean
  added_at:             string
}

export type RefreshKey =
  | 'auth'
  | 'profile'
  | 'location'
  | 'recentStores'
  | 'topItems'
  | 'shoppingList'
  | 'gamification'

export interface UserContextValue {
  user:              User | null
  session:           Session | null
  profile:           UserProfile | null
  location:          CachedLocation | null
  recentStores:      string[]          // last 5 unique store_chain values
  favoriteStore:     string | null     // most frequent store_chain
  topItems:          string[]          // top 20 item_name_normalised by scan count
  level:             number | null     // from localStorage basket_gam_level
  streak:            number | null     // from localStorage basket_gam_streak
  shoppingListItems: ShoppingListItem[]
  loading:           boolean
  error:             string | null
  refresh:           (keys?: RefreshKey[]) => Promise<void>
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function readLocationCache(): CachedLocation | null {
  try {
    const raw = localStorage.getItem('basket_postcode_cached')
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      postcode?: string | null
      coords?: { lat: number; lon: number } | null
      expires?: number
    }
    if (parsed.expires && Date.now() > parsed.expires) return null
    return {
      lat:       parsed.coords?.lat   ?? null,
      lon:       parsed.coords?.lon   ?? null,
      postcode:  parsed.postcode      ?? null,
      timestamp: parsed.expires       ?? Date.now(),
    }
  } catch {
    return null
  }
}

function readGamification(): { level: number | null; streak: number | null } {
  try {
    const lvl = localStorage.getItem('basket_gam_level')
    const str = localStorage.getItem('basket_gam_streak')
    return {
      level:  lvl ? parseInt(lvl, 10) : null,
      streak: str ? parseInt(str, 10) : null,
    }
  } catch {
    return { level: null, streak: null }
  }
}

function aggregateStores(rows: { store_chain: string | null }[]): {
  recent: string[]
  favorite: string | null
} {
  const seen  = new Set<string>()
  const recent: string[] = []
  const freq: Record<string, number> = {}

  for (const row of rows) {
    const chain = row.store_chain
    if (!chain) continue
    freq[chain] = (freq[chain] ?? 0) + 1
    if (!seen.has(chain) && recent.length < 5) {
      seen.add(chain)
      recent.push(chain)
    }
  }

  const topEntry = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]
  return { recent, favorite: topEntry?.[0] ?? null }
}

function aggregateTopItems(rows: { item_name_normalised: string | null }[]): string[] {
  const freq: Record<string, number> = {}
  for (const row of rows) {
    const n = row.item_name_normalised
    if (!n) continue
    freq[n] = (freq[n] ?? 0) + 1
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name]) => name)
}

// ── Context ──────────────────────────────────────────────────────────────────

const UserContext = createContext<UserContextValue | null>(null)

export function useUserContext(): UserContextValue {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUserContext must be used within <UserContextProvider>')
  return ctx
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function UserContextProvider({ children }: { children: React.ReactNode }) {
  const [user,              setUser]              = useState<User | null>(null)
  const [session,           setSession]           = useState<Session | null>(null)
  const [profile,           setProfile]           = useState<UserProfile | null>(null)
  const [location,          setLocation]          = useState<CachedLocation | null>(null)
  const [recentStores,      setRecentStores]      = useState<string[]>([])
  const [favoriteStore,     setFavoriteStore]     = useState<string | null>(null)
  const [topItems,          setTopItems]          = useState<string[]>([])
  const [level,             setLevel]             = useState<number | null>(null)
  const [streak,            setStreak]            = useState<number | null>(null)
  const [shoppingListItems, setShoppingListItems] = useState<ShoppingListItem[]>([])
  const [loading,           setLoading]           = useState(true)
  const [error,             setError]             = useState<string | null>(null)

  // Prevent concurrent refresh of the same key
  const refreshingKeys = useRef(new Set<RefreshKey>())

  // ── Full load ───────────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Step 1: auth — must precede all user-guarded queries
      const { data: { session: s } } = await supabase.auth.getSession()
      setSession(s)
      setUser(s?.user ?? null)

      // Gamification: sync from localStorage immediately (no network)
      const gam = readGamification()
      setLevel(gam.level)
      setStreak(gam.streak)

      const userId = s?.user?.id ?? null

      // Step 2: all remaining branches in parallel
      const [profileRes, locationVal, storeRes, itemsRes, listRes] = await Promise.all([
        userId
          ? supabase
              .from('profiles')
              .select('postcode, onboarded, total_savings')
              .eq('id', userId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),

        Promise.resolve(readLocationCache()),

        userId
          ? supabase
              .from('receipts')
              .select('store_chain')
              .eq('user_id', userId)
              .not('store_chain', 'is', null)
              .order('created_at', { ascending: false })
              .limit(50)
          : Promise.resolve({ data: [], error: null }),

        userId
          ? supabase
              .from('price_items')
              .select('item_name_normalised')
              .eq('user_id', userId)
              .not('item_name_normalised', 'is', null)
              .limit(200)
          : Promise.resolve({ data: [], error: null }),

        userId
          ? supabase
              .from('shopping_list_items')
              .select('id, item_name, item_name_normalised, estimated_price, store_chain, quantity, is_bought, added_at')
              .eq('user_id', userId)
              .order('added_at', { ascending: false })
              .limit(500)
          : Promise.resolve({ data: [], error: null }),
      ])

      // Settle profile
      if (profileRes.data) {
        const pc = (profileRes.data.postcode as string) ?? null
        setProfile({
          postcode:      pc,
          dept:          pc ? pc.slice(0, 2) : null,
          onboarded:     Boolean(profileRes.data.onboarded),
          total_savings: Number(profileRes.data.total_savings ?? 0),
        })
      }

      // Location from cache
      setLocation(locationVal)

      // Recent stores + favorite
      const { recent, favorite } = aggregateStores(
        (storeRes.data ?? []) as { store_chain: string | null }[]
      )
      setRecentStores(recent)
      setFavoriteStore(favorite)

      // Top items
      setTopItems(aggregateTopItems(
        (itemsRes.data ?? []) as { item_name_normalised: string | null }[]
      ))

      // Shopping list
      setShoppingListItems((listRes.data ?? []) as ShoppingListItem[])

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement du contexte')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Selective refresh ────────────────────────────────────────────────────────

  const refresh = useCallback(async (keys?: RefreshKey[]) => {
    if (!keys || keys.length === 0) {
      await loadAll()
      return
    }

    // Retrieve current userId without causing a re-render
    const { data: { session: s } } = await supabase.auth.getSession()
    const userId = s?.user?.id ?? null
    if (!userId) return

    const pending = keys.filter(k => !refreshingKeys.current.has(k))
    if (pending.length === 0) return
    pending.forEach(k => refreshingKeys.current.add(k))

    try {
      await Promise.all(
        pending.map(async (key) => {
          switch (key) {
            case 'profile': {
              const { data } = await supabase
                .from('profiles')
                .select('postcode, onboarded, total_savings')
                .eq('id', userId)
                .maybeSingle()
              if (data) {
                const pc = (data.postcode as string) ?? null
                setProfile({
                  postcode:      pc,
                  dept:          pc ? pc.slice(0, 2) : null,
                  onboarded:     Boolean(data.onboarded),
                  total_savings: Number(data.total_savings ?? 0),
                })
              }
              break
            }
            case 'recentStores': {
              const { data } = await supabase
                .from('receipts')
                .select('store_chain')
                .eq('user_id', userId)
                .not('store_chain', 'is', null)
                .order('created_at', { ascending: false })
                .limit(50)
              const { recent, favorite } = aggregateStores(
                (data ?? []) as { store_chain: string | null }[]
              )
              setRecentStores(recent)
              setFavoriteStore(favorite)
              break
            }
            case 'topItems': {
              const { data } = await supabase
                .from('price_items')
                .select('item_name_normalised')
                .eq('user_id', userId)
                .not('item_name_normalised', 'is', null)
                .limit(200)
              setTopItems(aggregateTopItems(
                (data ?? []) as { item_name_normalised: string | null }[]
              ))
              break
            }
            case 'shoppingList': {
              const { data } = await supabase
                .from('shopping_list_items')
                .select('id, item_name, item_name_normalised, estimated_price, store_chain, quantity, is_bought, added_at')
                .eq('user_id', userId)
                .order('added_at', { ascending: false })
                .limit(500)
              setShoppingListItems((data ?? []) as ShoppingListItem[])
              break
            }
            case 'location': {
              setLocation(readLocationCache())
              break
            }
            case 'gamification': {
              const gam = readGamification()
              setLevel(gam.level)
              setStreak(gam.streak)
              break
            }
          }
        })
      )
    } finally {
      pending.forEach(k => refreshingKeys.current.delete(k))
    }
  }, [loadAll])

  // ── Mount ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // ── Event subscriptions ──────────────────────────────────────────────────────

  useEffect(() => {
    const unsubScan = on('receipt:scanned', () => {
      refresh(['recentStores', 'profile'])
    })
    const unsubList = on('list:updated', () => {
      refresh(['shoppingList'])
    })
    const unsubProfile = on('profile:updated', ({ postcode }) => {
      if (postcode !== undefined) {
        // Optimistically update dept without a DB round-trip
        setProfile(prev => prev ? {
          ...prev,
          postcode,
          dept: postcode ? postcode.slice(0, 2) : null,
        } : prev)
      }
    })
    return () => { unsubScan(); unsubList(); unsubProfile() }
  }, [refresh])

  // ── Auth state change (handles login/logout mid-session) ─────────────────────

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadAll()
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setSession(null)
        setProfile(null)
        setRecentStores([])
        setFavoriteStore(null)
        setTopItems([])
        setShoppingListItems([])
        setLoading(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [loadAll])

  const value: UserContextValue = {
    user,
    session,
    profile,
    location,
    recentStores,
    favoriteStore,
    topItems,
    level,
    streak,
    shoppingListItems,
    loading,
    error,
    refresh,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}
