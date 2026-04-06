'use client'

import { motion, LayoutGroup } from 'framer-motion'
import { Home, Camera, User, ShoppingCart } from 'lucide-react'

const TABS = [
  { id: 'home',    label: 'Accueil', icon: Home,         href: '/dashboard' },
  { id: 'scan',    label: 'Scanner', icon: Camera,        href: '/scan',      isFab: true },
  { id: 'liste',   label: 'Liste',   icon: ShoppingCart,  href: '/liste' },
  { id: 'profile', label: 'Profil',  icon: User,          href: '/profile' },
]

export default function BottomNav({ active }: { active: 'home' | 'scan' | 'liste' | 'profile' }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        background: 'rgba(10,10,10,0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <LayoutGroup>
        <div
          className="flex items-end justify-around px-2"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)', paddingTop: '8px' }}
        >
          {TABS.map((tab) => {
            const isActive = active === tab.id

            if (tab.isFab) {
              return (
                <a key={tab.id} href={tab.href} className="flex flex-col items-center" style={{ marginBottom: '12px' }}>
                  <motion.div
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: 52,
                      height: 52,
                      background: '#E07A5F',
                      boxShadow: '0 4px 20px rgba(224,122,95,0.5)',
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <tab.icon className="w-6 h-6 text-white" />
                  </motion.div>
                  <span className="text-[10px] mt-1 font-medium" style={{ color: '#E07A5F' }}>{tab.label}</span>
                </a>
              )
            }

            return (
              <a key={tab.id} href={tab.href} className="flex flex-col items-center gap-1 py-1 relative min-w-[52px]">
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="flex flex-col items-center gap-1"
                >
                  <tab.icon className="w-5 h-5 transition-colors" style={{ color: isActive ? '#E07A5F' : '#4B5563' }} />
                  <span className="text-[10px] font-medium transition-colors" style={{ color: isActive ? '#E07A5F' : '#4B5563' }}>
                    {tab.label}
                  </span>
                </motion.div>
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ background: '#E07A5F' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </a>
            )
          })}
        </div>
      </LayoutGroup>
    </nav>
  )
}
