import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Carte des prix — Trouvez le magasin le moins cher | Basket',
  description: 'Explorez plus de 4 000 magasins sur la carte interactive Basket. Comparez les prix de 15 enseignes, trouvez le supermarche le moins cher et contribuez a la communaute.',
  openGraph: {
    title: 'Carte des prix — Trouvez le magasin le moins cher | Basket',
    description: 'Plus de 4 000 magasins, 15 enseignes, des prix mis a jour chaque jour.',
    url: 'https://basketbeta.com/carte-info',
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: 'Basket Carte' }],
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
