import { NextRequest, NextResponse } from 'next/server'

/**
 * Middleware is intentionally minimal.
 *
 * Supabase JS v2 stores sessions in localStorage (not HTTP cookies), so
 * server-side session detection requires @supabase/ssr with cookie-based
 * storage — which is a larger migration. For now, auth protection is
 * handled client-side in each page's useEffect (redirects to /login).
 *
 * This middleware only passes requests through without blocking anything.
 * Add @supabase/ssr-based protection here when upgrading auth storage.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
