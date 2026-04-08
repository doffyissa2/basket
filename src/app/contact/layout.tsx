import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact — Basket',
  description: "Une question, un retour, un partenariat ? Contactez l'équipe Basket. Nous répondons à tous les messages.",
  openGraph: {
    title: 'Contact — Basket',
    description: "Contactez l'équipe Basket. Nous répondons à tous les messages.",
    url: 'https://basketbeta.com/contact',
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: 'Basket' }],
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
