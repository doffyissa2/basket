'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Map } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

export default function CartePage() {
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setAuthed(true)
    })
  }, [])

  if (!authed) {
    return (
      <div className="min-h-[100dvh] bg-paper flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#7ed957', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-paper text-graphite pb-28">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 pt-14 pb-4"
        style={{ borderBottom: '1px solid rgba(17,17,17,0.08)' }}
      >
        <motion.a
          href="/dashboard"
          whileTap={{ scale: 0.9 }}
          className="w-9 h-9 rounded-full flex items-center justify-center glass"
        >
          <ArrowLeft className="w-4 h-4 text-graphite/50" />
        </motion.a>
        <div className="flex items-center gap-2 flex-1">
          <Map className="w-4 h-4" style={{ color: '#7ed957' }} />
          <h1 className="font-bold text-base text-graphite">Carte des prix</h1>
        </div>
      </div>

      {/* Coming soon */}
      <div className="flex flex-col items-center justify-center px-8 pt-24 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
          style={{ background: 'rgba(126,217,87,0.1)' }}
        >
          <Map className="w-9 h-9" style={{ color: '#7ed957' }} />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl font-bold text-graphite mb-2"
        >
          Bientôt disponible
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-sm text-graphite/50 leading-relaxed max-w-xs"
        >
          La carte des prix arrive prochainement. Vous pourrez visualiser les enseignes les moins chères autour de vous.
        </motion.p>
      </div>

      <BottomNav active="carte" />
    </div>
  )
}
