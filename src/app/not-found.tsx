import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page introuvable — Basket',
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-paper text-graphite flex flex-col items-center justify-center px-5 text-center">
      <img src="/basket_logo.png" alt="Basket" className="h-16 w-16 mb-8 opacity-30" />
      <p className="font-mono text-xs text-graphite/30 uppercase tracking-[0.2em] mb-4">Erreur 404</p>
      <h1 className="text-4xl font-extrabold tracking-tighter text-graphite mb-3">
        Page introuvable
      </h1>
      <p className="text-graphite/50 text-sm max-w-xs leading-relaxed mb-10">
        Cette page n&apos;existe pas ou a été déplacée. Vérifiez l&apos;URL ou retournez à l&apos;accueil.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/dashboard"
          className="h-12 px-8 rounded-2xl font-semibold text-sm flex items-center justify-center text-white"
          style={{ background: '#111111' }}
        >
          Mon tableau de bord
        </Link>
        <Link
          href="/"
          className="h-12 px-8 rounded-2xl font-semibold text-sm flex items-center justify-center text-graphite"
          style={{ background: 'rgba(17,17,17,0.06)', border: '1px solid rgba(17,17,17,0.1)' }}
        >
          Accueil
        </Link>
      </div>
    </div>
  )
}
