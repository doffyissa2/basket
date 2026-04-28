'use client'

import { useUserContext } from '@/lib/user-context'
import WaitlistScreen from './WaitlistScreen'

export default function BetaGate({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useUserContext()

  // Not logged in — let pages handle their own /login redirect
  if (!loading && !user) return <>{children}</>

  // Logged in but profile hasn't loaded yet — show neutral loader, NOT children.
  // Otherwise an unapproved user could briefly see protected content before
  // the profile arrives and BetaGate flips to the waitlist screen.
  if (loading || (user && !profile)) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-graphite/10 border-t-graphite/40 animate-spin" />
      </div>
    )
  }

  if (profile && !profile.beta_approved) return <WaitlistScreen />

  return <>{children}</>
}
