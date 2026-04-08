import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Connexion — Basket',
  description: 'Connectez-vous à votre compte Basket pour scanner vos tickets et comparer vos prix.',
  openGraph: {
    title: 'Connexion — Basket',
    description: 'Connectez-vous ou créez un compte Basket gratuitement.',
    url: 'https://basketbeta.com/login',
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: 'Basket' }],
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
