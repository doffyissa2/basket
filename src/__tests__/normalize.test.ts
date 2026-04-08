import { describe, it, expect } from 'vitest'
import { removeAccents, normalizeProductName, tokenize, extractWeight } from '@/lib/normalize'

describe('removeAccents', () => {
  it('strips French accents', () => {
    expect(removeAccents('éàüîç')).toBe('eauic')
    expect(removeAccents('Crème fraîche')).toBe('Creme fraiche')
    expect(removeAccents('Gruyère râpé')).toBe('Gruyere rape')
  })

  it('leaves ASCII unchanged', () => {
    expect(removeAccents('Nutella 750g')).toBe('Nutella 750g')
  })

  it('handles empty string', () => {
    expect(removeAccents('')).toBe('')
  })
})

describe('normalizeProductName', () => {
  it('lowercases and removes accents', () => {
    expect(normalizeProductName('Gruyère Râpé 200G')).toBe('gruyere rape 200g')
  })

  it('collapses multiple spaces', () => {
    expect(normalizeProductName('pain   complet')).toBe('pain complet')
  })

  it('removes special characters', () => {
    expect(normalizeProductName("Crème brûlée (x4)!")).toBe('creme brulee x4')
  })

  it('trims leading/trailing whitespace', () => {
    expect(normalizeProductName('  riz basmati  ')).toBe('riz basmati')
  })
})

describe('tokenize', () => {
  it('splits into tokens and removes French stopwords', () => {
    const tokens = tokenize('Lait demi-écrémé de vache')
    expect(tokens).toContain('lait')
    expect(tokens).toContain('demi')
    expect(tokens).toContain('ecreme')
    expect(tokens).not.toContain('de')
  })

  it('removes single-character tokens', () => {
    const tokens = tokenize('Riz x4 basmati')
    expect(tokens).not.toContain('x')
    expect(tokens).toContain('riz')
    expect(tokens).toContain('basmati')
  })

  it('returns empty array for empty string', () => {
    expect(tokenize('')).toEqual([])
  })
})

describe('extractWeight', () => {
  it('extracts kilograms', () => {
    expect(extractWeight('Farine de blé 1kg')).toBe('1kg')
    expect(extractWeight('Sucre 1,5 kg')).toBe('1.5kg')
  })

  it('extracts grams', () => {
    expect(extractWeight('Beurre Président 250g')).toBe('250g')
    expect(extractWeight('Jambon 4 tranches 200 g')).toBe('200g')
  })

  it('extracts litres', () => {
    expect(extractWeight('Coca-Cola 1.5L')).toBe('1.5l')
    expect(extractWeight('Lait 1l')).toBe('1l')
  })

  it('extracts millilitres', () => {
    expect(extractWeight('Huile olive 750ml')).toBe('750ml')
  })

  it('returns null when no weight found', () => {
    expect(extractWeight('Nutella')).toBeNull()
    expect(extractWeight('')).toBeNull()
  })
})
