'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, LayoutGroup } from 'framer-motion'
import { Home, Camera, User, ShoppingCart, Map } from 'lucide-react'
import { haptic } from '@/lib/haptic'

const TABS = [
  { id: 'home',    label: 'Accueil', icon: Home,         href: '/dashboard' },
  { id: 'carte',   label: 'Carte',   icon: Map,           href: '/carte' },
  { id: 'scan',    label: 'Scanner', icon: Camera,        href: '/scan',      isFab: true },
  { id: 'liste',   label: 'Liste',   icon: ShoppingCart,  href: '/liste' },
  { id: 'profile', label: 'Profil',  icon: User,          href: '/profile' },
]

interface ProfileMeta {
  level:       number
  streak?:     number
  hasNewBadge?: boolean
}

interface BottomNavProps {
  active:       'home' | 'scan' | 'liste' | 'profile' | 'carte'
  profileMeta?: ProfileMeta
}

export default function BottomNav({ active, profileMeta }: BottomNavProps) {
  const [localBadge, setLocalBadge] = useState(false)
  const [localLevel, setLocalLevel] = useState<number | null>(null)
  const [localStreak, setLocalStreak] = useState(0)

  useEffect(() => {
    try {
      const badge  = localStorage.getItem('basket_gam_new_badge')
      const level  = localStorage.getItem('basket_gam_level')
      const streak = localStorage.getItem('basket_gam_streak')
      if (badge)  setLocalBadge(true)
      if (level)  setLocalLevel(parseInt(level, 10))
      if (streak) setLocalStreak(parseInt(streak, 10))
    } catch { /* ignore */ }
  }, [])

  const level    = profileMeta?.level  ?? localLevel
  const streak   = profileMeta?.streak ?? localStreak
  const hasBadge = profileMeta?.hasNewBadge ?? localBadge

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass-dock">
      <LayoutGroup>
        <div
          className="flex items-end justify-around"
          style={{
            paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
            paddingTop: '6px',
          }}
        >
          {TABS.map((tab) => {
            const isActive     = active === tab.id
            const isProfileTab = tab.id === 'profile'

            if (tab.isFab) {
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  prefetch
                  className="flex flex-col items-center -mt-4"
                  onClick={() => haptic(50)}
                >
                  <motion.div
                    whileTap={{ scale: 0.88 }}
                    className="flex items-center justify-center rounded-full glass-fab"
                    style={{ width: 52, height: 52 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  >
                    <tab.icon className="w-[22px] h-[22px] text-white" strokeWidth={2.2} />
                  </motion.div>
                  <span className="text-[10px] font-semibold mt-1 text-graphite/40">{tab.label}</span>
                </Link>
              )
            }

            return (
              <Link
                key={tab.id}
                href={tab.href}
                prefetch
                className="flex flex-col items-center justify-end py-1 relative"
                style={{ minWidth: 56 }}
                onClick={() => haptic()}
              >
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className="flex flex-col items-center relative"
                >
                  {isProfileTab && (
                    <>
                      {hasBadge && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full z-10"
                          style={{ background: '#EF4444', border: '2px solid rgba(245,243,238,0.75)' }}
                        />
                      )}
                      {level && level > 1 && !hasBadge && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-2.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold z-10 leading-none"
                          style={{ background: '#7ed957', color: '#111' }}
                        >
                          {level}
                        </motion.div>
                      )}
                      {streak >= 2 && (
                        <span className="absolute -top-1 -left-2.5 text-[10px] leading-none">🔥</span>
                      )}
                    </>
                  )}

                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
                    style={{
                      background: isActive ? 'rgba(126, 217, 87, 0.1)' : 'transparent',
                    }}
                  >
                    <tab.icon
                      className="w-[20px] h-[20px]"
                      strokeWidth={isActive ? 2.2 : 1.7}
                      style={{ color: isActive ? '#7ed957' : 'rgba(17,17,17,0.28)' }}
                    />
                  </div>
                  <span
                    className="text-[10px] font-semibold transition-colors"
                    style={{ color: isActive ? '#7ed957' : 'rgba(17,17,17,0.28)' }}
                  >
                    {tab.label}
                  </span>
                </motion.div>

                {isActive && (
                  <motion.div
                    layoutId="navPill"
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full"
                    style={{ width: 20, height: 3, background: '#7ed957', borderRadius: 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
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
