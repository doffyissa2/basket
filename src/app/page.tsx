'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import NewsletterSection, { PWAGuide } from '@/components/NewsletterSection'
import BasketIndexSection from '@/components/BasketIndexSection'

const PublicMapPreview = dynamic(() => import('@/components/PublicMapPreview'), { ssr: false })

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'iconify-icon': React.HTMLAttributes<HTMLElement> & { icon?: string }
    }
  }
}

const FAQS = [
  {
    q: "Comment fonctionne Basket ?",
    a: "Basket utilise l'intelligence artificielle pour lire vos tickets de caisse et extraire automatiquement chaque article et prix. Nous comparons ces prix avec notre base de plus de 9 000 références dans 15 enseignes françaises pour vous montrer où vous auriez payé moins cher.",
  },
  {
    q: "Est-ce vraiment gratuit ?",
    a: "Oui, Basket est entièrement gratuit. Nous sommes en phase beta et notre priorité est de construire le meilleur outil de comparaison de prix pour les consommateurs français. Aucune carte bancaire n'est requise.",
  },
  {
    q: "Mes données personnelles sont-elles sécurisées ?",
    a: "Absolument. Vos tickets et données d'achats sont chiffrés et stockés en toute sécurité. Nous ne partageons jamais vos données avec des tiers et vous pouvez les supprimer à tout moment depuis votre profil. Les images de tickets sont supprimées dès la fin de l'analyse.",
  },
  {
    q: "Quels magasins sont comparés ?",
    a: "Basket compare les prix de 15 grandes enseignes françaises : E.Leclerc, Carrefour, Intermarché, Système U, Auchan, Lidl, Aldi, Monoprix et bien d'autres. Notre base est mise à jour régulièrement pour garantir des comparaisons précises.",
  },
  {
    q: "La reconnaissance de ticket est-elle précise ?",
    a: "Notre IA atteint un taux de reconnaissance supérieur à 95% sur les tickets standard. En cas d'erreur, vous pouvez facilement corriger les articles reconnus. Les tickets très froissés ou en mauvais état peuvent parfois réduire la précision.",
  },
  {
    q: "Comment ajouter Basket à mon écran d'accueil ?",
    a: "Sur iPhone : ouvrez Basket dans Safari → icône de partage → « Sur l'écran d'accueil ». Sur Android : ouvrez dans Chrome → menu (⋮) → « Ajouter à l'écran d'accueil ». Vous bénéficierez d'une expérience similaire à une application native.",
  },
  {
    q: "Puis-je utiliser Basket pour n'importe quel supermarché ?",
    a: "Basket fonctionne avec la quasi-totalité des supermarchés français. Du moment que le ticket comporte des articles et des prix lisibles, notre IA peut les extraire et les comparer. Nous améliorons continuellement la compatibilité avec de nouvelles enseignes.",
  },
]

function FaqSection() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <section className="py-16 md:py-[15vh] px-5 md:px-[5vw] relative z-10 max-w-4xl mx-auto">
      <div className="mb-10 md:mb-[8vh]">
        <span className="font-mono text-xs text-graphite/50 uppercase tracking-tight">Questions fréquentes</span>
        <h2 className="font-sans text-4xl md:text-[5vw] tracking-tighter text-graphite font-extrabold leading-none mt-2">
          Tout ce que vous<br /><span className="text-signal">voulez savoir.</span>
        </h2>
      </div>
      <div className="border-t" style={{ borderColor: 'rgba(17,17,17,0.08)' }}>
        {FAQS.map((faq, i) => (
          <div key={i} className="border-b" style={{ borderColor: 'rgba(17,17,17,0.08)' }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between gap-6 py-5 md:py-6 text-left group"
            >
              <span className={`font-sans text-base md:text-lg font-semibold tracking-tight transition-colors duration-300 ${open === i ? 'text-signal' : 'text-graphite group-hover:text-signal'}`}>
                {faq.q}
              </span>
              <span
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300"
                style={{ background: open === i ? '#7ed957' : 'rgba(17,17,17,0.06)', transform: open === i ? 'rotate(45deg)' : 'rotate(0deg)' }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1v10M1 6h10" stroke={open === i ? '#111' : '#111'} strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
            </button>
            <div
              style={{
                maxHeight: open === i ? '300px' : '0px',
                overflow: 'hidden',
                transition: 'max-height 0.4s cubic-bezier(0.16,1,0.3,1)',
              }}
            >
              <p className="font-mono text-sm text-graphite/60 leading-relaxed pb-6 max-w-2xl">
                {faq.a}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function HomePage() {
  useEffect(() => {
    // ── Inject page-scoped CSS ─────────────────────────────────────────────
    const style = document.createElement('style')
    style.textContent = `
      body, a, button { cursor: none !important; }
      @media (hover: none) and (pointer: coarse) {
        body, a, button { cursor: auto !important; }
        #custom-cursor { display: none !important; }
      }
      .char-span { display: inline-block; }
      .marquee-container { display: flex; width: 200vw; }
      .stack-shadow { box-shadow: 0 -20px 40px -20px rgba(17,17,17,0.1); }
      @keyframes receiptFloat {
        0%, 100% { transform: translateY(0px) rotateY(0deg) rotateX(5deg); }
        50%       { transform: translateY(-20px) rotateY(8deg) rotateX(0deg); }
      }
      @keyframes scanLine {
        0%   { top: 10%; }
        50%  { top: 85%; }
        100% { top: 10%; }
      }
      @keyframes pricePopIn {
        0%, 100% { opacity: 0.3; transform: scale(0.95); }
        50%       { opacity: 1;   transform: scale(1); }
      }
      .receipt-float     { animation: receiptFloat 6s ease-in-out infinite; }
      .scan-line         { animation: scanLine 3s ease-in-out infinite; }
      .price-pop         { animation: pricePopIn 4s ease-in-out infinite; }
      .price-pop-delay   { animation: pricePopIn 4s ease-in-out infinite 1.5s; }
      .price-pop-delay2  { animation: pricePopIn 4s ease-in-out infinite 3s; }
    `
    document.head.appendChild(style)

    // ── Override dark-mode body colours set by globals.css ────────────────
    const htmlEl = document.documentElement
    const hadDark = htmlEl.classList.contains('dark')
    htmlEl.classList.remove('dark')
    const prevHtmlBg    = htmlEl.style.backgroundColor
    const prevBodyBg    = document.body.style.backgroundColor
    const prevBodyColor = document.body.style.color
    htmlEl.style.backgroundColor    = '#E8E4DD'
    document.body.style.backgroundColor = '#E8E4DD'
    document.body.style.color           = '#111111'

    let termInterval: ReturnType<typeof setInterval> | undefined
    let lenisInstance: { raf: (t: number) => void; destroy?: () => void } | undefined
    let rafId: number | undefined
    let mouseMoveHandler: ((e: MouseEvent) => void) | undefined
    const injectedScripts: HTMLScriptElement[] = []

    function loadScript(src: string): Promise<void> {
      return new Promise((resolve) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
        const s = document.createElement('script')
        s.src = src
        s.onload  = () => resolve()
        s.onerror = () => resolve()
        document.head.appendChild(s)
        injectedScripts.push(s)
      })
    }

    async function init() {
      // Space Mono for font-mono usage on the landing page
      if (!document.querySelector('link[data-space-mono]')) {
        const fl = document.createElement('link')
        fl.rel = 'stylesheet'
        fl.setAttribute('data-space-mono', '1')
        fl.href = 'https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap'
        document.head.appendChild(fl)
      }

      // No CDN Tailwind — colors are compiled via globals.css @theme
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js')
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js')
      await loadScript('https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.34/dist/lenis.min.js')
      await loadScript('https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js')

      const gsap          = (window as any).gsap
      const ScrollTrigger = (window as any).ScrollTrigger
      const Lenis         = (window as any).Lenis
      if (!gsap || !ScrollTrigger || !Lenis) return

      // Lenis smooth scroll
      lenisInstance = new Lenis({ lerp: 0.08, smoothWheel: true })
      function raf(time: number) { if (!lenisInstance) return; lenisInstance.raf(time); rafId = requestAnimationFrame(raf) }
      rafId = requestAnimationFrame(raf)

      gsap.registerPlugin(ScrollTrigger)

      // ── Custom cursor ──────────────────────────────────────────────────
      const cursor = document.getElementById('custom-cursor')
      if (cursor) {
        let mouseX = -100, mouseY = -100  // start off-screen until first move
        let cursorX = mouseX, cursorY = mouseY
        // xPercent/yPercent centres the dot on the hotspot regardless of its size
        gsap.set(cursor, { xPercent: -50, yPercent: -50, x: mouseX, y: mouseY })
        mouseMoveHandler = (e: MouseEvent) => { mouseX = e.clientX; mouseY = e.clientY }
        window.addEventListener('mousemove', mouseMoveHandler)
        gsap.ticker.add(() => {
          cursorX += (mouseX - cursorX) * 0.15
          cursorY += (mouseY - cursorY) * 0.15
          gsap.set(cursor, { x: cursorX, y: cursorY })
        })
        document.querySelectorAll('.hover-trigger, a, button').forEach((el: Element) => {
          el.addEventListener('mouseenter', () => { cursor.classList.add('w-12', 'h-12'); cursor.classList.remove('w-5', 'h-5') })
          el.addEventListener('mouseleave', () => { cursor.classList.remove('w-12', 'h-12'); cursor.classList.add('w-5', 'h-5') })
        })
      }

      // ── Text splitter (plain-text only — never pass elements with HTML inside) ──
      function splitText(selector: string) {
        document.querySelectorAll(selector).forEach((el: Element) => {
          const htmlEl = el as HTMLElement
          // Skip elements that contain child HTML tags — splitting by space
          // would break partial tag tokens (e.g. `class=` becomes raw text)
          if (/<[a-z]/i.test(htmlEl.innerHTML)) return
          const words = (htmlEl.textContent || '').trim().split(' ')
          htmlEl.innerHTML = ''
          words.forEach((word: string) => {
            const wd = document.createElement('div')
            wd.className = 'inline-block overflow-hidden mr-[1.5vw] last:mr-0 align-top'
            word.split('').forEach((char: string) => {
              const sp = document.createElement('span')
              sp.className = 'char-span inline-block translate-y-[110%] opacity-0'
              sp.textContent = char
              wd.appendChild(sp)
            })
            htmlEl.appendChild(wd)
          })
        })
      }

      // Hero text animations
      splitText('.split-target')
      // Line 1 — char stagger
      gsap.to('.split-target .char-span', { y: '0%', opacity: 1, duration: 1.2, stagger: 0.02, ease: 'power3.out', delay: 0.3 })
      // Line 2 — whole line slide-up (contains a coloured <span>)
      gsap.fromTo('.hero-line-2', { y: '60px', opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', delay: 0.7 })

      // Navbar hide/show on scroll
      let lastScroll = 0
      window.addEventListener('scroll', () => {
        const current = window.scrollY
        if (current > lastScroll && current > 100) gsap.to('#navbar', { y: '-150%', duration: 0.4, ease: 'power2.in' })
        else gsap.to('#navbar', { y: '0%', duration: 0.4, ease: 'power2.out' })
        lastScroll = current
      })

      // Feature cards entrance
      gsap.fromTo('.feature-card', { y: 100, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: '#features', start: 'top 70%' } })

      // Security card mobile: reveal scan line on scroll
      const securityCard = document.querySelector('.security-card') as HTMLElement | null
      if (securityCard && window.matchMedia('(max-width: 767px)').matches) {
        ScrollTrigger.create({
          trigger: securityCard,
          start: 'top 80%',
          onEnter: () => {
            const scanLine = securityCard.querySelector('.scan-line') as HTMLElement | null
            if (scanLine) {
              gsap.to(scanLine, { top: '100%', duration: 2, ease: 'power2.inOut', repeat: -1, repeatDelay: 1 })
            }
          },
        })
      }

      // AI terminal feed
      const feedLines = [
        '[SCAN] Ticket détecté — Carrefour Market',
        '[OCR] Extraction des articles...',
        '[AI] Lait demi-écrémé 1L → 1,15 €',
        '[CMP] Lidl : 0,89 € (−0,26 €)',
        '[AI] Beurre Président 250g → 2,49 €',
        '[CMP] Aldi : 1,85 € (−0,64 €)',
        "[OK] Analyse terminée : 3,40 € d'économies",
        '[AI] Rapport envoyé sur WhatsApp',
      ]
      const feedContainer = document.getElementById('terminal-feed')
      let feedStep = 0
      if (feedContainer) {
        termInterval = setInterval(() => {
          if (feedStep >= feedLines.length) feedStep = 0
          const div = document.createElement('div')
          div.innerText = feedLines[feedStep]
          feedContainer.prepend(div)
          feedStep++
        }, 1500)
      }

      // Live stats counters — fetch real counts from /api/public-stats then
      // animate each from 0 to its target on scroll-into-view.
      const animateCounter = (id: string, target: number) => {
        const obj = { val: 0 }
        gsap.to(obj, {
          val: target,
          duration: 2.5,
          ease: 'power4.out',
          onUpdate: () => {
            const el = document.getElementById(id)
            if (el) el.innerText = Math.round(obj.val).toLocaleString('fr-FR')
          },
        })
      }

      let statsTriggered = false
      let liveStores = 0
      let liveReceipts = 0
      let liveProducts = 0

      fetch('/api/public-stats')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data) return
          liveStores   = data.stores   ?? 0
          liveReceipts = data.receipts ?? 0
          liveProducts = data.products ?? 0
        })
        .catch(() => {})

      ScrollTrigger.create({
        trigger: '#stats-card', start: 'top 85%',
        onEnter: () => {
          if (statsTriggered) return
          statsTriggered = true
          animateCounter('stat-stores',   liveStores)
          animateCounter('stat-receipts', liveReceipts)
          animateCounter('stat-products', liveProducts)
        },
      })

      // Vision section
      ScrollTrigger.create({
        trigger: '#philosophy', start: 'top 60%',
        onEnter: () => {
          gsap.fromTo('.contrast-1', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1 })
          gsap.fromTo('.contrast-2', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.2, delay: 0.3 })
        },
      })

      // Horizontal scroll — Comment ça marche
      const prContainer = document.querySelector('.pr-container') as HTMLElement | null
      if (prContainer) {
        gsap.to(prContainer, {
          x: () => -(prContainer.scrollWidth - window.innerWidth) + 'px',
          ease: 'none',
          scrollTrigger: { trigger: '#protocol', pin: true, scrub: 1, end: () => '+=' + prContainer.scrollWidth },
        })
      }

      // Topology cards
      gsap.fromTo('.topology-card', { y: 100, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: '#topology', start: 'top 70%' } })

      // Parameter rows
      gsap.fromTo('.parameter-row', { x: -50, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: 'power2.out', scrollTrigger: { trigger: '#parameters', start: 'top 65%' } })

      // Stacking cards — scale + subtle opacity only (no brightness filter which blacks out dark cards)
      const stackCards = gsap.utils.toArray('.stack-card') as HTMLElement[]
      stackCards.forEach((card: HTMLElement, i: number) => {
        if (i === stackCards.length - 1) return
        gsap.to(card, {
          scale: 0.96 - i * 0.015,
          opacity: 0.65,
          transformOrigin: 'top center',
          ease: 'none',
          scrollTrigger: {
            trigger: stackCards[i + 1],
            start: 'top 80%',
            end: 'top 35%',
            scrub: 1,
          },
        })
      })

      // Ecosystem grid
      gsap.fromTo('.eco-item', { y: 50, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.8, stagger: 0.05, ease: 'back.out(1.5)', scrollTrigger: { trigger: '#ecosystem', start: 'top 80%' } })

      // Marquee — duplicate content then animate
      const marqueeContent = document.getElementById('marquee-content')
      if (marqueeContent) {
        marqueeContent.innerHTML = marqueeContent.innerHTML + marqueeContent.innerHTML
        gsap.to(marqueeContent, { xPercent: -50, ease: 'none', duration: 12, repeat: -1 })
      }

      // Analytics matrix
      gsap.fromTo('.matrix-item', { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, stagger: 0.2, ease: 'power3.out', scrollTrigger: { trigger: '#matrix-section', start: 'top 75%' } })

      const pathLine = document.getElementById('animated-line') as SVGPathElement | null
      if (pathLine) {
        const length = pathLine.getTotalLength()
        gsap.set(pathLine, { strokeDasharray: length, strokeDashoffset: length })
        ScrollTrigger.create({
          trigger: '#matrix-section', start: 'top 50%',
          onEnter: () => gsap.to(pathLine, { strokeDashoffset: 0, duration: 2.5, ease: 'power3.inOut' }),
        })
      }

      const entropyObj = { val: 0 }
      ScrollTrigger.create({
        trigger: '#matrix-section', start: 'top 50%',
        onEnter: () => {
          gsap.to('#entropy-circle', { strokeDashoffset: 283 - 283 * 0.72, duration: 2.5, ease: 'power4.out' })
          gsap.to(entropyObj, {
            val: 47, duration: 2.5, ease: 'power4.out',
            onUpdate: () => {
              const el = document.getElementById('entropy-value')
              if (el) el.innerText = String(Math.round(entropyObj.val))
            },
          })
        },
      })

      // CTA entrance
      ScrollTrigger.create({
        trigger: '#cta', start: 'top 75%',
        onEnter: () => gsap.fromTo('#cta h2', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }),
      })

      // Magnetic buttons
      document.querySelectorAll('.magnetic-btn').forEach((btn: Element) => {
        btn.addEventListener('mousemove', (e: Event) => {
          const me   = e as MouseEvent
          const rect = (btn as HTMLElement).getBoundingClientRect()
          gsap.to(btn, { x: (me.clientX - rect.left - rect.width / 2) * 0.4, y: (me.clientY - rect.top - rect.height / 2) * 0.4, duration: 0.6, ease: 'power3.out' })
        })
        btn.addEventListener('mouseleave', () => gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' }))
      })
    }

    init()

    return () => {
      if (termInterval) clearInterval(termInterval)
      if (rafId) cancelAnimationFrame(rafId)
      if (mouseMoveHandler) window.removeEventListener('mousemove', mouseMoveHandler)
      try { lenisInstance?.destroy?.() } catch { /* ignore */ }
      lenisInstance = undefined
      style.remove()
      htmlEl.style.backgroundColor    = prevHtmlBg
      document.body.style.backgroundColor = prevBodyBg
      document.body.style.color           = prevBodyColor
      if (hadDark) htmlEl.classList.add('dark')
    }
  }, [])

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <div
      className="bg-paper text-graphite font-sans antialiased overflow-x-hidden scrollbar-none"
      style={{ backgroundColor: '#E8E4DD', color: '#111111', fontFamily: '"Plus Jakarta Sans", sans-serif' }}
    >

      {/* Noise Overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.04] mix-blend-overlay">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <filter id="noiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)" />
        </svg>
      </div>

      {/* Custom Cursor */}
      {/* bg-white + mix-blend-difference = dark on light bg, light on dark bg */}
      <div id="custom-cursor" className="fixed top-0 left-0 w-5 h-5 bg-white rounded-full pointer-events-none z-[200] mix-blend-difference transition-[width,height] duration-200 ease-out will-change-transform" style={{ backgroundColor: 'white' }} />

      {/* ==================== NAVBAR ==================== */}
      <nav
        id="navbar"
        className="fixed top-0 left-0 right-0 z-40 hover-trigger"
        style={{ background: 'rgba(245,243,238,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(17,17,17,0.08)' }}
      >
        <div className="max-w-[1400px] mx-auto px-8 h-16 flex items-center justify-between gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <img src="/basket_logo.png" alt="Basket" className="h-7 w-7" />
            <span className="font-sans font-bold tracking-tight text-graphite text-sm">Basket <span className="font-mono text-[9px] text-graphite/40 font-normal tracking-wider">(Beta)</span></span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8 font-mono text-xs text-graphite/50">
            <Link href="/basket-ai" className="hover:text-signal transition-colors duration-200 py-1 border-b border-transparent hover:border-signal">Basket AI</Link>
            <Link href="/vision" className="hover:text-signal transition-colors duration-200 py-1 border-b border-transparent hover:border-signal">Vision</Link>
            <Link href="/comment-ca-marche" className="hover:text-signal transition-colors duration-200 py-1 border-b border-transparent hover:border-signal">Comment ça marche</Link>
            <Link href="/carte" className="hover:text-signal transition-colors duration-200 py-1 border-b border-transparent hover:border-signal">Carte</Link>
          </div>

          {/* CTA */}
          <Link href="/login" className="flex-shrink-0">
            <button className="relative overflow-hidden rounded-xl bg-signal text-graphite px-5 py-2 font-sans text-xs font-semibold uppercase tracking-wider group transition-transform duration-300 hover:scale-[1.03] magnetic-btn">
              <span className="absolute inset-0 bg-graphite translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]" />
              <span className="relative z-10 group-hover:text-signal transition-colors duration-500">Se connecter</span>
            </button>
          </Link>
        </div>
      </nav>

      {/* ==================== HERO ==================== */}
      <header className="h-[100dvh] relative overflow-hidden pt-16" id="hero">

        {/* === MOBILE HERO === */}
        <div className="md:hidden h-full flex flex-col px-5 pt-4 pb-8">
          {/* Title at top */}
          <div className="relative z-10">
            <h1 className="font-sans text-[11vw] leading-[0.88] tracking-tighter text-graphite font-extrabold split-target">
              Le chemin le plus court
            </h1>
            <h1 className="font-sans text-[12vw] leading-[0.88] tracking-tighter font-extrabold hero-line-2 mt-1">
              vers les <span className="text-signal">économies.</span>
            </h1>
          </div>
          {/* Receipt centered in middle */}
          <div className="flex-1 flex items-center justify-center z-0 pointer-events-none">
            <div className="receipt-float" style={{ transform: 'rotate(2deg)', perspective: '800px' }}>
              <div className="w-52 bg-white rounded-3xl shadow-2xl p-4 relative overflow-hidden border border-graphite/5">
                <div className="scan-line absolute left-0 w-full h-[2px] bg-signal/60 z-20" style={{ boxShadow: '0 0 16px rgba(126,217,87,0.5)' }} />
                <div className="text-center mb-2.5 border-b border-dashed border-graphite/20 pb-2.5">
                  <p className="font-mono text-[9px] text-graphite/40 uppercase tracking-wider">Carrefour Market</p>
                  <p className="font-mono text-[8px] text-graphite/25 mt-0.5">08/04/2026 — 14:32</p>
                </div>
                <div className="space-y-1.5 font-mono text-[9px]">
                  <div className="flex justify-between price-pop"><span className="text-graphite/70 truncate pr-2">Lait demi-écrémé 1L</span><span className="text-graphite font-medium flex-shrink-0">1,15 €</span></div>
                  <div className="flex justify-between price-pop-delay"><span className="text-graphite/70 truncate pr-2">Beurre Président 250g</span><span className="text-graphite font-medium flex-shrink-0">2,49 €</span></div>
                  <div className="flex justify-between price-pop-delay2"><span className="text-graphite/70 truncate pr-2">Pâtes Barilla 500g</span><span className="text-graphite font-medium flex-shrink-0">1,29 €</span></div>
                  <div className="flex justify-between price-pop"><span className="text-graphite/70 truncate pr-2">Eau Cristaline 6×1.5L</span><span className="text-graphite font-medium flex-shrink-0">2,49 €</span></div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-dashed border-graphite/20 flex justify-between font-sans text-[10px]">
                  <span className="font-bold">TOTAL</span><span className="font-bold">7,42 €</span>
                </div>
                <div className="mt-2 bg-signal/10 rounded-xl p-1.5 text-center">
                  <p className="font-sans text-[9px] font-bold text-signal flex items-center justify-center gap-1"><img src="/basket_logo.png" alt="" className="h-3 w-3" />Basket : économisez 3,40 € chez Lidl</p>
                </div>
              </div>
            </div>
          </div>
          {/* CTA at bottom centered */}
          <div className="flex flex-col items-center gap-2 relative z-10">
            <Link href="/login" className="w-full max-w-xs">
              <button className="w-full rounded-2xl bg-signal text-graphite py-4 font-sans text-sm font-bold uppercase tracking-wide">
                Commencer
              </button>
            </Link>
            <span className="font-mono text-xs text-graphite/40 text-center">Gratuit · Sans CB</span>
          </div>
        </div>

        {/* === DESKTOP HERO === */}
        <div className="hidden md:flex h-full flex-col justify-end pb-[10vh] px-[5vw]">
          <div className="relative z-10 w-full max-w-[80vw]">
            <h1 className="font-sans text-[8vw] leading-[0.9] tracking-tighter text-graphite font-extrabold split-target">
              Le chemin le plus court
            </h1>
            <h1 className="font-sans text-[9vw] leading-[0.9] tracking-tighter font-extrabold hero-line-2 mt-[1vh]">
              vers les <span className="text-signal">économies.</span>
            </h1>
          </div>
        </div>

        {/* Desktop Receipt */}
        <div className="absolute top-[15vh] right-[5vw] w-[40vw] h-[65vh] hidden md:flex items-center justify-center z-0">
          <div className="receipt-float relative" style={{ perspective: '1000px' }}>
            <div className="w-[22vw] bg-white rounded-[1.5rem] shadow-2xl p-[2vw] relative overflow-hidden border border-graphite/5" style={{ transformStyle: 'preserve-3d' }}>
              <div className="scan-line absolute left-0 w-full h-[2px] bg-signal/60 shadow-[0_0_20px_rgba(126,217,87,0.5)] z-20" />
              <div className="text-center mb-[2vh] border-b border-dashed border-graphite/20 pb-[1.5vh]">
                <p className="font-mono text-xs text-graphite/40 uppercase tracking-wider">Carrefour Market</p>
                <p className="font-mono text-[0.6vw] text-graphite/30 mt-1">07/04/2026 — 14:32 — Caisse #04</p>
              </div>
              <div className="space-y-[1vh] font-mono text-xs">
                <div className="flex justify-between price-pop"><span className="text-graphite/70">Lait demi-écrémé 1L</span><span className="text-graphite font-medium">1,15 €</span></div>
                <div className="flex justify-between price-pop-delay"><span className="text-graphite/70">Beurre Président 250g</span><span className="text-graphite font-medium">2,49 €</span></div>
                <div className="flex justify-between price-pop-delay2"><span className="text-graphite/70">Pain de mie 500g</span><span className="text-graphite font-medium">1,65 €</span></div>
                <div className="flex justify-between price-pop"><span className="text-graphite/70">Pâtes Barilla 500g</span><span className="text-graphite font-medium">1,29 €</span></div>
                <div className="flex justify-between price-pop-delay"><span className="text-graphite/70">Oeufs x12</span><span className="text-graphite font-medium">3,45 €</span></div>
                <div className="flex justify-between price-pop-delay2"><span className="text-graphite/70">Eau Cristaline 6x1.5L</span><span className="text-graphite font-medium">2,49 €</span></div>
              </div>
              <div className="mt-[2vh] pt-[1.5vh] border-t border-dashed border-graphite/20 flex justify-between font-sans">
                <span className="font-bold text-sm">TOTAL</span>
                <span className="font-bold text-sm">12,52 €</span>
              </div>
              <div className="mt-[1.5vh] bg-signal/10 rounded-xl p-[0.8vw] text-center">
                <p className="font-sans text-xs font-bold text-signal flex items-center gap-1"><img src="/basket_logo.png" alt="" className="h-4 w-4" />Basket : économisez 3,40 € chez Lidl</p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-[5vh] right-[5vw] hidden md:flex items-center gap-[1vw] font-mono text-xs text-graphite/40 uppercase tracking-tight">
          <span>Défiler</span>
          <iconify-icon icon="solar:arrow-down-linear" className="text-lg animate-bounce" />
        </div>
      </header>

      {/* ==================== PRIVACY TRUST STRIP ==================== */}
      <section className="px-5 md:px-[5vw] pt-8 pb-0 relative z-10">
        <div
          className="max-w-4xl mx-auto rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8"
          style={{ background: 'rgba(126,217,87,0.07)', border: '1px solid rgba(126,217,87,0.18)' }}
        >
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(126,217,87,0.15)' }}>
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                <path d="M8 1.5L2 4v4c0 3.31 2.5 6.41 6 7.16C11.5 14.41 14 11.31 14 8V4L8 1.5z" stroke="#7ed957" strokeWidth="1.3" strokeLinejoin="round" fill="rgba(126,217,87,0.15)" />
                <path d="M5.5 8l1.75 1.75L10.5 6.5" stroke="#7ed957" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color: '#7ed957' }}>Données privées</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 font-mono text-xs text-graphite/55">
            <span><span className="text-graphite/80 font-semibold">Nous ne vendons jamais vos données personnelles.</span> Vos tickets restent privés.</span>
            <span className="hidden sm:block w-px h-4 bg-graphite/15 flex-shrink-0" />
            <span>Seuls des prix <span className="text-graphite/75 font-semibold">agrégés et anonymisés</span> alimentent la base communautaire.</span>
            <span className="hidden sm:block w-px h-4 bg-graphite/15 flex-shrink-0" />
            <span>Supprimez vos données à tout moment.</span>
          </div>
        </div>
      </section>

      {/* ==================== ULULE PROMO ==================== */}
      <section className="px-5 md:px-[5vw] pt-10 md:pt-16 pb-0 relative z-10">
        <div
          className="max-w-5xl mx-auto rounded-[2rem] md:rounded-[3rem] overflow-hidden relative"
          style={{ background: 'linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)', boxShadow: '0 8px 40px rgba(0,0,0,0.3), 0 0 80px rgba(126,217,87,0.08)' }}
        >
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(126,217,87,0.4), transparent)' }} />

          <div className="relative px-6 md:px-12 py-10 md:py-14">
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center">

              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 bg-signal/15 rounded-full px-4 py-1.5 mb-5">
                  <span className="w-2 h-2 rounded-full bg-signal animate-pulse" />
                  <span className="font-mono text-[11px] text-signal font-bold uppercase tracking-wider">Campagne en cours</span>
                </div>

                <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-[1.1] tracking-tight mb-4">
                  Aidez-nous a rendre<br />
                  <span style={{ color: '#7ed957' }}>les courses moins cheres</span><br />
                  pour tout le monde.
                </h2>

                <p className="font-sans text-base md:text-lg text-white/60 leading-relaxed max-w-xl mb-6">
                  Basket compare les prix de <strong className="text-white/80">15 enseignes</strong> pour trouver ou votre panier coute le moins cher.
                  Pour rester independant, gratuit et sans pub, on a besoin de vous.
                </p>

                <div className="grid grid-cols-3 gap-3 md:gap-5 mb-8 max-w-md mx-auto lg:mx-0">
                  <div className="text-center lg:text-left">
                    <div className="font-sans text-2xl md:text-3xl font-extrabold text-white">100%</div>
                    <div className="font-mono text-[10px] text-white/40 uppercase tracking-wider mt-1">Gratuit</div>
                  </div>
                  <div className="text-center lg:text-left">
                    <div className="font-sans text-2xl md:text-3xl font-extrabold text-white">0</div>
                    <div className="font-mono text-[10px] text-white/40 uppercase tracking-wider mt-1">Pubs</div>
                  </div>
                  <div className="text-center lg:text-left">
                    <div className="font-sans text-2xl md:text-3xl font-extrabold text-white">15</div>
                    <div className="font-mono text-[10px] text-white/40 uppercase tracking-wider mt-1">Enseignes</div>
                  </div>
                </div>

                <a
                  href="https://www.ulule.com/basketbeta/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 rounded-full px-8 py-4 font-sans text-lg font-bold text-graphite transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(126,217,87,0.4)] active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #7ed957, #a3e635)', boxShadow: '0 4px 20px rgba(126,217,87,0.3)' }}
                >
                  Soutenir le projet sur Ulule
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                    <path d="M4 10h12m0 0l-4.5-4.5M16 10l-4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>

              <div className="flex-shrink-0 w-full lg:w-auto max-w-xs">
                <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="font-mono text-[11px] text-white/40 uppercase tracking-wider text-center">Votre soutien finance</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(126,217,87,0.15)' }}>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2v10" stroke="#7ed957" strokeWidth="1.5" strokeLinecap="round" /></svg>
                      </div>
                      <div>
                        <p className="font-sans text-sm font-semibold text-white/90">Serveurs et infrastructure</p>
                        <p className="font-mono text-[10px] text-white/40 mt-0.5">Hebergement, base de donnees, API</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(126,217,87,0.15)' }}>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><path d="M7 1v4l2.5 1.5M13 7A6 6 0 111 7a6 6 0 0112 0z" stroke="#7ed957" strokeWidth="1.3" strokeLinecap="round" /></svg>
                      </div>
                      <div>
                        <p className="font-sans text-sm font-semibold text-white/90">Mise a jour des prix</p>
                        <p className="font-mono text-[10px] text-white/40 mt-0.5">Scraping quotidien de 15 enseignes</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(126,217,87,0.15)' }}>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><path d="M7 2.5L1.5 5v4c0 2.76 2.2 5.34 5.5 5.96 3.3-.62 5.5-3.2 5.5-5.96V5L7 2.5z" stroke="#7ed957" strokeWidth="1.3" strokeLinejoin="round" /><path d="M5 7.25l1.5 1.5L9 6" stroke="#7ed957" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </div>
                      <div>
                        <p className="font-sans text-sm font-semibold text-white/90">Zero pub, zero revente</p>
                        <p className="font-mono text-[10px] text-white/40 mt-0.5">Vos donnees restent les votres</p>
                      </div>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-white/10 text-center">
                    <p className="font-sans text-xs text-white/50">Chaque contribution compte.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ==================== FEATURES ==================== */}
      <section className="py-12 md:py-[15vh] px-5 md:px-[5vw] grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-[2vw] relative z-10" id="features">
        {/* Card 1 — Basket AI */}
        <div className="bg-offwhite rounded-[2rem] md:rounded-[3rem] p-5 md:p-[2.5vw] h-auto min-h-[280px] md:h-[50vh] flex flex-col justify-between group border border-graphite/10 hover-trigger feature-card">
          <div className="flex justify-between items-start">
            <span className="font-mono text-xs text-graphite/50 uppercase tracking-tight">01 // Basket AI</span>
            <iconify-icon icon="solar:brain-linear" className="text-2xl text-signal" />
          </div>
          <div className="font-mono text-xs text-graphite/80 space-y-1 h-24 md:h-[15vh] overflow-hidden opacity-70" id="terminal-feed" />
          <h3 className="font-sans text-xl md:text-[2vw] leading-none tracking-tighter font-bold text-graphite mt-4 md:mt-[4vh]">
            Lecture intelligente<br />de vos tickets
          </h3>
        </div>

        {/* Card 2 — Base de données (live stats) */}
        <div id="stats-card" className="bg-offwhite rounded-[2rem] md:rounded-[3rem] p-5 md:p-[2.5vw] h-auto min-h-[280px] md:h-[50vh] flex flex-col justify-between group border border-graphite/10 hover-trigger feature-card">
          <div className="flex justify-between items-start">
            <span className="font-mono text-xs text-graphite/50 uppercase tracking-tight">02 // Base de données</span>
            <iconify-icon icon="solar:database-linear" className="text-2xl text-signal" />
          </div>

          <div className="flex-1 flex flex-col justify-end gap-3 md:gap-[1.2vh] mb-3 md:mb-[1.5vh]">
            <div className="flex items-baseline justify-between gap-3 border-b border-graphite/10 pb-2">
              <span className="font-sans text-3xl md:text-[2.6vw] leading-none tracking-tighter font-extrabold text-graphite" id="stat-stores">0</span>
              <span className="font-mono text-[10px] md:text-xs text-graphite/55 uppercase tracking-tight">magasins</span>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-b border-graphite/10 pb-2">
              <span className="font-sans text-3xl md:text-[2.6vw] leading-none tracking-tighter font-extrabold text-graphite" id="stat-receipts">0</span>
              <span className="font-mono text-[10px] md:text-xs text-graphite/55 uppercase tracking-tight">tickets scannés</span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-sans text-3xl md:text-[2.6vw] leading-none tracking-tighter font-extrabold text-signal" id="stat-products">0</span>
              <span className="font-mono text-[10px] md:text-xs text-graphite/55 uppercase tracking-tight">produits comparables</span>
            </div>
          </div>

          <h3 className="font-sans text-xl md:text-[2vw] leading-none tracking-tighter font-bold text-graphite">
            Comparés en<br />temps réel
          </h3>
        </div>

        {/* Card 3 — Sécurité */}
        <div className="bg-offwhite rounded-[2rem] md:rounded-[3rem] p-5 md:p-[2.5vw] h-auto min-h-[280px] md:h-[50vh] flex flex-col justify-between relative overflow-hidden group border border-graphite/10 hover-trigger feature-card security-card">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-signal shadow-[0_0_15px_rgba(126,217,87,0.8)] -translate-y-[10px] group-hover:translate-y-[50vh] transition-transform duration-[2s] ease-[cubic-bezier(0.87,0,0.13,1)] z-20" />
          <div className="scan-line absolute left-0 w-full h-[2px] bg-signal/40 z-20 md:hidden" style={{ boxShadow: '0 0 12px rgba(126,217,87,0.4)' }} />
          <div className="flex justify-between items-start relative z-10">
            <span className="font-mono text-xs text-graphite/50 uppercase tracking-tight">03 // Sécurité</span>
            <iconify-icon icon="solar:shield-keyhole-minimalistic-linear" className="text-2xl text-signal" />
          </div>
          {/* Blur overlay — desktop hover only, hidden on mobile */}
          <div className="hidden md:block absolute inset-0 bg-offwhite/60 backdrop-blur-[8px] z-10 group-hover:backdrop-blur-none transition-all duration-[2s]" />
          <div className="relative z-10 mt-auto">
            <div className="font-mono text-xs text-signal mb-4 md:mb-[2vh] md:opacity-0 group-hover:opacity-100 transition-opacity duration-1000 delay-500">[DONNÉES_PROTÉGÉES]</div>
            <h3 className="font-sans text-xl md:text-[2vw] leading-none tracking-tighter font-bold text-graphite">
              Vos données<br />restent privées
            </h3>
          </div>
        </div>
      </section>

      {/* ==================== VISION ==================== */}
      <section className="py-16 md:py-[20vh] px-5 md:px-[5vw] bg-graphite rounded-[2rem] md:rounded-[3rem] mx-2 md:mx-[2vw] my-4 md:my-[5vh] text-paper relative overflow-hidden" id="philosophy">
        <div className="relative z-10 max-w-[90vw] md:max-w-[70vw] mx-auto text-center flex flex-col items-center">
          <p className="font-mono text-xs text-paper/40 mb-8 md:mb-[8vh] uppercase tracking-tight border border-paper/10 px-4 py-1.5 rounded-full">Notre Vision</p>
          <p className="font-sans text-lg md:text-[2vw] text-paper/50 font-light mb-[4vh] tracking-tight contrast-1">
            Chaque semaine, des millions de Français paient plus cher que nécessaire.
          </p>
          <h2 className="font-sans text-4xl md:text-[6vw] leading-[0.9] font-extrabold text-signal contrast-2 split-target-2">
            Découvrez si votre voisin a payé son pain moins cher que vous.
          </h2>
        </div>
      </section>

      {/* ==================== PWA / INSTALL GUIDE ==================== */}
      <PWAGuide />

      {/* ==================== COMMENT ÇA MARCHE (horizontal scroll) ==================== */}
      <section className="hidden md:flex h-screen w-full overflow-hidden bg-paper relative items-center pr-wrapper mt-[10vh]" id="protocol">
        <div className="w-[300vw] flex h-full pr-container">
          <div className="w-screen h-full flex flex-col justify-center px-[10vw] relative">
            <span className="font-mono text-[15vw] text-graphite/[0.03] leading-none absolute top-[20vh] left-[5vw]">01</span>
            <h3 className="font-sans text-[5vw] text-graphite font-extrabold tracking-tighter mt-[4vh] relative z-10">Scannez</h3>
            <p className="font-mono text-sm text-graphite/60 mt-[2vh] max-w-sm relative z-10">
              Prenez en photo votre ticket de caisse après vos courses. Notre IA lit chaque article et chaque prix en quelques secondes.
            </p>
          </div>
          <div className="w-screen h-full flex flex-col justify-center px-[10vw] relative">
            <span className="font-mono text-[15vw] text-graphite/[0.03] leading-none absolute top-[20vh] left-[5vw]">02</span>
            <h3 className="font-sans text-[5vw] text-graphite font-extrabold tracking-tighter mt-[4vh] relative z-10">Comparez</h3>
            <p className="font-mono text-sm text-graphite/60 mt-[2vh] max-w-sm relative z-10">
              Basket compare instantanément vos prix avec ceux de 15 enseignes françaises. Vous voyez immédiatement où vous auriez payé moins.
            </p>
          </div>
          <div className="w-screen h-full flex flex-col justify-center px-[10vw] relative">
            <span className="font-mono text-[15vw] text-graphite/[0.03] leading-none absolute top-[20vh] left-[5vw]">03</span>
            <h3 className="font-sans text-[5vw] text-signal font-extrabold tracking-tighter mt-[4vh] relative z-10">Économisez</h3>
            <p className="font-mono text-sm text-graphite/60 mt-[2vh] max-w-sm relative z-10">
              La prochaine fois, faites vos courses au bon endroit. Basket vous montre le magasin le moins cher près de chez vous, article par article.
            </p>
          </div>
        </div>
      </section>

      {/* Mobile "Comment ça marche" — vertical (desktop uses horizontal scroll above) */}
      <section className="md:hidden py-16 px-5 bg-paper" id="protocol-mobile">
        <p className="font-mono text-xs text-graphite/50 uppercase tracking-tight mb-2">Comment ça marche</p>
        <h2 className="font-sans text-4xl font-extrabold tracking-tighter text-graphite mb-10">3 étapes,<br /><span className="text-signal">c&apos;est tout.</span></h2>
        <div className="space-y-0">
          {[
            { n: '01', title: 'Scannez', desc: 'Prenez en photo votre ticket de caisse. Notre IA lit chaque article et chaque prix en quelques secondes.', color: 'text-graphite' },
            { n: '02', title: 'Comparez', desc: 'Basket compare instantanément vos prix avec ceux de 15 enseignes françaises. Vous voyez où vous auriez payé moins.', color: 'text-graphite' },
            { n: '03', title: 'Économisez', desc: 'Faites vos courses au bon endroit. Basket vous montre le magasin le moins cher près de chez vous, article par article.', color: 'text-signal' },
          ].map((step, i) => (
            <div key={step.n} className="flex gap-5 py-8" style={{ borderBottom: i < 2 ? '1px solid rgba(17,17,17,0.08)' : 'none' }}>
              <span className="font-mono text-[10vw] font-bold text-graphite/10 leading-none flex-shrink-0 w-12">{step.n}</span>
              <div>
                <h3 className={`font-sans text-3xl font-extrabold tracking-tighter ${step.color} mb-2`}>{step.title}</h3>
                <p className="font-mono text-sm text-graphite/60 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== NEWSLETTER ==================== */}
      <NewsletterSection />

      {/* ==================== CARTE (Topology) ==================== */}
      <section className="py-12 md:py-[15vh] px-5 md:px-[5vw] relative z-10" id="topology">
        <div className="mb-8 md:mb-[8vh] flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-[4vh]">
          <div>
            <span className="font-mono text-xs text-graphite/50 uppercase tracking-tight">Carte des prix</span>
            <h2 className="font-sans text-4xl md:text-[6vw] tracking-tighter text-graphite font-extrabold leading-none mt-2 md:mt-[2vh]">
              Trouvez le <span className="text-signal">moins cher</span> près de chez vous.
            </h2>
          </div>
          <p className="font-mono text-xs text-graphite/60 max-w-sm">
            15 enseignes comparées. Des milliers de magasins. Basket vous indique exactement où aller pour payer moins — article par article.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-[2vw]">
          {/* Large Map Card — live read-only map */}
          <div className="md:col-span-2 md:row-span-2 rounded-[2rem] md:rounded-[3rem] overflow-hidden border border-graphite/10 topology-card min-h-[350px] md:min-h-[50vh]">
            <PublicMapPreview />
          </div>

          {/* Price Comparison Card */}
          <div className="bg-offwhite rounded-[2rem] md:rounded-[3rem] p-5 md:p-[2.5vw] min-h-[200px] flex flex-col justify-between group border border-graphite/10 hover-trigger topology-card">
            <div className="flex justify-between items-start">
              <span className="font-mono text-xs text-graphite/50 uppercase tracking-tight">Comparaison</span>
              <iconify-icon icon="solar:sort-by-time-linear" className="text-2xl text-graphite/50 group-hover:text-signal transition-colors" />
            </div>
            <div className="flex-1 flex flex-col justify-center gap-2 py-4 md:py-[2vh]">
              <div className="flex justify-between items-center font-mono text-xs"><span className="text-graphite/60">Lait 1L</span><span className="text-signal font-bold">0,85 €</span></div>
              <div className="w-full h-[2px] bg-graphite/10 relative rounded-full">
                <div className="absolute top-0 left-0 h-full w-[40%] bg-signal rounded-full" />
              </div>
              <div className="flex justify-between items-center font-mono text-xs"><span className="text-graphite/40">Aldi</span><span className="text-graphite/40">Monoprix — 1,35 €</span></div>
            </div>
            <h3 className="font-sans text-sm md:text-[1.5vw] leading-tight tracking-tighter font-bold text-graphite">
              Prix le plus bas
            </h3>
          </div>

          {/* Savings Alert Card */}
          <div className="bg-offwhite rounded-[2rem] md:rounded-[3rem] p-5 md:p-[2.5vw] min-h-[200px] flex flex-col justify-between group border border-graphite/10 hover-trigger topology-card">
            <div className="flex justify-between items-start">
              <span className="font-mono text-xs text-graphite/50 uppercase tracking-tight">Alerte</span>
              <iconify-icon icon="solar:bell-linear" className="text-2xl text-graphite/50 group-hover:text-signal transition-colors" />
            </div>
            <div className="flex items-center justify-center flex-1 py-4 md:py-[4vh]">
              <div className="text-center">
                <p className="font-sans text-4xl md:text-[3vw] font-extrabold text-signal">-30%</p>
                <p className="font-mono text-xs text-graphite/50 mt-1">Beurre chez Lidl</p>
              </div>
            </div>
            <h3 className="font-sans text-sm md:text-[1.5vw] leading-tight tracking-tighter font-bold text-graphite">
              Alertes prix bas
            </h3>
          </div>

          {/* Wide Summary Card */}
          <div className="md:col-span-2 bg-offwhite rounded-[2rem] md:rounded-[3rem] p-5 md:p-[2.5vw] flex flex-col justify-between group border border-graphite/10 hover-trigger topology-card min-h-[160px] md:min-h-[25vh]">
            <div className="flex justify-between items-start mb-4 md:mb-[4vh]">
              <span className="font-mono text-xs text-graphite/50 uppercase tracking-tight">Économies du mois</span>
              <iconify-icon icon="solar:wallet-money-linear" className="text-2xl text-signal" />
            </div>
            <div className="flex items-end justify-between">
              <div>
                <h3 className="font-sans text-base md:text-[2vw] leading-none tracking-tighter font-bold text-graphite mb-2 md:mb-[1vh]">Rapport hebdomadaire</h3>
                <p className="font-mono text-xs text-graphite/50">Recevez chaque dimanche un résumé de vos économies possibles.</p>
              </div>
              <div className="flex items-end gap-1 md:gap-[0.5vw] h-12 md:h-[6vh]">
                <div className="w-3 md:w-[0.8vw] bg-graphite/10 h-[30%] rounded-t-sm group-hover:h-[60%] transition-all duration-300" />
                <div className="w-3 md:w-[0.8vw] bg-graphite/10 h-[50%] rounded-t-sm group-hover:h-[40%] transition-all duration-300 delay-75" />
                <div className="w-3 md:w-[0.8vw] bg-graphite/10 h-[80%] rounded-t-sm group-hover:h-[90%] transition-all duration-300 delay-150" />
                <div className="w-3 md:w-[0.8vw] bg-signal h-[40%] rounded-t-sm group-hover:h-[100%] transition-all duration-300 delay-200 shadow-[0_0_10px_rgba(126,217,87,0.6)]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== BASKET INDEX ==================== */}
      <BasketIndexSection />

      {/* ==================== FONCTIONNEMENT (Accordion) ==================== */}
      <section className="py-12 md:py-[15vh] px-5 md:px-[5vw] relative z-10 bg-graphite rounded-[2rem] md:rounded-[3rem] mx-2 md:mx-[2vw] my-4 md:my-[5vh] text-paper overflow-hidden" id="parameters">
        <div className="relative z-10 max-w-full md:max-w-[80vw] mx-auto">
          <div className="mb-8 md:mb-[10vh]">
            <span className="font-mono text-xs text-paper/40 uppercase tracking-tight border border-paper/10 px-4 py-1.5 rounded-full">Comment Basket fonctionne</span>
          </div>
          <div className="flex flex-col border-t border-paper/10">
            <div className="py-6 md:py-[5vh] border-b border-paper/10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-[4vh] group hover-trigger parameter-row">
              <h3 className="font-sans text-2xl md:text-[4vw] font-bold tracking-tighter text-paper/60 group-hover:text-signal transition-colors duration-500">Reconnaissance IA</h3>
              <div className="md:w-[40%] flex justify-between items-center gap-4 md:gap-[2vw]">
                <p className="font-mono text-xs text-paper/40 group-hover:text-paper/80 transition-colors duration-500 md:max-w-[20vw]">Notre intelligence artificielle lit votre ticket en quelques secondes et identifie chaque produit automatiquement.</p>
                <iconify-icon icon="solar:arrow-right-up-linear" className="text-3xl text-paper/20 group-hover:text-signal group-hover:rotate-45 transition-all duration-500 flex-shrink-0" />
              </div>
            </div>
            <div className="py-6 md:py-[5vh] border-b border-paper/10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-[4vh] group hover-trigger parameter-row">
              <h3 className="font-sans text-2xl md:text-[4vw] font-bold tracking-tighter text-paper/60 group-hover:text-signal transition-colors duration-500">Comparaison instantanée</h3>
              <div className="md:w-[40%] flex justify-between items-center gap-4 md:gap-[2vw]">
                <p className="font-mono text-xs text-paper/40 group-hover:text-paper/80 transition-colors duration-500 md:max-w-[20vw]">Chaque produit est comparé en temps réel avec les prix de 15 enseignes françaises dans votre zone.</p>
                <iconify-icon icon="solar:arrow-right-up-linear" className="text-3xl text-paper/20 group-hover:text-signal group-hover:rotate-45 transition-all duration-500 flex-shrink-0" />
              </div>
            </div>
            <div className="py-6 md:py-[5vh] border-b border-paper/10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-[4vh] group hover-trigger parameter-row">
              <h3 className="font-sans text-2xl md:text-[4vw] font-bold tracking-tighter text-paper/60 group-hover:text-signal transition-colors duration-500">Recommandations personnalisées</h3>
              <div className="md:w-[40%] flex justify-between items-center gap-4 md:gap-[2vw]">
                <p className="font-mono text-xs text-paper/40 group-hover:text-paper/80 transition-colors duration-500 md:max-w-[20vw]">Basket apprend vos habitudes et vous suggère le meilleur magasin pour votre liste de courses chaque semaine.</p>
                <iconify-icon icon="solar:arrow-right-up-linear" className="text-3xl text-paper/20 group-hover:text-signal group-hover:rotate-45 transition-all duration-500 flex-shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== STACK ARCHITECTURE ==================== */}
      <section className="relative z-10 px-5 md:px-[5vw] py-12 md:py-[15vh] md:min-h-[300vh]" id="stacking-cards-section">
        <div className="mb-8 md:mb-[8vh] relative z-20">
          <span className="font-mono text-xs text-graphite/50 uppercase tracking-tight">Sous le capot</span>
          <h2 className="font-sans text-4xl md:text-[6vw] tracking-tighter text-graphite font-extrabold leading-none mt-2 md:mt-[2vh]">
            Comment <span className="text-signal">Basket</span> fonctionne.
          </h2>
        </div>
        <div className="relative w-full flex flex-col gap-4 md:gap-0" id="cards-wrapper">
          {/* Card 1 */}
          <div className="md:sticky md:top-[15vh] w-full h-auto md:h-[70vh] bg-offwhite rounded-[2rem] md:rounded-[3rem] border border-graphite/10 p-6 md:p-[4vw] flex flex-col justify-between stack-card stack-shadow overflow-hidden group">
            <div className="flex justify-between items-start relative z-10">
              <span className="font-mono text-xs text-graphite/50 uppercase tracking-tight">Étape 01</span>
              <iconify-icon icon="solar:camera-linear" className="text-3xl text-signal" />
            </div>
            <div className="relative z-10 mt-8 md:mt-0">
              <h3 className="font-sans text-3xl md:text-[4vw] tracking-tighter font-extrabold text-graphite leading-none">Capture</h3>
              <p className="font-mono text-sm text-graphite/60 mt-4 md:mt-[2vh] max-w-md">Photographiez votre ticket de caisse. Notre OCR intelligent extrait chaque article, prix et quantité en quelques secondes — même les tickets froissés.</p>
            </div>
          </div>
          {/* Card 2 */}
          <div className="md:sticky md:top-[20vh] w-full h-auto md:h-[70vh] bg-[#2A2A2A] rounded-[2rem] md:rounded-[3rem] border border-graphite/20 p-6 md:p-[4vw] flex flex-col justify-between stack-card text-paper stack-shadow overflow-hidden group">
            <div className="flex justify-between items-start relative z-10">
              <span className="font-mono text-xs text-paper/50 uppercase tracking-tight">Étape 02</span>
              <iconify-icon icon="solar:chart-2-linear" className="text-3xl text-signal" />
            </div>
            <div className="relative z-10 mt-8 md:mt-0">
              <h3 className="font-sans text-3xl md:text-[4vw] tracking-tighter font-extrabold text-paper leading-none">Analyse</h3>
              <p className="font-mono text-sm text-paper/60 mt-4 md:mt-[2vh] max-w-md">Basket compare vos prix avec notre base de plus de 33 000 références dans 15 enseignes. L&apos;algorithme de matching intelligent identifie les meilleurs prix même quand les noms diffèrent.</p>
            </div>
          </div>
          {/* Card 3 */}
          <div className="md:sticky md:top-[25vh] w-full h-auto md:h-[70vh] bg-graphite rounded-[2rem] md:rounded-[3rem] border border-graphite/40 p-6 md:p-[4vw] flex flex-col justify-between stack-card text-paper stack-shadow overflow-hidden group">
            <div className="flex justify-between items-start relative z-10">
              <span className="font-mono text-xs text-paper/50 uppercase tracking-tight">Étape 03</span>
              <iconify-icon icon="solar:wallet-money-linear" className="text-3xl text-signal" />
            </div>
            <div className="relative z-10 mt-8 md:mt-0">
              <h3 className="font-sans text-3xl md:text-[4vw] tracking-tighter font-extrabold text-signal leading-none">Économies</h3>
              <p className="font-mono text-sm text-paper/60 mt-4 md:mt-[2vh] max-w-md">Vous recevez votre rapport personnalisé : combien vous auriez économisé, dans quel magasin, article par article. Partagez-le sur WhatsApp et faites économiser votre entourage.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== MARQUEE ==================== */}
      <section className="py-[10vh] overflow-hidden relative z-10 bg-signal text-graphite flex items-center hover-trigger group" id="marquee-section">
        <div className="absolute inset-0 bg-graphite translate-y-full group-hover:translate-y-0 transition-transform duration-[1.5s] ease-[cubic-bezier(0.87,0,0.13,1)] z-0" />
        <div className="marquee-container relative z-10 pointer-events-none" id="marquee-content">
          <div className="flex items-center gap-[4vw] px-[2vw] whitespace-nowrap">
            <h2 className="font-sans text-[10vw] leading-none font-extrabold tracking-tighter group-hover:text-signal transition-colors duration-700">SCANNEZ</h2>
            <span className="font-sans text-[6vw] font-medium opacity-30 group-hover:text-signal group-hover:opacity-100 transition-colors duration-700">//</span>
            <h2 className="font-sans text-[10vw] leading-none font-extrabold tracking-tighter group-hover:text-signal transition-colors duration-700">COMPAREZ</h2>
            <span className="font-sans text-[6vw] font-medium opacity-30 group-hover:text-signal group-hover:opacity-100 transition-colors duration-700">//</span>
            <h2 className="font-sans text-[10vw] leading-none font-extrabold tracking-tighter group-hover:text-signal transition-colors duration-700">ÉCONOMISEZ</h2>
            <span className="font-sans text-[6vw] font-medium opacity-30 group-hover:text-signal group-hover:opacity-100 transition-colors duration-700">//</span>
          </div>
        </div>
      </section>

      {/* ==================== ANALYTICS ==================== */}
      <section className="py-12 md:py-[15vh] px-5 md:px-[5vw] relative z-10" id="matrix-section">
        <div className="mb-8 md:mb-[8vh]">
          <span className="font-mono text-xs text-graphite/50 uppercase tracking-tight">Suivi personnel</span>
          <h2 className="font-sans text-4xl md:text-[6vw] tracking-tighter text-graphite font-extrabold leading-none mt-2 md:mt-[2vh]">
            Vos <span className="text-signal">analyses.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-[2vw]">
          {/* Chart card */}
          <div className="md:col-span-2 bg-offwhite rounded-[2rem] md:rounded-[3rem] p-5 md:p-[3vw] h-auto min-h-[300px] md:h-[60vh] flex flex-col justify-between border border-graphite/10 matrix-item overflow-hidden relative group hover-trigger">
            <div className="flex justify-between items-start relative z-10">
              <span className="font-mono text-xs text-graphite/50 uppercase tracking-tight">Économies hebdomadaires</span>
              <iconify-icon icon="solar:chart-square-linear" className="text-2xl text-signal" />
            </div>
            <div className="absolute inset-0 flex items-end justify-center pointer-events-none p-[2vw] mt-[5vh]">
              <svg viewBox="0 0 100 100" className="w-full h-[80%] overflow-visible" preserveAspectRatio="none">
                <line x1="0" y1="20" x2="100" y2="20" stroke="#111111" strokeOpacity="0.05" strokeWidth="0.5" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="#111111" strokeOpacity="0.05" strokeWidth="0.5" />
                <line x1="0" y1="80" x2="100" y2="80" stroke="#111111" strokeOpacity="0.05" strokeWidth="0.5" />
                <path d="M0,90 C15,85 25,70 40,60 C55,50 65,30 80,20 C90,14 95,10 100,5" fill="none" stroke="#111111" strokeWidth="0.5" strokeDasharray="2 4" className="opacity-20" />
                <path d="M0,90 C15,85 25,70 40,60 C55,50 65,30 80,20 C90,14 95,10 100,5" fill="none" stroke="#7ed957" strokeWidth="1.5" id="animated-line" />
              </svg>
            </div>
            <div className="relative z-10 mt-auto flex justify-between items-end">
              <h3 className="font-sans text-xl md:text-[3vw] tracking-tighter font-bold text-graphite leading-none">Rapport<br />de la semaine</h3>
              <div className="text-right">
                <span className="block font-mono text-xs text-graphite/40">Envoyé chaque dimanche</span>
              </div>
            </div>
          </div>

          {/* Circle card */}
          <div className="bg-offwhite rounded-[2rem] md:rounded-[3rem] p-5 md:p-[3vw] h-auto min-h-[300px] md:h-[60vh] flex flex-col justify-between border border-graphite/10 matrix-item group hover-trigger">
            <div className="flex justify-between items-start">
              <span className="font-mono text-xs text-graphite/50 uppercase tracking-tight">Ce mois-ci</span>
              <iconify-icon icon="solar:pie-chart-2-linear" className="text-2xl text-graphite/50 group-hover:text-signal transition-colors duration-500" />
            </div>
            <div className="flex items-center justify-center flex-1 relative my-[4vh]">
              <svg className="w-[15vw] h-[15vw] min-w-[150px] min-h-[150px] -rotate-90 group-hover:scale-110 transition-transform duration-700 ease-out" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#111111" strokeWidth="1" strokeOpacity="0.1" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="#7ed957" strokeWidth="2" strokeDasharray="283" strokeDashoffset="283" id="entropy-circle" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="font-sans text-2xl md:text-[4vw] tracking-tighter font-extrabold text-graphite leading-none" id="entropy-value">0</span>
                <span className="font-mono text-xs text-signal tracking-tight mt-[1vh]">€ économisés</span>
              </div>
            </div>
            <div>
              <h3 className="font-sans text-base md:text-[2vw] tracking-tighter font-bold text-graphite leading-none">Bilan<br />mensuel</h3>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== ENSEIGNES ==================== */}
      <section className="py-12 md:py-[15vh] px-5 md:px-[5vw] relative z-10 bg-offwhite rounded-[2rem] md:rounded-[3rem] mx-2 md:mx-[2vw] my-4 md:my-[5vh] border border-graphite/10" id="ecosystem">
        <div className="mb-8 md:mb-[8vh] text-center max-w-full md:max-w-[50vw] mx-auto">
          <span className="font-mono text-xs text-graphite/50 uppercase tracking-tight">Enseignes compatibles</span>
          <h2 className="font-sans text-3xl md:text-[5vw] tracking-tighter text-graphite font-extrabold leading-none mt-2 md:mt-[2vh]">
            Tous vos <span className="text-signal">magasins.</span>
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px] bg-graphite/10 border border-graphite/10 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden">
          {['E.Leclerc', 'Carrefour', 'Intermarché', 'Système U', 'Auchan', 'Lidl', 'Monoprix', 'Aldi'].map((name) => (
            <div key={name} className="bg-offwhite p-6 md:p-[4vw] flex items-center justify-center group hover-trigger eco-item">
              <span className="font-sans font-bold text-lg text-graphite/40 group-hover:text-signal group-hover:scale-110 transition-all duration-500">{name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== BETA SECTION ==================== */}
      <section className="py-16 md:py-[10vh] px-5 md:px-[5vw] relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="bg-graphite rounded-[2rem] md:rounded-[3rem] p-8 md:p-[4vw] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 pointer-events-none"
              style={{ background: 'radial-gradient(circle, #7ed957 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-signal/15 border border-signal/30 rounded-full px-4 py-1.5 mb-6">
                <div className="w-2 h-2 rounded-full bg-signal animate-pulse" />
                <span className="font-mono text-xs text-signal font-semibold uppercase tracking-wider">Version Beta</span>
              </div>
              <h2 className="font-sans text-3xl md:text-[4vw] font-extrabold tracking-tighter text-paper leading-none mb-4">
                Basket est en <span className="text-signal">phase beta.</span>
              </h2>
              <p className="font-mono text-sm text-paper/50 max-w-xl mb-8 leading-relaxed">
                Nous travaillons activement à améliorer la reconnaissance de tickets, la base de données de prix et les recommandations personnalisées. Vos retours nous aident à construire le meilleur outil possible.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <div className="flex items-center gap-3 bg-paper/5 border border-paper/10 rounded-2xl px-5 py-3 opacity-60">
                  <svg className="w-6 h-6 text-paper flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  <div>
                    <p className="font-mono text-[9px] text-paper/40 uppercase tracking-wider">Bientôt disponible</p>
                    <p className="font-sans text-sm font-bold text-paper">App Store</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-paper/5 border border-paper/10 rounded-2xl px-5 py-3 opacity-60">
                  <svg className="w-6 h-6 text-paper flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M3.18 23.76c.3.17.65.19.96.07l12.45-6.99-2.78-2.78-10.63 9.7zm-1.11-18.9c-.06.2-.07.43-.07.67v17.94c0 .24.01.47.07.67l.07.06 10.04-10.04v-.22L2.14 4.79l-.07.07zM20.93 9.97l-2.78-1.56-3.12 3.12 3.12 3.12 2.81-1.58c.8-.45.8-1.19-.03-1.1zM4.14.24L16.59 7.23l-2.78 2.78L3.18.31C3.49.13 3.84.07 4.14.24z"/></svg>
                  <div>
                    <p className="font-mono text-[9px] text-paper/40 uppercase tracking-wider">Bientôt disponible</p>
                    <p className="font-sans text-sm font-bold text-paper">Google Play</p>
                  </div>
                </div>
              </div>
              <p className="font-mono text-xs text-paper/30">
                En attendant, utilisez Basket directement depuis votre navigateur — ajoutez-le à votre écran d&apos;accueil pour une expérience native.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== CTA ==================== */}
      <section className="py-16 md:py-[20vh] px-5 md:px-[5vw] relative z-10 flex flex-col items-center justify-center text-center overflow-hidden" id="cta">
        <h2 className="font-sans text-5xl md:text-[7vw] leading-[0.9] text-graphite font-extrabold mb-6 md:mb-[4vh] split-target-cta">
          Prêt à payer <span className="text-signal">moins</span> ?
        </h2>
        <p className="font-mono text-sm text-graphite/50 mb-8 md:mb-[6vh] max-w-md">Rejoignez des milliers de Français qui économisent chaque semaine grâce à Basket.</p>
        <Link href="/login">
          <button className="relative overflow-hidden rounded-[2rem] bg-signal text-graphite px-8 py-4 md:px-[3vw] md:py-[2vh] min-w-[200px] font-sans text-sm font-bold uppercase tracking-tight group hover:scale-[1.05] transition-transform duration-500 magnetic-btn flex items-center justify-center gap-3 md:gap-[1vw]">
            <span className="absolute inset-0 bg-graphite translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]" />
            <span className="relative z-10 group-hover:text-signal transition-colors duration-500 flex items-center gap-3 md:gap-[1vw]">
              Commencer gratuitement
              <iconify-icon icon="solar:arrow-right-linear" className="text-lg" />
            </span>
          </button>
        </Link>
      </section>

      {/* ==================== FAQ ==================== */}
      <FaqSection />

      {/* ==================== FOOTER ==================== */}
      <footer className="bg-graphite text-paper rounded-t-[2rem] md:rounded-t-[4rem] mt-4 md:mt-[5vh] pt-16 md:pt-[15vh] pb-8 md:pb-[5vh] px-5 md:px-[5vw] relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="footerGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E8E4DD" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#footerGrid)" />
          </svg>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[10vw] relative z-10">
          <div>
            <h2 className="font-sans text-[10vw] md:text-[6vw] font-extrabold tracking-tighter uppercase leading-none text-paper flex items-center gap-[1vw]"><img src="/basket_logo.png" alt="Basket" className="h-[10vw] w-[10vw] md:h-[6vw] md:w-[6vw]" />Basket <span className="font-mono text-xs md:text-[14px] text-paper/40 font-normal tracking-wider normal-case">(Beta)</span></h2>
            <p className="font-mono text-xs text-paper/40 mt-[3vh] max-w-xs">Le chemin le plus court vers les économies. Scannez, comparez, économisez — chaque semaine.</p>
          </div>
          <div className="flex flex-col md:flex-row gap-[8vw] mt-[4vh] md:mt-0">
            <ul className="space-y-[2vh] font-mono text-xs text-paper/60">
              <li><Link href="/login" className="hover:text-signal transition-colors hover-trigger">Créer un compte</Link></li>
              <li><Link href="/basket-ai" className="hover:text-signal transition-colors hover-trigger">Basket AI</Link></li>
              <li><Link href="/comment-ca-marche" className="hover:text-signal transition-colors hover-trigger">Comment ça marche</Link></li>
              <li><Link href="/vision" className="hover:text-signal transition-colors hover-trigger">Vision</Link></li>
            </ul>
            <ul className="space-y-[2vh] font-mono text-xs text-paper/60">
              <li><Link href="/carte" className="hover:text-signal transition-colors hover-trigger">Carte des prix</Link></li>
              <li><Link href="/contact" className="hover:text-signal transition-colors hover-trigger">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-signal transition-colors hover-trigger">Politique de confidentialité</Link></li>
              <li><Link href="/terms" className="hover:text-signal transition-colors hover-trigger">{"Conditions d'utilisation"}</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-16 md:mt-[20vh] flex justify-between items-end border-t border-paper/10 pt-8 md:pt-[5vh] relative z-10">
          <div className="flex items-center gap-[1vw]">
            <div className="w-[8px] h-[8px] rounded-full bg-signal animate-pulse" />
            <span className="font-mono text-xs text-paper/50 uppercase tracking-tight">Fait avec soin en France 🇫🇷</span>
          </div>
          <span className="font-mono text-xs text-paper/30">© 2026 Basket</span>
        </div>
        <p className="font-mono text-[10px] text-paper/20 mt-6 max-w-3xl relative z-10 leading-relaxed">
          Basket est un outil de comparaison indépendant. Les noms de marques et enseignes (Carrefour, Lidl, Aldi, Leclerc, Intermarché, etc.) sont la propriété de leurs détenteurs respectifs. Basket n&apos;est affilié à aucun distributeur. Les prix affichés sont indicatifs, issus de données communautaires, et peuvent différer des prix pratiqués en magasin. Dernière mise à jour des données : voir chaque fiche produit.
        </p>
      </footer>

    </div>
  )
}
