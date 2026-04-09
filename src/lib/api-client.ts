/**
 * Typed fetch wrapper for internal API routes.
 * - Adds Authorization header from Supabase session
 * - Redirects to /login on 401
 * - Shows toast on 429 and 500
 * - Retries once after 2s on network error
 */

import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return {}
  return { Authorization: `Bearer ${session.access_token}` }
}

async function attempt(url: string, options: RequestInit): Promise<Response> {
  const authHeader = await getAuthHeader()
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...options.headers,
    },
  })
}

export async function apiRequest<T = unknown>(
  url: string,
  options: RequestInit = {},
  timeoutMs = 30000,
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response
  try {
    response = await attempt(url, { ...options, signal: controller.signal })
  } catch (err: unknown) {
    clearTimeout(timeoutId)
    if (err instanceof DOMException && err.name === 'AbortError') {
      toast.error('La requête prend trop de temps', {
        description: 'Vérifiez votre connexion et réessayez.',
      })
      throw new Error('timeout')
    }
    // Network error — retry once after 2s
    await new Promise(r => setTimeout(r, 2000))
    try {
      response = await attempt(url, options)
    } catch {
      toast.error('Erreur réseau', { description: 'Impossible de joindre le serveur.' })
      throw new Error('network_error')
    }
  } finally {
    clearTimeout(timeoutId)
  }

  if (response.status === 401) {
    window.location.href = '/login'
    throw new Error('unauthorized')
  }

  if (response.status === 429) {
    toast.error('Trop de requêtes', { description: 'Réessayez dans un instant.' })
    throw new Error('rate_limited')
  }

  if (response.status >= 500) {
    toast.error('Erreur serveur', { description: 'Réessayez dans quelques secondes.' })
    throw new Error('server_error')
  }

  return response.json() as Promise<T>
}

export const apiGet = <T = unknown>(url: string, timeoutMs?: number) =>
  apiRequest<T>(url, { method: 'GET' }, timeoutMs)

export const apiPost = <T = unknown>(url: string, body: unknown, timeoutMs?: number) =>
  apiRequest<T>(url, { method: 'POST', body: JSON.stringify(body) }, timeoutMs)
