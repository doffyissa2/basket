import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: 'Basket — Payez-vous trop cher vos courses ?',
  description: 'Scannez vos tickets de caisse et découvrez si vous payez plus cher que vos voisins. Trouvez les meilleurs prix près de chez vous.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Basket',
  },
}

export const viewport: Viewport = {
  themeColor: '#E07A5F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
