'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShoppingBasket, Loader2, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [postcode, setPostcode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (isSignup) {
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signupError) {
        setError(signupError.message)
      } else if (data.user) {
        // Save postcode to profile
        if (postcode) {
          await supabase
            .from('profiles')
            .update({ postcode })
            .eq('id', data.user.id)
        }
        // Redirect to dashboard
        window.location.href = '/dashboard'
      }
    } else {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (loginError) {
        setError(loginError.message)
      } else {
        window.location.href = '/dashboard'
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      {/* Back nav */}
      <nav className="px-6 py-5 max-w-6xl mx-auto w-full">
        <a href="/" className="inline-flex items-center gap-2 text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </a>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 pb-20">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-10">
            <ShoppingBasket className="w-8 h-8 text-[#E07A5F]" strokeWidth={2.5} />
            <span className="text-2xl font-bold tracking-tight">Basket</span>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-[#EDECE8] p-8">
            <h1 className="text-xl font-bold mb-1 text-center">
              {isSignup ? 'Créer un compte' : 'Se connecter'}
            </h1>
            <p className="text-sm text-[#6B6B6B] mb-6 text-center">
              {isSignup
                ? 'Commencez à économiser sur vos courses'
                : 'Content de vous revoir'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-sm font-medium mb-1.5 block">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-xl border-[#E0DDD8] focus-visible:ring-[#E07A5F]"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-medium mb-1.5 block">
                  Mot de passe
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-11 rounded-xl border-[#E0DDD8] focus-visible:ring-[#E07A5F]"
                />
              </div>

              {isSignup && (
                <div>
                  <Label htmlFor="postcode" className="text-sm font-medium mb-1.5 block">
                    Code postal
                  </Label>
                  <Input
                    id="postcode"
                    type="text"
                    placeholder="75001"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    className="h-11 rounded-xl border-[#E0DDD8] focus-visible:ring-[#E07A5F]"
                  />
                  <p className="text-xs text-[#9B9B9B] mt-1">
                    Pour comparer les prix près de chez vous
                  </p>
                </div>
              )}

              {error && (
                <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}
              {message && (
                <p className="text-emerald-600 text-sm bg-emerald-50 px-3 py-2 rounded-lg">{message}</p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-[#E07A5F] hover:bg-[#C96A52] text-white font-semibold transition-all"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isSignup ? (
                  "Créer mon compte"
                ) : (
                  "Se connecter"
                )}
              </Button>
            </form>
          </div>

          {/* Toggle */}
          <p className="text-center text-sm text-[#6B6B6B] mt-6">
            {isSignup ? 'Déjà un compte ?' : 'Pas encore de compte ?'}{' '}
            <button
              onClick={() => {
                setIsSignup(!isSignup)
                setError('')
                setMessage('')
              }}
              className="text-[#E07A5F] font-medium hover:underline"
            >
              {isSignup ? 'Se connecter' : "S'inscrire"}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}