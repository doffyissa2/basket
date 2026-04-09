'use client'

import React from 'react'
import { AlertTriangle, RefreshCw, Mail } from 'lucide-react'

interface State { hasError: boolean; errorMessage: string }

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, errorMessage: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message ?? 'Erreur inconnue' }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center"
        style={{ background: '#F7F7F5' }}>
        <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-6"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-graphite mb-2">Quelque chose s'est mal passé</h1>
        <p className="text-sm text-graphite/50 mb-8 max-w-xs">
          Une erreur inattendue s'est produite. Veuillez réessayer ou nous contacter si le problème persiste.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm text-white"
            style={{ background: '#111' }}>
            <RefreshCw className="w-4 h-4" /> Réessayer
          </button>
          <a
            href="mailto:contact@basketbeta.com?subject=Erreur Basket&body=Message d'erreur: "
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm"
            style={{ background: 'rgba(17,17,17,0.06)', color: 'rgba(17,17,17,0.5)', textDecoration: 'none' }}>
            <Mail className="w-4 h-4" /> Signaler
          </a>
        </div>
      </div>
    )
  }
}
