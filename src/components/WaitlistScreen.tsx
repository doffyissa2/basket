'use client'

import { motion } from 'framer-motion'
import { LogOut, Clock, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function WaitlistScreen() {
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-paper text-graphite flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background orb */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, #7ed957 0%, transparent 70%)',
            top: '-150px',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <motion.div
        className="glass-strong rounded-2xl p-8 max-w-md w-full text-center relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <motion.div
          className="flex items-center justify-center gap-2 mb-8"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <img src="/basket_logo.png" alt="Basket" className="h-10 w-10" />
          <span className="text-2xl font-bold tracking-tight text-graphite">Basket</span>
        </motion.div>

        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{
            background: 'rgba(126,217,87,0.12)',
            border: '1px solid rgba(126,217,87,0.25)',
          }}
        >
          <Clock className="w-8 h-8" style={{ color: '#7ed957' }} />
        </div>

        <h1 className="text-2xl font-bold mb-2 text-graphite">
          Vous etes sur la liste !
        </h1>
        <p className="text-graphite/50 text-sm leading-relaxed mb-6">
          Votre compte a bien ete cree. Nous examinons les inscriptions
          manuellement pour garantir la meilleure experience possible
          pendant la phase de test.
        </p>

        {/* Beta info card */}
        <div
          className="rounded-xl p-4 mb-6 flex items-center gap-3"
          style={{
            background: 'rgba(126,217,87,0.08)',
            border: '1px solid rgba(126,217,87,0.15)',
          }}
        >
          <Users className="w-5 h-5 flex-shrink-0" style={{ color: '#7ed957' }} />
          <p className="text-sm text-graphite/60 text-left">
            Places limitees a <strong className="text-graphite">100 beta testeurs</strong>.
            Vous recevrez un email des que votre acces sera active.
          </p>
        </div>

        <p className="text-xs text-graphite/40 mb-6">
          Une question ? Ecrivez-nous a{' '}
          <a
            href="mailto:angelo.maniraguha@gmail.com"
            className="underline hover:text-graphite/60 transition-colors"
          >
            angelo.maniraguha@gmail.com
          </a>
        </p>

        <motion.button
          onClick={handleSignOut}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full h-11 rounded-xl font-semibold text-graphite/60 flex items-center justify-center gap-2 transition-colors hover:text-graphite"
          style={{
            background: 'rgba(17,17,17,0.05)',
            border: '1px solid rgba(17,17,17,0.1)',
          }}
        >
          <LogOut className="w-4 h-4" />
          Se deconnecter
        </motion.button>
      </motion.div>
    </div>
  )
}
