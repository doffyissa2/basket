import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Comment ça marche — Guide Basket',
  description: "Scannez, comparez, économisez. Découvrez comment Basket analyse vos tickets de caisse et vous aide à faire vos courses au meilleur prix près de chez vous.",
  openGraph: {
    title: 'Comment ça marche — Guide Basket',
    description: "3 étapes pour ne plus jamais payer vos courses trop cher.",
    url: 'https://basketbeta.com/comment-ca-marche',
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: 'Basket' }],
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
