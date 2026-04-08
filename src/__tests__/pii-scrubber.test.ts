import { describe, it, expect } from 'vitest'
import { depersonalizePostcode } from '@/lib/pii-scrubber'

describe('depersonalizePostcode', () => {
  it('reduces full postcode to department (2 digits)', () => {
    expect(depersonalizePostcode('75013')).toBe('75')
    expect(depersonalizePostcode('69001')).toBe('69')
    expect(depersonalizePostcode('13008')).toBe('13')
  })

  it('strips spaces before slicing', () => {
    expect(depersonalizePostcode('75 013')).toBe('75')
  })

  it('returns null for null input', () => {
    expect(depersonalizePostcode(null)).toBeNull()
  })

  it('handles overseas departments', () => {
    expect(depersonalizePostcode('97100')).toBe('97')
  })
})
