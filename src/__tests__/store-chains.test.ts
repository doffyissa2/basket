import { describe, it, expect } from 'vitest'
import { normalizeStoreChain, isKnownStore } from '@/lib/store-chains'

describe('normalizeStoreChain', () => {
  it('normalizes Leclerc variants', () => {
    expect(normalizeStoreChain('E.LECLERC DRIVE')).toBe('Leclerc')
    expect(normalizeStoreChain('E.Leclerc')).toBe('Leclerc')
    expect(normalizeStoreChain('LECLERC HYPER')).toBe('Leclerc')
  })

  it('normalizes Lidl', () => {
    expect(normalizeStoreChain('LIDL FRANCE')).toBe('Lidl')
    expect(normalizeStoreChain('lidl')).toBe('Lidl')
  })

  it('normalizes Aldi', () => {
    expect(normalizeStoreChain('ALDI MARCHE')).toBe('Aldi')
  })

  it('normalizes Carrefour family', () => {
    expect(normalizeStoreChain('CARREFOUR MARKET')).toBe('Carrefour')
    expect(normalizeStoreChain('CARREFOUR CITY')).toBe('Carrefour')
    expect(normalizeStoreChain('CARREFOUR EXPRESS')).toBe('Carrefour')
  })

  it('normalizes Intermarché variants', () => {
    expect(normalizeStoreChain('INTERMARCHE')).toBe('Intermarché')
    expect(normalizeStoreChain('Intermarché')).toBe('Intermarché')
  })

  it('normalizes Super U family', () => {
    expect(normalizeStoreChain('SUPER U')).toBe('Super U')
    expect(normalizeStoreChain('U EXPRESS')).toBe('Super U')
    expect(normalizeStoreChain('HYPER U')).toBe('Super U')
  })

  it('returns trimmed original for unknown stores', () => {
    expect(normalizeStoreChain('ÉPICERIE DU COIN')).toBe('ÉPICERIE DU COIN')
    expect(normalizeStoreChain('  Unknown Store  ')).toBe('Unknown Store')
  })

  it('handles empty string', () => {
    expect(normalizeStoreChain('')).toBe('')
  })
})

describe('isKnownStore', () => {
  it('returns true for known chains', () => {
    expect(isKnownStore('LIDL FRANCE')).toBe(true)
    expect(isKnownStore('E.LECLERC DRIVE')).toBe(true)
    expect(isKnownStore('CARREFOUR MARKET')).toBe(true)
  })

  it('returns false for unknown stores', () => {
    expect(isKnownStore('EPICERIE DU VILLAGE')).toBe(false)
    expect(isKnownStore('')).toBe(false)
  })
})
