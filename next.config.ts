import type { NextConfig } from 'next'

const securityHeaders = [
  // Prevent clickjacking — only allow embedding from same origin
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Force HTTPS for 1 year, include subdomains
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // Minimal referrer info sent to third parties
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Restrict browser features — no camera/mic/geo access except our own origin
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(), geolocation=(self), payment=()',
  },
  // Content-Security-Policy
  // - default: same origin only
  // - scripts: self + inline (needed for Next.js hydration) + CDNs used by landing page
  // - styles: self + inline (Tailwind inlines styles)
  // - images: self + data URIs + Supabase storage
  // - connect: self + Supabase + Upstash + Anthropic + Nominatim + Overpass + OpenFoodFacts
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://code.iconify.design",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co https://*.openstreetmap.org https://tile.openstreetmap.org",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.upstash.io https://api.anthropic.com https://nominatim.openstreetmap.org https://overpass-api.de https://overpass.kumi.systems https://api.prices.openfoodfacts.org https://prices.openfoodfacts.org",
      "media-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.openstreetmap.org' },
    ],
  },
}

export default nextConfig
