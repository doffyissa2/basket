'use client'

import { useEffect } from 'react'

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'iconify-icon': React.HTMLAttributes<HTMLElement> & { icon?: string }
    }
  }
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
      await loadScript('https://unpkg.com/@studio-freight/lenis@1.0.34/dist/lenis.min.js')
      await loadScript('https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js')

      const gsap          = (window as any).gsap
      const ScrollTrigger = (window as any).ScrollTrigger
      const Lenis         = (window as any).Lenis
      if (!gsap || !ScrollTrigger || !Lenis) return

      // Lenis smooth scroll
      lenisInstance = new Lenis({ lerp: 0.08, smoothWheel: true })
      function raf(time: number) { lenisInstance!.raf(time); requestAnimationFrame(raf) }
      requestAnimationFrame(raf)

      gsap.registerPlugin(ScrollTrigger)

      // ── Custom cursor ──────────────────────────────────────────────────
      const cursor = document.getElementById('custom-cursor')
      if (cursor) {
        let mouseX = -100, mouseY = -100  // start off-screen until first move
        let cursorX = mouseX, cursorY = mouseY
        // xPercent/yPercent centres the dot on the hotspot regardless of its size
        gsap.set(cursor, { xPercent: -50, yPercent: -50, x: mouseX, y: mouseY })
        window.addEventListener('mousemove', (e: MouseEvent) => { mouseX = e.clientX; mouseY = e.clientY })
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

      // Product counter
      const counterObj = { val: 0 }
      ScrollTrigger.create({
        trigger: '#uptime-counter', start: 'top 85%',
        onEnter: () => {
          gsap.to(counterObj, {
            val: 33673, duration: 2.5, ease: 'power4.out',
            onUpdate: () => {
              const el = document.getElementById('uptime-counter')
              if (el) el.innerText = Math.round(counterObj.val).toLocaleString('fr-FR')
            },
          })
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
      try { lenisInstance?.destroy?.() } catch { /* ignore */ }
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
          <a href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <img src="/basket_logo.png" alt="Basket" className="h-7 w-7" />
            <span className="font-sans font-bold tracking-tight text-graphite text-sm">Basket <span className="font-mono text-[9px] text-graphite/40 font-normal tracking-wider">(Beta)</span></span>
          </a>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8 font-mono text-xs text-graphite/50">
            <a href="#features" className="hover:text-signal transition-colors duration-200 py-1 border-b border-transparent hover:border-signal">Basket AI</a>
            <a href="#philosophy" className="hover:text-signal transition-colors duration-200 py-1 border-b border-transparent hover:border-signal">Vision</a>
            <a href="#protocol" className="hover:text-signal transition-colors duration-200 py-1 border-b border-transparent hover:border-signal">Comment ça marche</a>
            <a href="#topology" className="hover:text-signal transition-colors duration-200 py-1 border-b border-transparent hover:border-signal">Carte</a>
          </div>

          {/* CTA */}
          <a href="/login" className="flex-shrink-0">
            <button className="relative overflow-hidden rounded-xl bg-signal text-graphite px-5 py-2 font-sans text-xs font-semibold uppercase tracking-wider group transition-transform duration-300 hover:scale-[1.03] magnetic-btn">
              <span className="absolute inset-0 bg-graphite translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]" />
              <span className="relative z-10 group-hover:text-signal transition-colors duration-500">Se connecter</span>
            </button>
          </a>
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
            <a href="/login" className="w-full max-w-xs">
              <button className="w-full rounded-2xl bg-signal text-graphite py-4 font-sans text-sm font-bold uppercase tracking-wide">
                Commencer
              </button>
            </a>
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

        {/* Card 2 — Base de données */}
        <div className="bg-offwhite rounded-[2rem] md:rounded-[3rem] p-5 md:p-[2.5vw] h-auto min-h-[280px] md:h-[50vh] flex flex-col justify-between group border border-graphite/10 hover-trigger feature-card">
          <div className="flex justify-between items-start">
            <span className="font-mono text-xs text-graphite/50 uppercase tracking-tight">02 // Base de données</span>
            <iconify-icon icon="solar:database-linear" className="text-2xl text-signal" />
          </div>
          <div className="flex-1 flex items-end mb-4 md:mb-[2vh] relative">
            <span className="font-sans text-5xl md:text-[5vw] leading-none tracking-tighter font-extrabold text-graphite" id="uptime-counter">0</span>
            <span className="font-mono text-lg text-signal mb-1 md:mb-[1vh] ml-2">produits</span>
          </div>
          <h3 className="font-sans text-xl md:text-[2vw] leading-none tracking-tighter font-bold text-graphite">
            +40 000 prix<br />comparés en temps réel
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
          {/* Large Map Card */}
          <div className="md:col-span-2 md:row-span-2 bg-offwhite rounded-[2rem] md:rounded-[3rem] p-5 md:p-[3vw] flex flex-col justify-between group border border-graphite/10 hover-trigger topology-card overflow-hidden relative min-h-[280px] md:min-h-[50vh]">
            <div className="flex justify-between items-start relative z-10">
              <span className="font-mono text-xs text-graphite/50 uppercase tracking-tight">Magasins à proximité</span>
              <iconify-icon icon="solar:map-point-wave-linear" className="text-2xl text-signal" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none mt-[4vh]">
              <div className="w-[120%] h-[120%] md:w-[80%] md:h-[120%] border-[1px] border-graphite/20 rounded-full absolute animate-[spin_60s_linear_infinite]" />
              <div className="w-[80%] h-[80%] md:w-[60%] md:h-[90%] border-[1px] border-graphite/20 rounded-full absolute animate-[spin_40s_linear_infinite_reverse] border-dashed" />
              <div className="absolute w-3 h-3 bg-signal rounded-full top-[25%] left-[35%] shadow-[0_0_12px_rgba(126,217,87,0.8)]">
                <span className="absolute -top-5 left-3 font-mono text-[0.5rem] text-graphite/60 whitespace-nowrap">Lidl</span>
              </div>
              <div className="absolute w-2.5 h-2.5 bg-orange-400 rounded-full top-[55%] left-[65%] shadow-[0_0_10px_rgba(251,146,60,0.6)]">
                <span className="absolute -top-5 left-3 font-mono text-[0.5rem] text-graphite/60 whitespace-nowrap">Carrefour</span>
              </div>
              <div className="absolute w-2.5 h-2.5 bg-blue-400 rounded-full top-[45%] left-[25%] shadow-[0_0_10px_rgba(96,165,250,0.6)]">
                <span className="absolute -top-5 left-3 font-mono text-[0.5rem] text-graphite/60 whitespace-nowrap">Leclerc</span>
              </div>
              <div className="absolute w-2 h-2 bg-red-400 rounded-full top-[70%] left-[45%] shadow-[0_0_10px_rgba(248,113,113,0.6)]">
                <span className="absolute -top-5 left-3 font-mono text-[0.5rem] text-graphite/60 whitespace-nowrap">Auchan</span>
              </div>
            </div>
            <h3 className="font-sans text-base md:text-[2vw] leading-none tracking-tighter font-bold text-graphite mt-8 md:mt-[30vh] relative z-10">
              Carte interactive<br />de votre quartier
            </h3>
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
            {/* Glow accent */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 pointer-events-none"
              style={{ background: 'radial-gradient(circle, #7ed957 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />

            <div className="relative z-10">
              {/* Beta badge */}
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

              {/* App store badges */}
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
        <a href="/login">
          <button className="relative overflow-hidden rounded-[2rem] bg-signal text-graphite px-8 py-4 md:px-[3vw] md:py-[2vh] min-w-[200px] font-sans text-sm font-bold uppercase tracking-tight group hover:scale-[1.05] transition-transform duration-500 magnetic-btn flex items-center justify-center gap-3 md:gap-[1vw]">
            <span className="absolute inset-0 bg-graphite translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]" />
            <span className="relative z-10 group-hover:text-signal transition-colors duration-500 flex items-center gap-3 md:gap-[1vw]">
              Commencer gratuitement
              <iconify-icon icon="solar:arrow-right-linear" className="text-lg" />
            </span>
          </button>
        </a>
      </section>

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
              <li><a href="/login" className="hover:text-signal transition-colors hover-trigger">Créer un compte</a></li>
              <li><a href="#features" className="hover:text-signal transition-colors hover-trigger">Basket AI</a></li>
              <li><a href="#protocol" className="hover:text-signal transition-colors hover-trigger">Comment ça marche</a></li>
            </ul>
            <ul className="space-y-[2vh] font-mono text-xs text-paper/60">
              <li><a href="#" className="hover:text-signal transition-colors hover-trigger">Politique de confidentialité</a></li>
              <li><a href="#" className="hover:text-signal transition-colors hover-trigger">{"Conditions d'utilisation"}</a></li>
              <li><a href="#" className="hover:text-signal transition-colors hover-trigger">Contact</a></li>
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
      </footer>

    </div>
  )
}
