'use client'

import { useUserContext } from '@/lib/user-context'
import WaitlistScreen from './WaitlistScreen'

export default function BetaGate({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useUserContext()

  if (loading || !user) return <>{children}</>

  if (profile && !profile.beta_approved) return <WaitlistScreen />

  return <>{children}</>
}
