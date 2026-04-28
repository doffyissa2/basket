'use client'

import { useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { MapPin, Users, ShieldCheck, Search, TrendingDown, Star, ArrowRight } from 'lucide-react'

const PublicMapPreview = dynamic(() => import('@/components/PublicMapPreview'), { ssr: false })

const EASE = [0.16, 1, 0.3, 1] as const

function FadeUp({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

const HOW_IT_WORKS = [
  {
    num: '01',
    icon: MapPin,
    title: 'Tous les magasins, une seule carte',
    desc: 'Plus de 4 000 points de vente de 15 enseignes (Leclerc, Carrefour, Lidl, Aldi, Intermarche...) geolocalises avec precision.',
    color: '#7ed957',
  },
  {
    num: '02',
    icon: Search,
    title: 'Cherchez, filtrez, comparez',
    desc: 'Tapez une ville ou un code postal, filtrez par enseigne ou par niveau de donnees. Trouvez le supermarche le plus proche et le moins cher.',
    color: '#F59E0B',
  },
  {
    num: '03',
    icon: TrendingDown,
    title: 'Prix reels, pas des estimations',
    desc: 'Chaque point vert sur la carte indique des prix verifies par la communaute. Plus il y a de scans pres de chez vous, plus les donnees sont fiables.',
    color: '#4ECDC4',
  },
]

const COMMUNITY = [
  {
    icon: Users,
    title: 'Enrichie par la communaute',
    desc: 'Chaque ticket scanne ajoute des prix reels a la carte. Plus on est nombreux, plus la carte est precise pour tout le monde.',
  },
  {
    icon: Star,
    title: 'Sauvegardez vos magasins',
    desc: 'Marquez vos magasins favoris, consultez vos visites recentes, et naviguez en un clic via Google Maps.',
  },
  {
    icon: ShieldCheck,
    title: 'Donnees anonymes et transparentes',
    desc: 'Seuls des prix agreges et anonymises apparaissent sur la carte. Vos tickets personnels restent strictement prives.',
  },
]

const TIERS = [
  {
    color: '#7ed957',
    label: 'Donnees locales',
    desc: 'Au moins 3 scans a proximite — prix moyens fiables pour ce magasin precis.',
  },
  {
    color: '#F59E0B',
    label: 'Donnees nationales',
    desc: "Prix catalogue de l'enseigne — utile pour comparer les chaines entre elles.",
  },
  {
    color: '#9CA3AF',
    label: 'Peu de donnees',
    desc: 'Le magasin est sur la carte mais nous manquons de scans. Contribuez pour ameliorer la couverture.',
  },
]

export default function CarteInfoPage() {
  return (
    <div className="min-h-screen bg-paper text-graphite">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-paper/80 backdrop-blur-xl border-b border-graphite/5">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/basket_logo.png" alt="Basket" className="h-7 w-7" />
            <span className="font-sans font-bold tracking-tight text-sm">Basket</span>
          </Link>
          <Link
            href="/login"
            className="rounded-xl bg-signal text-graphite px-5 py-2 font-sans text-xs font-semibold uppercase tracking-wider hover:scale-105 transition-transform"
          >
            Acceder a la carte
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="pt-16 md:pt-24 pb-8 px-5 md:px-[5vw]">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <div className="inline-flex items-center gap-2 bg-signal/10 rounded-full px-4 py-1.5 mb-6">
              <MapPin className="w-3.5 h-3.5 text-signal" />
              <span className="font-mono text-[11px] text-signal font-bold uppercase tracking-wider">Carte interactive</span>
            </div>
            <h1 className="font-sans text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
              Trouvez le <span className="text-signal">moins cher</span><br />
              pres de chez vous.
            </h1>
            <p className="font-sans text-base md:text-lg text-graphite/55 max-w-2xl mx-auto mt-6 leading-relaxed">
              15 enseignes. Des milliers de magasins. Des prix reels, soumis par la communaute.
              La carte Basket vous montre exactement ou aller pour payer moins — article par article.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Live Map ────────────────────────────────────────────────────────── */}
      <section className="px-5 md:px-[5vw] pb-16 md:pb-24">
        <FadeUp>
          <div className="max-w-6xl mx-auto rounded-[2rem] md:rounded-[3rem] overflow-hidden border border-graphite/10 shadow-2xl h-[400px] md:h-[550px]">
            <PublicMapPreview ctaHref="/login" ctaLabel="Acceder a la carte complete" />
          </div>
        </FadeUp>
      </section>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <section className="px-5 md:px-[5vw] pb-16 md:pb-24">
        <div className="max-w-5xl mx-auto">
          <FadeUp>
            <span className="font-mono text-xs text-graphite/40 uppercase tracking-wider">Comment ca marche</span>
            <h2 className="font-sans text-3xl md:text-5xl font-extrabold tracking-tight mt-2 mb-10 md:mb-14">
              Une carte, trois niveaux de donnees.
            </h2>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {HOW_IT_WORKS.map((step, i) => (
              <FadeUp key={step.num} delay={i * 0.12}>
                <div className="bg-offwhite rounded-2xl md:rounded-3xl p-6 md:p-8 border border-graphite/5 h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${step.color}18` }}
                    >
                      <step.icon className="w-5 h-5" style={{ color: step.color }} />
                    </div>
                    <span className="font-mono text-xs text-graphite/30 font-bold">{step.num}</span>
                  </div>
                  <h3 className="font-sans text-lg font-bold mb-2">{step.title}</h3>
                  <p className="font-sans text-sm text-graphite/55 leading-relaxed flex-1">{step.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tier legend ─────────────────────────────────────────────────────── */}
      <section className="px-5 md:px-[5vw] pb-16 md:pb-24">
        <div className="max-w-4xl mx-auto">
          <FadeUp>
            <div className="rounded-2xl md:rounded-3xl p-6 md:p-10 border border-graphite/5" style={{ background: 'rgba(126,217,87,0.04)' }}>
              <h3 className="font-sans text-xl md:text-2xl font-extrabold tracking-tight mb-6">Comprendre les couleurs</h3>
              <div className="space-y-5">
                {TIERS.map((tier) => (
                  <div key={tier.label} className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-4 h-4 rounded-full" style={{ background: tier.color, boxShadow: `0 0 10px ${tier.color}40` }} />
                    </div>
                    <div>
                      <p className="font-sans text-sm font-bold">{tier.label}</p>
                      <p className="font-sans text-sm text-graphite/50 mt-0.5">{tier.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Community features ──────────────────────────────────────────────── */}
      <section className="px-5 md:px-[5vw] pb-16 md:pb-24">
        <div className="max-w-5xl mx-auto">
          <FadeUp>
            <span className="font-mono text-xs text-graphite/40 uppercase tracking-wider">Communaute</span>
            <h2 className="font-sans text-3xl md:text-5xl font-extrabold tracking-tight mt-2 mb-10 md:mb-14">
              La carte grandit avec vous.
            </h2>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {COMMUNITY.map((item, i) => (
              <FadeUp key={item.title} delay={i * 0.12}>
                <div className="bg-offwhite rounded-2xl md:rounded-3xl p-6 md:p-8 border border-graphite/5 h-full flex flex-col">
                  <div className="w-10 h-10 rounded-xl bg-signal/10 flex items-center justify-center mb-4">
                    <item.icon className="w-5 h-5 text-signal" />
                  </div>
                  <h3 className="font-sans text-lg font-bold mb-2">{item.title}</h3>
                  <p className="font-sans text-sm text-graphite/55 leading-relaxed flex-1">{item.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="px-5 md:px-[5vw] pb-20 md:pb-28">
        <FadeUp>
          <div
            className="max-w-4xl mx-auto rounded-[2rem] md:rounded-[3rem] px-8 md:px-14 py-12 md:py-16 text-center relative overflow-hidden"
            style={{ background: 'linear-gradient(145deg, #1a1a1a, #2d2d2d)', boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}
          >
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(126,217,87,0.4), transparent)' }} />
            <h2 className="font-sans text-2xl md:text-4xl font-extrabold text-white tracking-tight mb-4">
              Pret a explorer ?
            </h2>
            <p className="font-sans text-base text-white/50 max-w-lg mx-auto mb-8">
              Creez votre compte gratuit et accedez a la carte complete avec filtres, favoris, navigation et prix detailles.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full px-8 py-4 font-sans text-base font-bold text-graphite transition-all hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #7ed957, #a3e635)', boxShadow: '0 4px 20px rgba(126,217,87,0.3)' }}
              >
                Creer un compte gratuit
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-sans text-sm font-semibold text-white/60 border border-white/10 hover:border-white/25 transition-colors"
              >
                Retour a l'accueil
              </Link>
            </div>
          </div>
        </FadeUp>
      </section>

    </div>
  )
}
