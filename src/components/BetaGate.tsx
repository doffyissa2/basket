'use client'

import { useUserContext } from '@/lib/user-context'
import WaitlistScreen from './WaitlistScreen'

export default function BetaGate({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, error } = useUserContext()

  // Not logged in — let pages handle their own /login redirect
  if (!loading && !user) return <>{children}</>

  // Still loading — show spinner (but only while loading is true)
  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-graphite/10 border-t-graphite/40 animate-spin" />
      </div>
    )
  }

  // Profile failed to load (DB error, missing column, etc.) — let them through
  // rather than permanently blocking. The API layer still enforces beta access.
  if (user && !profile) return <>{children}</>

  if (profile && !profile.beta_approved) return <WaitlistScreen />

  return <>{children}</>
}
