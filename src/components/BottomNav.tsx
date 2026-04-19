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
  // Read badge notification from localStorage (written by scan page after award)
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
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        background:           'rgba(245,243,238,0.95)',
        backdropFilter:       'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop:            '1px solid rgba(17,17,17,0.08)',
      }}
    >
      <LayoutGroup>
        <div
          className="flex items-center justify-around px-2"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 6px)', paddingTop: '6px', height: 'var(--nav-h, 56px)' }}
        >
          {TABS.map((tab) => {
            const isActive     = active === tab.id
            const isProfileTab = tab.id === 'profile'

            if (tab.isFab) {
              return (
                <Link key={tab.id} href={tab.href} prefetch className="flex flex-col items-center gap-0.5" onClick={() => haptic(50)}>
                  <motion.div
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width:      44,
                      height:     44,
                      background: '#111111',
                      boxShadow:  '0 4px 16px rgba(17,17,17,0.3)',
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <tab.icon className="w-5 h-5 text-white" />
                  </motion.div>
                  <span className="text-[9px] font-medium text-graphite/60">{tab.label}</span>
                </Link>
              )
            }

            return (
              <Link key={tab.id} href={tab.href} prefetch className="flex flex-col items-center gap-0.5 py-1 relative min-w-[48px]" onClick={() => haptic()}>
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="flex flex-col items-center gap-1 relative"
                >
                  {/* Profile-tab extras */}
                  {isProfileTab && (
                    <>
                      {/* New badge red dot */}
                      {hasBadge && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                          className="absolute -top-1 -right-1 w-2 h-2 rounded-full z-10"
                          style={{ background: '#EF4444' }}
                        />
                      )}
                      {/* Level chip */}
                      {level && level > 1 && !hasBadge && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                          className="absolute -top-1.5 -right-2 px-1.5 py-0.5 rounded-full text-[8px] font-bold z-10 leading-none"
                          style={{ background: '#7ed957', color: '#111' }}
                        >
                          {level}
                        </motion.div>
                      )}
                      {/* Streak fire */}
                      {streak >= 2 && (
                        <span className="absolute -top-1.5 -left-2 text-[10px] leading-none">🔥</span>
                      )}
                    </>
                  )}

                  <tab.icon
                    className="w-[18px] h-[18px] transition-colors"
                    style={{ color: isActive ? '#7ed957' : 'rgba(17,17,17,0.35)' }}
                  />
                  <span
                    className="text-[9px] font-semibold transition-colors"
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
