'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ShoppingBasket, Receipt, TrendingDown, Share2, ArrowRight, Check, Loader2 } from 'lucide-react'

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setError('')

    const { error: dbError } = await supabase
      .from('waitlist')
      .insert({ email: email.toLowerCase().trim() })

    if (dbError) {
      if (dbError.code === '23505') {
        setError('Vous êtes déjà inscrit(e) !')
      } else {
        setError('Une erreur est survenue. Réessayez.')
      }
    } else {
      setSubmitted(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1A1A1A]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <ShoppingBasket className="w-7 h-7 text-[#E07A5F]" strokeWidth={2.5} />
          <span className="text-xl font-bold tracking-tight">Basket</span>
        </div>
        <a href="/login">
          <Button variant="outline" className="rounded-full px-5 border-[#E07A5F] text-[#E07A5F] hover:bg-[#E07A5F] hover:text-white transition-all">
            Se connecter
          </Button>
        </a>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-[#E07A5F]/10 text-[#E07A5F] text-sm font-medium px-4 py-1.5 rounded-full mb-8">
          <TrendingDown className="w-4 h-4" />
          Économisez sur vos courses chaque semaine
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold leading-[1.1] tracking-tight mb-6">
          Payez-vous
          <span className="text-[#E07A5F]"> trop cher </span>
          vos courses&nbsp;?
        </h1>

        <p className="text-lg text-[#6B6B6B] max-w-xl mx-auto mb-10 leading-relaxed">
          Photographiez vos tickets de caisse. Basket vous dit si vos voisins paient moins — et où trouver les meilleurs prix près de chez vous.
        </p>

        {/* Waitlist form */}
        {submitted ? (
          <div className="flex items-center justify-center gap-3 bg-emerald-50 text-emerald-700 font-medium px-6 py-4 rounded-2xl max-w-md mx-auto">
            <Check className="w-5 h-5" />
            Merci ! Vous serez parmi les premiers informés.
          </div>
        ) : (
          <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 h-12 rounded-xl border-[#E0DDD8] bg-white px-4 text-base focus-visible:ring-[#E07A5F]"
            />
            <Button
              type="submit"
              disabled={loading}
              className="h-12 px-6 rounded-xl bg-[#E07A5F] hover:bg-[#C96A52] text-white font-semibold text-base transition-all"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Rejoindre <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </form>
        )}
        {error && (
          <p className="text-red-500 text-sm mt-3">{error}</p>
        )}
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-center text-3xl font-bold mb-14">Comment ça marche</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Receipt,
              title: 'Scannez votre ticket',
              desc: 'Prenez en photo votre ticket de caisse. Notre IA lit chaque article et chaque prix automatiquement.',
              step: '1',
            },
            {
              icon: TrendingDown,
              title: 'Comparez les prix',
              desc: "Découvrez combien vos voisins paient pour les mêmes produits dans d'autres magasins près de chez vous.",
              step: '2',
            },
            {
              icon: Share2,
              title: 'Partagez vos économies',
              desc: 'Envoyez votre rapport d\'économies à votre famille sur WhatsApp. Ils adoreront.',
              step: '3',
            },
          ].map((item) => (
            <div key={item.step} className="relative bg-white rounded-2xl p-8 border border-[#EDECE8] hover:shadow-lg transition-all">
              <div className="absolute -top-4 left-8 bg-[#E07A5F] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                {item.step}
              </div>
              <item.icon className="w-8 h-8 text-[#E07A5F] mb-4 mt-2" />
              <h3 className="font-bold text-lg mb-2">{item.title}</h3>
              <p className="text-[#6B6B6B] leading-relaxed text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof / stat */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <div className="bg-white rounded-3xl border border-[#EDECE8] p-10">
          <p className="text-5xl font-extrabold text-[#E07A5F] mb-3">23&nbsp;€</p>
          <p className="text-[#6B6B6B] text-lg">
            Économie moyenne par semaine pour nos premiers testeurs
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 pb-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Prêt à payer moins ?</h2>
        <p className="text-[#6B6B6B] mb-8">Rejoignez la liste d&apos;attente — c&apos;est 100% gratuit.</p>
        {!submitted && (
          <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 h-12 rounded-xl border-[#E0DDD8] bg-white px-4 text-base focus-visible:ring-[#E07A5F]"
            />
            <Button
              type="submit"
              disabled={loading}
              className="h-12 px-6 rounded-xl bg-[#E07A5F] hover:bg-[#C96A52] text-white font-semibold text-base"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "S'inscrire"}
            </Button>
          </form>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-[#EDECE8] py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-[#9B9B9B]">
          <div className="flex items-center gap-2">
            <ShoppingBasket className="w-4 h-4" />
            <span>Basket © 2026</span>
          </div>
          <p>Fait avec soin en France 🇫🇷</p>
        </div>
      </footer>
    </div>
  )
}