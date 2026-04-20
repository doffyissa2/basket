import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-service'

export const maxDuration = 10

export async function GET() {
  const checks: Record<string, unknown> = {}

  // ── 1. Environment variables ────────────────────────────────────────
  checks.env_vars = {
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }

  // ── 2. Supabase service client ──────────────────────────────────────
  const tables = ['receipts', 'price_items', 'store_locations', 'community_prices']
  const tableChecks: Record<string, boolean> = {}
  let supabaseOk = false
  let supabaseError: string | null = null

  try {
    const supabase = getServiceClient()
    for (const table of tables) {
      const { error } = await supabase.from(table).select('*', { count: 'exact', head: true }).limit(0)
      tableChecks[table] = !error
      if (error) supabaseError = `${table}: ${error.message}`
    }
    supabaseOk = Object.values(tableChecks).every(Boolean)
  } catch (e) {
    supabaseError = e instanceof Error ? e.message : 'Unknown error'
  }

  checks.supabase = { connected: supabaseOk, tables: tableChecks, error: supabaseError }

  // ── 3. Anthropic API ────────────────────────────────────────────────
  let anthropicOk = false
  let anthropicError: string | null = null

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (apiKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 5,
          messages: [{ role: 'user', content: 'Reply OK' }],
        }),
        signal: AbortSignal.timeout(8000),
      })

      if (res.ok) {
        const data = await res.json()
        anthropicOk = !!data.content?.[0]?.text
      } else {
        const err = await res.text().catch(() => '')
        anthropicError = `HTTP ${res.status}: ${err.slice(0, 200)}`
      }
    } catch (e) {
      anthropicError = e instanceof Error ? e.message : 'Unknown error'
    }
  } else {
    anthropicError = 'ANTHROPIC_API_KEY not set'
  }

  checks.anthropic = { reachable: anthropicOk, error: anthropicError }

  // ── 4. Function timeout (self-report) ───────────────────────────────
  checks.vercel = {
    maxDuration_declared: 10,
    node_env: process.env.NODE_ENV,
    vercel_env: process.env.VERCEL_ENV ?? null,
    region: process.env.VERCEL_REGION ?? null,
  }

  // ── Overall status ──────────────────────────────────────────────────
  const allOk = supabaseOk && anthropicOk && !!apiKey
  const status = allOk ? 'ok' : anthropicOk || supabaseOk ? 'degraded' : 'broken'

  return NextResponse.json({ status, timestamp: new Date().toISOString(), checks })
}
