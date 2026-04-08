import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Routes that require an authenticated session
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/scan',
  '/carte',
  '/bilan',
  '/liste',
  '/profile',
  '/notifications',
  '/receipt',
]

// Routes that should redirect authenticated users away (e.g. login)
const AUTH_ONLY_PATHS = ['/login']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p))
  const isAuthOnly  = AUTH_ONLY_PATHS.some(p => pathname.startsWith(p))

  if (!isProtected && !isAuthOnly) return NextResponse.next()

  // Read the Supabase session cookie that the client SDK writes
  // Cookie name format: sb-<project-ref>-auth-token
  const cookieHeader = request.headers.get('cookie') ?? ''
  const tokenMatch = cookieHeader.match(/sb-[^-]+-auth-token=([^;]+)/)
  let accessToken: string | null = null

  if (tokenMatch) {
    try {
      // Cookie value is base64url-encoded JSON: [access_token, refresh_token]
      const decoded = Buffer.from(decodeURIComponent(tokenMatch[1]), 'base64').toString()
      const parsed = JSON.parse(decoded)
      accessToken = parsed.access_token ?? parsed[0] ?? null
    } catch {
      // Malformed cookie — treat as unauthenticated
    }
  }

  let isAuthenticated = false

  if (accessToken) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await supabase.auth.getUser(accessToken)
      isAuthenticated = !!user
    } catch {
      isAuthenticated = false
    }
  }

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthOnly && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon, icons, manifest, sw
     * - public assets
     * - api routes (handled by their own requireAuth)
     */
    '/((?!_next/static|_next/image|favicon|icon|manifest|sw\\.js|offline\\.html|basket_logo\\.png|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)).*)',
  ],
}
