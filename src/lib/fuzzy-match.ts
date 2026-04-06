import { normalizeProductName, tokenize, extractBrand, extractWeight, brandToCategory } from './normalize'
import { expandAbbreviations } from './receipt-abbreviations'

export type MatchStrategy =
  | 'exact'
  | 'contains'
  | 'token_overlap'
  | 'brand_weight'
  | 'levenshtein'
  | 'none'

export interface MatchResult {
  matched: string | null
  confidence: number
  strategy: MatchStrategy
}

// ─── Levenshtein distance ────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

function levenshteinSimilarity(a: string, b: string): number {
  const dist = levenshtein(a, b)
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - dist / maxLen
}

// ─── Token overlap ────────────────────────────────────────────────────────────

function tokenOverlapScore(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0
  const setA = new Set(tokensA)
  const setB = new Set(tokensB)
  let overlap = 0
  for (const t of setA) {
    if (setB.has(t)) overlap++
    // Partial: one token starts with another (handles truncated receipt names)
    else {
      for (const tb of setB) {
        if (t.startsWith(tb) || tb.startsWith(t)) { overlap += 0.6; break }
      }
    }
  }
  const union = new Set([...setA, ...setB]).size
  return overlap / union
}

// ─── Main fuzzy match function ────────────────────────────────────────────────

export function fuzzyMatch(scanned: string, candidates: string[]): MatchResult {
  if (candidates.length === 0) return { matched: null, confidence: 0, strategy: 'none' }

  // Prepare the query in multiple forms
  const expanded = expandAbbreviations(scanned)
  const normQuery = normalizeProductName(expanded)
  const tokensQuery = tokenize(expanded)
  const brandQuery = extractBrand(expanded) ?? extractBrand(scanned)
  const weightQuery = extractWeight(expanded) ?? extractWeight(scanned)
  const brandCategories = brandToCategory(expanded) ?? brandToCategory(scanned)

  let bestMatch: string | null = null
  let bestScore = 0
  let bestStrategy: MatchStrategy = 'none'

  for (const candidate of candidates) {
    const normCand = normalizeProductName(candidate)
    const tokensCand = tokenize(candidate)
    const brandCand = extractBrand(candidate)
    const weightCand = extractWeight(candidate)

    // ── a. Exact match ───────────────────────────────────────────────────────
    if (normQuery === normCand) {
      return { matched: candidate, confidence: 1.0, strategy: 'exact' }
    }

    let score = 0
    let strategy: MatchStrategy = 'none'

    // ── b. Contains match ────────────────────────────────────────────────────
    if (normCand.includes(normQuery) || normQuery.includes(normCand)) {
      const lengthRatio = Math.min(normQuery.length, normCand.length) / Math.max(normQuery.length, normCand.length)
      const containsScore = 0.75 + 0.15 * lengthRatio
      if (containsScore > score) { score = containsScore; strategy = 'contains' }
    }

    // ── c. Token overlap ─────────────────────────────────────────────────────
    const overlap = tokenOverlapScore(tokensQuery, tokensCand)
    if (overlap > 0) {
      // Boost if weight also matches
      const weightBoost = weightQuery && weightCand && weightQuery === weightCand ? 0.1 : 0
      const tokenScore = overlap * 0.85 + weightBoost
      if (tokenScore > score) { score = tokenScore; strategy = 'token_overlap' }
    }

    // ── d. Levenshtein similarity ─────────────────────────────────────────────
    // Apply only when strings are similar in length to avoid wasted compute
    const lenRatio = Math.min(normQuery.length, normCand.length) / Math.max(normQuery.length, normCand.length)
    if (lenRatio > 0.5) {
      const levSim = levenshteinSimilarity(normQuery, normCand)
      const levScore = levSim * 0.7 // cap so levenshtein alone can't win over token overlap
      if (levScore > score) { score = levScore; strategy = 'levenshtein' }
    }

    // ── e. Brand + weight matching ───────────────────────────────────────────
    if (brandQuery && brandCand && brandQuery === brandCand) {
      const brandBase = 0.55
      const weightBoost = weightQuery && weightCand && weightQuery === weightCand ? 0.35 : 0
      const brandScore = brandBase + weightBoost
      if (brandScore > score) { score = brandScore; strategy = 'brand_weight' }
    }

    // ── f. Brand→category matching ───────────────────────────────────────────
    // e.g. "cristaline" → category ["eau","eau minerale"] — match candidates
    // containing any of those category keywords
    if (brandCategories && brandCategories.length > 0) {
      const catMatch = brandCategories.some((cat) => normCand.includes(cat))
      if (catMatch) {
        const weightBoost = weightQuery && weightCand && weightQuery === weightCand ? 0.25 : 0
        const catScore = 0.55 + weightBoost
        if (catScore > score) { score = catScore; strategy = 'brand_weight' }
      }
    }

    if (score > bestScore) {
      bestScore = score
      bestMatch = candidate
      bestStrategy = strategy
    }
  }

  if (bestScore < 0.3) return { matched: null, confidence: 0, strategy: 'none' }

  return {
    matched: bestMatch,
    confidence: Math.min(bestScore, 1),
    strategy: bestStrategy,
  }
}

// ─── Batch helper ─────────────────────────────────────────────────────────────

export interface BatchMatchResult {
  item: string
  matched: string | null
  confidence: number
  strategy: MatchStrategy
  usedClaude: boolean
}

/**
 * Returns which items need Claude (confidence < threshold) and which
 * can be resolved locally.
 */
export function batchFuzzyMatch(
  items: string[],
  candidates: string[],
  claudeThreshold = 0.3
): BatchMatchResult[] {
  return items.map((item) => {
    const result = fuzzyMatch(item, candidates)
    return {
      item,
      matched: result.matched,
      confidence: result.confidence,
      strategy: result.strategy,
      usedClaude: result.confidence < claudeThreshold,
    }
  })
}
