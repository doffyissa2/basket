import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vision — La mission de Basket',
  description: "Nous croyons que chaque Français mérite de savoir s'il paie ses courses trop cher. Basket rend la transparence des prix accessible à tous.",
  openGraph: {
    title: 'Vision — La mission de Basket',
    description: "Nous croyons que chaque Français mérite de savoir s'il paie ses courses trop cher.",
    url: 'https://basketbeta.com/vision',
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: 'Basket' }],
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
