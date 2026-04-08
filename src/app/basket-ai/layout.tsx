import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Basket AI — Analyse vos courses par intelligence artificielle',
  description: "Basket utilise Claude Vision d'Anthropic pour lire vos tickets en quelques secondes, identifier chaque article et comparer les prix sur 15 enseignes françaises.",
  openGraph: {
    title: 'Basket AI — Analyse vos courses par intelligence artificielle',
    description: "Notre IA lit votre ticket en 3 secondes et trouve où vous auriez payé moins cher.",
    url: 'https://basketbeta.com/basket-ai',
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: 'Basket AI' }],
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
