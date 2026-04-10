import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import PWASetup from '@/components/PWASetup'
import ErrorBoundary from '@/components/ErrorBoundary'
import OfflineBanner from '@/components/OfflineBanner'
import { UserContextProvider } from '@/lib/user-context'

const BASE_URL = 'https://basketbeta.com'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Basket — Payez-vous trop cher vos courses ?',
    template: '%s — Basket',
  },
  description: 'Scannez vos tickets de caisse et découvrez si vous payez plus cher que vos voisins. Comparez les prix de 15 enseignes et économisez chaque semaine.',
  manifest: '/manifest.json',
  keywords: ['comparaison prix courses', 'ticket de caisse', 'Lidl', 'Leclerc', 'Aldi', 'économies', 'supermarché'],
  authors: [{ name: 'Basket', url: BASE_URL }],
  creator: 'Basket',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: BASE_URL,
    siteName: 'Basket',
    title: 'Basket — Payez-vous trop cher vos courses ?',
    description: 'Scannez vos tickets de caisse et découvrez si vous payez plus cher que vos voisins. Comparez les prix de 15 enseignes et économisez chaque semaine.',
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: 'Basket' }],
  },
  twitter: {
    card: 'summary',
    title: 'Basket — Payez-vous trop cher vos courses ?',
    description: 'Scannez vos tickets de caisse et comparez les prix de 15 enseignes françaises.',
    images: ['/icon-512.png'],
    creator: '@basketapp',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Basket',
    startupImage: '/icon-512.png',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'msapplication-TileColor': '#0A0A0A',
    'msapplication-tap-highlight': 'no',
  },
}

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className="dark">
      <head>
        <link rel="icon" href="/basket_logo.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/basket_logo.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <OfflineBanner />
        <ErrorBoundary>
          <UserContextProvider>
            {children}
          </UserContextProvider>
        </ErrorBoundary>
        <PWASetup />
        <Toaster />
      </body>
    </html>
  )
}
