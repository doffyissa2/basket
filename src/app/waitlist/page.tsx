'use client'

import { useEffect } from 'react'
import { useUserContext } from '@/lib/user-context'
import WaitlistScreen from '@/components/WaitlistScreen'

export default function WaitlistPage() {
  const { user, profile, loading } = useUserContext()

  useEffect(() => {
    if (loading) return
    if (!user) {
      window.location.href = '/login'
      return
    }
    if (profile?.beta_approved) {
      window.location.href = '/dashboard'
    }
  }, [user, profile, loading])

  if (loading || !user) return null

  if (profile && !profile.beta_approved) return <WaitlistScreen />

  return null
}
