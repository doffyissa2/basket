/**
 * PII Scrubber — strips personally-identifying information from receipt text
 * before it enters the database.
 *
 * Required for community receipt processing (Reddit, Dealabs).
 * This is the privacy pipeline that makes the LIA (Legitimate Interest Assessment)
 * defensible to the CNIL.
 *
 * What we KEEP: store name, postcode (dept only), item names, prices.
 * What we STRIP: names, cards, phones, emails, full addresses, loyalty IDs.
 */

// French mobile / landline patterns
const PHONE_FR = /(?:(?:\+33|0033|0)[\s.-]?)(?:[1-9][\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2})/g

// Email
const EMAIL = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g

// French IBAN
const IBAN = /FR\d{2}[\s]?[\d\s]{23,27}/gi

// Credit/debit card — 4 groups of 4 digits (with various separators)
const CARD_NUMBER = /\b(?:\d[\s\-*x]{0,2}){13,19}\b/g

// Loyalty card numbers — long (≥10) digit sequences that aren't prices
// Prices are short (≤6 digits, usually with a decimal), so we target long pure-digit runs
const LOYALTY_CARD = /\b\d{10,}\b/g

// Full French address lines: "12 rue de la Paix, 75001 Paris" → keep only postcode
const ADDRESS_LINE = /\b\d{1,4}[\s,]+(?:rue|avenue|boulevard|impasse|allée|voie|chemin|place|passage|square|résidence|villa|lotissement|hameau)[^\n,]{3,60}/gi

// Civility + name patterns: "Mme Dupont", "M. Martin", "Monsieur Doe"
const CIVILITY_NAME = /\b(?:Mme?\.?|M\.?|Monsieur|Madame|Mademoiselle|Dr\.?|Me\.?)\s+[A-ZÀ-Ÿ][a-zà-ÿ\-]{1,30}(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ\-]{1,30})?/g

// Transaction / authorization reference numbers (long alphanumeric codes)
const TRANSACTION_REF = /\b[A-Z]{2,6}[\s\-]?\d{6,20}\b/g

// Member / client numbers embedded in text: "N° CLIENT: 1234567890"
const MEMBER_NUMBER = /(?:n[°o]?\.?\s*)?(?:client|membre|carte|fidelite|fidélité|loyalty|card|member)[^\d]{0,10}\d{6,}/gi

const REPLACEMENT = '[redacted]'

/**
 * Removes all PII from a raw text string.
 * Order matters: more specific patterns run before generic ones.
 */
export function scrubPII(raw: string): string {
  return raw
    .replace(IBAN, REPLACEMENT)
    .replace(CARD_NUMBER, REPLACEMENT)
    .replace(MEMBER_NUMBER, REPLACEMENT)
    .replace(EMAIL, REPLACEMENT)
    .replace(PHONE_FR, REPLACEMENT)
    .replace(ADDRESS_LINE, REPLACEMENT)
    .replace(CIVILITY_NAME, REPLACEMENT)
    .replace(TRANSACTION_REF, REPLACEMENT)
    .replace(LOYALTY_CARD, REPLACEMENT)
    // Clean up multiple consecutive redacted tokens
    .replace(/(\[redacted\]\s*){2,}/g, '[redacted] ')
    .trim()
}

/**
 * Validates that a string is safe (no obvious PII remaining).
 * Returns false if any high-confidence PII pattern is still present.
 */
export function hasPII(text: string): boolean {
  return (
    PHONE_FR.test(text) ||
    EMAIL.test(text) ||
    IBAN.test(text) ||
    /\b\d{13,19}\b/.test(text) // long digit strings = card number
  )
}

/**
 * Reduces a postcode to department level only (75001 → 75).
 * We keep dept for geographic aggregation but not the full postcode.
 */
export function depersonalizePostcode(postcode: string | null): string | null {
  if (!postcode) return null
  return postcode.replace(/\s/g, '').slice(0, 2)
}
