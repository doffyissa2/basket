'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { ShoppingBasket, Camera, LogOut, Receipt, TrendingDown, History } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface RecentReceipt {
  id: string
  store_name: string | null
  total_amount: number | null
  receipt_date: string | null
  created_at: string
}

interface SavingSummary {
  total_items_scanned: number
  potential_savings: number
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentReceipts, setRecentReceipts] = useState<RecentReceipt[]>([])
  const [savings, setSavings] = useState<SavingSummary>({ total_items_scanned: 0, potential_savings: 0 })

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setUser(user)

      // Fetch recent receipts
      const { data: receipts } = await supabase
        .from('receipts')
        .select('id, store_name, total_amount, receipt_date, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (receipts) setRecentReceipts(receipts)

      // Fetch savings summary
      const { data: items, count } = await supabase
        .from('price_items')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)

      setSavings({
        total_items_scanned: count || 0,
        potential_savings: 0, // Will be calculated by comparison engine later
      })

      setLoading(false)
    }

    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-2 text-[#6B6B6B]">
          <ShoppingBasket className="w-6 h-6" />
          <span>Chargement...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <ShoppingBasket className="w-7 h-7 text-[#E07A5F]" strokeWidth={2.5} />
          <span className="text-xl font-bold tracking-tight">Basket</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </nav>

      <main className="max-w-4xl mx-auto px-6 pb-20">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">
            Bonjour {user?.email?.split('@')[0]} 👋
          </h1>
          <p className="text-[#6B6B6B]">
            Scannez un ticket pour commencer à économiser.
          </p>
        </div>

        {/* Scan CTA */}
        <a href="/scan">
          <div className="bg-[#E07A5F] text-white rounded-2xl p-8 mb-8 hover:bg-[#C96A52] transition-all cursor-pointer group">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold mb-2">Scanner un ticket</h2>
                <p className="text-white/80 text-sm">
                  Prenez en photo votre ticket de caisse pour voir vos économies possibles
                </p>
              </div>
              <div className="bg-white/20 rounded-2xl p-4 group-hover:bg-white/30 transition-all">
                <Camera className="w-8 h-8" />
              </div>
            </div>
          </div>
        </a>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-[#EDECE8] p-6">
            <Receipt className="w-5 h-5 text-[#E07A5F] mb-3" />
            <p className="text-2xl font-bold">{recentReceipts.length}</p>
            <p className="text-sm text-[#6B6B6B]">Tickets scannés</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EDECE8] p-6">
            <TrendingDown className="w-5 h-5 text-emerald-500 mb-3" />
            <p className="text-2xl font-bold">{savings.total_items_scanned}</p>
            <p className="text-sm text-[#6B6B6B]">Produits analysés</p>
          </div>
        </div>

        {/* Recent receipts */}
        <div className="bg-white rounded-2xl border border-[#EDECE8] p-6">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-[#6B6B6B]" />
            <h3 className="font-bold">Derniers tickets</h3>
          </div>

          {recentReceipts.length === 0 ? (
            <div className="text-center py-8 text-[#9B9B9B]">
              <Receipt className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Aucun ticket scanné pour l&apos;instant</p>
              <p className="text-xs mt-1">Scannez votre premier ticket pour commencer</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentReceipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="flex items-center justify-between py-3 border-b border-[#F5F4F0] last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">{receipt.store_name || 'Magasin inconnu'}</p>
                    <p className="text-xs text-[#9B9B9B]">
                      {receipt.receipt_date
                        ? new Date(receipt.receipt_date).toLocaleDateString('fr-FR')
                        : new Date(receipt.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <p className="font-bold text-sm">
                    {receipt.total_amount ? `${receipt.total_amount.toFixed(2)} €` : '—'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}