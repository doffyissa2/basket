import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Carte des prix — Basket',
  description: "Visualisez les prix des magasins autour de vous. Trouvez l'enseigne la moins chère dans votre secteur, article par article.",
  openGraph: {
    title: 'Carte des prix — Basket',
    description: "Les prix de votre quartier, visualisés en temps réel.",
    url: 'https://basketbeta.com/carte',
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: 'Basket' }],
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
