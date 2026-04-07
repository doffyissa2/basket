'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingDown, Sparkles, ShoppingBasket } from 'lucide-react'

const SLIDES = [
  {
    icon: ShoppingBasket,
    title: 'Bienvenue sur Basket',
    desc: 'Votre assistant pour payer moins cher vos courses chaque semaine.',
    color: '#7ed957',
  },
  {
    icon: TrendingDown,
    title: 'Comparez les prix',
    desc: 'Scannez vos tickets de caisse et voyez instantanément où vos voisins paient moins.',
    color: '#00D09C',
  },
  {
    icon: Sparkles,
    title: 'Économisez chaque semaine',
    desc: 'Nos utilisateurs économisent en moyenne 23€ par semaine. Commencez maintenant.',
    color: '#7ed957',
  },
]

export default function OnboardingFlow() {
  const [visible, setVisible] = useState(false)
  const [slide, setSlide] = useState(0)
  const [direction, setDirection] = useState(1)

  useEffect(() => {
    const done = localStorage.getItem('basket_onboarding_done')
    if (!done) setVisible(true)
  }, [])

  const dismiss = () => {
    localStorage.setItem('basket_onboarding_done', '1')
    setVisible(false)
  }

  const next = () => {
    if (slide < SLIDES.length - 1) {
      setDirection(1)
      setSlide((s) => s + 1)
    } else {
      dismiss()
    }
  }

  if (!visible) return null

  const current = SLIDES[slide]
  const Icon = current.icon

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{ background: 'rgba(245,243,238,0.98)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Skip button */}
      <button
        onClick={dismiss}
        className="absolute top-12 right-6 text-sm font-medium transition-colors"
        style={{ color: 'rgba(17,17,17,0.4)' }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#111111')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(17,17,17,0.4)')}
      >
        Passer
      </button>

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={slide}
          custom={direction}
          initial={{ opacity: 0, x: direction * 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -60 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="text-center max-w-xs w-full"
        >
          {/* Icon */}
          <motion.div
            className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8"
            style={{
              background: `${current.color}18`,
              border: `1px solid ${current.color}35`,
            }}
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Icon className="w-12 h-12" style={{ color: current.color }} />
          </motion.div>

          <h2 className="text-3xl font-extrabold text-graphite mb-4">{current.title}</h2>
          <p className="text-graphite/60 leading-relaxed">{current.desc}</p>
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      <div className="flex gap-2 mt-12 mb-8">
        {SLIDES.map((_, i) => (
          <motion.div
            key={i}
            className="h-1.5 rounded-full"
            animate={{
              width: i === slide ? 24 : 6,
              background: i === slide ? '#7ed957' : 'rgba(17,17,17,0.15)',
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        ))}
      </div>

      {/* Next / Start button */}
      <motion.button
        onClick={next}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="w-full max-w-xs h-14 rounded-2xl font-bold text-white text-lg"
        style={{ background: '#111111' }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {slide < SLIDES.length - 1 ? 'Suivant' : 'Commencer'}
      </motion.button>
    </motion.div>
  )
}
