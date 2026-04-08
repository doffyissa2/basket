'use client'

import Link from 'next/link'
import { motion, LayoutGroup } from 'framer-motion'
import { Home, Camera, User, ShoppingCart, Map } from 'lucide-react'

const TABS = [
  { id: 'home',    label: 'Accueil', icon: Home,         href: '/dashboard' },
  { id: 'carte',   label: 'Carte',   icon: Map,           href: '/carte' },
  { id: 'scan',    label: 'Scanner', icon: Camera,        href: '/scan',      isFab: true },
  { id: 'liste',   label: 'Liste',   icon: ShoppingCart,  href: '/liste' },
  { id: 'profile', label: 'Profil',  icon: User,          href: '/profile' },
]

export default function BottomNav({ active }: { active: 'home' | 'scan' | 'liste' | 'profile' | 'carte' }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        background: 'rgba(245,243,238,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(17,17,17,0.08)',
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
                <Link key={tab.id} href={tab.href} className="flex flex-col items-center" style={{ marginBottom: '12px' }}>
                  <motion.div
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: 52,
                      height: 52,
                      background: '#111111',
                      boxShadow: '0 4px 20px rgba(17,17,17,0.25)',
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <tab.icon className="w-6 h-6 text-white" />
                  </motion.div>
                  <span className="text-[10px] mt-1 font-medium text-graphite/60">{tab.label}</span>
                </Link>
              )
            }

            return (
              <Link key={tab.id} href={tab.href} className="flex flex-col items-center gap-1 py-1 relative min-w-[52px]">
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="flex flex-col items-center gap-1"
                >
                  <tab.icon
                    className="w-5 h-5 transition-colors"
                    style={{ color: isActive ? '#7ed957' : 'rgba(17,17,17,0.35)' }}
                  />
                  <span
                    className="text-[10px] font-semibold transition-colors"
                    style={{ color: isActive ? '#7ed957' : 'rgba(17,17,17,0.35)' }}
                  >
                    {tab.label}
                  </span>
                </motion.div>
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ background: '#7ed957' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            )
          })}
        </div>
      </LayoutGroup>
    </nav>
  )
}
