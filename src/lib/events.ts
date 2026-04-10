/**
 * Typed module-level event bus.
 * Importable in client components, pages, and server code alike.
 * No external dependencies — just a Map of Sets.
 *
 * Usage:
 *   const unsub = on('receipt:scanned', ({ storeChain }) => { ... })
 *   // in cleanup: unsub()
 *
 *   emit('receipt:scanned', { storeChain: 'Carrefour', savings: 1.5, itemCount: 12 })
 */

type EventPayloads = {
  'receipt:scanned': { storeChain: string; savings: number; itemCount: number }
  'list:updated':    { count: number }
  'profile:updated': { postcode?: string }
}

type EventName = keyof EventPayloads
type Listener<K extends EventName> = (payload: EventPayloads[K]) => void

const listeners = new Map<EventName, Set<Listener<EventName>>>()

/**
 * Subscribe to an event. Returns an unsubscribe function.
 * Use in useEffect: `useEffect(() => on('event', handler), [])`
 */
export function on<K extends EventName>(event: K, listener: Listener<K>): () => void {
  if (!listeners.has(event)) listeners.set(event, new Set())
  listeners.get(event)!.add(listener as Listener<EventName>)
  return () => listeners.get(event)?.delete(listener as Listener<EventName>)
}

/**
 * Emit an event with a typed payload.
 * Errors in individual listeners are caught and logged, not propagated.
 */
export function emit<K extends EventName>(event: K, payload: EventPayloads[K]): void {
  listeners.get(event)?.forEach((listener) => {
    try {
      listener(payload)
    } catch (e) {
      console.warn('[events] listener error for', event, e)
    }
  })
}
